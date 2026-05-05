'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Step = 'validating' | 'invalid' | 'search' | 'camera' | 'sending' | 'success' | 'error'

type Medico = { id: string; nome: string; crm: string }

function PontoContent() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const hospitalId = params.get('hospital') ?? ''

  const [step, setStep] = useState<Step>('validating')
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [filtered, setFiltered] = useState<Medico[]>([])
  const [search, setSearch] = useState('')
  const [searched, setSearched] = useState(false)
  const [loadingMedicos, setLoadingMedicos] = useState(false)
  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [selfieDataUrl, setSelfieDataUrl] = useState<string>('')
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const loadMedicos = useCallback(async (): Promise<Medico[]> => {
    setLoadingMedicos(true)
    try {
      const r = await fetch('/api/medicos')
      const d = await r.json()
      const lista: Medico[] = d.medicos || []
      setMedicos(lista)
      return lista
    } finally {
      setLoadingMedicos(false)
    }
  }, [])

  // Valida token
  useEffect(() => {
    if (!token) { setStep('invalid'); return }
    fetch(`/api/token/validate?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) {
          setStep('search')
        } else {
          setStep('invalid')
        }
      })
      .catch(() => setStep('invalid'))
  }, [token])

  const handleSearch = async () => {
    if (search.trim().length < 2) return
    const lista = medicos.length > 0 ? medicos : await loadMedicos()
    const q = search.toLowerCase().trim()
    setFiltered(lista.filter(m => m.nome.toLowerCase().includes(q) || m.crm.includes(q)))
    setSearched(true)
  }

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setErrorMsg('Nao foi possivel acessar a camera. Verifique as permissoes.')
      setStep('error')
    }
  }, [])

  useEffect(() => {
    if (step === 'camera') startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [step, startCamera])

  const handleSelectMedico = (medico: Medico) => {
    setSelectedMedico(medico)
    setSearched(false)
    setSearch('')
    setPinError('')
    setPin('')
  }

  const handlePinConfirm = () => {
    if (pin.length < 4) { setPinError('PIN deve ter 4 digitos'); return }
    setPinError('')
    setStep('camera')
  }

  const takeSelfie = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setSelfieDataUrl(dataUrl)

    // Para a câmera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }

    submitPonto(dataUrl)
  }

  const submitPonto = async (selfie: string) => {
    setStep('sending')

    let latitude: number | null = null
    let longitude: number | null = null

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, enableHighAccuracy: true })
      )
      latitude = pos.coords.latitude
      longitude = pos.coords.longitude
    } catch {
      // GPS opcional — continua sem
    }

    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicoId: selectedMedico!.id,
          pin,
          token,
          tipo,
          selfie,
          latitude,
          longitude,
          hospitalId: hospitalId || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg(data.message)
        setStep('success')
      } else {
        setErrorMsg(data.error || 'Erro ao registrar ponto.')
        setStep('error')
      }
    } catch {
      setErrorMsg('Erro de conexao. Tente novamente.')
      setStep('error')
    }
  }

  // --- Telas ---

  if (step === 'validating') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Verificando acesso...</p>
        </div>
      </Screen>
    )
  }

  if (step === 'invalid') {
    return (
      <Screen>
        <div className="text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">X</div>
          <h2 className="text-xl font-bold text-gray-800">Codigo expirado</h2>
          <p className="text-gray-500 text-sm max-w-xs">
            Este QR Code nao e mais valido. Volte a recepcao e escaneie o codigo atual.
          </p>
        </div>
      </Screen>
    )
  }

  if (step === 'search') {
    return (
      <Screen>
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">FlowIA</h2>
            <p className="text-gray-500 text-sm mt-1">Selecione seu nome</p>
          </div>

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['entrada', 'saida'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`py-2 rounded-xl font-semibold text-sm transition-all ${
                  tipo === t
                    ? t === 'entrada' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t === 'entrada' ? 'Entrada' : 'Saida'}
              </button>
            ))}
          </div>

          {/* Busca */}
          {!selectedMedico && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite seu nome ou CRM..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSearched(false) }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={loadingMedicos || search.trim().length < 2}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition-colors"
                >
                  {loadingMedicos ? (
                    <span className="block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'Buscar'}
                </button>
              </div>

              {searched && (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-4">Nenhum médico encontrado</p>
                  ) : filtered.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMedico(m)}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-blue-400 bg-white text-left transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                        {m.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{m.nome}</p>
                        <p className="text-gray-400 text-xs">CRM: {m.crm}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Médico selecionado + PIN */}
          {selectedMedico && (
            <div className="flex flex-col gap-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                    {selectedMedico.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{selectedMedico.nome}</p>
                    <p className="text-gray-400 text-xs">CRM: {selectedMedico.crm}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedMedico(null); setPin(''); setPinError('') }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Trocar
                </button>
              </div>
              <p className="text-sm font-medium text-gray-700">Digite seu PIN (4 digitos)</p>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••"
              />
              {pinError && <p className="text-red-500 text-xs">{pinError}</p>}
              <button
                onClick={handlePinConfirm}
                disabled={pin.length < 4}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-40 transition-all"
              >
                Continuar para selfie
              </button>
            </div>
          )}
        </div>
      </Screen>
    )
  }

  if (step === 'camera') {
    return (
      <Screen>
        <div className="w-full max-w-sm flex flex-col items-center gap-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-800">Tire sua selfie</h2>
            <p className="text-gray-500 text-sm mt-1">Olhe para a camera e confirme</p>
          </div>

          <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-[3/4]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 border-4 border-blue-400 rounded-2xl pointer-events-none" />
          </div>

          <button
            onClick={takeSelfie}
            className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-4xl shadow-lg active:scale-95 transition-transform"
          >
            O
          </button>
          <p className="text-gray-400 text-xs">Toque para registrar</p>
        </div>
      </Screen>
    )
  }

  if (step === 'sending') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Registrando ponto...</p>
        </div>
      </Screen>
    )
  }

  if (step === 'success') {
    return (
      <Screen>
        <div className="text-center flex flex-col items-center gap-5">
          {selfieDataUrl && (
            <img
              src={selfieDataUrl}
              alt="Selfie"
              className="w-24 h-24 rounded-full object-cover border-4 border-green-400 scale-x-[-1]"
            />
          )}
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-3xl">V</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Ponto registrado!</h2>
            <p className="text-gray-500 text-sm mt-2 max-w-xs">{successMsg}</p>
          </div>
          <p className="text-gray-400 text-xs">Voce ja pode fechar esta pagina.</p>
        </div>
      </Screen>
    )
  }

  // error
  return (
    <Screen>
      <div className="text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">!</div>
        <h2 className="text-xl font-bold text-gray-800">Erro</h2>
        <p className="text-gray-500 text-sm max-w-xs">{errorMsg}</p>
        <button
          onClick={() => { setStep('search'); setErrorMsg('') }}
          className="text-blue-600 text-sm font-medium"
        >
          Tentar novamente
        </button>
      </div>
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}

export default function PontoPage() {
  return (
    <Suspense>
      <PontoContent />
    </Suspense>
  )
}
