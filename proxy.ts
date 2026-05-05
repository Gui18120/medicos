import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const SECRET = process.env.TOKEN_SECRET || 'change-this-secret-in-production'

function validateSession(value: string | undefined): boolean {
  if (!value) return false

  // Novo formato: userId:cargo:hmac
  const parts = value.split(':')
  if (parts.length === 3) {
    const [userId, cargo, hmac] = parts
    const expectedHmac = crypto.createHmac('sha256', SECRET).update(`${userId}:${cargo}`).digest('hex')
    try {
      if (crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) return true
    } catch {}
  }

  // Formato legado: string hex única
  const legacy = crypto.createHmac('sha256', SECRET).update('admin-session').digest('hex')
  return value === legacy
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('admin_session')?.value
    if (!validateSession(session)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
