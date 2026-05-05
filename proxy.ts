import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const SECRET = process.env.TOKEN_SECRET || 'change-this-secret-in-production'

function parseSession(value: string | undefined): { userId: string; cargo: string } | null {
  if (!value) return null

  // Novo formato: userId:cargo:hmac
  const parts = value.split(':')
  if (parts.length === 3) {
    const [userId, cargo, hmac] = parts
    const expectedHmac = crypto.createHmac('sha256', SECRET).update(`${userId}:${cargo}`).digest('hex')
    try {
      if (crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
        return { userId, cargo }
      }
    } catch {}
  }

  // Formato legado: admin master
  const legacy = crypto.createHmac('sha256', SECRET).update('admin-session').digest('hex')
  if (value === legacy) return { userId: 'master', cargo: 'admin' }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('admin_session')?.value
    const parsed = parseSession(session)

    if (!parsed) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Médico só acessa o kiosk
    if (parsed.cargo === 'medico') {
      return NextResponse.redirect(new URL('/kiosk', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
