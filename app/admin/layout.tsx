'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/medicos', label: 'Medicos' },
  { href: '/admin/relatorios', label: 'Relatorios' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-lg">Ponto Medico</span>
            <nav className="flex gap-1">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? 'bg-white text-blue-700'
                      : 'text-blue-100 hover:bg-blue-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/kiosk"
              target="_blank"
              className="text-blue-200 text-sm hover:text-white transition-colors"
            >
              Abrir Kiosk
            </Link>
            <button
              onClick={handleLogout}
              className="text-blue-200 text-sm hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  )
}
