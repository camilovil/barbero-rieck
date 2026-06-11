import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // No proteger el login (página ni API)
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next()
  }

  const token = req.cookies.get('admin_token')?.value
  const secret = process.env.ADMIN_SECRET

  // Permitir migración con secret como query param (uso remoto de una sola vez)
  if (pathname === '/api/admin/migrate-times' && secret && req.nextUrl.searchParams.get('secret') === secret) {
    return NextResponse.next()
  }

  if (!token || !secret || token !== secret) {
    // Las rutas API devuelven 401 JSON, las páginas redirigen al login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
