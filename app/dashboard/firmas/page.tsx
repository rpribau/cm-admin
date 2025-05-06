"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, PenToolIcon, PlusIcon, Trash2Icon, UserIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Tipo para las firmas
interface Signature {
  id: string
  name: string
  role: string
  department: string
  createdAt: string
}

export default function FirmasPage() {
  const router = useRouter()
  const { user, isSuperuser, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [newSignature, setNewSignature] = useState({
    name: "",
    role: "",
    department: "humanitario",
  })
  const [isSaving, setIsSaving] = useState(false)

  // Verificar si el usuario es superusuario
  useEffect(() => {
    const checkAccess = async () => {
      setIsLoading(true)
      try {
        // Wait for auth to be ready
        if (authLoading) {
          return
        }

        if (!user) {
          // Si no hay usuario, redirigir al login
          router.push("/login")
          return
        }

        if (!isSuperuser) {
          // Si no es superusuario, redirigir al dashboard
          toast.error("No tienes permisos para acceder a esta página")
          router.push("/dashboard")
          return
        }

        // Cargar firmas (simulado)
        // En una implementación real, esto sería una llamada a la API
        setTimeout(() => {
          setSignatures([
            {
              id: "1",
              name: "Carlos Méndez",
              role: "Director de Proyecto",
              department: "humanitario",
              createdAt: "2024-05-15",
            },
            {
              id: "2",
              name: "María García",
              role: "Gerente de Calidad",
              department: "psicosocial",
              createdAt: "2024-05-16",
            },
            {
              id: "3",
              name: "Laura Sánchez",
              role: "Directora Financiera",
              department: "legal",
              createdAt: "2024-05-17",
            },
          ])
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error al verificar acceso:", error)
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [user, isSuperuser, router, authLoading])

  // Función para añadir una nueva firma
  const handleAddSignature = () => {
    if (!newSignature.name || !newSignature.role || !newSignature.department) {
      toast.error("Todos los campos son obligatorios")
      return
    }

    setIsSaving(true)

    // Simular una llamada a la API
    setTimeout(() => {
      const newSignatureItem: Signature = {
        id: `new-${Date.now()}`,
        name: newSignature.name,
        role: newSignature.role,
        department: newSignature.department,
        createdAt: new Date().toISOString().split("T")[0],
      }

      setSignatures([...signatures, newSignatureItem])
      setNewSignature({
        name: "",
        role: "",
        department: "humanitario",
      })
      setIsSaving(false)
      toast.success("Firma añadida correctamente")
    }, 1000)
  }

  // Función para eliminar una firma
  const handleDeleteSignature = (id: string) => {
    setSignatures(signatures.filter((signature) => signature.id !== id))
    toast.success("Firma eliminada correctamente")
  }

  // Renderizar el departamento con un badge
  const renderDepartment = (department: string) => {
    let color = ""
    switch (department) {
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
      <Badge variant="outline" className={`${color}`}>
        {department.charAt(0).toUpperCase() + department.slice(1)}
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
    <div className="container mx-auto py-6 m-x-4 md:py-8 md:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestión de Firmas</h1>
        <p className="text-muted-foreground">Crea y administra las firmas para los documentos</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario para añadir firmas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenToolIcon className="h-5 w-5" />
              Crear Nueva Firma
            </CardTitle>
            <CardDescription>Añade una nueva firma para los documentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                placeholder="Ej: Juan Pérez"
                value={newSignature.name}
                onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Input
                id="role"
                placeholder="Ej: Director de Proyecto"
                value={newSignature.role}
                onChange={(e) => setNewSignature({ ...newSignature, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select
                value={newSignature.department}
                onValueChange={(value) => setNewSignature({ ...newSignature, department: value })}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Seleccionar departamento" />
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
          </CardContent>
          <CardFooter>
            <Button onClick={handleAddSignature} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Añadir Firma
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Lista de firmas existentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Firmas Existentes
            </CardTitle>
            <CardDescription>Listado de todas las firmas disponibles</CardDescription>
          </CardHeader>
          <CardContent>
            {signatures.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signatures.map((signature) => (
                    <TableRow key={signature.id}>
                      <TableCell className="font-medium">{signature.name}</TableCell>
                      <TableCell>{signature.role}</TableCell>
                      <TableCell>{renderDepartment(signature.department)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSignature(signature.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2Icon className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-center text-muted-foreground">No hay firmas registradas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
