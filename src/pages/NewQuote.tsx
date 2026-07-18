import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Customer, Factory, Project } from '../lib/types'

export function NewQuote() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [factories, setFactories] = useState<Factory[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const [factoryId, setFactoryId] = useState('')
  const [mode, setMode] = useState<'predefined' | 'custom'>('custom')
  const [customerId, setCustomerId] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerMobile, setNewCustomerMobile] = useState('')
  const [projectId, setProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: c }, { data: p }] = await Promise.all([
        supabase.from('factories').select('*').eq('active', true).order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
      ])
      setFactories((f as Factory[]) ?? [])
      setCustomers((c as Customer[]) ?? [])
      setProjects((p as Project[]) ?? [])
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!factoryId) { setError('Pick a factory before starting the quote.'); return }
    setBusy(true)
    try {
      let finalCustomerId = customerId
      if (!finalCustomerId) {
        if (!newCustomerName.trim()) throw new Error('Enter a customer name, or pick an existing one.')
        const { data, error: cErr } = await supabase
          .from('customers')
          .insert({ name: newCustomerName.trim(), mobile: newCustomerMobile.trim() })
          .select()
          .single()
        if (cErr) throw cErr
        finalCustomerId = data.id
      }

      let finalProjectId = projectId
      if (!finalProjectId) {
        const { data, error: pErr } = await supabase
          .from('projects')
          .insert({
            name: newProjectName.trim() || `${newCustomerName || 'Project'}`,
            customer_id: finalCustomerId,
            site_address: siteAddress.trim(),
          })
          .select()
          .single()
        if (pErr) throw pErr
        finalProjectId = data.id
      }

      const { data: quote, error: qErr } = await supabase
        .from('quotations')
        .insert({
          factory_id: factoryId,
          mode,
          project_id: finalProjectId,
          created_by: session?.user.id,
        })
        .select()
        .single()
      if (qErr) throw qErr

      navigate(`/quotes/${quote.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-slate-800 mb-1">New Quote</h1>
      <p className="text-sm text-slate-500 mb-6">
        Pick the factory first — pricing for every item you add will use that factory's rates.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-slate-200 rounded-lg p-5">
        <div>
          <label className="text-xs font-medium text-slate-600">Factory *</label>
          <select
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={factoryId}
            onChange={(e) => setFactoryId(e.target.value)}
            required
          >
            <option value="">Select factory...</option>
            {factories.map((f) => (
              <option key={f.id} value={f.id}>{f.name} — {f.city} ({f.specialties})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Quote mode</label>
          <div className="mt-1 flex gap-2">
            {(['custom', 'predefined'] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${
                  mode === m ? 'border-amber-700 bg-amber-50 text-amber-800' : 'border-slate-300 text-slate-600'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="text-xs font-medium text-slate-600">Customer</label>
          <select
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">+ New customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
          </select>
          {!customerId && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input placeholder="Customer name" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
              <input placeholder="Mobile" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={newCustomerMobile} onChange={(e) => setNewCustomerMobile(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Project</label>
          <select
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">+ New project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!projectId && (
            <div className="mt-2 grid grid-cols-1 gap-2">
              <input placeholder="Project name (e.g. Shah Residence 3BHK)" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
              <input placeholder="Site address" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
                value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full bg-amber-800 text-white rounded-md py-2 text-sm font-medium hover:bg-amber-900 disabled:opacity-50">
          {busy ? 'Creating...' : 'Start quote →'}
        </button>
      </form>
    </div>
  )
}
