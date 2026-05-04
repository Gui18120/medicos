'use client'

import { useEffect, useState } from 'react'

type Registro = {
  id: string
  tipo: 'entrada' | 'saida'
  timestamp: string
  latitude: number | null
  longitude: number | null
  selfie_url: string | null
  medicos: { nome: string; crm: string }
}

type DiaSummary = {
  dia: string
  entradas: number
  saidas: number
  horas_trabalhadas: string
  horas_ms: number
}

type ResumoMedico = {
  medico: string
  dias: DiaSummary[]
}

function getWeekRange() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    inicio: monday.toISOString().slice(0, 10),
    fim: sunday.toISOString().slice(0, 10),
  }
}

export default function RelatoriosPage() {
  const week = getWeekRange()
  const [inicio, setInicio] = useState(week.inicio)
  const [fim, setFim] = useState(week.fim)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [resumo, setResumo] = useState<ResumoMedico[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'resumo' | 'detalhado'>('resumo')

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/relatorios?inicio=${inicio}&fim=${fim}`)
    const data = await res.json()
    setRegistros(data.registros || [])
    setResumo(data.resumo || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const formatHora = (ts: string) =>
    new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatDia = (dia: string) =>
    new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })

  const totalHoras = resumo.reduce((acc, m) => acc + m.dias.reduce((a, d) => a + d.horas_ms, 0), 0)
  const totalHorasFormatted = `${Math.floor(totalHoras / 3600000)}h${Math.floor((totalHoras % 3600000) / 60000).toString().padStart(2, '0')}m`

  const exportCSV = () => {
    const rows = [['Medico', 'CRM', 'Tipo', 'Data', 'Hora', 'GPS']]
    for (const r of registros) {
      rows.push([
        r.medicos?.nome ?? '',
        r.medicos?.crm ?? '',
        r.tipo,
        r.timestamp.slice(0, 10),
        formatHora(r.timestamp),
        r.latitude ? `${r.latitude},${r.longitude}` : '',
      ])
    }
    const csv = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ponto-${inicio}-${fim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Relatorios</h1>
        <button
          onClick={exportCSV}
          className="px-5 py-2 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Data inicio</label>
            <input
              type="date"
              value={inicio}
              onChange={e => setInicio(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Data fim</label>
            <input
              type="date"
              value={fim}
              onChange={e => setFim(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            {loading ? 'Buscando...' : 'Filtrar'}
          </button>

          {/* Atalhos */}
          <div className="flex gap-2 ml-4">
            {[
              { label: 'Hoje', fn: () => { const t = new Date().toISOString().slice(0, 10); setInicio(t); setFim(t) } },
              { label: 'Esta semana', fn: () => { const w = getWeekRange(); setInicio(w.inicio); setFim(w.fim) } },
              { label: 'Este mes', fn: () => {
                const now = new Date()
                setInicio(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
                setFim(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))
              }},
            ].map(s => (
              <button
                key={s.label}
                onClick={s.fn}
                className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-2xl p-5 text-blue-700">
          <p className="text-3xl font-bold">{registros.length}</p>
          <p className="text-sm font-medium mt-1 opacity-80">Total de registros</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-5 text-purple-700">
          <p className="text-3xl font-bold">{resumo.length}</p>
          <p className="text-sm font-medium mt-1 opacity-80">Medicos no periodo</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-5 text-green-700">
          <p className="text-3xl font-bold">{totalHorasFormatted}</p>
          <p className="text-sm font-medium mt-1 opacity-80">Total de horas</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex gap-2">
        {(['resumo', 'detalhado'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              view === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {v === 'resumo' ? 'Resumo por medico' : 'Registros detalhados'}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'resumo' ? (
        <div className="flex flex-col gap-4">
          {resumo.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Nenhum dado no periodo.</div>
          ) : resumo.map(m => (
            <div key={m.medico} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                    {m.medico.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800">{m.medico}</span>
                </div>
                <span className="text-sm text-gray-500">
                  Total: {(() => {
                    const ms = m.dias.reduce((a, d) => a + d.horas_ms, 0)
                    return `${Math.floor(ms / 3600000)}h${Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0')}m`
                  })()}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {m.dias.map(d => (
                  <div key={d.dia} className="px-6 py-3 flex items-center justify-between text-sm">
                    <span className="text-gray-600 w-28">{formatDia(d.dia)}</span>
                    <span className="text-green-600 text-xs">{d.entradas} entrada{d.entradas !== 1 ? 's' : ''}</span>
                    <span className="text-red-500 text-xs">{d.saidas} saida{d.saidas !== 1 ? 's' : ''}</span>
                    <span className="font-semibold text-gray-700">{d.horas_trabalhadas}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {registros.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Nenhum registro no periodo.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {registros.map(r => (
                <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                  {r.selfie_url ? (
                    <img src={r.selfie_url} alt="selfie" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-100" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                      {r.medicos?.nome?.charAt(0) ?? '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{r.medicos?.nome ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {r.timestamp.slice(0, 10)} · {formatHora(r.timestamp)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    r.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {r.tipo === 'entrada' ? 'Entrada' : 'Saida'}
                  </span>
                  {r.latitude && r.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      GPS
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
