"use client"

import type React from "react"
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
  | "superuser" // Añadido el rol de superusuario

// Definir la interfaz del usuario
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

// Definir la interfaz del contexto de autenticación
export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isSuperuser: boolean // Añadida propiedad para verificar si es superusuario
  userType: string | null
}

// Crear el contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Proveedor del contexto de autenticación
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Verificar si el usuario está autenticado al cargar la página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error al verificar autenticación:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Función para iniciar sesión
  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al iniciar sesión")
      }

      const data = await response.json()
      setUser(data.user)
      router.push("/dashboard")
    } catch (error) {
      console.error("Error al iniciar sesión:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Función para cerrar sesión
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      setUser(null)
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  // Determinar si el usuario es administrador
  const isAdmin = user?.role.startsWith("admin-") || user?.role === "superuser" || false

  // Determinar si el usuario es superusuario
  const isSuperuser = user?.role === "superuser" || false

  // Obtener el tipo de usuario (humanitario, psicosocial, etc.)
  const userType = user ? (user.role === "superuser" ? "todos" : user.role.replace("admin-", "")) : null

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
