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

// Retorna IDs dos hospitais do médico
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('medico_hospital')
    .select('hospital_id')
    .eq('medico_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ hospitalIds: data?.map(d => d.hospital_id) ?? [] })
}

// Sincroniza hospitais do médico (substitui todos)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { hospitalIds } = await request.json()

  await supabaseAdmin.from('medico_hospital').delete().eq('medico_id', id)

  if (hospitalIds?.length > 0) {
    const rows = hospitalIds.map((hid: string) => ({ medico_id: id, hospital_id: hid }))
    const { error } = await supabaseAdmin.from('medico_hospital').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
