"use client"

import React from "react"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Definir los tipos de roles
export type UserRole =
  | "humanitario"
  | "psicosocial"
  | "legal"
  | "comunicacion"
  | "almacen"
  | "admin-humanitario"
  | "admin-psicosocial"
  | "admin-legal"
  | "admin-comunicacion"
  | "admin-almacen"
  | "superuser"

// Definir la interfaz del usuario
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  types?: string[]
}

// Definir la interfaz del contexto de autenticación
export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isSuperuser: boolean
  userType: string | null
  userTypes: string[]
}

// Crear el contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Proveedor del contexto de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  // Verificar si el usuario está autenticado al cargar la página
  useEffect(() => {
    const checkAuth = async () => {
      // Evitar múltiples verificaciones simultáneas
      if (isInitialized) return

      setIsLoading(true)
      try {
        console.log("🔍 Verificando autenticación...")

        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-cache",
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        console.log("📡 Respuesta de auth/me:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("✅ Usuario autenticado:", data.user.name)
          setUser(data.user)
        } else {
          console.log("❌ No autenticado, limpiando estado")
          setUser(null)

          // Solo redirigir si estamos en una ruta protegida
          const currentPath = window.location.pathname
          if (currentPath.startsWith("/dashboard")) {
            console.log("🔄 Redirigiendo a login desde:", currentPath)
            router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`)
          }
        }
      } catch (error) {
        console.error("❌ Error al verificar autenticación:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    checkAuth()
  }, [router, isInitialized])

  // Función para iniciar sesión
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      console.log("🔐 Intentando login para:", email)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al iniciar sesión")
      }

      const data = await response.json()
      console.log("✅ Login exitoso para:", data.user.name)
      setUser(data.user)

      // Pequeña pausa para asegurar que el estado se actualice
      await new Promise((resolve) => setTimeout(resolve, 100))

      router.push("/dashboard")
    } catch (error) {
      console.error("❌ Error al iniciar sesión:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Función para cerrar sesión
  const logout = async () => {
    setIsLoading(true)
    try {
      console.log("🚪 Cerrando sesión...")

      // Primero limpiar el estado local
      setUser(null)
      setIsInitialized(false)

      // Luego llamar al endpoint de logout
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      console.log("✅ Sesión cerrada exitosamente")

      // Redirigir al login
      router.push("/login")
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error)
      // Incluso si hay error, limpiar estado y redirigir
      setUser(null)
      setIsInitialized(false)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  // Determinar si el usuario es administrador
  const isAdmin = user?.role.startsWith("admin-") || user?.role === "superuser" || false

  // Determinar si el usuario es superusuario
  const isSuperuser = user?.role === "superuser" || false

  // Actualizar la obtención de userType para manejar casos especiales
  const userType = user ? (user.role === "superuser" ? "todos" : user.role.replace("admin-", "")) : null

  // Obtener todos los tipos de usuario con mejor normalización
  const userTypes = React.useMemo(() => {
    if (!user) return []

    if (user.role === "superuser") {
      return ["todos"]
    }

    // Si el usuario tiene múltiples tipos en el campo type
    if (user.types && user.types.length > 0) {
      return user.types
    }

    // Si no hay user.types, intentar parsear desde el campo type del usuario
    // Esto maneja casos donde el tipo viene como "humanitario,psicosocial,legal,comunicacion,almacen"
    if (user.role && user.role.includes(",")) {
      const types = user.role.split(",").map((type) => type.trim())
      console.log(`Tipos parseados desde role: ${types.join(", ")}`)
      return types
    }

    // Extraer el tipo base del rol (quitar "admin-" si existe)
    const baseType = user.role.replace("admin-", "")
    console.log(`Tipo de usuario normalizado: ${baseType} desde rol: ${user.role}`)
    return [baseType]
  }, [user])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        isAdmin,
        isSuperuser,
        userType,
        userTypes,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider")
  }
  return context
}
