import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { parseSessionCookie, getAdminSessionToken, hashPassword } from '@/lib/auth'

async function isAdmin() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (!session) return false
  const parsed = parseSessionCookie(session)
  if (parsed && parsed.cargo === 'admin') return true
  return session === getAdminSessionToken()
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('admin_usuarios')
    .select('id, nome, cargo, ativo, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ usuarios: data })
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nome, senha, cargo } = await request.json()

  if (!nome || !senha) {
    return NextResponse.json({ error: 'Nome e senha são obrigatórios.' }, { status: 400 })
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
  }

  const senha_hash = hashPassword(senha)

  const { data, error } = await supabaseAdmin
    .from('admin_usuarios')
    .insert({ nome: nome.trim(), senha_hash, cargo: cargo || 'admin' })
    .select('id, nome, cargo, ativo, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Nome já cadastrado.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ usuario: data }, { status: 201 })
}
