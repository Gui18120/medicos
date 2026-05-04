'use client'

import { useEffect, useState, useCallback } from 'react'

export default function KioskPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [time, setTime] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(30)

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch('/api/qr')
      const data = await res.json()
      setQrDataUrl(data.qr)
      setSecondsLeft(data.secondsLeft)
    } catch {
      // silently retry on next interval
    }
  }, [])

  useEffect(() => {
    fetchQR()

    // Atualiza QR quando muda de bucket (a cada 30s sincronizado)
    const qrInterval = setInterval(fetchQR, 5000)

    // Clock
    const clockInterval = setInterval(() => {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setSecondsLeft(30 - (Math.floor(now.getTime() / 1000) % 30))
    }, 1000)

    setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

    return () => {
      clearInterval(qrInterval)
      clearInterval(clockInterval)
    }
  }, [fetchQR])

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-blue-700 flex flex-col items-center justify-center text-white select-none">
      <div className="flex flex-col items-center gap-8 p-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Registro de Ponto</h1>
          <p className="text-blue-200 mt-1 capitalize">{today}</p>
        </div>

        {/* Clock */}
        <div className="text-7xl font-mono font-bold tracking-widest">
          {time || '--:--:--'}
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-gray-400 text-sm">Carregando...</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-gray-800 font-semibold text-lg">Aponte a camera para o codigo</p>
            <p className="text-gray-500 text-sm mt-1">Abre automaticamente no celular</p>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-64 flex flex-col items-center gap-2">
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-1000"
              style={{ width: `${(secondsLeft / 30) * 100}%` }}
            />
          </div>
          <p className="text-blue-200 text-sm">Codigo atualiza em {secondsLeft}s</p>
        </div>

        {/* Instructions */}
        <div className="grid grid-cols-3 gap-4 text-center max-w-md">
          {[
            { step: '1', text: 'Escaneie o QR Code' },
            { step: '2', text: 'Digite seu PIN e tire selfie' },
            { step: '3', text: 'Confirme o registro' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
                {item.step}
              </div>
              <p className="text-blue-100 text-xs">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
