import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = await signIn(username, password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-amber-200/70 border-t-4 border-t-amber-700 p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <img src="/logo.png" alt="Casa Bianca" className="w-20 h-20 object-contain mb-3" />
          <h1 className="font-serif text-2xl font-bold text-amber-800 leading-tight">Casa Bianca</h1>
          <p className="text-[11px] tracking-[0.25em] text-amber-700/70 uppercase mt-1">Modular OS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Username</label>
            <input
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. amitchheda"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-amber-800 text-white rounded-md py-2 text-sm font-medium hover:bg-amber-900 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Please wait...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
          Accounts are created by an administrator only.<br />Contact Amit if you need access.
        </p>
      </div>
    </div>
  )
}
