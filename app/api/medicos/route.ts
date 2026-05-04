import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { getAdminSessionToken } from '@/lib/token'

async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === getAdminSessionToken()
}

// Listagem pública (para a tela de ponto dos médicos)
export async function GET(request: NextRequest) {
  const adminOnly = request.nextUrl.searchParams.get('admin') === '1'

  if (adminOnly) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await supabaseAdmin
      .from('medicos')
      .select('id, nome, crm, email, ativo, created_at')
      .order('nome')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ medicos: data })
  }

  // Público: retorna apenas ativos sem PIN
  const { data, error } = await supabaseAdmin
    .from('medicos')
    .select('id, nome, crm')
    .eq('ativo', true)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ medicos: data })
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nome, crm, email, pin } = await request.json()

  if (!nome || !crm || !pin) {
    return NextResponse.json({ error: 'Nome, CRM e PIN sao obrigatorios.' }, { status: 400 })
  }

  if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN deve ter exatamente 4 digitos.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('medicos')
    .insert({ nome, crm, email: email || null, pin })
    .select('id, nome, crm, email, ativo, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'CRM ja cadastrado.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ medico: data }, { status: 201 })
}
