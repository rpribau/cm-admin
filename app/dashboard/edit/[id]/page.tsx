"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  LinkIcon,
  Loader2,
  PencilIcon,
  SaveIcon,
  ShieldAlertIcon,
  Trash2Icon,
  XCircleIcon,
  ShieldIcon,
  FileIcon,
  DownloadIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { schema } from "@/components/data-table"
import type { z } from "zod"
import { useAuth } from "@/contexts/auth-provider"
import {
  documentoCompletoApi,
  digitalSignatureApi,
  firmaDocumentoApi,
  type FirmaDocumentoModel,
} from "@/lib/api-service"
import { accountDetailsApi } from "@/lib/api-service"
import { autorizacionApi } from "@/lib/api-service"
import { documentoApi } from "@/lib/api-service"
import type { AutorizacionModel, DocumentoModel } from "@/lib/api-service"
import { accountAccessApi } from "@/lib/api-service"

export default function DocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, isAdmin, userType, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [item, setItem] = React.useState<z.infer<typeof schema> | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("general")
  const [permissionError, setPermissionError] = React.useState<string | null>(null)

  // Estados mejorados para control de duplicaciones
  const [authorizationsProcessed, setAuthorizationsProcessed] = React.useState(false)
  const [isProcessingAuthorizations, setIsProcessingAuthorizations] = React.useState(false)
  const documentIdRef = React.useRef<number | null>(null)

  // Estados para los campos editables
  const [editableFields, setEditableFields] = React.useState({
    header: "",
    description: "",
    notes: "",
    status: "",
    reviewer: "",
    limit_date: "",
  })

  // Estado para el nuevo enlace
  const [newLink, setNewLink] = React.useState({ title: "", url: "" })
  const [showNewLinkForm, setShowNewLinkForm] = React.useState(false)

  // Estados para firma digital (simplificados)
  const [signingDocument, setSigningDocument] = React.useState(false)
  const [showSignDialog, setShowSignDialog] = React.useState(false)
  const [currentAuthIndex, setCurrentAuthIndex] = React.useState<number | null>(null)

  // Estado para documentos firmados (ahora desde /firma_documentos/)
  const [documentosFirmados, setDocumentosFirmados] = React.useState<FirmaDocumentoModel[]>([])
  const [loadingDocumentosFirmados, setLoadingDocumentosFirmados] = React.useState(false)

  // Función para calcular el estado del documento basado en autorizaciones
  const calculateDocumentStatus = (authorizations: any[]) => {
    if (!authorizations || authorizations.length === 0) {
      return "No Iniciado"
    }

    const approvedCount = authorizations.filter((auth) => auth.status === "approved").length
    const rejectedCount = authorizations.filter((auth) => auth.status === "rejected").length
    const totalCount = authorizations.length

    // Si hay al menos un rechazo, el documento está rechazado
    if (rejectedCount > 0) {
      return "Rechazado"
    }

    // Si todos han aprobado, está completado
    if (approvedCount === totalCount) {
      return "Completado"
    }

    // Si hay al menos una aprobación pero no todas, está en proceso
    if (approvedCount > 0) {
      return "En Proceso"
    }

    // Si nadie ha firmado, no iniciado
    return "No Iniciado"
  }

  // Verificar si el usuario tiene permisos para ver este documento
  const checkPermissions = (document: z.infer<typeof schema>) => {
    if (!user || !userType) return false

    // Si el usuario es superusuario, tiene acceso a todo
    if (userType === "todos") return true

    // Si el tipo de documento no coincide con el tipo de usuario
    if (document.type.toLowerCase() !== userType.toLowerCase()) {
      setPermissionError(`No tienes permisos para ver documentos de tipo ${document.type}`)
      return false
    }

    return true
  }

  // Función mejorada para cargar autorizaciones sin duplicaciones
  const loadAuthorizationsForDocument = async (documentId: number, documentType: string) => {
    // Prevenir múltiples ejecuciones simultáneas
    if (isProcessingAuthorizations) {
      console.log("⏳ Ya se están procesando autorizaciones, saltando...")
      return []
    }

    // Verificar si ya se procesaron las autorizaciones para este documento
    if (authorizationsProcessed && documentIdRef.current === documentId) {
      console.log("✅ Autorizaciones ya procesadas para este documento")
      try {
        // Obtener directamente del endpoint específico para este documento
        const existingAuths = await autorizacionApi.getByDocumentoId(documentId)
        console.log(`📋 Autorizaciones obtenidas para documento ${documentId}:`, existingAuths.length)

        return existingAuths.map((auth) => ({
          name: auth.name,
          role: auth.role,
          status: auth.status || "pending",
          date: auth.date || "",
        }))
      } catch (error) {
        console.error(`❌ Error al obtener autorizaciones para documento ${documentId}:`, error)
        return []
      }
    }

    setIsProcessingAuthorizations(true)

    try {
      console.log(`🔍 Cargando autorizaciones para documento ${documentId} desde API`)

      // Intentar obtener autorizaciones existentes para este documento
      let existingAuths = []
      try {
        existingAuths = await autorizacionApi.getByDocumentoId(documentId)
        console.log(`📋 Autorizaciones existentes para documento ${documentId}:`, existingAuths.length)
      } catch (error) {
        console.error(`❌ Error al obtener autorizaciones existentes para documento ${documentId}:`, error)
        existingAuths = []
      }

      // Si hay autorizaciones existentes, limpiar duplicados y devolverlas
      if (existingAuths.length > 0) {
        // Eliminar duplicados por nombre
        const uniqueAuthsMap = new Map()
        existingAuths.forEach((auth) => {
          const key = auth.name
          // Si ya existe, mantener la que tenga un estado diferente a "pending" o la más reciente
          if (uniqueAuthsMap.has(key)) {
            const existing = uniqueAuthsMap.get(key)
            if (existing.status === "pending" && auth.status !== "pending") {
              uniqueAuthsMap.set(key, auth)
            } else if (auth.status === "pending" && existing.status !== "pending") {
              // Mantener la existente
            } else if (auth.id && existing.id && auth.id > existing.id) {
              // Si ambas tienen el mismo estado, mantener la más reciente (ID mayor)
              uniqueAuthsMap.set(key, auth)
            }
          } else {
            uniqueAuthsMap.set(key, auth)
          }
        })

        const uniqueAuths = Array.from(uniqueAuthsMap.values())
        console.log(`✅ Autorizaciones únicas después de limpieza: ${uniqueAuths.length}`)

        setAuthorizationsProcessed(true)
        documentIdRef.current = documentId

        return uniqueAuths.map((auth) => ({
          name: auth.name,
          role: auth.role,
          status: auth.status || "pending",
          date: auth.date || "",
        }))
      }

      // Si no hay autorizaciones existentes, crear nuevas (solo una vez)
      console.log(`📝 No se encontraron autorizaciones existentes. Creando nuevas para documento ${documentId}`)

      // Obtener usuarios autorizados para este tipo de documento
      const allUsers = await accountDetailsApi.getAll()
      const authorizedUsers = allUsers.filter(
        (user) =>
          user.authorizacion === true &&
          (user.type.toLowerCase() === documentType.toLowerCase() ||
            user.type.toLowerCase().includes(documentType.toLowerCase())),
      )

      console.log(`👥 Encontrados ${authorizedUsers.length} usuarios autorizados para tipo ${documentType}`)

      if (authorizedUsers.length > 0) {
        const newAuthorizations = []
        const processedNames = new Set() // Para evitar duplicados

        // Crear autorizaciones una por una para evitar condiciones de carrera
        for (const user of authorizedUsers) {
          try {
            // Evitar duplicados por nombre
            if (processedNames.has(user.name)) {
              console.log(`⚠️ Usuario ${user.name} ya procesado, saltando...`)
              continue
            }

            processedNames.add(user.name)

            // Verificar una vez más que no existe antes de crear
            const existingAuth = await autorizacionApi.getByDocumentoIdAndNombre(documentId, user.name)

            if (!existingAuth) {
              console.log(`📝 Creando autorización para ${user.name} en documento ${documentId}`)

              const createdAuth = await autorizacionApi.create({
                documento_id: documentId,
                name: user.name,
                role: `Autorización ${documentType}`,
                status: "pending",
                date: null,
              })

              newAuthorizations.push({
                name: user.name,
                role: `Autorización ${documentType}`,
                status: "pending",
                date: "",
              })

              console.log(`✅ Autorización creada para ${user.name} en documento ${documentId}`)
            } else {
              console.log(`⚠️ Autorización ya existe para ${user.name}, usando la existente`)
              newAuthorizations.push({
                name: existingAuth.name,
                role: existingAuth.role,
                status: existingAuth.status || "pending",
                date: existingAuth.date || "",
              })
            }
          } catch (authError) {
            console.error(`❌ Error al procesar autorización para usuario ${user.name}:`, authError)
          }
        }

        setAuthorizationsProcessed(true)
        documentIdRef.current = documentId
        return newAuthorizations
      }

      setAuthorizationsProcessed(true)
      documentIdRef.current = documentId
      return []
    } catch (error) {
      console.error("❌ Error al cargar autorizaciones:", error)
      return []
    } finally {
      setIsProcessingAuthorizations(false)
    }
  }

  // Cargar TODOS los documentos firmados para este documento (de todos los usuarios)
  const loadDocumentosFirmados = async () => {
    if (!item) return

    setLoadingDocumentosFirmados(true)
    try {
      console.log("🔍 Cargando TODOS los documentos firmados para documento ID:", item.id)

      // Obtener todas las firmas de documentos
      const allFirmasDocumentos = await firmaDocumentoApi.getAll()
      console.log(`📄 Total de firmas en el sistema: ${allFirmasDocumentos.length}`)

      // Filtrar las firmas que corresponden a este documento (de TODOS los usuarios)
      const firmasDeEsteDocumento = allFirmasDocumentos.filter((firma) => firma.id_documentos === item.id)

      console.log(`✅ Firmas encontradas para documento ${item.id}: ${firmasDeEsteDocumento.length}`)

      // Mostrar detalles de cada firma para debugging
      firmasDeEsteDocumento.forEach((firma, index) => {
        console.log(`   Firma ${index + 1}: ID=${firma.id}, URL=${firma.url_firma}`)
      })

      setDocumentosFirmados(firmasDeEsteDocumento)
    } catch (error) {
      console.error("❌ Error al cargar documentos firmados:", error)
      setDocumentosFirmados([])
      toast.error("Error al cargar los documentos firmados")
    } finally {
      setLoadingDocumentosFirmados(false)
    }
  }

  // Función para probar manualmente el endpoint
  const testDocumentosFirmadosEndpoint = async () => {
    try {
      console.log("🧪 Probando endpoint /firma_documentos/...")
      const response = await fetch("http://4.157.251.39:8000/firma_documentos/")
      console.log("🧪 Status:", response.status)
      console.log("🧪 Headers:", Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log("🧪 Datos recibidos:", data)
      console.log("🧪 Tipo de datos:", typeof data)
      console.log("🧪 Es array:", Array.isArray(data))

      if (Array.isArray(data)) {
        console.log("🧪 Elementos del array:")
        data.forEach((item, index) => {
          console.log(`   ${index + 1}.`, item)
        })

        // Filtrar por documento actual si existe
        if (item) {
          const firmasDelDocumento = data.filter((firma: any) => firma.id_documentos === item.id)
          console.log(`🧪 Firmas para documento ${item.id}:`, firmasDelDocumento.length)
        }
      }
    } catch (error) {
      console.error("🧪 Error en prueba manual:", error)
    }
  }

  // Descargar documento firmado (desde URL de firma)
  const handleDownloadSignedDocument = async (firmaUrl: string, firmaId: number) => {
    try {
      console.log(`📥 Descargando documento firmado desde: ${firmaUrl}`)

      // Intentar descargar directamente desde la URL
      const response = await fetch(firmaUrl)

      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()

      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `documento_firmado_${item?.id}_${firmaId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Documento descargado correctamente")
    } catch (error) {
      console.error("Error al descargar documento firmado:", error)
      toast.error("Error al descargar el documento firmado")
    }
  }

  // Modificar la función loadData para evitar crear autorizaciones duplicadas
  const loadData = async () => {
    // If auth is still loading, wait
    if (authLoading) return

    setIsLoading(true)
    try {
      // Intentar obtener los datos del documento desde la API
      const documentId = Number.parseInt(params.id)

      // Resetear estados cuando cambia el documento
      if (documentIdRef.current !== documentId) {
        setAuthorizationsProcessed(false)
        setIsProcessingAuthorizations(false)
        documentIdRef.current = documentId
      }

      try {
        // Primero intentar obtener el documento de la API
        const documentoCompleto = await documentoCompletoApi.getById(documentId)

        if (documentoCompleto) {
          // Convertir al formato esperado por el frontend
          const frontendDoc = documentoCompletoApi.mapToFrontendFormat(documentoCompleto)

          // Verificar permisos
          const hasPermission = checkPermissions(frontendDoc)

          if (hasPermission) {
            // Cargar autorizaciones usando la función mejorada
            const authorizations = await loadAuthorizationsForDocument(documentId, frontendDoc.type)
            frontendDoc.authorizations = authorizations

            // Calcular el estado del documento basado en las autorizaciones
            const initialDocumentStatus = calculateDocumentStatus(authorizations)
            frontendDoc.status = initialDocumentStatus

            setItem(frontendDoc)
            setEditableFields({
              header: frontendDoc.header,
              description: frontendDoc.description || "",
              notes: frontendDoc.notes || "",
              status: initialDocumentStatus,
              reviewer: frontendDoc.reviewer,
              limit_date: frontendDoc.limit_date,
            })
            setPermissionError(null)
            setIsLoading(false)

            // Cargar documentos firmados relacionados
            loadDocumentosFirmados()

            return
          }
        }
      } catch (apiError) {
        console.error("Error al obtener documento de la API:", apiError)
        // Continuar con el plan de respaldo
      }

      // Plan de respaldo: obtener datos de la API local
      console.log("Usando datos de respaldo de la API local")
      const response = await fetch("/api/documents")
      const allData = await response.json()

      // Encontrar el elemento con el ID correspondiente
      const foundItem = allData.find((item: any) => item.id === Number.parseInt(params.id))

      if (foundItem) {
        // Verificar permisos
        const hasPermission = checkPermissions(foundItem)

        if (hasPermission) {
          // Cargar autorizaciones usando la función mejorada
          const authorizations = await loadAuthorizationsForDocument(Number.parseInt(params.id), foundItem.type)
          foundItem.authorizations = authorizations

          // Calcular el estado del documento basado en las autorizaciones
          const initialDocumentStatus = calculateDocumentStatus(authorizations)
          foundItem.status = initialDocumentStatus

          setItem(foundItem)
          setEditableFields({
            header: foundItem.header,
            description: foundItem.description || "",
            notes: foundItem.notes || "",
            status: initialDocumentStatus,
            reviewer: foundItem.reviewer,
            limit_date: foundItem.limit_date,
          })
          setPermissionError(null)

          // Cargar documentos firmados relacionados
          loadDocumentosFirmados()
        } else {
          setItem(null)
        }
      } else {
        toast.error("Elemento no encontrado")
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  // Manejar el guardado de cambios (sin incluir status que es automático)
  const handleSave = async () => {
    if (!item) return

    setIsSaving(true)
    try {
      // Actualizar el item con los campos editables (sin status)
      const updatedItem = {
        ...item,
        header: editableFields.header,
        description: editableFields.description,
        notes: editableFields.notes,
        reviewer: editableFields.reviewer,
        limit_date: editableFields.limit_date,
        // El status se mantiene como está (automático)
      }

      // Enviar los cambios a la API
      const apiDocument = documentoCompletoApi.mapToApiFormat(updatedItem)
      await documentoCompletoApi.update(apiDocument)

      setItem(updatedItem)
      setIsEditing(false)
      toast.success("Cambios guardados correctamente")
    } catch (error) {
      console.error("Error al guardar cambios:", error)
      toast.error("Error al guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  // Manejar la adición de un nuevo enlace
  const handleAddLink = async () => {
    if (!item) return
    if (!newLink.title.trim() || !newLink.url.trim()) {
      toast.error("El título y la URL son obligatorios")
      return
    }

    try {
      // Crear un nuevo enlace temporal para la UI
      const newLinkItem = {
        id: `new-${Date.now()}`,
        title: newLink.title,
        url: newLink.url,
      }

      const updatedLinks = [...(item.links || []), newLinkItem]

      // Actualizar el estado local
      const updatedItem = {
        ...item,
        links: updatedLinks,
      }

      setItem(updatedItem)
      setNewLink({ title: "", url: "" })
      setShowNewLinkForm(false)

      // Crear el enlace en la API
      await fetch("/api/documents", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      })

      toast.success("Enlace añadido")
    } catch (error) {
      console.error("Error al añadir enlace:", error)
      toast.error("Error al añadir el enlace")
    }
  }

  // Manejar la eliminación de un enlace
  const handleDeleteLink = async (linkId: string) => {
    if (!item || !item.links) return

    try {
      const updatedLinks = item.links.filter((link) => link.id !== linkId)

      // Actualizar el estado local
      const updatedItem = {
        ...item,
        links: updatedLinks,
      }

      setItem(updatedItem)

      // Actualizar en la API
      await fetch("/api/documents", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedItem),
      })

      toast.success("Enlace eliminado")
    } catch (error) {
      console.error("Error al eliminar enlace:", error)
      toast.error("Error al eliminar el enlace")
    }
  }

  // Manejar cambios en el estado de autorización (MEJORADO)
  const handleAuthStatusChange = async (index: number, status: "approved" | "rejected" | "pending") => {
    if (!item || !item.authorizations) return

    try {
      const updatedAuths = [...item.authorizations]
      const authToUpdate = updatedAuths[index]

      console.log(`🔄 Iniciando actualización de autorización para ${authToUpdate.name} a estado: ${status}`)
      console.log(`📋 Datos actuales de la autorización:`, authToUpdate)

      updatedAuths[index] = {
        ...authToUpdate,
        status,
        date: status !== "pending" ? new Date().toISOString().split("T")[0] : "",
      }

      // Calcular el nuevo estado del documento automáticamente
      const newDocumentStatus = calculateDocumentStatus(updatedAuths)

      // Actualizar el estado local con el nuevo estado del documento
      const updatedItem = {
        ...item,
        authorizations: updatedAuths,
        status: newDocumentStatus,
      }

      setItem(updatedItem)

      // También actualizar los campos editables para reflejar el cambio
      setEditableFields((prev) => ({
        ...prev,
        status: newDocumentStatus,
      }))

      // IMPORTANTE: Actualizar el estado en la API de autorizaciones
      console.log(`🔄 Actualizando autorización para ${authToUpdate.name} a estado: ${status}`)

      try {
        // Intentar obtener la autorización específica por documento_id y nombre
        console.log(`🔍 Buscando autorización para documento ${item.id} y usuario ${authToUpdate.name}`)
        const authorizacion = await autorizacionApi.getByDocumentoIdAndNombre(item.id, authToUpdate.name)
        console.log(`📋 Autorización encontrada:`, authorizacion)

        if (authorizacion) {
          // Actualizar la autorización en la API usando PUT con el formato correcto
          const authToUpdate_API: AutorizacionModel = {
            id: authorizacion.id,
            documento_id: item.id,
            name: authToUpdate.name,
            role: authToUpdate.role,
            status,
            date: status !== "pending" ? new Date().toISOString().split("T")[0] : null,
          }

          console.log(`📤 Enviando autorización actualizada:`, authToUpdate_API)
          const updatedAuth = await autorizacionApi.update(authToUpdate_API)
          console.log(`✅ Autorización actualizada para ${authToUpdate.name}:`, updatedAuth)
        } else {
          console.log(`📝 No se encontró autorización para ${authToUpdate.name}, creando nueva`)

          // Si no existe, crear una nueva autorización
          const newAuth: AutorizacionModel = {
            documento_id: item.id,
            name: authToUpdate.name,
            role: authToUpdate.role,
            status,
            date: status !== "pending" ? new Date().toISOString().split("T")[0] : null,
          }

          console.log(`📤 Creando nueva autorización:`, newAuth)
          const createdAuth = await autorizacionApi.create(newAuth)
          console.log(`✅ Nueva autorización creada:`, createdAuth)
        }

        // IMPORTANTE: Actualizar también el estado del documento usando PUT /documentos/
        console.log(`🔄 Actualizando estado del documento a: ${newDocumentStatus}`)

        const documentoToUpdate: DocumentoModel = {
          id: item.id,
          header: item.header,
          type: item.type || null,
          status: newDocumentStatus, // Usar el nuevo estado calculado
          target: item.target ? Number.parseInt(item.target.toString()) : null,
          limit: item.limit ? Number.parseInt(item.limit.toString()) : null,
          limit_date: item.limit_date,
          reviewer: item.reviewer || null,
          description: item.description || null,
        }

        console.log(`📤 Enviando documento actualizado:`, documentoToUpdate)
        const updatedDocument = await documentoApi.update(documentoToUpdate)
        console.log(`✅ Estado del documento actualizado:`, updatedDocument)
      } catch (error) {
        console.error(`❌ Error al actualizar autorización para ${authToUpdate.name}:`, error)
        throw error // Re-lanzar el error para que se maneje abajo
      }

      toast.success(
        `Autorización ${status === "approved" ? "aprobada" : status === "rejected" ? "rechazada" : "pendiente"}. Estado del documento: ${newDocumentStatus}`,
      )

      // Si se aprobó o rechazó, actualizar la lista de documentos firmados
      if (status === "approved" || status === "rejected") {
        // Esperar un poco antes de recargar para que la API procese la firma
        setTimeout(() => {
          loadDocumentosFirmados()
        }, 2000)
      }
    } catch (error) {
      console.error("❌ Error al actualizar autorización:", error)
      toast.error("Error al actualizar la autorización")
    }
  }

  // Función simplificada para firmar el documento (sin subida de archivos)
  const handleSignDocument = async () => {
    if (!item || !user || currentAuthIndex === null) return

    setSigningDocument(true)
    try {
      console.log("🔐 Iniciando proceso de firma digital para usuario:", user.name)

      // Obtener todos los account_access para debugging
      const allAccessData = await accountAccessApi.getAll()
      console.log("📋 Todos los account_access disponibles:", allAccessData)

      // Buscar el account_access del usuario actual con la nueva función
      const userAccess = await accountAccessApi.getByUserName(user.name)

      if (!userAccess) {
        console.error(`❌ No se encontró acceso de firma digital para ${user.name}`)
        toast.error(`No se encontró acceso de firma digital para ${user.name}. Contacte al administrador.`)
        return
      }

      console.log("🔑 Usando Access ID:", userAccess.id, "para usuario:", user.name)
      console.log("📄 Documento ID:", item.id)

      // Llamar al endpoint de firma automatizada
      console.log("📤 Enviando solicitud de firma con:", {
        account_access_id: userAccess.id,
        documento_id: item.id,
      })

      const signResponse = await digitalSignatureApi.signDocument({
        account_access_id: userAccess.id,
        documento_id: item.id,
      })

      console.log("✅ Respuesta de firma:", signResponse)

      // IMPORTANTE: Actualizar el estado de la autorización a "approved" en la API
      console.log("🔄 Actualizando autorización después de firmar...")
      await handleAuthStatusChange(currentAuthIndex, "approved")

      // Esperar un poco más para que la API procese todos los cambios
      setTimeout(() => {
        loadDocumentosFirmados()
        // También recargar las autorizaciones para ver el cambio
        loadData()
      }, 3000)

      // Cerrar el dialog y limpiar estados
      setShowSignDialog(false)
      setCurrentAuthIndex(null)

      toast.success("Documento firmado exitosamente y autorización actualizada")
    } catch (error) {
      console.error("❌ Error al firmar documento:", error)
      toast.error(error instanceof Error ? error.message : "Error al firmar el documento")
    } finally {
      setSigningDocument(false)
    }
  }

  // Función para rechazar directamente (sin firmar)
  const handleRejectDocument = async (authIndex: number) => {
    if (!item || !user) return

    try {
      console.log("❌ Rechazando documento para usuario:", user.name)

      // Actualizar el estado de la autorización a "rejected"
      await handleAuthStatusChange(authIndex, "rejected")

      toast.success("Documento rechazado correctamente")
    } catch (error) {
      console.error("❌ Error al rechazar documento:", error)
      toast.error("Error al rechazar el documento")
    }
  }

  // Función para abrir el dialog de firma
  const openSignDialog = (authIndex: number) => {
    setCurrentAuthIndex(authIndex)
    setShowSignDialog(true)
  }

  // Función para obtener el ícono de estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2Icon className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      case "pending":
        return <ClockIcon className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircleIcon className="h-4 w-4 text-gray-400" />
    }
  }

  // Función para obtener el color del badge de estado
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Completado":
        return "default" // Verde
      case "En Proceso":
        return "secondary" // Azul
      case "Rechazado":
        return "destructive" // Rojo
      case "No Iniciado":
        return "outline" // Gris
      default:
        return "outline"
    }
  }

  // Función para obtener el ícono del estado del documento
  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case "Completado":
        return <CheckCircle2Icon className="h-4 w-4" />
      case "En Proceso":
        return <ClockIcon className="h-4 w-4" />
      case "Rechazado":
        return <XCircleIcon className="h-4 w-4" />
      case "No Iniciado":
        return <AlertCircleIcon className="h-4 w-4" />
      default:
        return <AlertCircleIcon className="h-4 w-4" />
    }
  }

  // Cargar datos cuando el componente se monta o cuando cambia la autenticación
  React.useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [params.id, authLoading, user])

  // Mostrar loading mientras se cargan los datos de autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Mostrar error de permisos si el usuario no tiene acceso
  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <ShieldAlertIcon className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="text-gray-600 text-center max-w-md">{permissionError}</p>
        <Button onClick={() => router.push("/dashboard")} variant="outline">
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <AlertCircleIcon className="h-16 w-16 text-gray-400" />
        <h1 className="text-2xl font-bold">Documento no encontrado</h1>
        <Button onClick={() => router.push("/dashboard")} variant="outline">
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  // Agregar un botón para verificar el account_access del usuario actual
  const checkUserAccess = async () => {
    if (!user) return

    try {
      toast.info(`Verificando acceso para ${user.name}...`)
      const userAccess = await accountAccessApi.getByUserName(user.name)

      if (userAccess) {
        toast.success(`Acceso encontrado para ${user.name}. ID: ${userAccess.id}`)
        console.log("✅ Datos de acceso:", userAccess)
      } else {
        toast.error(`No se encontró acceso para ${user.name}`)
        console.log("❌ No se encontró acceso para el usuario")
      }
    } catch (error) {
      console.error("Error al verificar acceso:", error)
      toast.error("Error al verificar acceso")
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold">{item.header}</h1>
            <Badge variant={getStatusBadgeVariant(item.status)} className="flex items-center space-x-1">
              {getDocumentStatusIcon(item.status)}
              <span>{item.status}</span>
            </Badge>
          </div>
          <p className="text-muted-foreground">ID: {item.id}</p>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SaveIcon className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <PencilIcon className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Tabs (sin la pestaña de Firmas) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="authorizations">
            Autorizaciones
            {item.authorizations && (
              <Badge variant="secondary" className="ml-2">
                {item.authorizations.filter((auth) => auth.status === "approved").length}/{item.authorizations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="links">
            Enlaces
            {item.links && (
              <Badge variant="secondary" className="ml-2">
                {item.links.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="signatures">
            Documentos Firmados
            <Badge variant="secondary" className="ml-2">
              {documentosFirmados.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Tab: General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="header">Título</Label>
                  {isEditing ? (
                    <Input
                      id="header"
                      value={editableFields.header}
                      onChange={(e) => setEditableFields({ ...editableFields, header: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{item.header}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <p className="text-sm">{item.type}</p>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(item.status)} className="flex items-center space-x-1">
                      {getDocumentStatusIcon(item.status)}
                      <span>{item.status}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">(Calculado automáticamente)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reviewer">Revisor</Label>
                  {isEditing ? (
                    <Input
                      id="reviewer"
                      value={editableFields.reviewer}
                      onChange={(e) => setEditableFields({ ...editableFields, reviewer: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{item.reviewer}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Objetivo</Label>
                  <p className="text-sm">{item.target}</p>
                </div>

                <div className="space-y-2">
                  <Label>Límite</Label>
                  <p className="text-sm">{item.limit}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="limit_date">Fecha Límite</Label>
                  {isEditing ? (
                    <Input
                      id="limit_date"
                      type="date"
                      value={editableFields.limit_date}
                      onChange={(e) => setEditableFields({ ...editableFields, limit_date: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.limit_date}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={editableFields.description}
                    onChange={(e) => setEditableFields({ ...editableFields, description: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm">{item.description || "Sin descripción"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                {isEditing ? (
                  <Textarea
                    id="notes"
                    value={editableFields.notes}
                    onChange={(e) => setEditableFields({ ...editableFields, notes: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm">{item.notes || "Sin notas"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Autorizaciones */}
        <TabsContent value="authorizations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ShieldIcon className="h-5 w-5" />
                  <span>Autorizaciones Requeridas</span>
                </CardTitle>
                {user && (
                  <Button onClick={checkUserAccess} variant="outline" size="sm">
                    Verificar Mi Acceso
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {item.authorizations && item.authorizations.length > 0 ? (
                <div className="space-y-3">
                  {item.authorizations.map((auth, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(auth.status)}
                        <div>
                          <p className="font-medium">{auth.name}</p>
                          <p className="text-sm text-muted-foreground">{auth.role}</p>
                          {auth.date && <p className="text-xs text-muted-foreground">Fecha: {auth.date}</p>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Solo mostrar controles si el usuario actual es el que debe autorizar */}
                        {user && auth.name === user.name && auth.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSignDialog(index)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <ShieldIcon className="h-4 w-4 mr-1" />
                              Firmar y Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectDocument(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </>
                        )}
                        {/* Mostrar estado actual */}
                        <Badge
                          variant={
                            auth.status === "approved"
                              ? "default"
                              : auth.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {auth.status === "approved"
                            ? "Aprobado"
                            : auth.status === "rejected"
                              ? "Rechazado"
                              : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay autorizaciones configuradas</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Enlaces */}
        <TabsContent value="links" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <LinkIcon className="h-5 w-5" />
                  <span>Enlaces Relacionados</span>
                </CardTitle>
                <Button onClick={() => setShowNewLinkForm(true)} size="sm">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Añadir Enlace
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Formulario para nuevo enlace */}
              {showNewLinkForm && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      placeholder="Título del enlace"
                      value={newLink.title}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    />
                    <Input
                      placeholder="URL del enlace"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleAddLink} size="sm">
                      Añadir
                    </Button>
                    <Button onClick={() => setShowNewLinkForm(false)} variant="outline" size="sm">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de enlaces */}
              {item.links && item.links.length > 0 ? (
                <div className="space-y-3">
                  {item.links.map((link) => (
                    <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{link.title}</p>
                          <p className="text-sm text-muted-foreground">{link.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLinkIcon className="h-4 w-4 mr-1" />
                            Abrir
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLink(link.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay enlaces configurados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos Firmados (mejorado para mostrar TODAS las firmas) */}
        <TabsContent value="signatures" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FileIcon className="h-5 w-5" />
                  <span>Documentos Firmados</span>
                </CardTitle>
                <div className="flex space-x-2">
                  <Button
                    onClick={loadDocumentosFirmados}
                    variant="outline"
                    size="sm"
                    disabled={loadingDocumentosFirmados}
                  >
                    {loadingDocumentosFirmados ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <DownloadIcon className="h-4 w-4 mr-2" />
                    )}
                    Actualizar
                  </Button>
                  <Button onClick={testDocumentosFirmadosEndpoint} variant="outline" size="sm">
                    🧪 Test API
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDocumentosFirmados ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Cargando documentos firmados...</span>
                </div>
              ) : documentosFirmados.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-4">
                    Mostrando todas las firmas para este documento (de todos los usuarios autorizados)
                  </div>
                  {documentosFirmados.map((firma, index) => (
                    <div key={firma.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Documento Firmado #{firma.id}</p>
                          <p className="text-sm text-muted-foreground">URL: {firma.url_firma}</p>
                          <p className="text-xs text-muted-foreground">Documento ID: {firma.id_documentos}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <a href={firma.url_firma} target="_blank" rel="noopener noreferrer">
                            <ExternalLinkIcon className="h-4 w-4 mr-1" />
                            Ver
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadSignedDocument(firma.url_firma, firma.id || 0)}
                        >
                          <DownloadIcon className="h-4 w-4 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos firmados disponibles</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Los documentos aparecerán aquí después de ser firmados digitalmente por cualquier usuario autorizado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog simplificado para confirmación de firma */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ShieldIcon className="h-5 w-5" />
              <span>Confirmar Firma Digital</span>
            </DialogTitle>
            <DialogDescription>¿Estás seguro de que quieres firmar este documento digitalmente?</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información del documento */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{item?.header}</p>
              <p className="text-sm text-muted-foreground">ID: {item?.id}</p>
            </div>

            {/* Warning de confirmación */}
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <strong>Proceso automatizado:</strong> El sistema utilizará automáticamente tus claves criptográficas
                para firmar el documento. Esta acción no se puede deshacer y actualizará tu autorización a "aprobada".
              </AlertDescription>
            </Alert>

            {/* Información adicional */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• La firma se realizará automáticamente con tus credenciales</p>
              <p>• El documento firmado se guardará en Azure Blob Storage</p>
              <p>• Tu autorización se marcará como "aprobada" automáticamente</p>
              <p>• El estado del documento se actualizará según las autorizaciones</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSignDocument} disabled={signingDocument}>
              {signingDocument ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Firmando...
                </>
              ) : (
                <>
                  <ShieldIcon className="h-4 w-4 mr-2" />
                  Confirmar Firma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
