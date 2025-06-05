import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Eliminar todas las cookies de autenticación
    const cookiesToDelete = ["auth-token", "user-role", "user-types"]

    cookiesToDelete.forEach((cookieName) => {
      cookieStore.set({
        name: cookieName,
        value: "",
        httpOnly: true,
        path: "/",
        expires: new Date(0), // Fecha en el pasado para eliminar la cookie
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
    })

    return NextResponse.json({
      success: true,
      message: "Sesión cerrada correctamente",
    })
  } catch (error) {
    console.error("Error al cerrar sesión:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al cerrar sesión",
      },
      { status: 500 },
    )
  }
}
