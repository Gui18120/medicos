'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import jsQR from 'jsqr'

function KioskContent() {
  const params = useSearchParams()
  const hospital = params.get('hospital') ?? ''

  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [pontoUrl, setPontoUrl] = useState<string>('')
  const [time, setTime] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [isMobile, setIsMobile] = useState(false)
  const [scanning, setScanning] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  const stopScanner = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const tick = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0)
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height)
          if (code?.data?.includes('/ponto?')) {
            stopScanner()
            window.location.href = code.data
            return
          }
        }
        animRef.current = requestAnimationFrame(tick)
      }
      animRef.current = requestAnimationFrame(tick)
    } catch {
      setScanning(false)
    }
  }, [stopScanner])

  useEffect(() => () => stopScanner(), [stopScanner])

  const fetchQR = useCallback(async () => {
    try {
      const url = `/api/qr${hospital ? `?hospital=${hospital}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      setQrDataUrl(data.qr)
      setSecondsLeft(data.secondsLeft)
      setPontoUrl(data.url)
    } catch {
      // silently retry
    }
  }, [hospital])

  useEffect(() => {
    fetchQR()
    const qrInterval = setInterval(fetchQR, 5000)
    const clockInterval = setInterval(() => {
      const now = new Date()
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setSecondsLeft(30 - (Math.floor(now.getTime() / 1000) % 30))
    }, 1000)
    setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    return () => { clearInterval(qrInterval); clearInterval(clockInterval) }
  }, [fetchQR])

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  if (isMobile) {
    return (
      <div className="min-h-screen bg-blue-700 flex flex-col items-center justify-center text-white p-6">
        <div className="flex flex-col items-center gap-5 text-center w-full max-w-xs">
          <h1 className="text-3xl font-bold tracking-tight">FlowIA</h1>

          {scanning ? (
            <>
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {/* mira */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-4 border-white rounded-2xl opacity-70" />
                </div>
              </div>
              <p className="text-blue-200 text-sm">Aponte para o QR Code do tablet</p>
              <button
                onClick={stopScanner}
                className="w-full bg-white/20 text-white font-semibold py-3 rounded-2xl active:scale-95 transition-transform"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <p className="text-blue-200 text-sm">Escolha como registrar seu ponto</p>

              <button
                onClick={startScanner}
                className="w-full bg-white text-blue-700 font-bold text-lg py-4 rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-4v3a1 1 0 01-1 1h-3m4-11h-3a1 1 0 00-1 1v3"/>
                </svg>
                Escanear QR do tablet
              </button>

              {pontoUrl && (
                <a
                  href={pontoUrl}
                  className="w-full bg-white/20 text-white font-semibold py-3 rounded-2xl active:scale-95 transition-transform"
                >
                  Registrar com token atual
                </a>
              )}

              <p className="text-blue-300 text-xs mt-1">
                Use "Escanear" para apontar a câmera para o QR exibido no tablet da recepção.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-700 flex flex-col items-center justify-center text-white select-none">
      <div className="flex flex-col items-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">FlowIA</h1>
          <p className="text-blue-200 mt-1 capitalize">{today}</p>
        </div>

        <div className="text-7xl font-mono font-bold tracking-widest">
          {time || '--:--:--'}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
              <span className="text-gray-400 text-sm">Carregando...</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-gray-800 font-semibold text-lg">Aponte a câmera para o código</p>
            <p className="text-gray-500 text-sm mt-1">Abre automaticamente no celular</p>
          </div>
        </div>

        <div className="w-64 flex flex-col items-center gap-2">
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all duration-1000"
              style={{ width: `${(secondsLeft / 30) * 100}%` }}
            />
          </div>
          <p className="text-blue-200 text-sm">Código atualiza em {secondsLeft}s</p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center max-w-md">
          {[
            { step: '1', text: 'Escaneie o QR Code' },
            { step: '2', text: 'Digite seu PIN e tire selfie' },
            { step: '3', text: 'Confirme o registro' },
          ].map(item => (
            <div key={item.step} className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">{item.step}</div>
              <p className="text-blue-100 text-xs">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function KioskPage() {
  return (
    <Suspense>
      <KioskContent />
    </Suspense>
  )
}
