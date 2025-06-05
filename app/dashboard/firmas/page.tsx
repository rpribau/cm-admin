"use client"

import { useEffect, useState } from "react"
import { Loader2, PlusIcon, UserIcon, KeyIcon, ShieldCheckIcon, EyeIcon, EyeOffIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ProtectedRoute } from "@/components/protected-route"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  accountDetailsApi,
  accountAccessApi,
  type AccountDetailsCreate,
  type AccountDetailsResponse,
  type AccountAccessCreate,
  type AccountAccessResponse,
} from "@/lib/api-service"

export default function FirmasPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [accountDetails, setAccountDetails] = useState<AccountDetailsResponse[]>([])
  const [digitalSignatures, setDigitalSignatures] = useState<AccountAccessResponse[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("users")
  const [showPrivateKeys, setShowPrivateKeys] = useState<{ [key: number]: boolean }>({})

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AccountDetailsResponse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form states - now align with OpenAPI spec types
  const [newUser, setNewUser] = useState<Omit<AccountDetailsCreate, "type"> & { type: string[] }>({
    id_casamonarca: 1,
    name: "",
    email: "",
    password: "",
    type: [], // Ahora es un array
    authorizacion: false,
  })

  const [newSignature, setNewSignature] = useState<AccountAccessCreate>({
    id_account_details: 0, // Will be selected from a user
    numero_empleado: "",
    signer_name: "",
  })

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [usersData, signaturesData] = await Promise.all([accountDetailsApi.getAll(), accountAccessApi.getAll()])

        setAccountDetails(usersData)
        setDigitalSignatures(signaturesData)
      } catch (error) {
        console.error("Error loading data:", error)
        toast.error("Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Resto del código...

  // Create new user
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password || newUser.type.length === 0) {
      toast.error("Nombre, email, contraseña y al menos un tipo de usuario son obligatorios.")
      return
    }

    setIsSaving(true)
    try {
      // Convertir el array de tipos a string separado por comas para el backend
      const userToCreate = {
        ...newUser,
        type: newUser.type.join(","), // Convertir array a string
      }
      const createdUser = await accountDetailsApi.create(userToCreate)
      setAccountDetails([...accountDetails, createdUser])
      setNewUser({
        id_casamonarca: 1,
        name: "",
        email: "",
        password: "",
        type: [],
        authorizacion: false,
      })
      toast.success("Usuario creado correctamente")
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error(`Error al crear el usuario: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Create digital signature
  const handleCreateSignature = async () => {
    if (!newSignature.id_account_details || !newSignature.numero_empleado || !newSignature.signer_name) {
      toast.error("Todos los campos para la firma son obligatorios.")
      return
    }

    setIsSaving(true)
    try {
      // The backend will generate private_key and public_key
      const createdSignature = await accountAccessApi.create(newSignature)
      setDigitalSignatures([...digitalSignatures, createdSignature])
      setNewSignature({
        id_account_details: 0,
        numero_empleado: "",
        signer_name: "",
      })
      toast.success("Solicitud de firma digital enviada. El backend generará las claves.")
    } catch (error) {
      console.error("Error creating digital signature:", error)
      toast.error(`Error al crear la firma digital: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete user confirmation
  const confirmDeleteUser = (user: AccountDetailsResponse) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  // Handle actual user deletion using the proper DELETE endpoint
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      // Now using the proper DELETE endpoint
      await accountDetailsApi.delete(userToDelete.id)

      // Remove from local state
      setAccountDetails(accountDetails.filter((user) => user.id !== userToDelete.id))

      // Also remove any associated signatures
      setDigitalSignatures(digitalSignatures.filter((sig) => sig.id_account_details !== userToDelete.id))

      toast.success(`Usuario ${userToDelete.name} eliminado correctamente`)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error(`Error al eliminar el usuario: ${error instanceof Error ? error.message : "Error desconocido"}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const togglePrivateKeyVisibility = (signatureId: number) => {
    setShowPrivateKeys((prev) => ({
      ...prev,
      [signatureId]: !prev[signatureId],
    }))
  }

  const downloadPublicKeyFile = (signature: AccountAccessResponse) => {
    if (!signature.public_key) {
      toast.error("Este usuario no tiene una clave pública configurada.")
      return
    }
    const userDetail = accountDetails.find((u) => u.id === signature.id_account_details)
    const userName = userDetail?.name || "usuario_desconocido"

    try {
      const pemContent = signature.public_key
      if (!pemContent.includes("BEGIN PUBLIC KEY") || !pemContent.includes("END PUBLIC KEY")) {
        // Loosened check slightly as per user's original code, but strict check is better
        toast.error("El formato de la clave pública podría no ser un PEM estándar, pero se intentará la descarga.")
      }

      const blob = new Blob([pemContent], { type: "application/x-pem-file" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${userName.replace(/\s+/g, "_").toLowerCase()}_public_key.pem`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`Clave pública de ${userName} descargada.`)
    } catch (error) {
      console.error("Error al descargar clave pública:", error)
      toast.error("Error al descargar la clave pública.")
    }
  }

  const renderDepartments = (typeString: string) => {
    const types = typeString.includes(",") ? typeString.split(",") : [typeString]

    return (
      <div className="flex flex-wrap gap-1">
        {types.map((type) => {
          let color = ""
          switch (type.trim().toLowerCase()) {
            case "humanitario":
              color = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
              break
            case "psicosocial":
              color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              break
            case "legal":
              color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
              break
            case "comunicacion":
              color = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
              break
            case "almacen":
              color = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
              break
            default:
              color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }
          return (
            <Badge key={type} variant="outline" className={color}>
              {type.trim().charAt(0).toUpperCase() + type.trim().slice(1)}
            </Badge>
          )
        })}
      </div>
    )
  }

  return (
    <ProtectedRoute requiredRole="superuser">
      {isLoading ? (
        <div className="flex min-h-screen flex-col">
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-6 px-5">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Gestión de Usuarios y Firmas Digitales</h1>
            <p className="text-muted-foreground">Administra usuarios y crea firmas digitales para los documentos</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Usuarios ({accountDetails.length})
              </TabsTrigger>
              <TabsTrigger value="signatures" className="flex items-center gap-2">
                <KeyIcon className="h-4 w-4" />
                Firmas Digitales ({digitalSignatures.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      Crear Nuevo Usuario
                    </CardTitle>
                    <CardDescription>Añade un nuevo usuario al sistema</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-name">Nombre completo *</Label>
                      <Input
                        id="user-name"
                        placeholder="Ej: Juan Pérez"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email *</Label>
                      <Input
                        id="user-email"
                        type="email"
                        placeholder="juan.perez@empresa.com"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Contraseña *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        placeholder="Contraseña segura"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipos de usuario *</Label>
                      <div className="space-y-2 rounded-md border p-3">
                        {[
                          { value: "humanitario", label: "Humanitario" },
                          { value: "psicosocial", label: "Psicosocial" },
                          { value: "legal", label: "Legal" },
                          { value: "comunicacion", label: "Comunicación" },
                          { value: "almacen", label: "Almacén" },
                        ].map((userType) => (
                          <div key={userType.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`type-${userType.value}`}
                              checked={newUser.type.includes(userType.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewUser({
                                    ...newUser,
                                    type: [...newUser.type, userType.value],
                                  })
                                } else {
                                  setNewUser({
                                    ...newUser,
                                    type: newUser.type.filter((t) => t !== userType.value),
                                  })
                                }
                              }}
                            />
                            <Label htmlFor={`type-${userType.value}`} className="text-sm font-normal">
                              {userType.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {newUser.type.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {newUser.type.map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="user-auth"
                        checked={newUser.authorizacion}
                        onCheckedChange={(checked) => setNewUser({ ...newUser, authorizacion: !!checked })}
                      />
                      <Label htmlFor="user-auth">Autorización especial</Label>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleCreateUser} disabled={isSaving} className="w-full">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...
                        </>
                      ) : (
                        <>
                          <PlusIcon className="mr-2 h-4 w-4" /> Crear Usuario
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usuarios Registrados</CardTitle>
                    <CardDescription>Lista de todos los usuarios en el sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {accountDetails.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {accountDetails.map(
                          (
                            accDetail, // Renamed to avoid conflict
                          ) => (
                            <div key={accDetail.id} className="flex items-center justify-between rounded-md border p-3">
                              <div>
                                <p className="font-medium">{accDetail.name}</p>
                                <p className="text-sm text-muted-foreground">{accDetail.email}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  {renderDepartments(accDetail.type)}
                                  {accDetail.authorizacion && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                      <ShieldCheckIcon className="mr-1 h-3 w-3" />
                                      Autorizado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => confirmDeleteUser(accDetail)}
                              >
                                <Trash2Icon className="h-4 w-4" />
                                <span className="sr-only">Eliminar usuario</span>
                              </Button>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                        <p className="text-center text-muted-foreground">No hay usuarios registrados</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="signatures" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KeyIcon className="h-5 w-5" />
                      Crear Firma Digital
                    </CardTitle>
                    <CardDescription>
                      Genera una nueva firma digital para un usuario. Las claves se generarán en el backend.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sig-user">Usuario *</Label>
                      <Select
                        value={newSignature.id_account_details ? newSignature.id_account_details.toString() : ""}
                        onValueChange={(value) =>
                          setNewSignature({ ...newSignature, id_account_details: Number.parseInt(value) })
                        }
                      >
                        <SelectTrigger id="sig-user">
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {accountDetails.map(
                            (
                              accDetail, // Renamed to avoid conflict
                            ) => (
                              <SelectItem key={accDetail.id} value={accDetail.id.toString()}>
                                {accDetail.name} - {accDetail.email}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sig-employee">Número de empleado *</Label>
                      <Input
                        id="sig-employee"
                        placeholder="EMP001"
                        value={newSignature.numero_empleado}
                        onChange={(e) => setNewSignature({ ...newSignature, numero_empleado: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sig-name">Nombre del firmante *</Label>
                      <Input
                        id="sig-name"
                        placeholder="Nombre para la firma"
                        value={newSignature.signer_name}
                        onChange={(e) => setNewSignature({ ...newSignature, signer_name: e.target.value })}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={handleCreateSignature}
                      disabled={isSaving || accountDetails.length === 0}
                      className="w-full"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                        </>
                      ) : (
                        <>
                          <KeyIcon className="mr-2 h-4 w-4" /> Generar Firma Digital
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Firmas Digitales</CardTitle>
                    <CardDescription>Firmas digitales generadas en el sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {digitalSignatures.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {digitalSignatures.map((signature) => {
                          const sigUser = accountDetails.find((u) => u.id === signature.id_account_details)
                          return (
                            <div key={signature.id} className="rounded-md border p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium">{signature.signer_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {sigUser?.name} - {signature.numero_empleado}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadPublicKeyFile(signature)}
                                  className="flex items-center gap-1"
                                >
                                  Descargar .pem
                                </Button>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <Label className="text-xs font-medium">Clave Pública (PEM):</Label>
                                  <Textarea
                                    value={signature.public_key}
                                    readOnly
                                    className="mt-1 h-20 text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium">Clave Privada (PEM):</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => togglePrivateKeyVisibility(signature.id)}
                                      className="h-6 px-2"
                                    >
                                      {showPrivateKeys[signature.id] ? (
                                        <EyeOffIcon className="h-3 w-3" />
                                      ) : (
                                        <EyeIcon className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                  <Textarea
                                    value={
                                      showPrivateKeys[signature.id] ? signature.private_key : "Clave Privada Oculta"
                                    }
                                    readOnly
                                    className="mt-1 h-20 text-xs font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                        <p className="text-center text-muted-foreground">No hay firmas digitales registradas</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará permanentemente al usuario <strong>{userToDelete?.name}</strong> y no se puede
                  deshacer.
                  {userToDelete && digitalSignatures.some((sig) => sig.id_account_details === userToDelete.id) && (
                    <span className="block mt-2 text-destructive font-medium">
                      ¡Atención! Este usuario tiene firmas digitales asociadas que también serán eliminadas.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...
                    </>
                  ) : (
                    "Eliminar"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </ProtectedRoute>
  )
}
