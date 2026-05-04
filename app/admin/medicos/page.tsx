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
    if (!form.nome || !form.crm) { setFormError('Nome e CRM sao obrigatorios.'); return }
    if (!editId && (!form.pin || !/^\d{4}$/.test(form.pin))) {
      setFormError('PIN deve ter 4 digitos numericos.')
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
    if (!confirm('Tem certeza que deseja excluir este medico?')) return
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Medicos</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setFormError('') }}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          + Novo Medico
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">
            {editId ? 'Editar Medico' : 'Novo Medico'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Nome completo *</label>
              <input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. Joao Silva"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">CRM *</label>
              <input
                value={form.crm}
                onChange={e => setForm(f => ({ ...f, crm: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="CRM/SP 123456"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="joao@clinica.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">
                PIN (4 digitos) {editId && '— deixe vazio para manter'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
              />
            </div>
          </div>
          {formError && <p className="text-red-500 text-sm mt-3">{formError}</p>}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : medicos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum medico cadastrado.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {medicos.map(m => (
              <div key={m.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 flex-shrink-0">
                  {m.nome.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{m.nome}</p>
                  <p className="text-xs text-gray-400">{m.crm}{m.email ? ` · ${m.email}` : ''}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    m.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(m)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleAtivo(m)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                  >
                    {m.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
