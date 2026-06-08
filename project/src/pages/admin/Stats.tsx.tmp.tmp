import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function Stats() {
  const [leads, setLeads] = useState<any[]>([])
  const [stages, setStages] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from("leads").select("*").then(({ data }) => setLeads(data ?? []))
    supabase.from("startup_stages").select("id,name").then(({ data }) => {
      const m: Record<string, string> = {}; (data ?? []).forEach((s: any) => (m[s.id] = s.name)); setStages(m)
    })
  }, [])

  const total = leads.length
  const byStage = count(leads, (l) => stages[l.stage_id] ?? "Sin definir")
  const byRegion = count(leads, (l) => l.location_region ?? l.location_country ?? "Sin definir")
  const byStatus = count(leads, (l) => l.status)
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const social = leads.filter((l) => l.social_impact).length
  const invest = leads.filter((l) => l.needs_investment).length
  const round = leads.filter((l) => l.in_funding_round).length

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Estadísticas</h1>
      <p className="mt-1 text-slate-500">{total} leads registrados.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Impacto social" value={`${pct(social)}%`} sub={`${social} leads`} />
        <Kpi label="Necesitan inversión" value={`${pct(invest)}%`} sub={`${invest} leads`} />
        <Kpi label="En ronda" value={`${pct(round)}%`} sub={`${round} leads`} />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Bars title="Por fase" data={byStage} total={total} />
        <Bars title="Por ubicación" data={byRegion} total={total} />
        <Bars title="Por estado" data={byStatus} total={total} />
      </div>
    </div>
  )
}

function count(arr: any[], fn: (x: any) => string): Record<string, number> {
  const m: Record<string, number> = {}
  for (const x of arr) { const k = fn(x); m[k] = (m[k] ?? 0) + 1 }
  return m
}
function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-brand-700">{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  )
}
function Bars({ title, data, total }: { title: string; data: Record<string, number>; total: number }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1])
  return (
    <div className="card p-5">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-sm"><span>{k}</span><span className="text-slate-400">{v}</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${total ? (v / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Sin datos todavía.</p>}
      </div>
    </div>
  )
}
