import { NextRequest, NextResponse } from 'next/server'

/* Esto era middleware.ts. Next 16 renombró la convención a «proxy» —misma
   función, mismo matcher, sólo cambia el nombre del archivo y el de la
   export— y dejaba un aviso de deprecación en cada arranque del server.

   Es lo único que protege el panel: sin esto, /admin y /api/admin quedan
   abiertos. */

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // No proteger el login (página ni API)
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next()
  }

  const token = req.cookies.get('admin_token')?.value
  const secret = process.env.ADMIN_SECRET

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
