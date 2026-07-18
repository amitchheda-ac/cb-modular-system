import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile, UserRole } from '../lib/types'

const ROLES: UserRole[] = ['admin', 'sales', 'designer', 'viewer']

const emptyAdd = { username: '', name: '', mobile: '', role: 'sales' as UserRole, password: '' }

export function AdminUsers() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyAdd)
  const [addError, setAddError] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; mobile: string; role: UserRole }>({ name: '', mobile: '', role: 'viewer' })
  const [editError, setEditError] = useState('')

  const [resetTargetId, setResetTargetId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetBusy, setResetBusy] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('name')
    setUsers((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (me?.role !== 'admin') {
    return <p className="text-sm text-slate-500">Only Admin can manage users.</p>
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddBusy(true)
    setAddError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'create', ...addForm },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    setAddBusy(false)
    const err = error ? (error.message || 'Something went wrong.') : (data && (data as any).error)
    if (err) {
      setAddError(err)
      return
    }
    setShowAdd(false)
    setAddForm(emptyAdd)
    await load()
  }

  function startEdit(u: Profile) {
    setEditForm({ name: u.name, mobile: u.mobile ?? '', role: u.role })
    setEditError('')
    setEditingId(u.id)
  }

  async function submitEdit(e: React.FormEvent, id: string) {
    e.preventDefault()
    setEditError('')
    if (id === me?.id && editForm.role !== 'admin') {
      setEditError("You can't remove your own admin role.")
      return
    }
    const { error } = await supabase.from('profiles').update({
      name: editForm.name, mobile: editForm.mobile, role: editForm.role,
    }).eq('id', id)
    if (error) {
      setEditError(error.message)
      return
    }
    setEditingId(null)
    await load()
  }

  async function toggleActive(u: Profile) {
    if (u.id === me?.id) {
      alert("You can't deactivate your own account.")
      return
    }
    if (!confirm(`${u.active ? 'Deactivate' : 'Activate'} ${u.name}? ${u.active ? 'They will immediately lose all access.' : ''}`)) return
    await supabase.from('profiles').update({ active: !u.active }).eq('id', u.id)
    await load()
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetTargetId) return
    setResetBusy(true)
    setResetError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset_password', userId: resetTargetId, password: resetPassword },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    setResetBusy(false)
    const err = error ? (error.message || 'Something went wrong.') : (data && (data as any).error)
    if (err) {
      setResetError(err)
      return
    }
    setResetTargetId(null)
    setResetPassword('')
    alert('Password updated.')
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-xl font-bold text-amber-800 mb-1">Users</h1>
      <p className="text-xs text-slate-500 mb-4">Admin only. Accounts can only be created here — there is no public sign-up. Deactivating a user immediately blocks their access to all quotes, customers, and projects.</p>

      {!showAdd && (
        <button onClick={() => { setShowAdd(true); setAddError('') }} className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900 mb-4">
          + Add user
        </button>
      )}

      {showAdd && (
        <form onSubmit={submitAdd} className="bg-white border border-amber-200 bg-amber-50/40 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="text-sm block">
              <span className="text-xs text-slate-500 block mb-1">Username</span>
              <input required className="w-full border border-slate-300 rounded px-2 py-1.5" value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} placeholder="e.g. rakesh.mod" />
            </label>
            <label className="text-sm block">
              <span className="text-xs text-slate-500 block mb-1">Full name</span>
              <input required className="w-full border border-slate-300 rounded px-2 py-1.5" value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="text-xs text-slate-500 block mb-1">Mobile</span>
              <input className="w-full border border-slate-300 rounded px-2 py-1.5" value={addForm.mobile}
                onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })} />
            </label>
            <label className="text-sm block">
              <span className="text-xs text-slate-500 block mb-1">Role</span>
              <select className="w-full border border-slate-300 rounded px-2 py-1.5" value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-sm block col-span-2">
              <span className="text-xs text-slate-500 block mb-1">Temporary password (share with them directly)</span>
              <input required type="text" minLength={6} className="w-full border border-slate-300 rounded px-2 py-1.5" value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
            </label>
          </div>
          {addError && <p className="text-xs text-red-600 mb-2">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={addBusy} className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900 disabled:opacity-50">
              {addBusy ? 'Creating...' : 'Create user'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs border border-slate-300 px-3 py-1.5 rounded-md">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {loading ? (
          <p className="text-sm text-slate-400 p-4">Loading...</p>
        ) : (
          users.map((u) =>
            editingId === u.id ? (
              <form key={u.id} onSubmit={(e) => submitEdit(e, u.id)} className="p-4 bg-amber-50/40">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="text-sm block">
                    <span className="text-xs text-slate-500 block mb-1">Name</span>
                    <input required className="w-full border border-slate-300 rounded px-2 py-1.5" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </label>
                  <label className="text-sm block">
                    <span className="text-xs text-slate-500 block mb-1">Mobile</span>
                    <input className="w-full border border-slate-300 rounded px-2 py-1.5" value={editForm.mobile}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} />
                  </label>
                  <label className="text-sm block">
                    <span className="text-xs text-slate-500 block mb-1">Role</span>
                    <select className="w-full border border-slate-300 rounded px-2 py-1.5" value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                </div>
                {editError && <p className="text-xs text-red-600 mb-2">{editError}</p>}
                <div className="flex gap-2">
                  <button type="submit" className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs border border-slate-300 px-3 py-1.5 rounded-md">Cancel</button>
                </div>
              </form>
            ) : resetTargetId === u.id ? (
              <form key={u.id} onSubmit={submitReset} className="p-4 bg-amber-50/40">
                <label className="text-sm block mb-2">
                  <span className="text-xs text-slate-500 block mb-1">New password for {u.name}</span>
                  <input required type="text" minLength={6} className="w-full border border-slate-300 rounded px-2 py-1.5" value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)} />
                </label>
                {resetError && <p className="text-xs text-red-600 mb-2">{resetError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={resetBusy} className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900 disabled:opacity-50">
                    {resetBusy ? 'Saving...' : 'Set password'}
                  </button>
                  <button type="button" onClick={() => { setResetTargetId(null); setResetPassword('') }} className="text-xs border border-slate-300 px-3 py-1.5 rounded-md">Cancel</button>
                </div>
              </form>
            ) : (
              <div key={u.id} className="p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className={u.active ? 'font-medium' : 'font-medium text-slate-400 line-through'}>{u.name}</span>
                  <span className="text-slate-400"> — {u.username}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{u.role}</span>
                  {!u.active && <span className="ml-2 text-[10px] uppercase tracking-wide text-red-500">inactive</span>}
                  {u.mobile && <div className="text-xs text-slate-400">{u.mobile}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(u)} className="text-xs text-amber-800 hover:underline">Edit</button>
                  <button onClick={() => { setResetTargetId(u.id); setResetPassword(''); setResetError('') }} className="text-xs text-slate-500 hover:underline">Reset password</button>
                  <button onClick={() => toggleActive(u)} className="text-xs text-red-600 hover:underline">
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  )
}
