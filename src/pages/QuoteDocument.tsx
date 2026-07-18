import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Category, Finish, Material, Quotation, QuotationItem, QuotationTotals, Project, Customer } from '../lib/types'

const money = (n: number | null | undefined) => n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`
type DocView = 'client' | 'sales' | 'factory' | 'designer'

export function QuoteDocument() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const defaultView: DocView = profile?.role === 'designer' ? 'designer' : profile?.role === 'admin' ? 'sales' : 'sales'
  const [view, setView] = useState<DocView>(defaultView)

  const [quote, setQuote] = useState<Quotation | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [totals, setTotals] = useState<QuotationTotals | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [finishes, setFinishes] = useState<Finish[]>([])

  useEffect(() => {
    if (!id) return
    (async () => {
      const { data: q } = await supabase.from('quotations_view').select('*').eq('id', id).single()
      setQuote(q as Quotation)
      if (q?.project_id) {
        const { data: p } = await supabase.from('projects').select('*').eq('id', q.project_id).single()
        setProject(p as Project)
        if (p?.customer_id) {
          const { data: c } = await supabase.from('customers').select('*').eq('id', p.customer_id).single()
          setCustomer(c as Customer)
        }
      }
      const { data: it } = await supabase.from('quotation_items_view').select('*').eq('quotation_id', id).order('created_at')
      setItems((it as QuotationItem[]) ?? [])
      const { data: t } = await supabase.from('quotation_totals_view').select('*').eq('quotation_id', id).maybeSingle()
      setTotals(t as QuotationTotals)
      const [{ data: c }, { data: m }, { data: f }] = await Promise.all([
        supabase.from('categories_view').select('*'),
        supabase.from('materials_view').select('*'),
        supabase.from('finishes_view').select('*'),
      ])
      setCategories((c as Category[]) ?? [])
      setMaterials((m as Material[]) ?? [])
      setFinishes((f as Finish[]) ?? [])
    })()
  }, [id])

  if (!quote) return <p className="text-sm text-slate-500 p-6">Loading...</p>

  const showPrice = view !== 'factory'
  const showCost = isAdmin && view === 'sales' && false // cost never shown on any generated document, admin-only in-app
  const title = { client: 'Client Quotation', sales: 'Sales Copy', factory: 'Factory Work Order', designer: 'Designer Specification' }[view]

  return (
    <div className="bg-slate-100 min-h-screen py-6 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <div className="flex gap-2">
          {(['client', 'sales', 'factory', 'designer'] as DocView[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-full border capitalize ${view === v ? 'bg-amber-800 text-white border-amber-800' : 'border-slate-300 text-slate-600'}`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="bg-slate-800 text-white text-xs px-4 py-2 rounded-md">Print / Save PDF</button>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none rounded-lg print:rounded-none p-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-amber-800">Casa Bianca</h1>
            <p className="text-xs text-slate-500">{title}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>{quote.quote_no ?? quote.id}</div>
            <div>{new Date(quote.created_at).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {customer && (
          <div className="mb-4 text-sm">
            <div className="font-medium text-slate-800">{customer.name}</div>
            <div className="text-slate-500">{customer.mobile}</div>
            {project && <div className="text-slate-500">{project.site_address}</div>}
          </div>
        )}

        <div className="space-y-4">
          {items.map((it) => {
            const cat = categories.find((c) => c.id === it.category_id)
            const mat = materials.find((m) => m.id === it.material_id)
            const ext = finishes.find((f) => f.id === it.external_finish_id)
            const furnitureImg = it.images?.find((i) => i.kind === 'furniture')
            return (
              <div key={it.id} className="border border-slate-200 rounded-lg p-4 break-inside-avoid">
                <div className="flex gap-4">
                  {(view === 'client' || view === 'designer') && (
                    <div className="w-28 h-28 bg-slate-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                      {furnitureImg ? <img src={furnitureImg.url} className="w-full h-full object-cover" /> : <span className="text-[10px] text-slate-400">No image</span>}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{cat?.name}</div>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <div>Dimensions: {it.width_mm} × {it.height_mm}{it.depth_mm ? ` × ${it.depth_mm}` : ''} mm · Qty {it.qty}</div>
                      {mat && <div>Material: {mat.name} ({mat.brand}){view === 'factory' && mat.thickness_mm ? `, ${mat.thickness_mm}mm` : ''}</div>}
                      {ext && <div>Finish: {ext.name}</div>}
                    </div>
                    {(view === 'designer' || view === 'client') && it.images?.length > 1 && (
                      <div className="flex gap-2 mt-2">
                        {it.images.filter((i) => i.kind !== 'furniture').map((img, i) => (
                          <img key={i} src={img.url} className="w-12 h-12 object-cover rounded border border-slate-200" title={img.kind} />
                        ))}
                      </div>
                    )}
                  </div>
                  {showPrice && (
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-slate-800">{money(it.sell_amount)}</div>
                      <div className="text-[10px] text-slate-400">MRP</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {showPrice && totals && (
          <div className="mt-6 border-t border-slate-200 pt-4 space-y-1 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            {totals.discount_pct > 0 && (
              <div className="flex justify-between text-slate-600"><span>Discount ({totals.discount_pct}%)</span><span>-{money(totals.discount_amount)}</span></div>
            )}
            <div className="flex justify-between text-slate-600"><span>GST ({totals.gst_pct}%)</span><span>{money(totals.gst_amount)}</span></div>
            <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1">
              <span>Grand Total</span><span>{money(totals.grand_total)}</span>
            </div>
          </div>
        )}

        {view === 'factory' && (
          <p className="mt-6 text-[11px] text-slate-400">Internal work order — pricing intentionally omitted. Refer to Sales copy for client commercials.</p>
        )}
        {showCost && null}
      </div>
    </div>
  )
}
