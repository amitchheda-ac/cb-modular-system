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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-amber-800">Casa Bianca</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900">Quotes</Link>
            <Link to="/quotes/new" className="text-slate-600 hover:text-slate-900">New Quote</Link>
            {profile?.role === 'admin' && <Link to="/admin/presets" className="text-slate-600 hover:text-slate-900">Presets</Link>}
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
