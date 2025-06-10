import { type NextRequest, NextResponse } from "next/server"
import type { UserRole } from "@/contexts/auth-provider"
import { accountDetailsApi, type AccountDetailsResponse } from "@/lib/api-service"

// Superuser credentials (mantenido como requerimiento especial)
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

    // 1. Check for Superuser first
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
        console.log(`🔍 Buscando usuario en API: ${email}`)
        const allAccounts = await accountDetailsApi.getAll()

        const apiUser = allAccounts.find(
          (acc: AccountDetailsResponse) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password,
        )

        if (apiUser) {
          console.log(`✅ Usuario encontrado en API: ${apiUser.name}`)

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
            console.warn(`⚠️ Rol inválido construido para usuario ${apiUser.email}: ${role}. Usando tipo base.`)
            role = primaryType // Fallback to base type if admin variant is not standard
          }

          authenticatedUser = {
            id: apiUser.id, // Use ID from API
            name: apiUser.name, // Use name from API
            email: apiUser.email,
            role: role,
            types: userTypes, // Include all user types
          }
        } else {
          console.log(`❌ Usuario no encontrado o credenciales incorrectas: ${email}`)
        }
      } catch (apiError) {
        console.error("❌ Error de API durante autenticación:", apiError)
        return NextResponse.json(
          { success: false, message: "Error de autenticación. No se pudo conectar con el servidor API externo." },
          { status: 500 },
        )
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ success: false, message: "Credenciales inválidas" }, { status: 401 })
    }

    // Generate a token with user data
    const tokenData = {
      userId: authenticatedUser.id.toString(),
      email: authenticatedUser.email,
      name: authenticatedUser.name,
      role: authenticatedUser.role,
      types: authenticatedUser.types,
      timestamp: Date.now(),
    }

    const token = Buffer.from(JSON.stringify(tokenData)).toString("base64")

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id.toString(), // Ensure ID is string
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        types: authenticatedUser.types,
      },
    })

    // Set session cookie with improved configuration
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    console.log(`✅ Login exitoso para: ${authenticatedUser.name} (${authenticatedUser.role})`)
    return response
  } catch (error) {
    console.error("❌ Error en la autenticación:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
