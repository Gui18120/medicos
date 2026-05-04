import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionToken } from '@/lib/token'

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  const sessionToken = getAdminSessionToken()
  const response = NextResponse.json({ ok: true })

  response.cookies.set('admin_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('admin_session')
  return response
}
