// API Service for interacting with the backend
const API_BASE_URL = "http://172.172.219.21:8000"

// Types based on the OpenAPI specification
export interface DocumentoModel {
  id?: number | null
  header: string
  type?: string | null
  status?: string | null
  target?: number | null
  limit?: number | null
  limit_date: string
  reviewer?: string | null
  description?: string | null
}

export interface AutorizacionModel {
  id?: number | null
  documento_id: number
  name: string
  role: string
  status?: string | null
  date: string | null
}

export interface LinkModel {
  id?: number | null
  documento_id: number
  title: string
  url: string
}

export interface AccountDetail {
  id?: number
  username: string
  email: string
  full_name?: string
  is_active?: boolean
  is_superuser?: boolean
  created_at?: string
  updated_at?: string
}

export interface AccountAccess {
  id?: number
  user_id: number
  signature_data: string
  created_at?: string
  is_active?: boolean
}

// Combined document type that includes authorizations and links
export interface DocumentoCompleto extends DocumentoModel {
  authorizations?: AutorizacionModel[]
  links?: LinkModel[]
}

// API error handling
class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Limpiar el endpoint para evitar dobles barras
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint
  const url = `${API_BASE_URL}/${cleanEndpoint}`

  const defaultHeaders = {
    "Content-Type": "application/json",
  }

  try {
    console.log(`Fetching from: ${url}`) // Para debug

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorMessage
      } catch (e) {
        // Si parsing JSON falla, usar el mensaje de error predeterminado
      }
      throw new ApiError(errorMessage, response.status)
    }

    return response.json()
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error)

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(
        "No se pudo conectar con el servidor API. Verifique que el servidor esté en ejecución y accesible.",
        0,
      )
    }

    throw error
  }
}

// Document API functions
export const documentoApi = {
  // Get all documents
  async getAll(): Promise<DocumentoModel[]> {
    return fetchApi<DocumentoModel[]>("documentos/")
  },

  // Create a new document
  async create(documento: DocumentoModel): Promise<DocumentoModel> {
    return fetchApi<DocumentoModel>("documentos/", {
      method: "POST",
      body: JSON.stringify(documento),
    })
  },

  // Update an existing document
  async update(documento: DocumentoModel): Promise<DocumentoModel> {
    return fetchApi<DocumentoModel>("documentos/", {
      method: "PUT",
      body: JSON.stringify(documento),
    })
  },
}

// Authorization API functions
export const autorizacionApi = {
  // Get all authorizations
  async getAll(): Promise<AutorizacionModel[]> {
    return fetchApi<AutorizacionModel[]>("autorizaciones/")
  },

  // Create a new authorization
  async create(autorizacion: AutorizacionModel): Promise<AutorizacionModel> {
    return fetchApi<AutorizacionModel>("autorizaciones/", {
      method: "POST",
      body: JSON.stringify(autorizacion),
    })
  },

  // Update an existing authorization
  async update(autorizacion: AutorizacionModel): Promise<AutorizacionModel> {
    return fetchApi<AutorizacionModel>("autorizaciones/", {
      method: "PUT",
      body: JSON.stringify(autorizacion),
    })
  },

  // Get authorizations for a specific document
  async getByDocumentoId(documentoId: number): Promise<AutorizacionModel[]> {
    const allAutorizaciones = await this.getAll()
    return allAutorizaciones.filter((auth) => auth.documento_id === documentoId)
  },
}

// Link API functions
export const linkApi = {
  // Get all links
  async getAll(): Promise<LinkModel[]> {
    return fetchApi<LinkModel[]>("links/")
  },

  // Create a new link
  async create(link: LinkModel): Promise<LinkModel> {
    return fetchApi<LinkModel>("links/", {
      method: "POST",
      body: JSON.stringify(link),
    })
  },

  // Update an existing link
  async update(link: LinkModel): Promise<LinkModel> {
    return fetchApi<LinkModel>("links/", {
      method: "PUT",
      body: JSON.stringify(link),
    })
  },

  // Get links for a specific document
  async getByDocumentoId(documentoId: number): Promise<LinkModel[]> {
    const allLinks = await this.getAll()
    return allLinks.filter((link) => link.documento_id === documentoId)
  },
}

// Account Details API (User management)
export const accountDetailsApi = {
  // Get all users
  async getAll(): Promise<AccountDetail[]> {
    return fetchApi<AccountDetail[]>("account_details/")
  },

  // Get user by ID
  async getById(id: number): Promise<AccountDetail> {
    return fetchApi<AccountDetail>(`account_details/${id}`)
  },

  // Create a new user
  async create(user: Omit<AccountDetail, "id">): Promise<AccountDetail> {
    return fetchApi<AccountDetail>("account_details/", {
      method: "POST",
      body: JSON.stringify(user),
    })
  },

  // Update an existing user
  async update(id: number, user: Partial<AccountDetail>): Promise<AccountDetail> {
    return fetchApi<AccountDetail>(`account_details/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    })
  },
}

// Account Access API (Digital Signatures)
export const accountAccessApi = {
  // Get all account access
  async getAll(): Promise<AccountAccess[]> {
    return fetchApi<AccountAccess[]>("account_access/")
  },

  // Get account access by ID
  async getById(id: number): Promise<AccountAccess> {
    return fetchApi<AccountAccess>(`account_access/${id}`)
  },

  // Create a new account access
  async create(access: Omit<AccountAccess, "id">): Promise<AccountAccess> {
    return fetchApi<AccountAccess>("account_access/", {
      method: "POST",
      body: JSON.stringify(access),
    })
  },

  // Update an existing account access
  async update(id: number, access: Partial<AccountAccess>): Promise<AccountAccess> {
    return fetchApi<AccountAccess>(`account_access/${id}`, {
      method: "PUT",
      body: JSON.stringify(access),
    })
  },
}

// Combined API functions for working with complete documents
export const documentoCompletoApi = {
  // Get all documents with their authorizations and links
  async getAll(): Promise<DocumentoCompleto[]> {
    const documentos = await documentoApi.getAll()
    const autorizaciones = await autorizacionApi.getAll()
    const links = await linkApi.getAll()

    return documentos.map((doc) => {
      return {
        ...doc,
        authorizations: autorizaciones.filter((auth) => auth.documento_id === doc.id),
        links: links.filter((link) => link.documento_id === doc.id),
      }
    })
  },

  // Get a specific document with its authorizations and links
  async getById(id: number): Promise<DocumentoCompleto | null> {
    const documentos = await documentoApi.getAll()
    const documento = documentos.find((doc) => doc.id === id)

    if (!documento) {
      return null
    }

    const authorizations = await autorizacionApi.getByDocumentoId(id)
    const links = await linkApi.getByDocumentoId(id)

    return {
      ...documento,
      authorizations,
      links,
    }
  },

  // Create a new document with its authorizations and links
  async create(documentoCompleto: DocumentoCompleto): Promise<DocumentoCompleto> {
    // First create the document
    const { authorizations, links, ...documentoData } = documentoCompleto
    const createdDocumento = await documentoApi.create(documentoData)

    // Then create authorizations and links if they exist
    const createdAuthorizations = authorizations
      ? await Promise.all(
          authorizations.map((auth) =>
            autorizacionApi.create({
              ...auth,
              documento_id: createdDocumento.id!,
            }),
          ),
        )
      : []

    const createdLinks = links
      ? await Promise.all(
          links.map((link) =>
            linkApi.create({
              ...link,
              documento_id: createdDocumento.id!,
            }),
          ),
        )
      : []

    return {
      ...createdDocumento,
      authorizations: createdAuthorizations,
      links: createdLinks,
    }
  },

  // Update an existing document with its authorizations and links
  async update(documentoCompleto: DocumentoCompleto): Promise<DocumentoCompleto> {
    if (!documentoCompleto.id) {
      throw new Error("Document ID is required for update")
    }

    const { authorizations, links, ...documentoData } = documentoCompleto

    // Update the document
    const updatedDocumento = await documentoApi.update(documentoData)

    // Handle authorizations
    let updatedAuthorizations: AutorizacionModel[] = []
    if (authorizations && authorizations.length > 0) {
      // Update or create authorizations
      updatedAuthorizations = await Promise.all(
        authorizations.map(async (auth) => {
          if (auth.id) {
            // Update existing authorization
            return autorizacionApi.update(auth)
          } else {
            // Create new authorization
            return autorizacionApi.create({
              ...auth,
              documento_id: documentoCompleto.id!,
            })
          }
        }),
      )
    }

    // Handle links
    let updatedLinks: LinkModel[] = []
    if (links && links.length > 0) {
      // Update or create links
      updatedLinks = await Promise.all(
        links.map(async (link) => {
          if (link.id) {
            // Update existing link
            return linkApi.update(link)
          } else {
            // Create new link
            return linkApi.create({
              ...link,
              documento_id: documentoCompleto.id!,
            })
          }
        }),
      )
    }

    return {
      ...updatedDocumento,
      authorizations: updatedAuthorizations,
      links: updatedLinks,
    }
  },

  // Convert API data format to the format used in the frontend
  mapToFrontendFormat(doc: DocumentoCompleto): any {
    return {
      id: doc.id || 0,
      header: doc.header,
      type: doc.type || "",
      status: doc.status || "No Iniciado",
      target: doc.target?.toString() || "",
      limit: doc.limit?.toString() || "",
      limit_date: doc.limit_date,
      reviewer: doc.reviewer || "Asignar revisor",
      description: doc.description || "",
      notes: "", // Agregar si tienes este campo en tu API
      authorizations:
        doc.authorizations?.map((auth) => ({
          name: auth.name,
          role: auth.role,
          status: auth.status || "pending",
          date: auth.date || "",
        })) || [],
      links:
        doc.links?.map((link) => ({
          id: link.id?.toString() || `new-${Date.now()}`,
          title: link.title,
          url: link.url,
        })) || [],
    }
  },

  // Convert frontend format to API data format
  mapToApiFormat(frontendDoc: any): DocumentoCompleto {
    return {
      id: frontendDoc.id !== 0 ? frontendDoc.id : null,
      header: frontendDoc.header,
      type: frontendDoc.type,
      status: frontendDoc.status,
      target: frontendDoc.target ? Number.parseInt(frontendDoc.target) : null,
      limit: frontendDoc.limit ? Number.parseInt(frontendDoc.limit) : null,
      limit_date: frontendDoc.limit_date,
      reviewer: frontendDoc.reviewer,
      description: frontendDoc.description,
      authorizations: frontendDoc.authorizations?.map((auth: any) => ({
        id: auth.id || null,
        documento_id: frontendDoc.id,
        name: auth.name,
        role: auth.role,
        status: auth.status,
        date: auth.date || null,
      })),
      links: frontendDoc.links?.map((link: any) => ({
        id: link.id && !link.id.startsWith("new-") ? Number.parseInt(link.id) : null,
        documento_id: frontendDoc.id,
        title: link.title,
        url: link.url,
      })),
    }
  },
}
