import { NextResponse } from "next/server"
import { digitalSignatureApi } from "@/lib/api-service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { account_access_id, documento_id, public_key_pem } = body

    if (!account_access_id || !documento_id || !public_key_pem) {
      return NextResponse.json(
        { message: "Se requieren account_access_id, documento_id y public_key_pem" },
        { status: 400 },
      )
    }

    console.log("Enviando solicitud de firma al servidor...")
    console.log("Datos:", { account_access_id, documento_id })

    // Llamar a la API para firmar el documento
    const signatureResponse = await digitalSignatureApi.signDocument({
      account_access_id,
      documento_id,
      public_key_pem,
    })

    if (!signatureResponse.success) {
      return NextResponse.json(
        { message: `Error al firmar el documento: ${signatureResponse.message}` },
        { status: 400 },
      )
    }

    console.log("Documento firmado exitosamente:", signatureResponse)

    return NextResponse.json(signatureResponse)
  } catch (error) {
    console.error("Error en la ruta de firma de documentos:", error)
    return NextResponse.json(
      { message: `Error al procesar la solicitud: ${error instanceof Error ? error.message : "Error desconocido"}` },
      { status: 500 },
    )
  }
}
