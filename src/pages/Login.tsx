import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = mode === 'signin'
      ? await signIn(username, password)
      : await signUp(username, name, password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (mode === 'signup') {
      setError(null)
      setMode('signin')
      alert('Account created. If you were pre-approved, your role is already set — sign in now.')
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
              required
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-medium text-slate-600">Full name</label>
              <input
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-amber-800 text-white rounded-md py-2 text-sm font-medium hover:bg-amber-900 disabled:opacity-50 transition-colors"
          >
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          className="mt-4 text-xs text-slate-500 hover:text-amber-800 underline block mx-auto"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
        >
          {mode === 'signin' ? "First time here? Create your account" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
