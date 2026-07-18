import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const roleColor: Record<string, string> = {
  admin: 'bg-amber-100 text-amber-800',
  sales: 'bg-blue-100 text-blue-800',
  designer: 'bg-purple-100 text-purple-800',
  viewer: 'bg-slate-100 text-slate-700',
}

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-amber-200/70 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Casa Bianca" className="w-9 h-9 object-contain" />
            <span className="leading-tight">
              <span className="block font-serif font-bold text-base text-amber-800">Casa Bianca</span>
              <span className="block text-[9px] tracking-[0.2em] text-amber-700/70 uppercase">Modular OS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-amber-800">Quotes</Link>
            <Link to="/quotes/new" className="text-slate-600 hover:text-amber-800">New Quote</Link>
            {profile?.role === 'admin' && <Link to="/admin/presets" className="text-slate-600 hover:text-amber-800">Presets</Link>}
            {profile && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[profile.role] ?? ''}`}>
                {profile.name || profile.username} · {profile.role}
              </span>
            )}
            <button
              onClick={async () => { await signOut(); navigate('/login') }}
              className="text-slate-400 hover:text-red-600"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
