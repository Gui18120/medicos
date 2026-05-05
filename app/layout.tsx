import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'crm.med — Flow.ya',
  description: 'Sistema de controle de ponto médico',
}

const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(t);}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
