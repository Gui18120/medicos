import { NextRequest, NextResponse } from 'next/server'

// Gera o session token usando Web Crypto API (compatível com Edge Runtime)
async function getExpectedToken(): Promise<string> {
  const secret = process.env.TOKEN_SECRET || 'change-this-secret-in-production'
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('admin-session'))
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = request.cookies.get('admin_session')?.value
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const expected = await getExpectedToken()
    if (session !== expected) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
