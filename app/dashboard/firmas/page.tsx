"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, PlusIcon, UserIcon, KeyIcon, ShieldCheckIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  accountDetailsApi,
  accountAccessApi,
  type accountDetailsApi,
  type AccountDetailsResponse,
  type AccountAccessCreate,
  type AccountAccessResponse,
} from "@/lib/api-service"

export default function FirmasPage() {
  const router = useRouter()
  const { user, isSuperuser, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [accountDetails, setAccountDetails] = useState<AccountDetailsResponse[]>([])
  const [digitalSignatures, setDigitalSignatures] = useState<AccountAccessResponse[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("users")
  const [showPrivateKeys, setShowPrivateKeys] = useState<{ [key: number]: boolean }>({})

  // Form states
  const [newUser, setNewUser] = useState<AccountDetailsCreate>({
    id_casamonarca: 1,
    name: "",
    email: "",
    password: "",
    type: "humanitario",
    authorizacion: false,
  })

  const [newSignature, setNewSignature] = useState<AccountAccessCreate>({
    id_account_details: 0,
    numero_empleado: "",
    signer_name: "",
  })

  // Check access and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      setIsLoading(true)
      try {
        if (authLoading) return

        if (!user) {
          router.push("/login")
          return
        }

        if (!isSuperuser) {
          toast.error("No tienes permisos para acceder a esta página")
          router.push("/dashboard")
          return
        }

        // Load account details and digital signatures
        const [users, signatures] = await Promise.all([accountDetailsApi.getAll(), accountAccessApi.getAll()])

        setAccountDetails(users)
        setDigitalSignatures(signatures)
      } catch (error) {
        console.error("Error loading data:", error)
        toast.error("Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    checkAccessAndLoadData()
  }, [user, isSuperuser, router, authLoading])

  // Create new user
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Todos los campos obligatorios deben completarse")
      return
    }

    setIsSaving(true)
    try {
      const createdUser = await accountDetailsApi.create(newUser)
      setAccountDetails([...accountDetails, createdUser])
      setNewUser({
        id_casamonarca: 1,
        name: "",
        email: "",
        password: "",
        type: "humanitario",
        authorizacion: false,
      })
      toast.success("Usuario creado correctamente")
    } catch (error) {
      console.error("Error creating user:", error)
      toast.error("Error al crear el usuario")
    } finally {
      setIsSaving(false)
    }
  }

  // Create digital signature
  const handleCreateSignature = async () => {
    if (!newSignature.id_account_details || !newSignature.numero_empleado || !newSignature.signer_name) {
      toast.error("Todos los campos son obligatorios")
      return
    }

    setIsSaving(true)
    try {
      const createdSignature = await accountAccessApi.create(newSignature)
      setDigitalSignatures([...digitalSignatures, createdSignature])
      setNewSignature({
        id_account_details: 0,
        numero_empleado: "",
        signer_name: "",
      })
      toast.success("Firma digital creada correctamente")
    } catch (error) {
      console.error("Error creating digital signature:", error)
      toast.error("Error al crear la firma digital")
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle private key visibility
  const togglePrivateKeyVisibility = (signatureId: number) => {
    setShowPrivateKeys((prev) => ({
      ...prev,
      [signatureId]: !prev[signatureId],
    }))
  }

  // Render department badge
  const renderDepartment = (type: string) => {
    let color = ""
    switch (type.toLowerCase()) {
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
      <Badge variant="outline" className={color}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    )
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
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
            {/* Create User Form */}
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
                  <Label htmlFor="user-type">Tipo de usuario</Label>
                  <Select value={newUser.type} onValueChange={(value) => setNewUser({ ...newUser, type: value })}>
                    <SelectTrigger id="user-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="humanitario">Humanitario</SelectItem>
                      <SelectItem value="psicosocial">Psicosocial</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="comunicacion">Comunicación</SelectItem>
                      <SelectItem value="almacen">Almacén</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Crear Usuario
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle>Usuarios Registrados</CardTitle>
                <CardDescription>Lista de todos los usuarios en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {accountDetails.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {accountDetails.map((user) => (
                      <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {renderDepartment(user.type)}
                            {user.authorizacion && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <ShieldCheckIcon className="mr-1 h-3 w-3" />
                                Autorizado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
            {/* Create Digital Signature Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyIcon className="h-5 w-5" />
                  Crear Firma Digital
                </CardTitle>
                <CardDescription>Genera una nueva firma digital para un usuario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sig-user">Usuario *</Label>
                  <Select
                    value={newSignature.id_account_details.toString()}
                    onValueChange={(value) =>
                      setNewSignature({ ...newSignature, id_account_details: Number.parseInt(value) })
                    }
                  >
                    <SelectTrigger id="sig-user">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountDetails.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.name} - {user.email}
                        </SelectItem>
                      ))}
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <KeyIcon className="mr-2 h-4 w-4" />
                      Generar Firma Digital
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Digital Signatures List */}
            <Card>
              <CardHeader>
                <CardTitle>Firmas Digitales</CardTitle>
                <CardDescription>Firmas digitales generadas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {digitalSignatures.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {digitalSignatures.map((signature) => {
                      const user = accountDetails.find((u) => u.id === signature.id_account_details)
                      return (
                        <div key={signature.id} className="rounded-md border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{signature.signer_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user?.name} - {signature.numero_empleado}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <KeyIcon className="mr-1 h-3 w-3" />
                              Activa
                            </Badge>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <Label className="text-xs font-medium">Clave Pública (PEM):</Label>
                              <Textarea value={signature.public_key} readOnly className="mt-1 h-20 text-xs font-mono" />
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
                                value={showPrivateKeys[signature.id] ? signature.private_key : "Clave Privada Oculta"}
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
    </div>
  )
}
