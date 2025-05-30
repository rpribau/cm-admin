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

export interface AccountDetailsCreate {
  id_casamonarca: number
  name: string
  email: string
  password: string
  type: string
  authorizacion: boolean
}

export interface AccountDetailsResponse extends AccountDetailsCreate {
  id: number
}

export interface AccountAccessCreate {
  id_account_details: number
  numero_empleado: string
  signer_name: string
}

export interface AccountAccessResponse extends AccountAccessCreate {
  id: number
  private_key: string
  public_key: string
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
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint
  const url = `${API_BASE_URL}/${cleanEndpoint}`

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
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
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => `${err.loc.join(" -> ")}: ${err.msg}`).join("; ")
          } else {
            errorMessage = errorData.detail
          }
        }
      } catch (e) {
        // Si parsing JSON falla, usar el mensaje de error predeterminado
      }
      throw new ApiError(errorMessage, response.status)
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return null as T
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
  async getAll(): Promise<DocumentoModel[]> {
    return fetchApi<DocumentoModel[]>("documentos/")
  },

  async create(documento: DocumentoModel): Promise<DocumentoModel> {
    return fetchApi<DocumentoModel>("documentos/", {
      method: "POST",
      body: JSON.stringify(documento),
    })
  },

  async update(documento: DocumentoModel): Promise<DocumentoModel> {
    return fetchApi<DocumentoModel>("documentos/", {
      method: "PUT",
      body: JSON.stringify(documento),
    })
  },
}

// Authorization API functions
export const autorizacionApi = {
  async getAll(): Promise<AutorizacionModel[]> {
    return fetchApi<AutorizacionModel[]>("autorizaciones/")
  },

  async create(autorizacion: AutorizacionModel): Promise<AutorizacionModel> {
    return fetchApi<AutorizacionModel>("autorizaciones/", {
      method: "POST",
      body: JSON.stringify(autorizacion),
    })
  },

  async update(autorizacion: AutorizacionModel): Promise<AutorizacionModel> {
    return fetchApi<AutorizacionModel>("autorizaciones/", {
      method: "PUT",
      body: JSON.stringify(autorizacion),
    })
  },

  async getByDocumentoId(documentoId: number): Promise<AutorizacionModel[]> {
    const allAutorizaciones = await this.getAll()
    return allAutorizaciones.filter((auth) => auth.documento_id === documentoId)
  },
}

// Link API functions
export const linkApi = {
  async getAll(): Promise<LinkModel[]> {
    return fetchApi<LinkModel[]>("links/")
  },

  async create(link: LinkModel): Promise<LinkModel> {
    return fetchApi<LinkModel>("links/", {
      method: "POST",
      body: JSON.stringify(link),
    })
  },

  async update(link: LinkModel): Promise<LinkModel> {
    return fetchApi<LinkModel>("links/", {
      method: "PUT",
      body: JSON.stringify(link),
    })
  },

  async getByDocumentoId(documentoId: number): Promise<LinkModel[]> {
    const allLinks = await this.getAll()
    return allLinks.filter((link) => link.documento_id === documentoId)
  },
}

// Account Details API (User management)
export const accountDetailsApi = {
  async getAll(): Promise<AccountDetailsResponse[]> {
    return fetchApi<AccountDetailsResponse[]>("account_details/")
  },

  async getById(id: number): Promise<AccountDetailsResponse> {
    return fetchApi<AccountDetailsResponse>(`account_details/${id}`)
  },

  async create(user: AccountDetailsCreate): Promise<AccountDetailsResponse> {
    return fetchApi<AccountDetailsResponse>("account_details/", {
      method: "POST",
      body: JSON.stringify(user),
    })
  },

  async update(id: number, user: AccountDetailsCreate): Promise<AccountDetailsResponse> {
    return fetchApi<AccountDetailsResponse>(`account_details/${id}`, {
      method: "PUT",
      body: JSON.stringify(user),
    })
  },
}

// Account Access API (Digital Signatures)
export const accountAccessApi = {
  async getAll(): Promise<AccountAccessResponse[]> {
    return fetchApi<AccountAccessResponse[]>("account_access/")
  },

  async getById(id: number): Promise<AccountAccessResponse> {
    return fetchApi<AccountAccessResponse>(`account_access/${id}`)
  },

  async create(access: AccountAccessCreate): Promise<AccountAccessResponse> {
    return fetchApi<AccountAccessResponse>("account_access/", {
      method: "POST",
      body: JSON.stringify(access),
    })
  },

  async update(id: number, access: AccountAccessCreate): Promise<AccountAccessResponse> {
    return fetchApi<AccountAccessResponse>(`account_access/${id}`, {
      method: "PUT",
      body: JSON.stringify(access),
    })
  },
}

// Combined API functions for working with complete documents
export const documentoCompletoApi = {
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

  async create(documentoCompleto: DocumentoCompleto): Promise<DocumentoCompleto> {
    const { authorizations, links, ...documentoData } = documentoCompleto
    const createdDocumento = await documentoApi.create(documentoData)
    const docId = createdDocumento.id!

    const createdAuthorizations = authorizations
      ? await Promise.all(
          authorizations.map((auth) =>
            autorizacionApi.create({
              ...auth,
              documento_id: docId,
            }),
          ),
        )
      : []

    const createdLinks = links
      ? await Promise.all(
          links.map((link) =>
            linkApi.create({
              ...link,
              documento_id: docId,
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

  async update(documentoCompleto: DocumentoCompleto): Promise<DocumentoCompleto> {
    if (!documentoCompleto.id) {
      throw new Error("Document ID is required for update")
    }

    const { authorizations, links, ...documentoData } = documentoCompleto
    const updatedDocumento = await documentoApi.update(documentoData)
    const docId = updatedDocumento.id!

    const updatedAuthorizations = authorizations
      ? await Promise.all(
          authorizations.map((auth) =>
            auth.id ? autorizacionApi.update(auth) : autorizacionApi.create({ ...auth, documento_id: docId }),
          ),
        )
      : []

    const updatedLinks = links
      ? await Promise.all(
          links.map((link) => (link.id ? linkApi.update(link) : linkApi.create({ ...link, documento_id: docId }))),
        )
      : []

    return {
      ...updatedDocumento,
      authorizations: updatedAuthorizations,
      links: updatedLinks,
    }
  },

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
      notes: "",
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
