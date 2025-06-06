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
import type { schema } from "@/components/data-table"
import type { z } from "zod"
import { useAuth } from "@/contexts/auth-provider"
import { documentoCompletoApi } from "@/lib/api-service"
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

  // Cargar datos del elemento
  React.useEffect(() => {
    const loadData = async () => {
      // If auth is still loading, wait
      if (authLoading) return

      setIsLoading(true)
      try {
        // Intentar obtener los datos del documento desde la API
        const documentId = Number.parseInt(params.id)

        try {
          // Primero intentar obtener el documento de la API
          const documentoCompleto = await documentoCompletoApi.getById(documentId)

          if (documentoCompleto) {
            // Convertir al formato esperado por el frontend
            const frontendDoc = documentoCompletoApi.mapToFrontendFormat(documentoCompleto)

            // Verificar permisos
            const hasPermission = checkPermissions(frontendDoc)

            if (hasPermission) {
              // Verificar si ya tiene autorizaciones
              const hasAuthorizations = frontendDoc.authorizations && frontendDoc.authorizations.length > 0

              // Solo cargar usuarios autorizados si no hay autorizaciones existentes
              if (!hasAuthorizations) {
                try {
                  const allUsers = await accountDetailsApi.getAll()
                  const authorizedUsers = allUsers.filter(
                    (user) =>
                      user.authorizacion === true &&
                      (user.type.toLowerCase() === frontendDoc.type.toLowerCase() ||
                        user.type.toLowerCase().includes(frontendDoc.type.toLowerCase())),
                  )

                  console.log(
                    `Encontrados ${authorizedUsers.length} usuarios autorizados para tipo ${frontendDoc.type}`,
                  )

                  // Si no hay autorizaciones, crear autorizaciones con usuarios autorizados
                  if (authorizedUsers.length > 0) {
                    frontendDoc.authorizations = authorizedUsers.map((user) => ({
                      name: user.name,
                      role: `Autorización ${frontendDoc.type}`,
                      status: "pending",
                      date: "",
                    }))

                    // Guardar estas autorizaciones en la API
                    for (const user of authorizedUsers) {
                      try {
                        await autorizacionApi.create({
                          documento_id: documentId,
                          name: user.name,
                          role: `Autorización ${frontendDoc.type}`,
                          status: "pending",
                          date: null,
                        })
                      } catch (authError) {
                        console.error(`Error al crear autorización para usuario ${user.name}:`, authError)
                      }
                    }
                  }
                } catch (usersError) {
                  console.error("Error al cargar usuarios autorizados:", usersError)
                }
              }

              setItem(frontendDoc)
              setEditableFields({
                header: frontendDoc.header,
                description: frontendDoc.description || "",
                notes: frontendDoc.notes || "",
                status: frontendDoc.status,
                reviewer: frontendDoc.reviewer,
                limit_date: frontendDoc.limit_date,
              })
              setPermissionError(null)
              setIsLoading(false)
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
            // Verificar si ya tiene autorizaciones
            const hasAuthorizations = foundItem.authorizations && foundItem.authorizations.length > 0

            // Solo intentar cargar usuarios autorizados si no hay autorizaciones existentes
            if (!hasAuthorizations) {
              try {
                const allUsers = await accountDetailsApi.getAll()
                const authorizedUsers = allUsers.filter(
                  (user) =>
                    user.authorizacion === true &&
                    (user.type.toLowerCase() === foundItem.type.toLowerCase() ||
                      user.type.toLowerCase().includes(foundItem.type.toLowerCase())),
                )

                // Si no hay autorizaciones, crear autorizaciones con usuarios autorizados
                if (authorizedUsers.length > 0) {
                  foundItem.authorizations = authorizedUsers.map((user) => ({
                    name: user.name,
                    role: `Autorización ${foundItem.type}`,
                    status: "pending",
                    date: "",
                  }))
                }
              } catch (usersError) {
                console.error("Error al cargar usuarios autorizados:", usersError)
              }
            }

            setItem(foundItem)
            setEditableFields({
              header: foundItem.header,
              description: foundItem.description || "",
              notes: foundItem.notes || "",
              status: foundItem.status,
              reviewer: foundItem.reviewer,
              limit_date: foundItem.limit_date,
            })
            setPermissionError(null)
          } else {
            // Si no tiene permisos, no establecer el item
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

    loadData()
  }, [params.id, router, user, userType, authLoading])

  // Manejar el guardado de cambios
  const handleSave = async () => {
    if (!item) return

    setIsSaving(true)
    try {
      // Actualizar el item con los campos editables
      const updatedItem = {
        ...item,
        header: editableFields.header,
        description: editableFields.description,
        notes: editableFields.notes,
        status: editableFields.status,
        reviewer: editableFields.reviewer,
        limit_date: editableFields.limit_date,
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

    // Verificar si el usuario tiene permisos de administrador
    if (!isAdmin) {
      toast.error("No tienes permisos para modificar autorizaciones")
      return
    }

    try {
      const updatedAuths = [...item.authorizations]
      updatedAuths[index] = {
        ...updatedAuths[index],
        status,
        date: status !== "pending" ? new Date().toISOString().split("T")[0] : "",
      }

      // Actualizar el estado local
      const updatedItem = {
        ...item,
        authorizations: updatedAuths,
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

      toast.success(
        `Autorización ${status === "approved" ? "aprobada" : status === "rejected" ? "rechazada" : "pendiente"}`,
      )
    } catch (error) {
      console.error("Error al actualizar autorización:", error)
      toast.error("Error al actualizar la autorización")
    }
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
              {isEditing ? (
                <Select
                  value={editableFields.status}
                  onValueChange={(value) => setEditableFields({ ...editableFields, status: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Iniciado">No Iniciado</SelectItem>
                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                renderStatus(item.status)
              )}
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
          <TabsList className="mb-4 grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="links">Enlaces ({item.links?.length || 0})</TabsTrigger>
            <TabsTrigger value="authorizations">Autorizaciones</TabsTrigger>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                            <span className="sr-only">Abrir enlace</span>
                          </Button>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <Trash2Icon className="h-4 w-4" />
                              <span className="sr-only">Eliminar enlace</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                    <p className="text-center text-muted-foreground">No hay enlaces asociados a este documento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authorizations" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Autorizaciones y Firmas</CardTitle>
                {!isAdmin && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    Solo administradores pueden modificar
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {item.authorizations && item.authorizations.length > 0 ? (
                  <div className="space-y-4">
                    {item.authorizations.map((auth, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">{auth.name}</p>
                          <p className="text-sm text-muted-foreground">{auth.role}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && isEditing ? (
                            <div className="flex gap-2">
                              <Button
                                variant={auth.status === "approved" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleAuthStatusChange(index, "approved")}
                              >
                                <CheckCircle2Icon className="mr-1 h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button
                                variant={auth.status === "rejected" ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => handleAuthStatusChange(index, "rejected")}
                              >
                                <XCircleIcon className="mr-1 h-4 w-4" />
                                Rechazar
                              </Button>
                              {auth.status !== "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAuthStatusChange(index, "pending")}
                                >
                                  <ClockIcon className="mr-1 h-4 w-4" />
                                  Pendiente
                                </Button>
                              )}
                            </div>
                          ) : (
                            renderAuthStatus(auth.status, auth.date)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                    <p className="text-center text-muted-foreground">
                      No hay autorizaciones registradas para este documento
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
