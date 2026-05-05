'use client'

import { useEffect, useRef, useState } from 'react'

type Medico = {
  id: string
  nome: string
  crm: string
  email: string | null
  ativo: boolean
  created_at: string
}

type CSVRow = { nome: string; crm: string; pin: string; email: string }

const emptyForm = { nome: '', crm: '', email: '', pin: '' }

function parseCSV(text: string): CSVRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length === 0) return []

  const sep = lines[0].includes(';') ? ';' : ','
  const firstLower = lines[0].toLowerCase()
  const hasHeader = firstLower.includes('nome') || firstLower.includes('crm')
  const dataLines = hasHeader ? lines.slice(1) : lines

  return dataLines.map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    return {
      nome: cols[0] ?? '',
      crm: cols[1] ?? '',
      pin: cols[2] ?? '',
      email: cols[3] ?? '',
    }
  }).filter(r => r.nome || r.crm)
}

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [showImport, setShowImport] = useState(false)
  const [csvRows, setCsvRows] = useState<CSVRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ inseridos: number; pulados: number; erros: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvRows(parseCSV(text))
      setImportResult(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (csvRows.length === 0) return
    setImporting(true)
    const res = await fetch('/api/medicos/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicos: csvRows }),
    })
    const data = await res.json()
    setImportResult(data)
    setImporting(false)
    if (data.inseridos > 0) fetchMedicos()
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
          <div className="flex gap-2">
            <button
              onClick={() => { setShowImport(v => !v); setImportResult(null); setCsvRows([]) }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 8l-3-3m3 3l3-3"/></svg>
              Importar CSV
            </button>
            <button
              onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); setFormError('') }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Novo Médico
            </button>
          </div>
        )}
      </div>

      {/* Importar CSV */}
      {showImport && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Importar médicos via CSV</h2>
            <p className="text-xs text-gray-400 mt-1">Colunas obrigatórias: <span className="font-mono">nome, crm, pin</span> — opcional: <span className="font-mono">email</span></p>
            <p className="text-xs text-gray-400">Separador: vírgula ou ponto-e-vírgula. Com ou sem cabeçalho.</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
            nome;crm;pin;email<br/>
            Dr. João Silva;CRM/SP 123456;1234;joao@clinica.com<br/>
            Dra. Maria Souza;CRM/RJ 654321;5678;
          </div>

          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
            Selecionar arquivo CSV
          </button>

          {csvRows.length > 0 && !importResult && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{csvRows.length} médico{csvRows.length !== 1 ? 's' : ''} encontrado{csvRows.length !== 1 ? 's' : ''} no arquivo:</p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {csvRows.map((r, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                      {r.nome.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate">{r.nome || <span className="text-red-400">sem nome</span>}</p>
                      <p className="text-xs text-gray-400">{r.crm} · PIN: {r.pin}{r.email ? ` · ${r.email}` : ''}</p>
                    </div>
                    {(!/^\d{4}$/.test(r.pin) || !r.nome || !r.crm) && (
                      <span className="text-xs text-red-500 font-medium">inválido</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-medium text-sm transition-colors"
                >
                  {importing ? 'Importando...' : `Importar ${csvRows.length} médico${csvRows.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => { setCsvRows([]); if (fileRef.current) fileRef.current.value = '' }}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.inseridos}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Importados</p>
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">{importResult.pulados}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pulados</p>
                </div>
              </div>
              {importResult.erros.length > 0 && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
                  {importResult.erros.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                </div>
              )}
              <button
                onClick={() => { setShowImport(false); setCsvRows([]); setImportResult(null) }}
                className="px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors w-fit"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )}

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
