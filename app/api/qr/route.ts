import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getCurrentToken } from '@/lib/token'

export async function GET(request: Request) {
  const token = getCurrentToken()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const hospital = new URL(request.url).searchParams.get('hospital')
  const url = `${appUrl}/ponto?token=${token}${hospital ? `&hospital=${hospital}` : ''}`

  const qr = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#1e3a5f', light: '#ffffff' },
  })

  const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30)

  return NextResponse.json({ qr, secondsLeft })
}
