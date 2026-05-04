import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { getAdminSessionToken } from '@/lib/token'

async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === getAdminSessionToken()
}

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/medicos/[id]'>) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.nome !== undefined) updates.nome = body.nome
  if (body.crm !== undefined) updates.crm = body.crm
  if (body.email !== undefined) updates.email = body.email || null
  if (body.ativo !== undefined) updates.ativo = body.ativo
  if (body.pin !== undefined) {
    if (!/^\d{4}$/.test(body.pin)) return NextResponse.json({ error: 'PIN invalido.' }, { status: 400 })
    updates.pin = body.pin
  }

  const { data, error } = await supabaseAdmin
    .from('medicos')
    .update(updates)
    .eq('id', id)
    .select('id, nome, crm, email, ativo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ medico: data })
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/medicos/[id]'>) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  const { error } = await supabaseAdmin.from('medicos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
