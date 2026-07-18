import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Quotation, QuotationTotals } from '../lib/types'

export function Dashboard() {
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [totals, setTotals] = useState<Record<string, QuotationTotals>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: q } = await supabase
        .from('quotations_view')
        .select('*')
        .order('created_at', { ascending: false })
      setQuotes((q as Quotation[]) ?? [])

      const { data: t } = await supabase.from('quotation_totals_view').select('*')
      const map: Record<string, QuotationTotals> = {}
      for (const row of (t as QuotationTotals[]) ?? []) map[row.quotation_id] = row
      setTotals(map)
      setLoading(false)
    })()
  }, [])

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    superseded: 'bg-slate-100 text-slate-400',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-800">Quotations</h1>
        <Link to="/quotes/new" className="bg-amber-800 text-white text-sm rounded-md px-4 py-2 hover:bg-amber-900">
          + New Quote
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading...</p>}
      {!loading && quotes.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center text-slate-500">
          No quotations yet. Start your first one.
        </div>
      )}

      <div className="grid gap-3">
        {quotes.map((q) => (
          <Link
            key={q.id}
            to={`/quotes/${q.id}`}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:border-amber-400 transition"
          >
            <div>
              <div className="font-medium text-slate-800">
                {q.quote_no ?? q.id} <span className="text-slate-400 font-normal">· v{q.version}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {q.mode === 'predefined' ? 'Predefined' : 'Custom'} · created {new Date(q.created_at).toLocaleDateString('en-IN')}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-semibold text-slate-800">
                  {totals[q.id] ? `₹${Math.round(totals[q.id].grand_total).toLocaleString('en-IN')}` : '—'}
                </div>
                <div className="text-[11px] text-slate-400">MRP incl. GST</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[q.status] ?? ''}`}>
                {q.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
