import { NextResponse } from "next/server"
import { documentoCompletoApi } from "@/lib/api-service"

export async function GET() {
  try {
    // Fetch documents from the API
    const documents = await documentoCompletoApi.getAll()

    // Map to the format expected by the frontend
    const formattedDocuments = documents.map((doc) => documentoCompletoApi.mapToFrontendFormat(doc))

    return NextResponse.json(formattedDocuments)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Convert to API format
    const apiDocument = documentoCompletoApi.mapToApiFormat(data)

    // Create document via API
    const createdDocument = await documentoCompletoApi.create(apiDocument)

    // Return the created document in frontend format
    return NextResponse.json(documentoCompletoApi.mapToFrontendFormat(createdDocument))
  } catch (error) {
    console.error("Error creating document:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()

    // Convert to API format
    const apiDocument = documentoCompletoApi.mapToApiFormat(data)

    // Update document via API
    const updatedDocument = await documentoCompletoApi.update(apiDocument)

    // Return the updated document in frontend format
    return NextResponse.json(documentoCompletoApi.mapToFrontendFormat(updatedDocument))
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}
