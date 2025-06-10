// Cambiar la primera línea para usar explícitamente la dirección IPv4
const API_BASE_URL = "http://4.157.251.39:8000"

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
  date?: string | null // Cambiado para que coincida con el schema
}

export interface LinkModel {
  id?: number | null
  documento_id: number
  title: string
  url: string
}

// Nueva interfaz para FirmaDocumentoModel
export interface FirmaDocumentoModel {
  id?: number | null
  id_documentos: number
  url_firma: string
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

export interface SignatureRequest {
  account_access_id: number
  documento_id: number
  public_key_pem?: string // Hacer opcional ya que no se usa en el proceso automatizado
}

export interface SignatureResponse {
  documento_id: number
  signature: string
  message_hash: string
  success: boolean
  message: string
}

export interface DocumentoFirmado {
  filename: string
  path: string
  size: number
  created_at: string
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

// Modificar la función fetchApi para mostrar más detalles sobre errores
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint
  const url = `${API_BASE_URL}/${cleanEndpoint}`

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
    // Agregar headers para CORS si es necesario
    "Access-Control-Allow-Origin": "*",
  }

  try {
    console.log(`Fetching from: ${url}`)
    console.log(`Method: ${options.method || "GET"}`)
    if (options.body) {
      console.log(`Body:`, JSON.parse(options.body as string))
    }

    // Agregar un timeout para evitar esperas largas si hay problemas de conexión
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos de timeout para API externa

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: controller.signal,
      // Agregar mode para CORS
      mode: "cors",
    })

    clearTimeout(timeoutId)

    console.log(`Response status: ${response.status}`)
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        console.log(`Error response:`, errorData)
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => `${err.loc.join(" -> ")}: ${err.msg}`).join("; ")
          } else {
            errorMessage = errorData.detail
          }
        }
      } catch (e) {
        console.log(`No se pudo parsear la respuesta de error como JSON`)
        // Intentar obtener el texto de error
        try {
          const errorText = await response.text()
          console.log(`Error response text:`, errorText)
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        } catch (textError) {
          console.log(`No se pudo obtener el texto de error`)
        }
      }
      throw new ApiError(errorMessage, response.status)
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return null as T
    }

    const responseData = await response.json()
    console.log(`Response data:`, responseData)
    return responseData
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error)

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(
        `No se pudo conectar con el servidor API en ${url}. Verifique que el servidor esté en ejecución y accesible.`,
        0,
      )
    }

    if (error.name === "AbortError") {
      throw new ApiError(
        `La conexión con ${url} ha excedido el tiempo de espera. Verifique que el servidor esté respondiendo.`,
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
    console.log("🔄 Actualizando documento con datos:", documento)

    // Asegurar que todos los campos requeridos estén presentes según el schema
    const documentoToUpdate: DocumentoModel = {
      id: documento.id,
      header: documento.header,
      type: documento.type || null,
      status: documento.status || null,
      target: documento.target || null,
      limit: documento.limit || null,
      limit_date: documento.limit_date,
      reviewer: documento.reviewer || null,
      description: documento.description || null,
    }

    return fetchApi<DocumentoModel>("documentos/", {
      method: "PUT",
      body: JSON.stringify(documentoToUpdate),
    })
  },
}

// CORREGIDO: API de autorizaciones usando solo endpoints que existen
export const autorizacionApi = {
  async getAll(): Promise<AutorizacionModel[]> {
    try {
      return fetchApi<AutorizacionModel[]>("autorizaciones/")
    } catch (error) {
      console.error("Error al obtener todas las autorizaciones:", error)
      return []
    }
  },

  async create(autorizacion: AutorizacionModel): Promise<AutorizacionModel> {
    // Asegurar que los campos requeridos estén presentes
    const autorizacionToCreate: AutorizacionModel = {
      id: autorizacion.id || null,
      documento_id: autorizacion.documento_id,
      name: autorizacion.name,
      role: autorizacion.role,
      status: autorizacion.status || null,
      date: autorizacion.date || null,
    }

    return fetchApi<AutorizacionModel>("autorizaciones/", {
      method: "POST",
      body: JSON.stringify(autorizacionToCreate),
    })
  },

  async update(autorizacion: AutorizacionModel): Promise<AutorizacionModel> {
    console.log("🔄 Actualizando autorización con datos:", autorizacion)

    // Asegurar que todos los campos requeridos estén presentes según el schema
    const autorizacionToUpdate: AutorizacionModel = {
      id: autorizacion.id,
      documento_id: autorizacion.documento_id,
      name: autorizacion.name,
      role: autorizacion.role,
      status: autorizacion.status || null,
      date: autorizacion.date || null,
    }

    return fetchApi<AutorizacionModel>("autorizaciones/", {
      method: "PUT",
      body: JSON.stringify(autorizacionToUpdate),
    })
  },

  // CORREGIDO: Usar solo GET /autorizaciones/ y filtrar en el cliente
  async getByDocumentoId(documentoId: number): Promise<AutorizacionModel[]> {
    try {
      console.log(`🔍 Obteniendo autorizaciones para documento ${documentoId} (filtrado local)`)
      const allAuths = await this.getAll()
      const filteredAuths = allAuths.filter((auth) => auth.documento_id === documentoId)
      console.log(`✅ Obtenidas ${filteredAuths.length} autorizaciones para documento ${documentoId}`)
      return filteredAuths
    } catch (error) {
      console.error(`Error al obtener autorizaciones para documento ${documentoId}:`, error)
      return []
    }
  },

  // CORREGIDO: Usar solo GET /autorizaciones/ y filtrar en el cliente
  async getByDocumentoIdAndNombre(documentoId: number, nombre: string): Promise<AutorizacionModel | null> {
    try {
      console.log(`🔍 Buscando autorización para documento ${documentoId} y usuario ${nombre} (filtrado local)`)
      const allAuths = await this.getAll()
      const autorization = allAuths.find((auth) => auth.documento_id === documentoId && auth.name === nombre)
      console.log(`${autorization ? "✅ Encontrada" : "❌ No encontrada"} autorización para ${nombre}`)
      return autorization || null
    } catch (error) {
      console.error(`Error al obtener autorización para documento ${documentoId} y usuario ${nombre}:`, error)
      return null
    }
  },

  // Agregar método para eliminar autorizaciones duplicadas
  async deleteDuplicates(documentoId: number): Promise<void> {
    try {
      console.log(`🧹 Iniciando limpieza de duplicados para documento ${documentoId}`)
      const autorizaciones = await this.getByDocumentoId(documentoId)

      // Agrupar por nombre para encontrar duplicados
      const authsByName = new Map()
      const duplicatesToDelete = []

      for (const auth of autorizaciones) {
        if (!auth.name) continue

        if (authsByName.has(auth.name)) {
          // Es un duplicado, decidir cuál mantener
          const existing = authsByName.get(auth.name)

          if (existing.status === "pending" && auth.status !== "pending") {
            // El nuevo tiene un estado más avanzado, eliminar el existente
            duplicatesToDelete.push(existing)
            authsByName.set(auth.name, auth)
          } else if (auth.status === "pending" && existing.status !== "pending") {
            // El existente tiene un estado más avanzado, eliminar el nuevo
            duplicatesToDelete.push(auth)
          } else if (auth.id && existing.id) {
            // Ambos tienen el mismo estado, mantener el más reciente
            if (auth.id > existing.id) {
              duplicatesToDelete.push(existing)
              authsByName.set(auth.name, auth)
            } else {
              duplicatesToDelete.push(auth)
            }
          }
        } else {
          authsByName.set(auth.name, auth)
        }
      }

      console.log(`🗑️ Encontrados ${duplicatesToDelete.length} duplicados para eliminar`)

      // Aquí se implementaría la eliminación real si el API lo soporta
      // Por ahora solo registramos los que se eliminarían
      for (const dup of duplicatesToDelete) {
        console.log(`  - Duplicado: ${dup.name} (ID: ${dup.id})`)
      }
    } catch (error) {
      console.error(`Error al limpiar duplicados:`, error)
    }
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

// Nuevo API para FirmaDocumentos
export const firmaDocumentoApi = {
  async getAll(): Promise<FirmaDocumentoModel[]> {
    return fetchApi<FirmaDocumentoModel[]>("firma_documentos/")
  },

  async create(firmaDocumento: FirmaDocumentoModel): Promise<FirmaDocumentoModel> {
    return fetchApi<FirmaDocumentoModel>("firma_documentos/", {
      method: "POST",
      body: JSON.stringify(firmaDocumento),
    })
  },

  async update(firmaDocumento: FirmaDocumentoModel): Promise<FirmaDocumentoModel> {
    return fetchApi<FirmaDocumentoModel>("firma_documentos/", {
      method: "PUT",
      body: JSON.stringify(firmaDocumento),
    })
  },

  async delete(firmaId: number): Promise<void> {
    return fetchApi<void>(`firma_documentos/${firmaId}`, {
      method: "DELETE",
    })
  },

  async getByDocumentoId(documentoId: number): Promise<FirmaDocumentoModel[]> {
    const allFirmas = await this.getAll()
    return allFirmas.filter((firma) => firma.id_documentos === documentoId)
  },
}

// Document upload API function
export const documentUploadApi = {
  async uploadDocument(
    file: File,
    documentData: {
      header: string
      type: string
      status: string
      target: number
      limit: number
      limit_date: string
      reviewer: string
      description: string
    },
  ): Promise<any> {
    const formData = new FormData()
    formData.append("file", file)

    const queryParams = new URLSearchParams({
      header: documentData.header,
      type: documentData.type,
      status: documentData.status,
      target: documentData.target.toString(),
      limit: documentData.limit.toString(),
      limit_date: documentData.limit_date,
      reviewer: documentData.reviewer,
      description: documentData.description,
    })

    const url = `${API_BASE_URL}/subir_documento/?${queryParams}`

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        mode: "cors", // Agregar mode para CORS
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

      return response.json()
    } catch (error) {
      console.error(`Error uploading document:`, error)
      throw error
    }
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

  async delete(id: number): Promise<void> {
    return fetchApi<void>(`account_details/${id}`, {
      method: "DELETE",
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

  // Nueva función para verificar si un usuario tiene acceso de firma
  async getByUserName(userName: string): Promise<AccountAccessResponse | null> {
    try {
      console.log(`🔍 Buscando account_access para usuario: ${userName}`)
      const allAccess = await this.getAll()
      console.log(`📋 Total de account_access encontrados: ${allAccess.length}`)

      // Mostrar todos los account_access para debugging
      console.log(`📋 Todos los account_access disponibles:`)
      allAccess.forEach((access, index) => {
        console.log(
          `  ${index + 1}. ID: ${access.id}, Signer: "${access.signer_name}", Employee: "${access.numero_empleado}"`,
        )
      })

      // Buscar coincidencias exactas o parciales
      const userAccess = allAccess.find(
        (access) =>
          access.signer_name === userName ||
          access.signer_name.includes(userName.split(" ")[0]) ||
          userName.includes(access.signer_name) ||
          access.signer_name.toLowerCase() === userName.toLowerCase() ||
          access.signer_name.toLowerCase().includes(userName.toLowerCase().split(" ")[0]),
      )

      if (userAccess) {
        console.log(`✅ Encontrado account_access para ${userName}:`, userAccess)
        return userAccess
      } else {
        console.log(`❌ No se encontró account_access para ${userName}`)
        console.log(`🔍 Intentando búsqueda más flexible...`)

        // Búsqueda más flexible por palabras individuales
        const userWords = userName.toLowerCase().split(" ")
        const flexibleMatch = allAccess.find((access) => {
          const signerWords = access.signer_name.toLowerCase().split(" ")
          return userWords.some((userWord) =>
            signerWords.some((signerWord) => userWord.includes(signerWord) || signerWord.includes(userWord)),
          )
        })

        if (flexibleMatch) {
          console.log(`✅ Encontrado account_access con búsqueda flexible para ${userName}:`, flexibleMatch)
          return flexibleMatch
        }

        return null
      }
    } catch (error) {
      console.error(`❌ Error al buscar account_access para ${userName}:`, error)
      return null
    }
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
        doc.authorizaciones?.map((auth) => ({
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
      target: frontendDoc.target ? Number.parseInt(frontendDoc.target.toString()) : null,
      limit: frontendDoc.limit ? Number.parseInt(frontendDoc.limit.toString()) : null,
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

// Digital Signature API functions
export const digitalSignatureApi = {
  async signDocument(data: SignatureRequest): Promise<SignatureResponse> {
    // Construir los query parameters
    const queryParams = new URLSearchParams({
      account_access_id: data.account_access_id.toString(),
      documento_id: data.documento_id.toString(),
    })

    return fetchApi<SignatureResponse>(`sign_document/?${queryParams}`, {
      method: "POST",
      // No enviar body ya que los parámetros van en la URL
    })
  },

  // Nuevo endpoint para firmar documentos con carga
  async signDocumentWithUpload(data: SignatureRequest): Promise<SignatureResponse> {
    const queryParams = new URLSearchParams({
      account_access_id: data.account_access_id.toString(),
      documento_id: data.documento_id.toString(),
    })

    return fetchApi<SignatureResponse>(`sign_document_with_upload/?${queryParams}`, {
      method: "POST",
    })
  },

  async verifySignature(data: {
    documento_id: number
    signature: string
    public_key_pem: string
  }): Promise<any> {
    return fetchApi<any>("verify_signature/", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async downloadDocument(linkId: number): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/links/download/${linkId}`)
    if (!response.ok) {
      throw new ApiError(`Error downloading document: ${response.statusText}`, response.status)
    }
    return response.blob()
  },

  async getPublicKey(accessId: number): Promise<string> {
    return fetchApi<string>(`account_access/${accessId}/public_key`)
  },

  // Función mejorada para documentos firmados
  async getDocumentosFirmados(): Promise<DocumentoFirmado[]> {
    try {
      console.log("🌐 Llamando a endpoint: firma_documentos/")
      const response = await fetchApi<FirmaDocumentoModel[]>("firma_documentos/")

      console.log("📡 Respuesta del API:", response)

      // Según la documentación, debería devolver un array directamente
      if (Array.isArray(response)) {
        console.log("✅ Respuesta es array directo con", response.length, "elementos")
        // Convertir FirmaDocumentoModel a DocumentoFirmado para compatibilidad
        return response.map((firma) => ({
          filename: `documento_firmado_${firma.id_documentos}_${firma.id}.pdf`,
          path: firma.url_firma,
          size: 0, // No disponible en la respuesta
          created_at: "", // No disponible en la respuesta
        }))
      }

      console.warn("⚠️ Respuesta no es un array, devolviendo array vacío")
      return []
    } catch (error) {
      console.error("❌ Error en getDocumentosFirmados:", error)
      return []
    }
  },

  async downloadDocumentoFirmado(filename: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/documentos_firmados/${encodeURIComponent(filename)}`)
    if (!response.ok) {
      throw new ApiError(`Error downloading signed document: ${response.statusText}`, response.status)
    }
    return response.blob()
  },
}
