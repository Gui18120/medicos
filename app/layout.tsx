import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ponto Médico',
  description: 'Sistema de controle de ponto médico',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
