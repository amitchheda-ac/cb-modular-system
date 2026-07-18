import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Factory } from '../lib/types'

type Tab = 'categories' | 'materials' | 'finishes' | 'hardware' | 'accessories' | 'shutterTypes'

type FieldType = 'text' | 'number' | 'checkbox'
interface FieldDef {
  key: string
  label: string
  type: FieldType
  step?: string
}

interface EntityConfig {
  key: Tab
  label: string
  table: string
  view: string
  fields: FieldDef[]
  globalRateCol?: string
  factoryRateTable?: string
  factoryRateFkCol?: string
  factoryRateValCol?: string
  factoryRateLabel?: string
}

const CONFIGS: EntityConfig[] = [
  {
    key: 'categories',
    label: 'Categories',
    table: 'categories',
    view: 'categories_view',
    fields: [
      { key: 'code', label: 'Code', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'lead_time_days', label: 'Lead time (days)', type: 'number' },
      { key: 'near_water', label: 'Near water', type: 'checkbox' },
      { key: 'wall_mounted_option', label: 'Wall mounted option', type: 'checkbox' },
      { key: 'base_rate', label: 'Base rate (₹/sqft)', type: 'number', step: '0.01' },
    ],
    globalRateCol: 'base_rate',
    factoryRateTable: 'factory_category_rates',
    factoryRateFkCol: 'category_id',
    factoryRateValCol: 'base_rate',
    factoryRateLabel: '₹/sqft',
  },
  {
    key: 'materials',
    label: 'Materials',
    table: 'materials',
    view: 'materials_view',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'thickness_mm', label: 'Thickness (mm)', type: 'number' },
      { key: 'waterproof', label: 'Waterproof', type: 'checkbox' },
      { key: 'rate_per_sqft', label: 'Rate (₹/sqft)', type: 'number', step: '0.01' },
      { key: 'wastage_pct', label: 'Wastage %', type: 'number', step: '0.01' },
      { key: 'multiplier', label: 'Multiplier', type: 'number', step: '0.01' },
    ],
    globalRateCol: 'rate_per_sqft',
    factoryRateTable: 'factory_material_rates',
    factoryRateFkCol: 'material_id',
    factoryRateValCol: 'rate_per_sqft',
    factoryRateLabel: '₹/sqft',
  },
  {
    key: 'finishes',
    label: 'Finishes',
    table: 'finishes',
    view: 'finishes_view',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'finish_type', label: 'Type', type: 'text' },
      { key: 'rate_per_sqft', label: 'Rate (₹/sqft)', type: 'number', step: '0.01' },
      { key: 'multiplier', label: 'Multiplier', type: 'number', step: '0.01' },
    ],
    globalRateCol: 'rate_per_sqft',
    factoryRateTable: 'factory_finish_rates',
    factoryRateFkCol: 'finish_id',
    factoryRateValCol: 'rate_per_sqft',
    factoryRateLabel: '₹/sqft',
  },
  {
    key: 'hardware',
    label: 'Hardware',
    table: 'hardware',
    view: 'hardware_view',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'unit', label: 'Unit', type: 'text' },
      { key: 'rate', label: 'Rate (₹/unit)', type: 'number', step: '0.01' },
    ],
    globalRateCol: 'rate',
    factoryRateTable: 'factory_hardware_rates',
    factoryRateFkCol: 'hardware_id',
    factoryRateValCol: 'rate',
    factoryRateLabel: '₹/unit',
  },
  {
    key: 'accessories',
    label: 'Accessories',
    table: 'accessories',
    view: 'accessories_view',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'rate', label: 'Rate (₹)', type: 'number', step: '0.01' },
    ],
  },
  {
    key: 'shutterTypes',
    label: 'Shutter Types',
    table: 'shutter_types',
    view: 'shutter_types_view',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'multiplier', label: 'Multiplier', type: 'number', step: '0.01' },
    ],
  },
]

function emptyFormFor(config: EntityConfig): Record<string, any> {
  const f: Record<string, any> = { active: true }
  for (const field of config.fields) {
    f[field.key] = field.type === 'checkbox' ? false : ''
  }
  return f
}

function toPayload(config: EntityConfig, form: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = { active: !!form.active }
  for (const field of config.fields) {
    const raw = form[field.key]
    if (field.type === 'number') {
      payload[field.key] = raw === '' || raw === null || raw === undefined ? null : Number(raw)
    } else if (field.type === 'checkbox') {
      payload[field.key] = !!raw
    } else {
      payload[field.key] = raw
    }
  }
  return payload
}

function MasterCrudSection({ config, onChanged }: { config: EntityConfig; onChanged: () => void }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<Record<string, any>>(emptyFormFor(config))
  const [addError, setAddError] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [editError, setEditError] = useState('')
  const [editBusy, setEditBusy] = useState(false)

  const [deleteError, setDeleteError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from(config.view).select('*').order('name')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    setShowAdd(false)
    setEditingId(null)
    setAddError('')
    setEditError('')
    setDeleteError('')
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key])

  function startAdd() {
    setAddForm(emptyFormFor(config))
    setAddError('')
    setShowAdd(true)
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddBusy(true)
    setAddError('')
    const payload = toPayload(config, addForm)
    payload.id = crypto.randomUUID()
    const { error } = await supabase.from(config.table).insert(payload)
    setAddBusy(false)
    if (error) {
      setAddError(error.message)
      return
    }
    setShowAdd(false)
    await load()
    onChanged()
  }

  function startEdit(item: any) {
    const f: Record<string, any> = { active: item.active }
    for (const field of config.fields) f[field.key] = item[field.key] ?? (field.type === 'checkbox' ? false : '')
    setEditForm(f)
    setEditError('')
    setEditingId(item.id)
    setShowAdd(false)
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setEditBusy(true)
    setEditError('')
    const payload = toPayload(config, editForm)
    const { error } = await supabase.from(config.table).update(payload).eq('id', editingId)
    setEditBusy(false)
    if (error) {
      setEditError(error.message)
      return
    }
    setEditingId(null)
    await load()
    onChanged()
  }

  async function toggleActive(item: any) {
    await supabase.from(config.table).update({ active: !item.active }).eq('id', item.id)
    await load()
    onChanged()
  }

  async function deleteItem(item: any) {
    setDeleteError('')
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    const { error } = await supabase.from(config.table).delete().eq('id', item.id)
    if (error) {
      if ((error as any).code === '23503' || /foreign key/i.test(error.message)) {
        setDeleteError(`"${item.name}" is already used elsewhere (e.g. in a preset or quote), so it can't be deleted. Use the Active toggle to hide it instead.`)
      } else {
        setDeleteError(error.message)
      }
      return
    }
    await load()
    onChanged()
  }

  function renderFieldInput(field: FieldDef, form: Record<string, any>, setForm: (f: Record<string, any>) => void) {
    if (field.type === 'checkbox') {
      return (
        <label key={field.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form[field.key]}
            onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
          />
          {field.label}
        </label>
      )
    }
    return (
      <label key={field.key} className="text-sm block">
        <span className="text-xs text-slate-500 block mb-1">{field.label}</span>
        <input
          required={field.type === 'text'}
          type={field.type === 'number' ? 'number' : 'text'}
          step={field.step}
          className="w-full border border-slate-300 rounded px-2 py-1.5"
          value={form[field.key] ?? ''}
          onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
        />
      </label>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-base font-semibold text-amber-800">{config.label}</h2>
        {!showAdd && (
          <button
            onClick={startAdd}
            className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900"
          >
            + Add {config.label.replace(/s$/, '')}
          </button>
        )}
      </div>

      {deleteError && <p className="text-xs text-red-600 mb-3">{deleteError}</p>}

      {showAdd && (
        <form onSubmit={submitAdd} className="border border-amber-200 bg-amber-50/40 rounded-md p-3 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            {config.fields.map((f) => renderFieldInput(f, addForm, setAddForm))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!addForm.active}
                onChange={(e) => setAddForm({ ...addForm, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          {addError && <p className="text-xs text-red-600 mb-2">{addError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={addBusy} className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900 disabled:opacity-50">
              {addBusy ? 'Saving...' : 'Save new'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs border border-slate-300 px-3 py-1.5 rounded-md">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">None yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) =>
            editingId === item.id ? (
              <form key={item.id} onSubmit={submitEdit} className="py-3 border border-amber-200 bg-amber-50/40 rounded-md p-3 mb-2">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {config.fields.map((f) => renderFieldInput(f, editForm, setEditForm))}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!editForm.active}
                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
                {editError && <p className="text-xs text-red-600 mb-2">{editError}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={editBusy} className="text-xs bg-amber-800 text-white px-3 py-1.5 rounded-md hover:bg-amber-900 disabled:opacity-50">
                    {editBusy ? 'Saving...' : 'Save changes'}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-xs border border-slate-300 px-3 py-1.5 rounded-md">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <span className={item.active ? '' : 'text-slate-400 line-through'}>{item.name}</span>
                  {'brand' in item && item.brand && <span className="text-slate-400"> ({item.brand})</span>}
                  {!item.active && <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">inactive</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(item)} className="text-xs text-amber-800 hover:underline">Edit</button>
                  <button onClick={() => toggleActive(item)} className="text-xs text-slate-500 hover:underline">
                    {item.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deleteItem(item)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function FactoryRateSection({ config, factoryId }: { config: EntityConfig; factoryId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from(config.view).select('*').order('name')
      setItems(data ?? [])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key])

  useEffect(() => {
    if (!factoryId || !config.factoryRateTable) return
    (async () => {
      const { data } = await supabase.from(config.factoryRateTable as string).select('*').eq('factory_id', factoryId)
      setRates(Object.fromEntries((data ?? []).map((r: any) => [r[config.factoryRateFkCol as string], r[config.factoryRateValCol as string]])))
    })()
  }, [factoryId, config.key])

  async function save() {
    if (!config.factoryRateTable) return
    setSaving(true)
    const rows = items.map((it) => ({
      factory_id: factoryId,
      [config.factoryRateFkCol as string]: it.id,
      [config.factoryRateValCol as string]: rates[it.id] ?? 0,
    }))
    await supabase.from(config.factoryRateTable).upsert(rows, { onConflict: `factory_id,${config.factoryRateFkCol}` })
    setSaving(false)
    setSavedAt(Date.now())
  }

  if (!config.factoryRateTable || !config.globalRateCol) return null

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mt-4">
      <h3 className="font-serif text-sm font-semibold text-amber-800 mb-3">Factory rate overrides — {config.label}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
            <th className="pb-2">{config.label.replace(/s$/, '')}</th>
            <th className="pb-2">Global default ({config.factoryRateLabel})</th>
            <th className="pb-2">Factory rate ({config.factoryRateLabel})</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-100">
              <td className="py-2">{it.name}</td>
              <td className="py-2 text-slate-400">{it[config.globalRateCol as string] ?? '—'}</td>
              <td className="py-2">
                <input
                  type="number"
                  className="w-28 border border-slate-300 rounded px-2 py-1"
                  value={rates[it.id] ?? ''}
                  onChange={(e) => setRates({ ...rates, [it.id]: Number(e.target.value) })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={save} disabled={saving} className="mt-4 bg-amber-800 text-white text-sm px-4 py-2 rounded-md hover:bg-amber-900 disabled:opacity-50">
        {saving ? 'Saving...' : `Save ${config.label.toLowerCase()} rates`}
      </button>
      {savedAt && <p className="text-xs text-green-600 mt-2">Saved.</p>}
    </div>
  )
}

export function AdminRates() {
  const { profile } = useAuth()
  const [factories, setFactories] = useState<Factory[]>([])
  const [factoryId, setFactoryId] = useState('')
  const [tab, setTab] = useState<Tab>('categories')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    (async () => {
      const { data: f } = await supabase.from('factories').select('*').order('name')
      setFactories((f as Factory[]) ?? [])
      if (f && f.length > 0) setFactoryId(f[0].id)
    })()
  }, [])

  if (profile?.role !== 'admin') {
    return <p className="text-sm text-slate-500">Only Admin can manage rates and master data.</p>
  }

  const config = CONFIGS.find((c) => c.key === tab)!

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-xl font-bold text-amber-800 mb-1">Rates &amp; Masters</h1>
      <p className="text-xs text-slate-500 mb-4">Admin only. Add, edit, or remove categories, materials, finishes, hardware, accessories, and shutter types — plus per-factory rate overrides.</p>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-600">Factory (for rate overrides)</label>
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

      <div className="flex gap-2 mb-4 flex-wrap">
        {CONFIGS.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`text-xs px-3 py-1.5 rounded-full border ${tab === c.key ? 'bg-amber-800 text-white border-amber-800' : 'border-slate-300 text-slate-600'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <MasterCrudSection key={config.key + refreshKey} config={config} onChanged={() => setRefreshKey((k) => k + 1)} />
      {factoryId && <FactoryRateSection key={config.key + '-rates-' + refreshKey} config={config} factoryId={factoryId} />}
    </div>
  )
}
