'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import jsQR from 'jsqr'

export default function Home() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const startScanner = async () => {
    setError('')
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      video.play()

      const tick = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current!
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(video, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code) {
            stopCamera()
            try {
              const url = new URL(code.data)
              if (url.pathname === '/ponto' && url.searchParams.get('token')) {
                router.push(`/ponto?token=${url.searchParams.get('token')}`)
                return
              }
            } catch {}
            setError('QR Code inválido. Aponte para o código da recepção.')
            return
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setScanning(false)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Registro de Ponto</h1>
          <p className="text-gray-500 text-sm mt-1">Escaneie o QR Code da recepção</p>
        </div>

        {scanning ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-square">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              {/* Moldura */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-blue-400 rounded-2xl" />
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-gray-500 text-sm">Aponte para o QR Code do tablet</p>
            <button onClick={stopCamera} className="text-gray-400 text-sm underline">
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <button
              onClick={startScanner}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold text-lg active:scale-95 transition-transform"
            >
              Escanear QR Code
            </button>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <a href="/admin" className="text-gray-400 text-xs underline mt-2">
              Acesso admin
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
