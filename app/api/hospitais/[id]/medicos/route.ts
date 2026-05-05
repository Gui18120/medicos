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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('medico_hospital')
    .select('medico_id, medicos(id, nome, crm)')
    .eq('hospital_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ medicos: data?.map(d => d.medicos) ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { medicoId } = await request.json()
  if (!medicoId) return NextResponse.json({ error: 'medicoId obrigatório.' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('medico_hospital')
    .upsert({ medico_id: medicoId, hospital_id: id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { medicoId } = await request.json()

  const { error } = await supabaseAdmin
    .from('medico_hospital')
    .delete()
    .eq('hospital_id', id)
    .eq('medico_id', medicoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
