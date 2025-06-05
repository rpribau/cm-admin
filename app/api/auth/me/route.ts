import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { UserRole } from "@/contexts/auth-provider"

export async function GET() {
  const cookieStore = await cookies()
  const authToken = cookieStore.get("auth-token")
  const userRole = cookieStore.get("user-role")
  const userTypes = cookieStore.get("user-types")

  if (!authToken || !userRole) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 })
  }

  // Extraer información del token (en una implementación real, verificaríamos el JWT)
  const tokenParts = authToken.value.split("-")
  const role = userRole.value as UserRole

  // Parse user types from cookie
  const types = userTypes?.value ? userTypes.value.split(",") : []

  // Determinar el nombre basado en el rol
  let name = "Usuario"
  if (role === "superuser") {
    name = "Super Usuario"
  } else if (role.startsWith("admin-")) {
    name = `Admin ${role.replace("admin-", "").charAt(0).toUpperCase() + role.replace("admin-", "").slice(1)}`
  } else {
    name = `Usuario ${role.charAt(0).toUpperCase() + role.slice(1)}`
  }

  // Devolver datos del usuario
  return NextResponse.json({
    success: true,
    user: {
      id: `user-${Date.now()}`,
      name,
      email: `${role}@email.com`,
      role,
      types,
    },
  })
}
