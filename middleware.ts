import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  // No proteger la página de login
  if (req.nextUrl.pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('admin_token')?.value
  const secret = process.env.ADMIN_SECRET

  if (!token || !secret || token !== secret) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
