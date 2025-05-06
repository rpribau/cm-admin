import { type NextRequest, NextResponse } from "next/server"

// Rutas que no requieren autenticación
const publicRoutes = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Obtener el token de autenticación
  const authToken = request.cookies.get("auth-token")?.value

  // Si es una ruta pública y el usuario está autenticado, redirigir al dashboard
  if (isPublicRoute && authToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Si no es una ruta pública y el usuario no está autenticado, redirigir al login
  if (!isPublicRoute && !authToken && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
