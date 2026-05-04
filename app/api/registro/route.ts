import { NextRequest, NextResponse } from 'next/server'
import { isValidToken } from '@/lib/token'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { medicoId, pin, token, tipo, selfie, latitude, longitude } = body

  if (!isValidToken(token)) {
    return NextResponse.json({ error: 'QR Code expirado. Escaneie o codigo atual.' }, { status: 400 })
  }

  if (!medicoId || !pin || !tipo) {
    return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  // Valida PIN
  const { data: medico, error: medicoError } = await supabaseAdmin
    .from('medicos')
    .select('id, nome, pin')
    .eq('id', medicoId)
    .eq('ativo', true)
    .single()

  if (medicoError || !medico) {
    return NextResponse.json({ error: 'Medico nao encontrado.' }, { status: 404 })
  }

  if (medico.pin !== pin) {
    return NextResponse.json({ error: 'PIN incorreto.' }, { status: 401 })
  }

  // Upload selfie
  let selfie_url: string | null = null
  if (selfie && selfie.startsWith('data:image')) {
    const base64 = selfie.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    const filename = `${medicoId}/${Date.now()}.jpg`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('selfies')
      .upload(filename, buffer, { contentType: 'image/jpeg' })

    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('selfies').getPublicUrl(filename)
      selfie_url = urlData?.publicUrl ?? null
    }
  }

  // Salva registro
  const { error: insertError } = await supabaseAdmin.from('registros').insert({
    medico_id: medicoId,
    tipo,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    selfie_url,
    token_usado: token,
  })

  if (insertError) {
    return NextResponse.json({ error: 'Erro ao salvar registro.' }, { status: 500 })
  }

  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const tipoLabel = tipo === 'entrada' ? 'Entrada' : 'Saida'

  return NextResponse.json({
    message: `${tipoLabel} de ${medico.nome} registrada as ${hora}.`,
  })
}
