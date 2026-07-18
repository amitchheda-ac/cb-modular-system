import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Category, ModulePreset } from '../lib/types'

const emptyForm = {
  categoryId: '', code: '', name: '', width: '', height: '', depth: '', description: '', basePrice: '',
}

export function AdminPresets() {
  const { profile } = useAuth()
  const [presets, setPresets] = useState<ModulePreset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterCat, setFilterCat] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [addError, setAddError] = useState<string | null>(null)
  const [addBusy, setAddBusy] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editError, setEditError] = useState<string | null>(null)
  const [editBusy, setEditBusy] = useState(false)

  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('module_presets').select('*').order('category_id').order('name'),
      supabase.from('categories_view').select('*').order('name'),
    ])
    setPresets((p as ModulePreset[]) ?? [])
    setCategories((c as Category[]) ?? [])
  }
  useEffect(() => { load() }, [])

  if (profile?.role !== 'admin') {
    return <p className="text-sm text-slate-500">Only Admin can manage the preset catalog.</p>
  }

  async function uploadImage(presetId: string, file: File) {
    setUploading(presetId)
    const path = `module-presets/${presetId}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('uploads').upload(path, file)
    if (!error) {
      const { data: pub } = supabase.storage.from('uploads').getPublicUrl(path)
      await supabase.from('module_presets').update({ image_url: pub.publicUrl }).eq('id', presetId)
      load()
    }
    setUploading(null)
  }

  async function toggleActive(preset: ModulePreset) {
    await supabase.from('module_presets').update({ active: !preset.active }).eq('id', preset.id)
    load()
  }

  function startAdd() {
    setAddForm({ ...emptyForm, categoryId: filterCat || categories[0]?.id || '' })
    setAddError(null)
    setShowAdd(true)
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError(null)
    if (!addForm.categoryId || !addForm.name.trim()) { setAddError('Category and name are required.'); return }
    setAddBusy(true)
    const { error } = await supabase.from('module_presets').insert({
      category_id: addForm.categoryId,
      code: addForm.code.trim() || null,
      name: addForm.name.trim(),
      width_mm: addForm.width ? Number(addForm.width) : null,
      height_mm: addForm.height ? Number(addForm.height) : null,
      depth_mm: addForm.depth ? Number(addForm.depth) : null,
      description: addForm.description.trim(),
      base_price: addForm.basePrice ? Number(addForm.basePrice) : 0,
    })
    setAddBusy(false)
    if (error) { setAddError(error.message); return }
    setShowAdd(false)
    setAddForm(emptyForm)
    load()
  }

  function startEdit(p: ModulePreset) {
    setEditingId(p.id)
    setEditError(null)
    setEditForm({
      categoryId: p.category_id ?? '',
      code: '',
      name: p.name,
      width: p.width_mm != null ? String(p.width_mm) : '',
      height: p.height_mm != null ? String(p.height_mm) : '',
      depth: p.depth_mm != null ? String(p.depth_mm) : '',
      description: p.description ?? '',
      basePrice: p.base_price != null ? String(p.base_price) : '',
    })
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setEditError(null)
    if (!editForm.categoryId || !editForm.name.trim()) { setEditError('Category and name are required.'); return }
    setEditBusy(true)
    const { error } = await supabase.from('module_presets').update({
      category_id: editForm.categoryId,
      name: editForm.name.trim(),
      width_mm: editForm.width ? Number(editForm.width) : null,
      height_mm: editForm.height ? Number(editForm.height) : null,
      depth_mm: editForm.depth ? Number(editForm.depth) : null,
      description: editForm.description.trim(),
      base_price: editForm.basePrice ? Number(editForm.basePrice) : 0,
    }).eq('id', editingId)
    setEditBusy(false)
    if (error) { setEditError(error.message); return }
    setEditingId(null)
    load()
  }

  async function deletePreset(p: ModulePreset) {
    setDeleteError(null)
    if (!confirm(`Delete "${p.name}" permanently? This can't be undone.`)) return
    const { error } = await supabase.from('module_presets').delete().eq('id', p.id)
    if (error) {
      if (error.message.includes('foreign key') || error.code === '23503') {
        setDeleteError(`"${p.name}" is already used in an existing quote, so it can't be deleted. Use Deactivate instead to hide it from new quotes.`)
      } else {
        setDeleteError(error.message)
      }
      return
    }
    load()
  }

  const visible = presets.filter((p) => !filterCat || p.category_id === filterCat)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-amber-800">Module Preset Catalog</h1>
        <div className="flex items-center gap-2">
          <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={startAdd} className="bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900">
            + Add preset
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {presets.length} presets loaded from your existing catalog. Add a photo to each so Sales can pick internals visually.
        Toggle off anything not ready to quote yet, edit details, or delete presets that were never used.
      </p>
      {deleteError && <p className="text-sm text-red-600 mb-4">{deleteError}</p>}

      {showAdd && (
        <form onSubmit={submitAdd} className="bg-white border border-amber-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">New preset</h2>
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-slate-400 hover:text-slate-700">Cancel</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm col-span-2"
              value={addForm.categoryId} onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })}>
              <option value="">Select category...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder="Name (e.g. Wardrobe Drawer 600mm)" className="border border-slate-300 rounded-md px-3 py-2 text-sm col-span-2"
              value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <input placeholder="Code (optional, e.g. WRD-DRW-600)" className="border border-slate-300 rounded-md px-3 py-2 text-sm col-span-2"
              value={addForm.code} onChange={(e) => setAddForm({ ...addForm, code: e.target.value })} />
            <input placeholder="Width mm" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={addForm.width} onChange={(e) => setAddForm({ ...addForm, width: e.target.value })} />
            <input placeholder="Height mm" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={addForm.height} onChange={(e) => setAddForm({ ...addForm, height: e.target.value })} />
            <input placeholder="Depth mm" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={addForm.depth} onChange={(e) => setAddForm({ ...addForm, depth: e.target.value })} />
            <input placeholder="Reference price (₹)" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={addForm.basePrice} onChange={(e) => setAddForm({ ...addForm, basePrice: e.target.value })} />
            <textarea placeholder="Description" className="border border-slate-300 rounded-md px-3 py-2 text-sm col-span-2"
              value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} />
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button disabled={addBusy} className="bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50">
            {addBusy ? 'Saving...' : 'Save preset'}
          </button>
        </form>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((p) => {
          const cat = categories.find((c) => c.id === p.category_id)
          const isEditing = editingId === p.id
          return (
            <div key={p.id} className={`bg-white border rounded-lg p-3 ${p.active ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
              {!isEditing && (
                <>
                  <div className="aspect-video bg-slate-100 rounded-md mb-2 overflow-hidden flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-800">{p.name}</div>
                  <div className="text-[11px] text-slate-400">{cat?.name} {p.width_mm ? `· ${p.width_mm}mm` : ''}</div>
                  <div className="flex items-center justify-between mt-2">
                    <label className="text-xs text-amber-800 cursor-pointer hover:underline">
                      {uploading === p.id ? 'Uploading...' : 'Upload photo'}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadImage(p.id, e.target.files[0])} />
                    </label>
                    <button onClick={() => toggleActive(p)} className="text-xs text-slate-400 hover:text-slate-700">
                      {p.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                    <button onClick={() => startEdit(p)} className="text-xs text-amber-800 hover:underline">Edit</button>
                    <button onClick={() => deletePreset(p)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </>
              )}
              {isEditing && (
                <form onSubmit={submitEdit} className="space-y-2">
                  <select className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    value={editForm.categoryId} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input placeholder="W" type="number" className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      value={editForm.width} onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} />
                    <input placeholder="H" type="number" className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} />
                    <input placeholder="D" type="number" className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                      value={editForm.depth} onChange={(e) => setEditForm({ ...editForm, depth: e.target.value })} />
                  </div>
                  <input placeholder="Reference price (₹)" type="number" className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    value={editForm.basePrice} onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })} />
                  <textarea placeholder="Description" className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
                    value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex items-center gap-2">
                    <button disabled={editBusy} className="bg-amber-800 text-white text-xs px-3 py-1.5 rounded-md hover:bg-amber-900 disabled:opacity-50">
                      {editBusy ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-800">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
