"use client"

import * as React from "react"
import { LogOutIcon, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export function UserAuthButton() {
  const { user, logout, isAdmin, isSuperuser } = useAuth()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await logout()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return null
  }

  // Determinar el tipo de usuario para mostrar en la interfaz
  const userType = user.role === "superuser" ? "superuser" : user.role.replace("admin-", "")
  const userTypeDisplay = userType.charAt(0).toUpperCase() + userType.slice(1)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          <span>{user.name}</span>
          {isSuperuser ? (
            <Badge
              variant="outline"
              className="ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
            >
              Super
            </Badge>
          ) : isAdmin ? (
            <Badge variant="outline" className="ml-1 bg-primary/10 text-primary">
              Admin
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <span className="flex w-full items-center justify-between">
            <span>Tipo de cuenta</span>
            <Badge variant="outline">{userTypeDisplay}</Badge>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <span className="flex w-full items-center justify-between">
            <span>Rol</span>
            <Badge
              variant={isSuperuser ? "default" : isAdmin ? "secondary" : "outline"}
              className={`font-normal ${isSuperuser ? "bg-purple-600 hover:bg-purple-600" : ""}`}
            >
              {isSuperuser ? "Superusuario" : isAdmin ? "Administrador" : "Usuario"}
            </Badge>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
