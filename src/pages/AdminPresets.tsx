import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Category, ModulePreset } from '../lib/types'

export function AdminPresets() {
  const { profile } = useAuth()
  const [presets, setPresets] = useState<ModulePreset[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterCat, setFilterCat] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

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

  const visible = presets.filter((p) => !filterCat || p.category_id === filterCat)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Module Preset Catalog</h1>
        <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {presets.length} presets loaded from your existing catalog. Add a photo to each so Sales can pick internals visually.
        Toggle off anything not ready to quote yet.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((p) => {
          const cat = categories.find((c) => c.id === p.category_id)
          return (
            <div key={p.id} className={`bg-white border rounded-lg p-3 ${p.active ? 'border-slate-200' : 'border-slate-100 opacity-50'}`}>
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
                <button onClick={() => toggleActive(p)} className="text-xs text-slate-400 hover:text-red-600">
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
