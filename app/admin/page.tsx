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

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-1 opacity-75">{label}</p>
    </div>
  )
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

  const formatHora = (ts: string) =>
    new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatData = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm capitalize mt-0.5">{formatData}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Registros hoje" value={registros.length} color="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" />
        <StatCard label="Entradas" value={entradas.length} color="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400" />
        <StatCard label="Saídas" value={saidas.length} color="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400" />
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Registros de hoje</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : registros.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Nenhum registro hoje
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {registros.map(r => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {r.selfie_url ? (
                  <img src={r.selfie_url} alt="selfie" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100 dark:ring-gray-800" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400 flex-shrink-0 text-sm font-bold">
                    {r.medicos?.nome?.charAt(0) ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{r.medicos?.nome ?? '—'}</p>
                  <p className="text-xs text-gray-400">CRM: {r.medicos?.crm ?? '—'}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  r.tipo === 'entrada'
                    ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                }`}>
                  {r.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
                <span className="text-sm text-gray-400 font-mono w-12 text-right flex-shrink-0">
                  {formatHora(r.timestamp)}
                </span>
                {r.latitude && r.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-600 flex-shrink-0"
                  >
                    GPS
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
