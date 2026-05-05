import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { parseSessionCookie, getAdminSessionToken } from '@/lib/auth'

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
    .from('hospitais')
    .select('id, nome, endereco, ativo, created_at')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospitais: data })
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nome, endereco } = await request.json()
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('hospitais')
    .insert({ nome: nome.trim(), endereco: endereco?.trim() || null })
    .select('id, nome, endereco, ativo, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospital: data }, { status: 201 })
}
