import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { getAdminSessionToken } from '@/lib/token'

async function isAdmin() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === getAdminSessionToken()
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const dataInicio = searchParams.get('inicio') // YYYY-MM-DD
  const dataFim = searchParams.get('fim')       // YYYY-MM-DD
  const medicoId = searchParams.get('medico_id')

  let query = supabaseAdmin
    .from('registros')
    .select('*, medicos(nome, crm)')
    .order('timestamp', { ascending: false })

  if (dataInicio) query = query.gte('timestamp', `${dataInicio}T00:00:00`)
  if (dataFim) query = query.lte('timestamp', `${dataFim}T23:59:59`)
  if (medicoId) query = query.eq('medico_id', medicoId)

  const { data: registros, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupa por medico + dia para calcular horas
  const porDia: Record<string, Record<string, { entradas: Date[], saidas: Date[] }>> = {}

  for (const r of registros ?? []) {
    const medicoNome = (r.medicos as { nome: string })?.nome ?? r.medico_id
    const dia = r.timestamp.slice(0, 10)
    if (!porDia[medicoNome]) porDia[medicoNome] = {}
    if (!porDia[medicoNome][dia]) porDia[medicoNome][dia] = { entradas: [], saidas: [] }

    const ts = new Date(r.timestamp)
    if (r.tipo === 'entrada') porDia[medicoNome][dia].entradas.push(ts)
    else porDia[medicoNome][dia].saidas.push(ts)
  }

  // Calcula horas por dia
  const resumo = Object.entries(porDia).map(([medico, dias]) => ({
    medico,
    dias: Object.entries(dias).map(([dia, { entradas, saidas }]) => {
      let totalMs = 0
      const pares = Math.min(entradas.length, saidas.length)
      const ent = [...entradas].sort((a, b) => a.getTime() - b.getTime())
      const sai = [...saidas].sort((a, b) => a.getTime() - b.getTime())
      for (let i = 0; i < pares; i++) {
        totalMs += sai[i].getTime() - ent[i].getTime()
      }
      const horas = Math.floor(totalMs / 3600000)
      const minutos = Math.floor((totalMs % 3600000) / 60000)
      return {
        dia,
        entradas: entradas.length,
        saidas: saidas.length,
        horas_trabalhadas: `${horas}h${minutos.toString().padStart(2, '0')}m`,
        horas_ms: totalMs,
      }
    }),
  }))

  return NextResponse.json({ registros, resumo })
}
