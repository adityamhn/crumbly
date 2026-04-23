import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect admin routes (except login page and login API)
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const token = request.cookies.get('admin_token')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    try {
      await jwtVerify(token, JWT_SECRET)
    } catch {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // Protect admin API routes (except login)
  if (pathname.startsWith('/api/admin') && !pathname.endsWith('/login')) {
    const token = request.cookies.get('admin_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await jwtVerify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path+', '/api/admin/:path*'],
}
