import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  Category, Finish, Material, ModulePreset, Quotation, QuotationItem, QuotationTotals, Project, Customer, Factory,
} from '../lib/types'

const money = (n: number | null | undefined) => n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [quote, setQuote] = useState<Quotation | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [factory, setFactory] = useState<Factory | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [totals, setTotals] = useState<QuotationTotals | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [finishes, setFinishes] = useState<Finish[]>([])
  const [presets, setPresets] = useState<ModulePreset[]>([])
  const [maxDiscount, setMaxDiscount] = useState(10)
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const [form, setForm] = useState({
    categoryId: '', presetId: '', materialId: '', extFinishId: '', intFinishId: '',
    width: '', height: '', depth: '', qty: '1',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    const [{ data: q }, { data: it }, { data: t }] = await Promise.all([
      supabase.from('quotations_view').select('*').eq('id', id).single(),
      supabase.from('quotation_items_view').select('*').eq('quotation_id', id).order('created_at'),
      supabase.from('quotation_totals_view').select('*').eq('quotation_id', id).maybeSingle(),
    ])
    setQuote(q as Quotation)
    setItems((it as QuotationItem[]) ?? [])
    setTotals(t as QuotationTotals)

    if (q?.factory_id) {
      const { data: fac } = await supabase.from('factories').select('*').eq('id', q.factory_id).maybeSingle()
      setFactory((fac as Factory) ?? null)
    }
    if (q?.project_id) {
      const { data: p } = await supabase.from('projects').select('*').eq('id', q.project_id).maybeSingle()
      setProject((p as Project) ?? null)
      if (p?.customer_id) {
        const { data: cu } = await supabase.from('customers').select('*').eq('id', p.customer_id).maybeSingle()
        setCustomer((cu as Customer) ?? null)
      }
    }
  }, [id])

  useEffect(() => {
    load()
    ;(async () => {
      const [{ data: c }, { data: m }, { data: f }, { data: p }, { data: dp }] = await Promise.all([
        supabase.from('categories_view').select('*').eq('active', true).order('name'),
        supabase.from('materials_view').select('*').eq('active', true).order('name'),
        supabase.from('finishes_view').select('*').eq('active', true).order('name'),
        supabase.from('module_presets_view').select('*').eq('active', true).order('name'),
        supabase.from('discount_policy_view').select('*').maybeSingle(),
      ])
      setCategories((c as Category[]) ?? [])
      setMaterials((m as Material[]) ?? [])
      setFinishes((f as Finish[]) ?? [])
      setPresets((p as ModulePreset[]) ?? [])
      if (dp && 'global_max_discount_pct' in dp) setMaxDiscount(Number((dp as { global_max_discount_pct: number }).global_max_discount_pct) || 10)
    })()
  }, [load])

  function applyPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId)
    setForm((f) => ({
      ...f,
      presetId,
      categoryId: preset?.category_id ?? f.categoryId,
      width: preset?.width_mm ? String(preset.width_mm) : f.width,
      height: preset?.height_mm ? String(preset.height_mm) : f.height,
      depth: preset?.depth_mm ? String(preset.depth_mm) : f.depth,
    }))
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!quote) return
    if (!form.categoryId || !form.width || !form.height) {
      setError('Category, width and height are required.')
      return
    }
    setSaving(true)
    const { error: insErr } = await supabase.from('quotation_items').insert({
      quotation_id: quote.id,
      category_id: form.categoryId,
      module_preset_id: form.presetId || null,
      material_id: form.materialId || null,
      external_finish_id: form.extFinishId || null,
      internal_finish_id: form.intFinishId || null,
      width_mm: Number(form.width),
      height_mm: Number(form.height),
      depth_mm: form.depth ? Number(form.depth) : null,
      qty: Number(form.qty) || 1,
    })
    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    setForm({ categoryId: '', presetId: '', materialId: '', extFinishId: '', intFinishId: '', width: '', height: '', depth: '', qty: '1' })
    load()
  }

  async function updateDiscount(pct: number) {
    if (!quote) return
    await supabase.from('quotations').update({ discount_pct: pct }).eq('id', quote.id)
    if (pct > 0) {
      await supabase.from('discount_log').insert({ quotation_id: quote.id, discount_pct: pct })
    }
    load()
  }

  async function confirmOrder() {
    if (!quote || !totals) return
    if (!confirm('Confirm this quote into an order? The price will be locked.')) return
    await supabase.from('quotations').update({ status: 'confirmed', price_locked: true }).eq('id', quote.id)
    await supabase.from('orders').insert({ quotation_id: quote.id, locked_sell_amount: totals.grand_total })
    load()
  }

  async function uploadImage(itemId: string, file: File, kind: string) {
    setUploadingFor(itemId)
    const path = `quotation-items/${itemId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file)
    if (!upErr) {
      const { data: pub } = supabase.storage.from('uploads').getPublicUrl(path)
      const item = items.find((i) => i.id === itemId)
      const images = [...(item?.images ?? []), { url: pub.publicUrl, kind }]
      await supabase.from('quotation_items').update({ images }).eq('id', itemId)
      load()
    }
    setUploadingFor(null)
  }

  const filteredPresets = presets.filter((p) => !form.categoryId || p.category_id === form.categoryId)

  if (!quote) return <p className="text-sm text-slate-500">Loading...</p>

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Link to="/" className="text-xs text-slate-500 hover:text-amber-800 inline-block">&larr; Back to all quotes</Link>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-800">{quote.quote_no ?? quote.id}</h1>
            <div className="flex items-center gap-2">
              <Link to={`/quotes/${quote.id}/document`} className="text-xs text-amber-800 hover:underline">Print / Export</Link>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{quote.status}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">{quote.mode === 'predefined' ? 'Predefined' : 'Custom'} quote · v{quote.version}</p>

          <div className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Customer</div>
              <div className="text-slate-700 font-medium">{customer?.name ?? '—'}</div>
              {customer?.mobile && <div className="text-xs text-slate-500">{customer.mobile}</div>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Project</div>
              <div className="text-slate-700 font-medium">{project?.name ?? '—'}</div>
              {project?.site_address && <div className="text-xs text-slate-500">{project.site_address}</div>}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Factory</div>
              <div className="text-slate-700 font-medium">{factory?.name ?? '—'}</div>
              {factory?.city && <div className="text-xs text-slate-500">{factory.city}</div>}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {items.length === 0 && <p className="p-4 text-sm text-slate-500">No items yet — add the first piece below.</p>}
          {items.map((it) => {
            const cat = categories.find((c) => c.id === it.category_id)
            const mat = materials.find((m) => m.id === it.material_id)
            const ext = finishes.find((f) => f.id === it.external_finish_id)
            return (
              <div key={it.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{cat?.name ?? it.category_id}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {it.width_mm}×{it.height_mm}{it.depth_mm ? `×${it.depth_mm}` : ''}mm · qty {it.qty}
                      {mat ? ` · ${mat.name}` : ''}{ext ? ` · ${ext.name}` : ''}
                    </div>
                    {it.images?.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {it.images.map((img, i) => (
                          <img key={i} src={img.url} alt={img.kind} className="w-14 h-14 object-cover rounded-md border border-slate-200" />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-slate-800">{money(it.sell_amount)}</div>
                    {isAdmin && <div className="text-[11px] text-slate-400">cost {money(it.cost_amount)}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <label className="text-xs text-amber-800 cursor-pointer hover:underline">
                    {uploadingFor === it.id ? 'Uploading...' : '+ Add image'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadImage(it.id, e.target.files[0], 'furniture')} />
                  </label>
                  {isAdmin && it.line_breakdown && (
                    <button onClick={() => setExpandedBreakdown(expandedBreakdown === it.id ? null : it.id)} className="text-xs text-slate-400 hover:underline">
                      {expandedBreakdown === it.id ? 'Hide cost breakdown' : 'Cost breakdown (admin)'}
                    </button>
                  )}
                </div>
                {isAdmin && expandedBreakdown === it.id && it.line_breakdown && (
                  <div className="mt-2 bg-slate-50 rounded-md p-3 text-xs space-y-1">
                    {it.line_breakdown.map((l, i) => (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>{l.label}</span><span>{money(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <form onSubmit={addItem} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Add item</h2>
          <div className="grid grid-cols-2 gap-2">
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value, presetId: '' })}>
              <option value="">Category *</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.presetId}
              onChange={(e) => applyPreset(e.target.value)}>
              <option value="">Module preset (optional)</option>
              {filteredPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.materialId}
              onChange={(e) => setForm({ ...form, materialId: e.target.value })}>
              <option value="">Material</option>
              {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.brand})</option>)}
            </select>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.extFinishId}
              onChange={(e) => setForm({ ...form, extFinishId: e.target.value })}>
              <option value="">External finish</option>
              {finishes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select className="border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.intFinishId}
              onChange={(e) => setForm({ ...form, intFinishId: e.target.value })}>
              <option value="">Internal finish</option>
              {finishes.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input placeholder="Qty" type="number" min={1} className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
            <input placeholder="Width mm *" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
            <input placeholder="Height mm *" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
            <input placeholder="Depth mm" type="number" className="border border-slate-300 rounded-md px-3 py-2 text-sm"
              value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={saving} className="bg-amber-800 text-white rounded-md px-4 py-2 text-sm hover:bg-amber-900 disabled:opacity-50">
            {saving ? 'Adding...' : '+ Add item'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-20">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Summary (MRP)</h2>
          {totals ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Discount ({totals.discount_pct}%)</span><span>-{money(totals.discount_amount)}</span></div>
              <div className="flex justify-between text-slate-600"><span>GST ({totals.gst_pct}%)</span><span>{money(totals.gst_amount)}</span></div>
              <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-100 pt-1.5 mt-1.5">
                <span>Grand total</span><span>{money(totals.grand_total)}</span>
              </div>
            </div>
          ) : <p className="text-sm text-slate-400">Add an item to see pricing.</p>}

          {!quote.price_locked && (
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">
                Discount % {isAdmin ? '(no limit — admin)' : `(up to ${maxDiscount}% without approval)`}
              </label>
              <input
                type="number" min={0} max={isAdmin ? 100 : maxDiscount}
                defaultValue={quote.discount_pct}
                onBlur={(e) => updateDiscount(Number(e.target.value))}
                className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}

          {!quote.price_locked && items.length > 0 && (
            <button onClick={confirmOrder} className="mt-4 w-full bg-green-700 text-white rounded-md py-2 text-sm hover:bg-green-800">
              Confirm → Create Order
            </button>
          )}
          {quote.price_locked && (
            <p className="mt-4 text-xs text-green-700 bg-green-50 rounded-md p-2">Price locked — this quote is now an order.</p>
          )}
        </div>
      </div>
    </div>
  )
}
