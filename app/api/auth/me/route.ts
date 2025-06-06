import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Obtener token de las cookies
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      console.log("❌ No se encontró token de autenticación")
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 })
    }

    try {
      // Decodificar token
      const decoded = JSON.parse(Buffer.from(token, "base64").toString())

      // Verificar que el token tenga la estructura esperada
      if (!decoded.userId || !decoded.email || !decoded.name || !decoded.role) {
        console.log("❌ Token con estructura inválida")
        return NextResponse.json({ success: false, message: "Token inválido" }, { status: 401 })
      }

      // Verificar que el token no sea muy antiguo (opcional)
      const tokenAge = Date.now() - (decoded.timestamp || 0)
      const maxAge = 60 * 60 * 24 * 7 * 1000 // 7 días en milisegundos

      if (tokenAge > maxAge) {
        console.log("❌ Token expirado")
        return NextResponse.json({ success: false, message: "Token expirado" }, { status: 401 })
      }

      console.log(`✅ Usuario autenticado: ${decoded.name} (${decoded.role})`)

      return NextResponse.json({
        success: true,
        user: {
          id: decoded.userId,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
          types: decoded.types || [],
        },
      })
    } catch (decodeError) {
      console.error("❌ Error decodificando token:", decodeError)
      return NextResponse.json({ success: false, message: "Token inválido" }, { status: 401 })
    }
  } catch (error) {
    console.error("❌ Error en verificación de autenticación:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
