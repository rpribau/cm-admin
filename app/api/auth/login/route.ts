import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { UserRole } from "@/contexts/auth-context"

// Credenciales de prueba para diferentes tipos de usuarios
const TEST_USERS = [
  {
    email: "humanitario@email.com",
    password: "password",
    name: "Usuario Humanitario",
    role: "humanitario" as UserRole,
  },
  {
    email: "psicosocial@email.com",
    password: "password",
    name: "Usuario Psicosocial",
    role: "psicosocial" as UserRole,
  },
  {
    email: "legal@email.com",
    password: "password",
    name: "Usuario Legal",
    role: "legal" as UserRole,
  },
  {
    email: "comunicacion@email.com",
    password: "password",
    name: "Usuario Comunicación",
    role: "comunicacion" as UserRole,
  },
  {
    email: "almacen@email.com",
    password: "password",
    name: "Usuario Almacén",
    role: "almacen" as UserRole,
  },
  {
    email: "admin-humanitario@email.com",
    password: "password",
    name: "Admin Humanitario",
    role: "admin-humanitario" as UserRole,
  },
  {
    email: "admin-psicosocial@email.com",
    password: "password",
    name: "Admin Psicosocial",
    role: "admin-psicosocial" as UserRole,
  },
  {
    email: "admin-legal@email.com",
    password: "password",
    name: "Admin Legal",
    role: "admin-legal" as UserRole,
  },
  {
    email: "admin-comunicacion@email.com",
    password: "password",
    name: "Admin Comunicación",
    role: "admin-comunicacion" as UserRole,
  },
  {
    email: "admin-almacen@email.com",
    password: "password",
    name: "Admin Almacén",
    role: "admin-almacen" as UserRole,
  },
  // Añadir superusuario
  {
    email: "superuser@email.com",
    password: "password",
    name: "Super Usuario",
    role: "superuser" as UserRole,
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Buscar el usuario por email y contraseña
    const user = TEST_USERS.find(
      (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password,
    )

    if (!user) {
      return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 401 })
    }

    // Generar un token simulado (en una implementación real, usaríamos JWT)
    const token = `token-${user.role}-${Date.now()}`

    // Establecer cookie de sesión
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      sameSite: "strict",
    })

    // Guardar el rol del usuario en otra cookie para poder acceder desde el cliente
    cookieStore.set({
      name: "user-role",
      value: user.role,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      sameSite: "strict",
    })

    // Devolver respuesta exitosa con datos del usuario
    return NextResponse.json({
      success: true,
      user: {
        id: `user-${Date.now()}`,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Error en la autenticación:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
