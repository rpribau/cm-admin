import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST() {
  // Eliminar la cookie de autenticación
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
  cookieStore.delete("user-role")

  return NextResponse.json({ success: true })
}
