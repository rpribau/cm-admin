"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { AlertCircleIcon, Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const loginSchema = z.object({
  email: z.string().email({
    message: "Por favor ingresa un correo electrónico válido.",
  }),
  password: z.string().min(1, {
    message: "La contraseña es requerida.",
  }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedRole, setSelectedRole] = React.useState<string>("humanitario")

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Actualizar el email basado en el rol seleccionado
  React.useEffect(() => {
    form.setValue("email", `${selectedRole}@email.com`)
    form.setValue("password", "password")
  }, [selectedRole, form])

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setError(null)

    try {
      await login(data.email, data.password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Iniciar sesión</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder al panel de administración</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <Label htmlFor="account-type">Tipo de cuenta</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="account-type">
                <SelectValue placeholder="Selecciona un tipo de cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="humanitario">Usuario Humanitario</SelectItem>
                <SelectItem value="psicosocial">Usuario Psicosocial</SelectItem>
                <SelectItem value="legal">Usuario Legal</SelectItem>
                <SelectItem value="comunicacion">Usuario Comunicación</SelectItem>
                <SelectItem value="almacen">Usuario Almacén</SelectItem>
                <SelectItem value="admin-humanitario">Admin Humanitario</SelectItem>
                <SelectItem value="admin-psicosocial">Admin Psicosocial</SelectItem>
                <SelectItem value="admin-legal">Admin Legal</SelectItem>
                <SelectItem value="admin-comunicacion">Admin Comunicación</SelectItem>
                <SelectItem value="admin-almacen">Admin Almacén</SelectItem>
                <SelectItem value="superuser">Super Usuario</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Para fines de demostración, la contraseña es siempre "password"
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="tu@ejemplo.com"
                        type="email"
                        autoComplete="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <span>¿Olvidaste tu contraseña? </span>
            <Button variant="link" className="h-auto p-0">
              Recuperar contraseña
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
