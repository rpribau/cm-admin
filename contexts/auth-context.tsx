"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

// Define user roles
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

// Define user interface
export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

// Define auth context interface
interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
  isSuperuser: boolean
  userType: string | null
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
  isSuperuser: false,
  userType: null,
})

// Auth provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is authenticated on mount
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
        console.error("Error checking authentication:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Login function
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
        throw new Error(error.message || "Login failed")
      }

      const data = await response.json()
      setUser(data.user)
      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      setUser(null)
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Derived properties
  const isAdmin = user?.role.startsWith("admin-") || user?.role === "superuser" || false
  const isSuperuser = user?.role === "superuser" || false
  const userType = user ? (user.role === "superuser" ? "todos" : user.role.replace("admin-", "")) : null

  // Context value
  const value = {
    user,
    isLoading,
    login,
    logout,
    isAdmin,
    isSuperuser,
    userType,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export function useAuth() {
  return useContext(AuthContext)
}
