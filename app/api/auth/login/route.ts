import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { UserRole } from "@/contexts/auth-provider"
import { accountDetailsApi, type AccountDetailsResponse } from "@/lib/api-service"

// Superuser credentials (kept as per requirement)
const SUPERUSER_EMAIL = "superuser@email.com"
const SUPERUSER_PASSWORD = "password"
const SUPERUSER_NAME = "Super Usuario"
const SUPERUSER_ROLE: UserRole = "superuser"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    let authenticatedUser: {
      id: string | number
      name: string
      email: string
      role: UserRole
      types?: string[]
    } | null = null

    // 1. Check for Superuser
    if (email.toLowerCase() === SUPERUSER_EMAIL) {
      if (password === SUPERUSER_PASSWORD) {
        authenticatedUser = {
          id: `user-superuser-${Date.now()}`,
          name: SUPERUSER_NAME,
          email: SUPERUSER_EMAIL,
          role: SUPERUSER_ROLE,
          types: ["todos"], // Superuser has access to all types
        }
      }
    } else {
      // 2. Authenticate against /account_details endpoint for other users
      try {
        // Modificar la parte donde se intenta usar el proxy para usar una URL absoluta
        // Usar una URL absoluta con la dirección IPv4 explícita
        const apiUrl = "http://127.0.0.1:8000/account_details"
        console.log(`Intentando autenticar usando la API directamente: ${apiUrl}`)

        const response = await fetch(apiUrl, {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Error al conectar con la API: ${response.status} ${response.statusText}`)
        }

        const allAccounts = await response.json()

        const apiUser = allAccounts.find(
          (acc: AccountDetailsResponse) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password,
        )

        if (apiUser) {
          // Parse multiple types from comma-separated string
          const userTypes = apiUser.type.includes(",")
            ? apiUser.type.split(",").map((t) => t.trim().toLowerCase())
            : [apiUser.type.toLowerCase()]

          // Determine primary role based on authorization and first type
          const primaryType = userTypes[0] as UserRole
          let role: UserRole

          if (apiUser.authorizacion) {
            // Construct admin role, e.g., "admin-humanitario"
            role = `admin-${primaryType}` as UserRole
          } else {
            role = primaryType
          }

          // Validate if the constructed role is a valid UserRole
          const validRoles: UserRole[] = [
            "humanitario",
            "psicosocial",
            "legal",
            "comunicacion",
            "almacen",
            "admin-humanitario",
            "admin-psicosocial",
            "admin-legal",
            "admin-comunicacion",
            "admin-almacen",
            "superuser",
          ]

          if (!validRoles.includes(role)) {
            console.warn(`Invalid role constructed for user ${apiUser.email}: ${role}. Defaulting to base type.`)
            role = primaryType // Fallback to base type if admin variant is not standard
          }

          authenticatedUser = {
            id: apiUser.id, // Use ID from API
            name: apiUser.name, // Use name from API
            email: apiUser.email,
            role: role,
            types: userTypes, // Include all user types
          }
        }
      } catch (apiError) {
        console.error("API error during authentication:", apiError)
        // Si la API falla, intentar con accountDetailsApi como fallback
        try {
          const allAccounts = await accountDetailsApi.getAll()
          const apiUser = allAccounts.find(
            (acc: AccountDetailsResponse) =>
              acc.email.toLowerCase() === email.toLowerCase() && acc.password === password,
          )

          if (apiUser) {
            // Mismo código de procesamiento que arriba
            const userTypes = apiUser.type.includes(",")
              ? apiUser.type.split(",").map((t) => t.trim().toLowerCase())
              : [apiUser.type.toLowerCase()]

            const primaryType = userTypes[0] as UserRole
            let role: UserRole

            if (apiUser.authorizacion) {
              role = `admin-${primaryType}` as UserRole
            } else {
              role = primaryType
            }

            const validRoles: UserRole[] = [
              "humanitario",
              "psicosocial",
              "legal",
              "comunicacion",
              "almacen",
              "admin-humanitario",
              "admin-psicosocial",
              "admin-legal",
              "admin-comunicacion",
              "admin-almacen",
              "superuser",
            ]

            if (!validRoles.includes(role)) {
              console.warn(`Invalid role constructed for user ${apiUser.email}: ${role}. Defaulting to base type.`)
              role = primaryType
            }

            authenticatedUser = {
              id: apiUser.id,
              name: apiUser.name,
              email: apiUser.email,
              role: role,
              types: userTypes,
            }
          }
        } catch (fallbackError) {
          console.error("Fallback authentication also failed:", fallbackError)
          return NextResponse.json(
            { success: false, message: "Error de autenticación. No se pudo conectar con el servidor API." },
            { status: 500 },
          )
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 401 })
    }

    // Generate a simulated token
    const token = `token-${authenticatedUser.role}-${Date.now()}`

    // Set session cookies
    const cookieStore = await cookies()
    cookieStore.set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "strict",
    })

    cookieStore.set({
      name: "user-role",
      value: authenticatedUser.role,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: "strict",
    })

    // Store user types for multi-type users
    if (authenticatedUser.types) {
      cookieStore.set({
        name: "user-types",
        value: authenticatedUser.types.join(","),
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: "strict",
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id.toString(), // Ensure ID is string
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        types: authenticatedUser.types,
      },
    })
  } catch (error) {
    console.error("Error en la autenticación:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
