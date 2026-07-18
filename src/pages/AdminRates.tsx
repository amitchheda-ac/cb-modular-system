import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Factory, Category, Material, Finish } from '../lib/types'

interface HardwareRow { id: string; name: string; brand: string; unit: string; rate: number | null }

type Tab = 'categories' | 'materials' | 'finishes' | 'hardware'

export function AdminRates() {
  const { profile } = useAuth()
  const [factories, setFactories] = useState<Factory[]>([])
  const [factoryId, setFactoryId] = useState('')
  const [tab, setTab] = useState<Tab>('categories')

  const [categories, setCategories] = useState<Category[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [finishes, setFinishes] = useState<Finish[]>([])
  const [hardware, setHardware] = useState<HardwareRow[]>([])

  const [catRates, setCatRates] = useState<Record<string, number>>({})
  const [matRates, setMatRates] = useState<Record<string, number>>({})
  const [finRates, setFinRates] = useState<Record<string, number>>({})
  const [hwRates, setHwRates] = useState<Record<string, number>>({})

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: c }, { data: m }, { data: fi }, { data: hw }] = await Promise.all([
        supabase.from('factories').select('*').order('name'),
        supabase.from('categories_view').select('*').order('name'),
        supabase.from('materials_view').select('*').order('name'),
        supabase.from('finishes_view').select('*').order('name'),
        supabase.from('hardware_view').select('*').order('name'),
      ])
      setFactories((f as Factory[]) ?? [])
      setCategories((c as Category[]) ?? [])
      setMaterials((m as Material[]) ?? [])
      setFinishes((fi as Finish[]) ?? [])
      setHardware((hw as HardwareRow[]) ?? [])
      if (f && f.length > 0) setFactoryId(f[0].id)
    })()
  }, [])

  useEffect(() => {
    if (!factoryId) return
    (async () => {
      const [{ data: cr }, { data: mr }, { data: fr }, { data: hr }] = await Promise.all([
        supabase.from('factory_category_rates').select('*').eq('factory_id', factoryId),
        supabase.from('factory_material_rates').select('*').eq('factory_id', factoryId),
        supabase.from('factory_finish_rates').select('*').eq('factory_id', factoryId),
        supabase.from('factory_hardware_rates').select('*').eq('factory_id', factoryId),
      ])
      setCatRates(Object.fromEntries((cr ?? []).map((r: any) => [r.category_id, r.base_rate])))
      setMatRates(Object.fromEntries((mr ?? []).map((r: any) => [r.material_id, r.rate_per_sqft])))
      setFinRates(Object.fromEntries((fr ?? []).map((r: any) => [r.finish_id, r.rate_per_sqft])))
      setHwRates(Object.fromEntries((hr ?? []).map((r: any) => [r.hardware_id, r.rate])))
    })()
  }, [factoryId])

  if (profile?.role !== 'admin') {
    return <p className="text-sm text-slate-500">Only Admin can manage factory rates.</p>
  }

  async function saveCategories() {
    setSaving(true)
    const rows = categories.map((c) => ({ factory_id: factoryId, category_id: c.id, base_rate: catRates[c.id] ?? 0 }))
    await supabase.from('factory_category_rates').upsert(rows, { onConflict: 'factory_id,category_id' })
    setSaving(false); setSavedAt(Date.now())
  }
  async function saveMaterials() {
    setSaving(true)
    const rows = materials.map((m) => ({ factory_id: factoryId, material_id: m.id, rate_per_sqft: matRates[m.id] ?? 0 }))
    await supabase.from('factory_material_rates').upsert(rows, { onConflict: 'factory_id,material_id' })
    setSaving(false); setSavedAt(Date.now())
  }
  async function saveFinishes() {
    setSaving(true)
    const rows = finishes.map((f) => ({ factory_id: factoryId, finish_id: f.id, rate_per_sqft: finRates[f.id] ?? 0 }))
    await supabase.from('factory_finish_rates').upsert(rows, { onConflict: 'factory_id,finish_id' })
    setSaving(false); setSavedAt(Date.now())
  }
  async function saveHardware() {
    setSaving(true)
    const rows = hardware.map((h) => ({ factory_id: factoryId, hardware_id: h.id, rate: hwRates[h.id] ?? 0 }))
    await supabase.from('factory_hardware_rates').upsert(rows, { onConflict: 'factory_id,hardware_id' })
    setSaving(false); setSavedAt(Date.now())
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: 'Categories' },
    { key: 'materials', label: 'Materials' },
    { key: 'finishes', label: 'Finishes' },
    { key: 'hardware', label: 'Hardware' },
  ]

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-xl font-bold text-amber-800 mb-1">Factory Rates</h1>
      <p className="text-xs text-slate-500 mb-4">Admin only. These rates override the global default when a quote is created against this factory.</p>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-600">Factory</label>
        <select
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          value={factoryId}
          onChange={(e) => setFactoryId(e.target.value)}
        >
          {factories.map((f) => (
            <option key={f.id} value={f.id}>{f.name} — {f.city}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${tab === t.key ? 'bg-amber-800 text-white border-amber-800' : 'border-slate-300 text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="pb-2">Category</th>
                <th className="pb-2">Global default (₹/sqft)</th>
                <th className="pb-2">Factory rate (₹/sqft)</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-slate-400">{c.base_rate ?? '—'}</td>
                  <td className="py-2">
                    <input type="number" className="w-28 border border-slate-300 rounded px-2 py-1"
                      value={catRates[c.id] ?? ''}
                      onChange={(e) => setCatRates({ ...catRates, [c.id]: Number(e.target.value) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={saveCategories} disabled={saving} className="mt-4 bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save category rates'}
          </button>
        </div>
      )}

      {tab === 'materials' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="pb-2">Material</th>
                <th className="pb-2">Global default (₹/sqft)</th>
                <th className="pb-2">Factory rate (₹/sqft)</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-2">{m.name} <span className="text-slate-400">({m.brand})</span></td>
                  <td className="py-2 text-slate-400">{m.rate_per_sqft ?? '—'}</td>
                  <td className="py-2">
                    <input type="number" className="w-28 border border-slate-300 rounded px-2 py-1"
                      value={matRates[m.id] ?? ''}
                      onChange={(e) => setMatRates({ ...matRates, [m.id]: Number(e.target.value) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={saveMaterials} disabled={saving} className="mt-4 bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save material rates'}
          </button>
        </div>
      )}

      {tab === 'finishes' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="pb-2">Finish</th>
                <th className="pb-2">Global default (₹/sqft)</th>
                <th className="pb-2">Factory rate (₹/sqft)</th>
              </tr>
            </thead>
            <tbody>
              {finishes.map((f) => (
                <tr key={f.id} className="border-b border-slate-100">
                  <td className="py-2">{f.name}</td>
                  <td className="py-2 text-slate-400">{f.rate_per_sqft ?? '—'}</td>
                  <td className="py-2">
                    <input type="number" className="w-28 border border-slate-300 rounded px-2 py-1"
                      value={finRates[f.id] ?? ''}
                      onChange={(e) => setFinRates({ ...finRates, [f.id]: Number(e.target.value) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={saveFinishes} disabled={saving} className="mt-4 bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save finish rates'}
          </button>
        </div>
      )}

      {tab === 'hardware' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="pb-2">Hardware</th>
                <th className="pb-2">Global default (₹/unit)</th>
                <th className="pb-2">Factory rate (₹/unit)</th>
              </tr>
            </thead>
            <tbody>
              {hardware.map((h) => (
                <tr key={h.id} className="border-b border-slate-100">
                  <td className="py-2">{h.name} <span className="text-slate-400">({h.brand}, per {h.unit})</span></td>
                  <td className="py-2 text-slate-400">{h.rate ?? '—'}</td>
                  <td className="py-2">
                    <input type="number" className="w-28 border border-slate-300 rounded px-2 py-1"
                      value={hwRates[h.id] ?? ''}
                      onChange={(e) => setHwRates({ ...hwRates, [h.id]: Number(e.target.value) })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={saveHardware} disabled={saving} className="mt-4 bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save hardware rates'}
          </button>
        </div>
      )}

      {savedAt && <p className="text-xs text-green-600 mt-3">Saved.</p>}
    </div>
  )
}
