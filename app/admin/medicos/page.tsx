'use client'

import { useEffect, useState } from 'react'

type Medico = {
  id: string
  nome: string
  crm: string
  email: string | null
  ativo: boolean
  created_at: string
}

const emptyForm = { nome: '', crm: '', email: '', pin: '' }

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchMedicos = async () => {
    setLoading(true)
    const res = await fetch('/api/medicos?admin=1')
    const data = await res.json()
    setMedicos(data.medicos || [])
    setLoading(false)
  }

  useEffect(() => { fetchMedicos() }, [])

  const handleSave = async () => {
    setFormError('')
    if (!form.nome || !form.crm) { setFormError('Nome e CRM são obrigatórios.'); return }
    if (!editId && (!form.pin || !/^\d{4}$/.test(form.pin))) {
      setFormError('PIN deve ter 4 dígitos numéricos.')
      return
    }

    setSaving(true)
    const body: Record<string, string> = { nome: form.nome, crm: form.crm }
    if (form.email) body.email = form.email
    if (form.pin) body.pin = form.pin

    const res = await fetch(editId ? `/api/medicos/${editId}` : '/api/medicos', {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) { setFormError(data.error || 'Erro ao salvar.'); setSaving(false); return }

    setSaving(false)
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    fetchMedicos()
  }

  const handleEdit = (m: Medico) => {
    setForm({ nome: m.nome, crm: m.crm, email: m.email || '', pin: '' })
    setEditId(m.id)
    setShowForm(true)
    setFormError('')
  }

  const handleToggleAtivo = async (m: Medico) => {
    await fetch(`/api/medicos/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !m.ativo }),
    })
    fetchMedicos()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este médico?')) return
    await fetch(`/api/medicos/${id}`, { method: 'DELETE' })
    fetchMedicos()
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setFormError('')
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Médicos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{medicos.length} cadastrado{medicos.length !== 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setFormError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-blue-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Novo Médico
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-5">
            {editId ? 'Editar Médico' : 'Novo Médico'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Nome completo *', key: 'nome', placeholder: 'Dr. João Silva', type: 'text' },
              { label: 'CRM *', key: 'crm', placeholder: 'CRM/SP 123456', type: 'text' },
              { label: 'Email', key: 'email', placeholder: 'joao@clinica.com', type: 'email' },
              { label: `PIN (4 dígitos)${editId ? ' — deixe vazio para manter' : ' *'}`, key: 'pin', placeholder: '••••', type: 'password' },
            ].map(field => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => {
                    const val = field.key === 'pin'
                      ? e.target.value.replace(/\D/g, '').slice(0, 4)
                      : e.target.value
                    setForm(f => ({ ...f, [field.key]: val }))
                  }}
                  placeholder={field.placeholder}
                  inputMode={field.key === 'pin' ? 'numeric' : undefined}
                  maxLength={field.key === 'pin' ? 4 : undefined}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            ))}
          </div>
          {formError && (
            <div className="mt-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : medicos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z"/></svg>
            Nenhum médico cadastrado
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {medicos.map(m => (
              <div key={m.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center font-bold text-blue-700 dark:text-blue-400 flex-shrink-0 text-sm">
                  {m.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{m.nome}</p>
                  <p className="text-xs text-gray-400">{m.crm}{m.email ? ` · ${m.email}` : ''}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  m.ativo
                    ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                }`}>
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(m)} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">Editar</button>
                  <button onClick={() => handleToggleAtivo(m)} className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">{m.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
