import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { account_access_id, documento_id, public_key_pem } = data

    if (!account_access_id || !documento_id || !public_key_pem) {
      return NextResponse.json(
        {
          success: false,
          message: "Faltan datos requeridos: account_access_id, documento_id, public_key_pem",
        },
        { status: 400 },
      )
    }

    console.log(`🔐 Iniciando firma digital para documento ${documento_id} con acceso ${account_access_id}`)

    // Llamar al API externo para firmar el documento
    const apiUrl = "http://4.157.251.39:8000/sign_document_with_upload/" // Usar la nueva IP
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_access_id,
        documento_id,
        public_key_pem,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("❌ Error en API externa:", errorData)
      return NextResponse.json(
        {
          success: false,
          message: errorData.detail || `Error en API externa: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      )
    }

    const result = await response.json()
    console.log("✅ Documento firmado exitosamente:", result)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("❌ Error al firmar documento:", error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido al firmar documento",
      },
      { status: 500 },
    )
  }
}
