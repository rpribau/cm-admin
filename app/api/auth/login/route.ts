import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import type { UserRole } from "@/contexts/auth-context"
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
    } | null = null

    // 1. Check for Superuser
    if (email.toLowerCase() === SUPERUSER_EMAIL) {
      if (password === SUPERUSER_PASSWORD) {
        authenticatedUser = {
          id: `user-superuser-${Date.now()}`,
          name: SUPERUSER_NAME,
          email: SUPERUSER_EMAIL,
          role: SUPERUSER_ROLE,
        }
      }
    } else {
      // 2. Authenticate against /account_details endpoint for other users
      try {
        const allAccounts = await accountDetailsApi.getAll()
        const apiUser = allAccounts.find(
          (acc: AccountDetailsResponse) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password,
        )

        if (apiUser) {
          let role: UserRole
          const apiUserType = apiUser.type.toLowerCase() as UserRole // Assuming type matches a base role

          if (apiUser.authorizacion) {
            // Construct admin role, e.g., "admin-humanitario"
            role = `admin-${apiUserType}` as UserRole
          } else {
            role = apiUserType
          }

          // Validate if the constructed role is a valid UserRole
          // This is a basic check; more robust validation might be needed if types are very dynamic
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
            role = apiUserType // Fallback to base type if admin variant is not standard
          }

          authenticatedUser = {
            id: apiUser.id, // Use ID from API
            name: apiUser.name, // Use name from API
            email: apiUser.email,
            role: role,
          }
        }
      } catch (apiError) {
        console.error("API error during authentication:", apiError)
        // If API is down or there's an error, non-superusers can't log in
        return NextResponse.json(
          { success: false, message: "Error de autenticación. Intente más tarde." },
          { status: 500 },
        )
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

    // It's good practice to also store user's name and email if they are frequently accessed by /api/auth/me
    // to avoid reconstructing them, but for now, role is the most critical for /me.
    // Storing more in cookies increases their size.

    return NextResponse.json({
      success: true,
      user: {
        id: authenticatedUser.id.toString(), // Ensure ID is string
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
      },
    })
  } catch (error) {
    console.error("Error en la autenticación:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
