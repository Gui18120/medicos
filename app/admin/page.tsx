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

export default function DashboardPage() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().slice(0, 10)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/relatorios?inicio=${today}&fim=${today}`)
    const data = await res.json()
    setRegistros(data.registros || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [])

  const entradas = registros.filter(r => r.tipo === 'entrada')
  const saidas = registros.filter(r => r.tipo === 'saida')
  const presentes = new Set(entradas.map(r => r.medicos?.nome)).size
  const sairam = new Set(saidas.map(r => r.medicos?.nome)).size

  const formatHora = (ts: string) =>
    new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatData = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm capitalize">{formatData}</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registros hoje', value: registros.length, color: 'bg-blue-50 text-blue-700' },
          { label: 'Entradas', value: entradas.length, color: 'bg-green-50 text-green-700' },
          { label: 'Saidas', value: saidas.length, color: 'bg-red-50 text-red-600' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl p-5 ${stat.color}`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm font-medium mt-1 opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Registros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Registros de hoje</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum registro hoje.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {registros.map(r => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                {/* Selfie */}
                {r.selfie_url ? (
                  <img
                    src={r.selfie_url}
                    alt="selfie"
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 text-sm font-bold">
                    {r.medicos?.nome?.charAt(0) ?? '?'}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{r.medicos?.nome ?? '—'}</p>
                  <p className="text-xs text-gray-400">CRM: {r.medicos?.crm ?? '—'}</p>
                </div>

                {/* Tipo */}
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    r.tipo === 'entrada'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {r.tipo === 'entrada' ? 'Entrada' : 'Saida'}
                </span>

                {/* Hora */}
                <span className="text-sm text-gray-500 font-mono w-14 text-right flex-shrink-0">
                  {formatHora(r.timestamp)}
                </span>

                {/* GPS */}
                {r.latitude && r.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0"
                  >
                    Ver mapa
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
