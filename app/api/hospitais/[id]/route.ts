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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if (body.nome) updates.nome = body.nome.trim()
  if (body.endereco !== undefined) updates.endereco = body.endereco?.trim() || null
  if (typeof body.ativo === 'boolean') updates.ativo = body.ativo

  const { data, error } = await supabaseAdmin
    .from('hospitais')
    .update(updates)
    .eq('id', id)
    .select('id, nome, endereco, ativo, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospital: data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('hospitais').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
