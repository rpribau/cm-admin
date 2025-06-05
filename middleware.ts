import { type NextRequest, NextResponse } from "next/server"

// Rutas que no requieren autenticación
const publicRoutes = ["/login", "/api/auth/login", "/api/auth/logout"]

// Rutas de API que no necesitan redirección a login (solo devolverán error 401)
const apiRoutes = ["/api/"]

// Archivos estáticos y recursos que no necesitan autenticación
const staticFiles = ["/favicon.ico", "/casa-monarca.ico", "/_next", "/images", "/icons", "/manifest.json"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir archivos estáticos sin verificación
  const isStaticFile = staticFiles.some((route) => pathname.startsWith(route))
  if (isStaticFile) {
    return NextResponse.next()
  }

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Verificar si es una ruta de API
  const isApiRoute = apiRoutes.some((route) => pathname.startsWith(route))

  // Obtener el token de autenticación
  const authToken = request.cookies.get("auth-token")?.value

  // Si es una ruta pública, permitir acceso
  if (isPublicRoute) {
    // Si está autenticado y trata de acceder al login, redirigir al dashboard
    if (pathname === "/login" && authToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // Si no es una ruta pública y el usuario no está autenticado
  if (!isPublicRoute && !authToken) {
    // Para rutas de API, devolver error 401 en lugar de redireccionar
    if (isApiRoute) {
      return new NextResponse(JSON.stringify({ success: false, message: "No autenticado" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    }

    // Para rutas normales, redireccionar al login con la URL de retorno
    const returnUrl = encodeURIComponent(pathname)
    return NextResponse.redirect(new URL(`/login?returnUrl=${returnUrl}`, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)",
  ],
}
