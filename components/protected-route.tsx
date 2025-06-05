"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-provider"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "admin" | "superuser" | string[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isSuperuser, userTypes } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Solo verificar después de que se haya completado la carga inicial
    if (!isLoading) {
      // Si no hay usuario, redirigir al login
      if (!user) {
        router.replace("/login")
        return
      }

      // Verificar roles específicos si se requieren
      if (requiredRole) {
        let hasAccess = false

        if (requiredRole === "superuser" && isSuperuser) {
          hasAccess = true
        } else if (requiredRole === "admin" && (isAdmin || isSuperuser)) {
          hasAccess = true
        } else if (Array.isArray(requiredRole)) {
          // Verificar si el usuario tiene al menos uno de los tipos requeridos
          hasAccess = requiredRole.some(
            (role) =>
              userTypes.includes(role) || (role === "admin" && isAdmin) || (role === "superuser" && isSuperuser),
          )
        }

        if (!hasAccess) {
          // Redirigir al dashboard si no tiene los permisos necesarios
          router.replace("/dashboard")
        }
      }
    }
  }, [user, isLoading, router, requiredRole, isAdmin, isSuperuser, userTypes])

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, no renderizar nada (el useEffect se encargará de la redirección)
  if (!user) {
    return null
  }

  // Si hay un usuario y no se requiere un rol específico o el usuario tiene el rol requerido
  return <>{children}</>
}
