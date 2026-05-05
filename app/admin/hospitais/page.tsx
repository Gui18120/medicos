'use client'

import { useEffect, useState } from 'react'

type Hospital = {
  id: string
  nome: string
  endereco: string | null
  ativo: boolean
  created_at: string
}

type Medico = { id: string; nome: string; crm: string }

const emptyForm = { nome: '', endereco: '' }

export default function HospitaisPage() {
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [allMedicos, setAllMedicos] = useState<Medico[]>([])
  const [medicosPorHospital, setMedicosPorHospital] = useState<Record<string, Medico[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [medicoSearch, setMedicoSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchHospitais = async () => {
    setLoading(true)
    const res = await fetch('/api/hospitais')
    const data = await res.json()
    setHospitais(data.hospitais || [])
    setLoading(false)
  }

  const fetchAllMedicos = async () => {
    const res = await fetch('/api/medicos?admin=1')
    const data = await res.json()
    setAllMedicos(data.medicos || [])
  }

  useEffect(() => {
    fetchHospitais()
    fetchAllMedicos()
  }, [])

  const fetchMedicosHospital = async (hospitalId: string) => {
    const res = await fetch(`/api/hospitais/${hospitalId}/medicos`)
    const data = await res.json()
    setMedicosPorHospital(prev => ({ ...prev, [hospitalId]: data.medicos || [] }))
  }

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setMedicoSearch(''); return }
    setExpandedId(id)
    setMedicoSearch('')
    if (!medicosPorHospital[id]) await fetchMedicosHospital(id)
  }

  const handleSave = async () => {
    setFormError('')
    if (!form.nome) { setFormError('Nome é obrigatório.'); return }
    setSaving(true)

    const res = await fetch(editId ? `/api/hospitais/${editId}` : '/api/hospitais', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: form.nome, endereco: form.endereco }),
    })

    const data = await res.json()
    if (!res.ok) { setFormError(data.error || 'Erro ao salvar.'); setSaving(false); return }

    setSaving(false)
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    fetchHospitais()
  }

  const handleEdit = (h: Hospital) => {
    setForm({ nome: h.nome, endereco: h.endereco || '' })
    setEditId(h.id)
    setShowForm(true)
    setFormError('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este hospital?')) return
    await fetch(`/api/hospitais/${id}`, { method: 'DELETE' })
    fetchHospitais()
  }

  const handleToggleAtivo = async (h: Hospital) => {
    await fetch(`/api/hospitais/${h.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !h.ativo }),
    })
    fetchHospitais()
  }

  const handleToggleMedico = async (hospitalId: string, medico: Medico, assigned: boolean) => {
    if (assigned) {
      await fetch(`/api/hospitais/${hospitalId}/medicos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicoId: medico.id }),
      })
    } else {
      await fetch(`/api/hospitais/${hospitalId}/medicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicoId: medico.id }),
      })
    }
    fetchMedicosHospital(hospitalId)
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hospitais e Clínicas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{hospitais.length} cadastrado{hospitais.length !== 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setFormError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-blue-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Novo Local
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">{editId ? 'Editar' : 'Novo Hospital/Clínica'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome *</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Hospital São Lucas"
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Endereço</label>
              <input
                value={form.endereco}
                onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                placeholder="Ex: Rua das Flores, 123"
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>
          {formError && (
            <div className="mt-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }} className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hospitais.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-center py-16 text-gray-400 dark:text-gray-600">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            Nenhum local cadastrado
          </div>
        ) : hospitais.map(h => (
          <div key={h.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Header do hospital */}
            <div className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{h.nome}</p>
                {h.endereco && <p className="text-xs text-gray-400 mt-0.5">{h.endereco}</p>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${h.ativo ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                {h.ativo ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex gap-1">
                <a
                  href={`/kiosk?hospital=${h.id}`}
                  target="_blank"
                  title="Abrir kiosk deste local"
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  Kiosk ↗
                </a>
                <button onClick={() => handleEdit(h)} className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">Editar</button>
                <button onClick={() => handleToggleAtivo(h)} className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">{h.ativo ? 'Desativar' : 'Ativar'}</button>
                <button onClick={() => handleDelete(h.id)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">Excluir</button>
                <button
                  onClick={() => toggleExpand(h.id)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1"
                >
                  Médicos
                  <svg className={`w-3 h-3 transition-transform ${expandedId === h.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                </button>
              </div>
            </div>

            {/* Médicos do hospital */}
            {expandedId === h.id && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Médicos neste local
                    {(medicosPorHospital[h.id] ?? []).length > 0 && (
                      <span className="ml-2 normal-case font-normal text-blue-500">
                        {(medicosPorHospital[h.id] ?? []).length} vinculado{(medicosPorHospital[h.id] ?? []).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                {allMedicos.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum médico cadastrado no sistema.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Pesquisar médico..."
                      value={medicoSearch}
                      onChange={e => setMedicoSearch(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                      {allMedicos
                        .filter(m => m.nome.toLowerCase().includes(medicoSearch.toLowerCase()) || m.crm.includes(medicoSearch))
                        .map(m => {
                          const assigned = (medicosPorHospital[h.id] ?? []).some(am => am.id === m.id)
                          return (
                            <label key={m.id} className="flex items-center gap-3 cursor-pointer group px-1">
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={() => handleToggleMedico(h.id, m, assigned)}
                                className="w-4 h-4 rounded text-blue-600 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                {m.nome} <span className="text-gray-400 text-xs">· {m.crm}</span>
                              </span>
                            </label>
                          )
                        })}
                      {allMedicos.filter(m => m.nome.toLowerCase().includes(medicoSearch.toLowerCase()) || m.crm.includes(medicoSearch)).length === 0 && (
                        <p className="text-xs text-gray-400 py-2 text-center">Nenhum médico encontrado</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
