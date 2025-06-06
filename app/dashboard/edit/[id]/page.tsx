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
  UploadIcon,
  FileIcon,
  DownloadIcon,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { schema } from "@/components/data-table"
import type { z } from "zod"
import { useAuth } from "@/contexts/auth-provider"
import { documentoCompletoApi, digitalSignatureApi, type DocumentoFirmado } from "@/lib/api-service"
import { accountDetailsApi } from "@/lib/api-service"
import { autorizacionApi } from "@/lib/api-service"

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

  // Estados para firma digital
  const [signingDocument, setSigningDocument] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [showSignDialog, setShowSignDialog] = React.useState(false)
  const [currentAuthIndex, setCurrentAuthIndex] = React.useState<number | null>(null)
  const [dragActive, setDragActive] = React.useState(false)

  // Estado para documentos firmados
  const [documentosFirmados, setDocumentosFirmados] = React.useState<DocumentoFirmado[]>([])
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

  // Función para limpiar duplicados existentes
  const cleanupDuplicateAuthorizations = async (documentId: number) => {
    try {
      console.log(`🧹 Limpiando duplicados para documento ${documentId}`)
      const allAuths = await autorizacionApi.getByDocumentoId(documentId)

      if (!allAuths || allAuths.length === 0) {
        console.log("✅ No hay autorizaciones para limpiar")
        return []
      }

      // Agrupar por nombre para encontrar duplicados
      const authsByName = new Map()
      const duplicatesToDelete = []

      for (const auth of allAuths) {
        const key = `${auth.name}-${auth.role}`

        if (authsByName.has(key)) {
          // Es un duplicado, marcarlo para eliminación
          // Mantener el que tenga un estado diferente a "pending" o el más reciente
          const existing = authsByName.get(key)

          if (existing.status === "pending" && auth.status !== "pending") {
            // El nuevo tiene un estado más avanzado, eliminar el existente
            duplicatesToDelete.push(existing)
            authsByName.set(key, auth)
          } else if (auth.status === "pending" && existing.status !== "pending") {
            // El existente tiene un estado más avanzado, eliminar el nuevo
            duplicatesToDelete.push(auth)
          } else {
            // Ambos tienen el mismo tipo de estado, mantener el que tenga ID menor (más antiguo)
            if (auth.id && existing.id && auth.id > existing.id) {
              duplicatesToDelete.push(auth)
            } else {
              duplicatesToDelete.push(existing)
              authsByName.set(key, auth)
            }
          }
        } else {
          authsByName.set(key, auth)
        }
      }

      // Eliminar duplicados
      if (duplicatesToDelete.length > 0) {
        console.log(
          `🗑️ Eliminando ${duplicatesToDelete.length} duplicados:`,
          duplicatesToDelete.map((d) => `${d.name} (ID: ${d.id})`),
        )

        for (const duplicate of duplicatesToDelete) {
          try {
            // Nota: Necesitarías implementar un endpoint DELETE en tu API
            // Por ahora, solo logueamos lo que se debería eliminar
            console.log(`❌ Debería eliminar: ${duplicate.name} (ID: ${duplicate.id})`)
            // await autorizacionApi.delete(duplicate.id)
          } catch (error) {
            console.error(`Error eliminando duplicado ${duplicate.id}:`, error)
          }
        }
      }

      // Retornar las autorizaciones únicas
      const uniqueAuths = Array.from(authsByName.values())
      console.log(`✅ Autorizaciones únicas después de limpieza: ${uniqueAuths.length}`)

      return uniqueAuths
    } catch (error) {
      console.error("❌ Error limpiando duplicados:", error)
      return []
    }
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
      const existingAuths = await autorizacionApi.getByDocumentoId(documentId)
      return existingAuths.map((auth) => ({
        name: auth.name,
        role: auth.role,
        status: auth.status || "pending",
        date: auth.date || "",
      }))
    }

    setIsProcessingAuthorizations(true)

    try {
      console.log(`🔍 Cargando autorizaciones para documento ${documentId}`)

      // Primero limpiar duplicados existentes
      const cleanedAuths = await cleanupDuplicateAuthorizations(documentId)

      if (cleanedAuths.length > 0) {
        console.log(`✅ Usando ${cleanedAuths.length} autorizaciones existentes (después de limpieza)`)
        setAuthorizationsProcessed(true)
        documentIdRef.current = documentId

        return cleanedAuths.map((auth) => ({
          name: auth.name,
          role: auth.role,
          status: auth.status || "pending",
          date: auth.date || "",
        }))
      }

      // Si no hay autorizaciones existentes, crear nuevas (solo una vez)
      console.log(`📝 Creando nuevas autorizaciones para documento ${documentId}`)
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

        // Crear autorizaciones una por una para evitar condiciones de carrera
        for (const user of authorizedUsers) {
          try {
            // Verificar una vez más que no existe antes de crear
            const existingAuth = await autorizacionApi.getByDocumentoIdAndNombre(documentId, user.name)

            if (!existingAuth) {
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
              console.log(`⚠️ Autorización ya existe para ${user.name}, saltando creación`)
              newAuthorizations.push({
                name: existingAuth.name,
                role: existingAuth.role,
                status: existingAuth.status || "pending",
                date: existingAuth.date || "",
              })
            }
          } catch (authError) {
            console.error(`❌ Error al crear autorización para usuario ${user.name}:`, authError)
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

  // Cargar documentos firmados relacionados con este documento
  const loadDocumentosFirmados = async () => {
    if (!item) return

    setLoadingDocumentosFirmados(true)
    try {
      console.log("🔍 Cargando documentos firmados para documento ID:", item.id)
      const allDocumentosFirmados = await digitalSignatureApi.getDocumentosFirmados()

      console.log("📄 Respuesta completa de documentos firmados:", allDocumentosFirmados)
      console.log("📄 Tipo de respuesta:", typeof allDocumentosFirmados)
      console.log("📄 Es array:", Array.isArray(allDocumentosFirmados))

      // Verificar que la respuesta sea un array
      if (!Array.isArray(allDocumentosFirmados)) {
        console.warn("⚠️ La respuesta no es un array:", typeof allDocumentosFirmados, allDocumentosFirmados)

        // Si la respuesta tiene una propiedad que contiene el array, usarla
        if (allDocumentosFirmados && typeof allDocumentosFirmados === "object") {
          // Buscar propiedades que podrían contener el array
          const possibleArrays = Object.values(allDocumentosFirmados).filter(Array.isArray)
          if (possibleArrays.length > 0) {
            console.log("✅ Encontrado array en la respuesta:", possibleArrays[0])
            setDocumentosFirmados(possibleArrays[0] as DocumentoFirmado[])
            return
          }
        }

        // Si no es un array válido, usar array vacío
        console.log("❌ No se pudo procesar la respuesta, usando array vacío")
        setDocumentosFirmados([])
        return
      }

      console.log(`📋 Total de documentos firmados encontrados: ${allDocumentosFirmados.length}`)

      // Mostrar todos los archivos para debugging
      allDocumentosFirmados.forEach((doc, index) => {
        console.log(`📄 Archivo ${index + 1}:`, doc.filename || doc)
      })

      // Filtrar documentos relacionados con este documento
      const documentId = item.id.toString()
      console.log(`🔍 Buscando documentos para documento ID: ${documentId}`)

      const filteredDocumentos = allDocumentosFirmados.filter((doc) => {
        const filename = doc.filename || doc

        // Patrones de búsqueda más amplios basados en el formato real
        const patterns = [
          `_${documentId}_`, // formato: original-Usuario_43_fecha.pdf
          `-${documentId}_`, // formato: original-Usuario-43_fecha.pdf
          `documento_${documentId}`, // formato: documento_43_...
          `doc${documentId}`, // formato: doc43_...
          `id${documentId}`, // formato: id43_...
          `${documentId}.pdf`, // formato: ...43.pdf
          `${documentId}_`, // formato: ...43_...
        ]

        const matchesAny = patterns.some((pattern) => filename.includes(pattern))

        console.log(`📋 Archivo: ${filename}`)
        console.log(`   - Patrones probados: ${patterns.join(", ")}`)
        console.log(`   - Coincide: ${matchesAny}`)

        return matchesAny
      })

      console.log(`✅ Documentos filtrados para documento ${documentId}: ${filteredDocumentos.length}`)

      if (filteredDocumentos.length === 0) {
        console.log("🔍 No se encontraron coincidencias. Mostrando todos los documentos para debugging:")
        allDocumentosFirmados.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.filename || doc}`)
        })

        // Para debugging, también mostrar documentos que contengan cualquier número
        const anyNumberDocs = allDocumentosFirmados.filter((doc) => {
          const filename = doc.filename || doc
          return /\d+/.test(filename) // Cualquier archivo que contenga números
        })

        console.log(`🔍 Documentos con números (para debugging): ${anyNumberDocs.length}`)
        anyNumberDocs.forEach((doc, index) => {
          console.log(`   ${index + 1}. ${doc.filename || doc}`)
        })
      }

      setDocumentosFirmados(filteredDocumentos)
    } catch (error) {
      console.error("❌ Error al cargar documentos firmados:", error)

      // Mostrar más detalles del error
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }

      // En caso de error, usar array vacío
      setDocumentosFirmados([])

      // Mostrar toast de error para debugging
      toast.error(
        `Error al cargar documentos firmados: ${error instanceof Error ? error.message : "Error desconocido"}`,
      )
    } finally {
      setLoadingDocumentosFirmados(false)
    }
  }

  // Función para probar manualmente el endpoint
  const testDocumentosFirmadosEndpoint = async () => {
    try {
      console.log("🧪 Probando endpoint manualmente...")
      const response = await fetch("http://127.0.0.1:8000/documentos_firmados/")
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
      }
    } catch (error) {
      console.error("🧪 Error en prueba manual:", error)
    }
  }

  // Descargar documento firmado
  const handleDownloadSignedDocument = async (filename: string) => {
    try {
      const blob = await digitalSignatureApi.downloadDocumentoFirmado(filename)

      // Crear un enlace temporal para descargar el archivo
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
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

  // Manejar cambios en el estado de autorización
  const handleAuthStatusChange = async (index: number, status: "approved" | "rejected" | "pending") => {
    if (!item || !item.authorizations) return

    try {
      const updatedAuths = [...item.authorizations]
      const authToUpdate = updatedAuths[index]

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

      // Buscar la autorización específica en la API usando el nuevo endpoint
      if (user) {
        try {
          // Intentar obtener la autorización específica por documento_id y nombre
          const authorizacion = await autorizacionApi.getByDocumentoIdAndNombre(item.id, authToUpdate.name)

          if (authorizacion) {
            // Actualizar la autorización en la API
            await autorizacionApi.update({
              id: authorizacion.id,
              documento_id: item.id,
              name: authToUpdate.name,
              role: authToUpdate.role,
              status,
              date: status !== "pending" ? new Date().toISOString().split("T")[0] : null,
            })

            console.log(`Autorización actualizada para ${authToUpdate.name} en documento ${item.id}`)
          } else {
            console.log(`No se encontró autorización para ${authToUpdate.name} en documento ${item.id}, creando nueva`)

            // Si no existe, crear una nueva autorización
            await autorizacionApi.create({
              documento_id: item.id,
              name: authToUpdate.name,
              role: authToUpdate.role,
              status,
              date: status !== "pending" ? new Date().toISOString().split("T")[0] : null,
            })
          }

          // Actualizar el estado del documento en la API
          const apiDocument = documentoCompletoApi.mapToApiFormat(updatedItem)
          await documentoCompletoApi.update(apiDocument)
          console.log(`Estado del documento actualizado a: ${newDocumentStatus}`)
        } catch (error) {
          console.error(`Error al actualizar autorización para ${authToUpdate.name}:`, error)

          // Plan de respaldo: actualizar usando el método tradicional
          await autorizacionApi.update({
            id: null,
            documento_id: item.id,
            name: authToUpdate.name,
            role: authToUpdate.role,
            status,
            date: status !== "pending" ? new Date().toISOString().split("T")[0] : null,
          })
        }
      }

      toast.success(
        `Autorización ${status === "approved" ? "aprobada" : status === "rejected" ? "rechazada" : "pendiente"}. Estado del documento: ${newDocumentStatus}`,
      )

      // Si se aprobó o rechazó, actualizar la lista de documentos firmados
      if (status === "approved" || status === "rejected") {
        loadDocumentosFirmados()
      }
    } catch (error) {
      console.error("Error al actualizar autorización:", error)
      toast.error("Error al actualizar la autorización")
    }
  }

  // Función para manejar la subida del archivo .pem
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.name.endsWith(".pem") || file.type === "application/x-pem-file" || file.type === "") {
        setSelectedFile(file)
        toast.success(`Archivo ${file.name} seleccionado`)
      } else {
        toast.error("Por favor selecciona un archivo .pem válido")
        event.target.value = ""
      }
    }
  }

  // Función para manejar drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith(".pem")) {
        setSelectedFile(file)
        toast.success(`Archivo ${file.name} seleccionado`)
      } else {
        toast.error("Por favor selecciona un archivo .pem válido")
      }
    }
  }

  // Función para firmar el documento
  const handleSignDocument = async () => {
    if (!item || !selectedFile || !user || currentAuthIndex === null) return

    setSigningDocument(true)
    try {
      // Leer el contenido del archivo .pem
      const fileContent = await selectedFile.text()

      // Buscar el account_access_id del usuario actual
      const accountAccessResponse = await fetch("/api/account-access")
      const accountAccessData = await accountAccessResponse.json()

      // Encontrar el acceso del usuario actual basado en el nombre
      const userAccess = accountAccessData.find(
        (access: any) => access.signer_name === user.name || access.signer_name.includes(user.name.split(" ")[0]),
      )

      if (!userAccess) {
        toast.error("No se encontró acceso de firma digital para tu usuario")
        return
      }

      console.log("🔐 Iniciando proceso de firma digital...")
      console.log("📄 Documento ID:", item.id)
      console.log("👤 Usuario:", user.name)
      console.log("🔑 Access ID:", userAccess.id)

      // Llamar al endpoint de firma
      const signResponse = await fetch("/api/sign-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_access_id: userAccess.id,
          documento_id: item.id,
          public_key_pem: fileContent,
        }),
      })

      if (!signResponse.ok) {
        const errorData = await signResponse.json()
        throw new Error(errorData.message || "Error al firmar el documento")
      }

      const signatureResult = await signResponse.json()
      console.log("✅ Documento firmado exitosamente:", signatureResult)

      // Actualizar el estado de la autorización a "approved"
      await handleAuthStatusChange(currentAuthIndex, "approved")

      // Cerrar el dialog y limpiar estados
      setShowSignDialog(false)
      setSelectedFile(null)
      setCurrentAuthIndex(null)

      // Actualizar la lista de documentos firmados después de un pequeño delay
      setTimeout(() => {
        loadDocumentosFirmados()
      }, 1000)

      toast.success("🎉 Documento firmado exitosamente")
    } catch (error) {
      console.error("❌ Error al firmar documento:", error)
      toast.error(`Error al firmar el documento: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setSigningDocument(false)
    }
  }

  // Función para iniciar el proceso de firma
  const startSigningProcess = (authIndex: number) => {
    setCurrentAuthIndex(authIndex)
    setShowSignDialog(true)
    setSelectedFile(null)
  }

  // Función para verificar si el usuario actual puede modificar una autorización específica
  const canModifyAuthorization = (authName: string) => {
    if (!user) return false

    // El usuario solo puede modificar su propia autorización
    return user.name === authName || authName.includes(user.name.split(" ")[0])
  }

  // Renderizar el estado con el icono correspondiente
  const renderStatus = (status: string) => {
    switch (status) {
      case "Completado":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
          >
            <CheckCircle2Icon className="h-3.5 w-3.5" />
            {status}
          </Badge>
        )
      case "En Proceso":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {status}
          </Badge>
        )
      case "No Iniciado":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          >
            <AlertCircleIcon className="h-3.5 w-3.5" />
            {status}
          </Badge>
        )
      case "Rechazado":
        return (
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          >
            <XCircleIcon className="h-3.5 w-3.5" />
            {status}
          </Badge>
        )
      default:
        return status
    }
  }

  // Renderizar el estado de autorización
  const renderAuthStatus = (status: string, date: string) => {
    switch (status) {
      case "approved":
        return (
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="h-5 w-5 text-green-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-green-600">Aprobado</span>
              {date && <span className="text-xs text-muted-foreground">{date}</span>}
            </div>
          </div>
        )
      case "rejected":
        return (
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-5 w-5 text-red-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-red-600">Rechazado</span>
              {date && <span className="text-xs text-muted-foreground">{date}</span>}
            </div>
          </div>
        )
      case "pending":
        return (
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">Pendiente</span>
          </div>
        )
      default:
        return null
    }
  }

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (e) {
      return dateString
    }
  }

  React.useEffect(() => {
    loadData()
  }, [params.id, authLoading])

  // Resetear estados cuando cambia el ID del documento
  React.useEffect(() => {
    const newDocumentId = Number.parseInt(params.id)
    if (documentIdRef.current !== newDocumentId) {
      setAuthorizationsProcessed(false)
      setIsProcessingAuthorizations(false)
      documentIdRef.current = newDocumentId
    }
  }, [params.id])

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando documento...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!item || permissionError) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <ShieldAlertIcon className="mb-2 h-10 w-10 text-destructive" />
              <h3 className="mb-2 text-lg font-medium">Acceso denegado</h3>
              <p className="text-center text-sm text-muted-foreground">
                {permissionError || "No tienes permisos para ver este documento."}
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                Volver al dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="container mx-auto max-w-5xl py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? (
                <Input
                  value={editableFields.header}
                  onChange={(e) => setEditableFields({ ...editableFields, header: e.target.value })}
                  className="max-w-md text-2xl font-bold"
                />
              ) : (
                item.header
              )}
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <Badge variant="outline" className="px-1.5 text-muted-foreground">
                {item.type}
              </Badge>
              <div className="flex items-center gap-2">
                {renderStatus(item.status)}
                {isEditing && <span className="text-xs text-muted-foreground">(Automático)</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="mr-2 h-4 w-4" />
                      Guardar
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => router.push("/dashboard")} variant="outline" className="mr-2">
                  Volver al Dashboard
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="links">Enlaces ({item.links?.length || 0})</TabsTrigger>
            <TabsTrigger value="authorizations">Autorizaciones</TabsTrigger>
            <TabsTrigger value="signed">Documentos Firmados ({documentosFirmados.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>ID</Label>
                    <div className="mt-1 rounded-md border p-2">{item.id}</div>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <div className="mt-1 rounded-md border p-2">{item.type}</div>
                  </div>
                  <div>
                    <Label>Fecha Límite</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editableFields.limit_date}
                        onChange={(e) => setEditableFields({ ...editableFields, limit_date: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 flex items-center gap-2 rounded-md border p-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {item.limit_date}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Revisor</Label>
                    {isEditing ? (
                      <Select
                        value={editableFields.reviewer}
                        onValueChange={(value) => setEditableFields({ ...editableFields, reviewer: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar revisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asignar revisor">Asignar revisor</SelectItem>
                          <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                          <SelectItem value="Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
                          <SelectItem value="Carlos Méndez">Carlos Méndez</SelectItem>
                          <SelectItem value="María García">María García</SelectItem>
                          <SelectItem value="Laura Sánchez">Laura Sánchez</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1 rounded-md border p-2">{item.reviewer}</div>
                    )}
                  </div>
                  {item.target && (
                    <div>
                      <Label>Objetivo</Label>
                      <div className="mt-1 rounded-md border p-2">{item.target}</div>
                    </div>
                  )}
                  {item.limit && (
                    <div>
                      <Label>Límite</Label>
                      <div className="mt-1 rounded-md border p-2">{item.limit}</div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label>Descripción</Label>
                  {isEditing ? (
                    <Textarea
                      value={editableFields.description}
                      onChange={(e) => setEditableFields({ ...editableFields, description: e.target.value })}
                      className="mt-1 min-h-[100px]"
                      placeholder="Añade una descripción del documento..."
                    />
                  ) : (
                    <div className="mt-1 min-h-[50px] rounded-md border p-2">
                      {item.description || <span className="text-muted-foreground">Sin descripción</span>}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notas</Label>
                  {isEditing ? (
                    <Textarea
                      value={editableFields.notes}
                      onChange={(e) => setEditableFields({ ...editableFields, notes: e.target.value })}
                      className="mt-1 min-h-[100px]"
                      placeholder="Añade notas adicionales..."
                    />
                  ) : (
                    <div className="mt-1 min-h-[50px] rounded-md border p-2">
                      {item.notes || <span className="text-muted-foreground">Sin notas</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Enlaces a Documentos</CardTitle>
                {isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setShowNewLinkForm(!showNewLinkForm)}>
                    {showNewLinkForm ? "Cancelar" : "Añadir Enlace"}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {showNewLinkForm && isEditing && (
                  <div className="mb-4 space-y-3 rounded-md border p-3">
                    <div>
                      <Label htmlFor="link-title">Título del documento</Label>
                      <Input
                        id="link-title"
                        placeholder="Informe mensual, Presupuesto, etc."
                        value={newLink.title}
                        onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="link-url">URL del documento</Label>
                      <Input
                        id="link-url"
                        placeholder="https://organizacion-my.sharepoint.com/..."
                        value={newLink.url}
                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <Button onClick={handleAddLink} className="w-full">
                      Añadir Enlace
                    </Button>
                  </div>
                )}

                {item.links && item.links.length > 0 ? (
                  <div className="space-y-3">
                    {item.links.map((link) => (
                      <div key={link.id} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{link.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={link.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLinkIcon className="h-4 w-4" />
                            </a>
                          </Button>
                          {isEditing && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteLink(link.id)}>
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <LinkIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No hay enlaces añadidos</p>
                    {isEditing && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowNewLinkForm(true)}>
                        Añadir primer enlace
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authorizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="h-5 w-5" />
                  Autorizaciones Requeridas
                  {isProcessingAuthorizations && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.authorizations && item.authorizations.length > 0 ? (
                  <div className="space-y-4">
                    {item.authorizations.map((auth, index) => (
                      <div
                        key={`${auth.name}-${index}`}
                        className="flex items-center justify-between rounded-md border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-medium text-primary">
                              {auth.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{auth.name}</p>
                            <p className="text-sm text-muted-foreground">{auth.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {renderAuthStatus(auth.status, auth.date)}
                          {canModifyAuthorization(auth.name) && auth.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() => startSigningProcess(index)}
                              >
                                <ShieldIcon className="mr-1 h-4 w-4" />
                                Firmar Documento
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleAuthStatusChange(index, "rejected")}
                              >
                                <XCircleIcon className="mr-1 h-4 w-4" />
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ShieldIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No hay autorizaciones configuradas</p>
                    {isProcessingAuthorizations && (
                      <p className="text-xs text-muted-foreground mt-2">Cargando autorizaciones...</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signed" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileIcon className="h-5 w-5" />
                  Documentos Firmados
                </CardTitle>
                <Button variant="outline" size="sm" onClick={testDocumentosFirmadosEndpoint}>
                  🧪 Probar Endpoint
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDocumentosFirmados ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando documentos firmados...</span>
                  </div>
                ) : documentosFirmados.length > 0 ? (
                  <div className="space-y-3">
                    {documentosFirmados.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{doc.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              Creado: {formatDate(doc.created_at)} • Tamaño: {(doc.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadSignedDocument(doc.filename)}>
                          <DownloadIcon className="mr-1 h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No hay documentos firmados disponibles</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Los documentos aparecerán aquí después de ser firmados digitalmente
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={loadDocumentosFirmados}>
                      🔄 Recargar Lista
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog para firma digital */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-green-600" />
              Firmar Documento Digitalmente
            </DialogTitle>
            <DialogDescription>
              Para firmar este documento, necesitas subir tu archivo de clave pública (.pem). Este proceso verificará tu
              identidad y creará una firma digital válida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información del documento */}
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm font-medium">Documento a firmar:</p>
              <p className="text-sm text-muted-foreground">{item?.header}</p>
              {currentAuthIndex !== null && item?.authorizations && (
                <p className="text-sm text-muted-foreground">
                  Firmando como: {item.authorizations[currentAuthIndex]?.name}
                </p>
              )}
            </div>

            {/* Área de subida de archivo */}
            <div
              className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : selectedFile
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pem"
                onChange={handleFileUpload}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2Icon className="h-8 w-8 text-green-600" />
                  <p className="font-medium text-green-700">{selectedFile.name}</p>
                  <p className="text-sm text-green-600">Archivo .pem seleccionado correctamente</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">Arrastra tu archivo .pem aquí</p>
                  <p className="text-sm text-muted-foreground">o haz clic para seleccionar</p>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Importante:</strong> Tu archivo .pem contiene tu clave pública que se usará para verificar tu
                identidad. Este proceso es seguro y no compromete tu clave privada.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSignDialog(false)} disabled={signingDocument}>
              Cancelar
            </Button>
            <Button onClick={handleSignDocument} disabled={!selectedFile || signingDocument}>
              {signingDocument ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Firmando...
                </>
              ) : (
                <>
                  <ShieldIcon className="mr-2 h-4 w-4" />
                  Firmar Documento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
