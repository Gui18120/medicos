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

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { medicos } = await request.json()

  if (!Array.isArray(medicos) || medicos.length === 0) {
    return NextResponse.json({ error: 'Nenhum médico enviado.' }, { status: 400 })
  }

  let inseridos = 0
  let pulados = 0
  const erros: string[] = []

  for (const m of medicos) {
    const nome = String(m.nome ?? '').trim()
    const crm = String(m.crm ?? '').trim()
    const pin = String(m.pin ?? '').trim()
    const email = m.email ? String(m.email).trim() : null

    if (!nome || !crm || !pin) {
      erros.push(`Linha ignorada — dados incompletos: ${JSON.stringify(m)}`)
      pulados++
      continue
    }

    if (!/^\d{4}$/.test(pin)) {
      erros.push(`PIN inválido para ${nome} (deve ter 4 dígitos): ${pin}`)
      pulados++
      continue
    }

    const { error } = await supabaseAdmin
      .from('medicos')
      .insert({ nome, crm, email, pin })

    if (error) {
      if (error.code === '23505') {
        pulados++
      } else {
        erros.push(`Erro ao inserir ${nome}: ${error.message}`)
        pulados++
      }
    } else {
      inseridos++
    }
  }

  return NextResponse.json({ inseridos, pulados, erros })
}
