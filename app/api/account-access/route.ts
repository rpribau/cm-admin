import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Obteniendo datos de account_access...")

    // Llamar al endpoint de la API externa
    const response = await fetch("http://4.157.251.39:8000/account_access/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("❌ Error al obtener account_access:", response.status)
      return NextResponse.json(
        { success: false, message: "Error al obtener datos de acceso" },
        { status: response.status },
      )
    }

    const accountAccessData = await response.json()
    console.log(`✅ Obtenidos ${accountAccessData.length} registros de account_access`)

    return NextResponse.json(accountAccessData)
  } catch (error) {
    console.error("❌ Error en endpoint de account-access:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
