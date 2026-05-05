import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, buildSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { nome, senha } = await request.json()

  if (!nome || !senha) {
    return NextResponse.json({ error: 'Nome e senha são obrigatórios.' }, { status: 400 })
  }

  let userId: string
  let cargo: string

  // Conta master (env var) — nunca pode ser removida
  if (nome.trim().toLowerCase() === 'admin' && senha === process.env.ADMIN_PASSWORD) {
    userId = 'master'
    cargo = 'admin'
  } else {
    // Busca na tabela de usuários
    const { data, error } = await supabaseAdmin
      .from('admin_usuarios')
      .select('id, senha_hash, cargo, ativo')
      .eq('nome', nome.trim())
      .single()

    if (error || !data || !data.ativo) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })
    }

    if (!verifyPassword(senha, data.senha_hash)) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })
    }

    userId = data.id
    cargo = data.cargo
  }

  const sessionToken = buildSessionCookie(userId, cargo)
  const response = NextResponse.json({ ok: true })

  response.cookies.set('admin_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('admin_session')
  return response
}
