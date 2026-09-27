import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

type Red = any

export default function Stats() {
  const { isSuperadmin } = useAuth()
  const [dias, setDias] = useState(30)
  const [red, setRed] = useState<Red | null>(null)
  const [mia, setMia] = useState<any | null>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [stages, setStages] = useState<Record<string, string>>({})
  const [act, setAct] = useState<any[]>([])
  const [ents, setEnts] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.rpc("estadisticas_red" as any, { dias } as any).then(({ data }) => setRed(data))
    if (!isSuperadmin) supabase.rpc("estadisticas_entidad" as any, { dias } as any).then(({ data }) => setMia(data))
  }, [dias, isSuperadmin])

  useEffect(() => {
    if (!isSuperadmin) return
    supabase.from("leads").select("*").then(({ data }) => setLeads(data ?? []))
    supabase.from("startup_stages").select("id,name").then(({ data }) => {
      const m: Record<string, string> = {}; (data ?? []).forEach((x: any) => (m[x.id] = x.name)); setStages(m)
    })
    supabase.from("entities").select("id,name").then(({ data }) => {
      const m: Record<string, string> = {}; (data ?? []).forEach((x: any) => (m[x.id] = x.name)); setEnts(m)
    })
    supabase.from("actividad" as any).select("*").order("created_at", { ascending: false }).limit(150).then(({ data }) => setAct((data ?? []) as any[]))
  }, [isSuperadmin])

  const e = red?.embudo ?? {}
  const pctE = (n: number) => (e.inicio ? Math.round((n / e.inicio) * 100) + "%" : "—")
  const total = leads.length
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)
  const social = leads.filter((l) => l.social_impact).length
  const invest = leads.filter((l) => l.needs_investment).length
  const round = leads.filter((l) => l.in_funding_round).length
  const aMapa = (arr: any[] | undefined, k: string) => Object.fromEntries((arr ?? []).map((x) => [x[k], x.n]))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Estadísticas</h1>
          <p className="mt-1 text-slate-500">{isSuperadmin ? "Actividad de toda la red." : "Lo vuestro y lo de la red, para comparar."}</p>
        </div>
        <select className="input" value={dias} onChange={(ev) => setDias(Number(ev.target.value))}>
          <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option><option value={365}>Último año</option>
        </select>
      </div>

      {!isSuperadmin && mia && (
        <>
          <h2 className="mt-8 text-lg font-bold">Vuestra entidad</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Os han elegido (total)" value={String(mia.elegida ?? 0)} sub={`${mia.elegida_periodo ?? 0} en el periodo`} />
            <Kpi label="Os han sugerido" value={String(mia.sugerida ?? 0)} sub={mia.sugerida ? `${Math.round(((mia.elegida ?? 0) / mia.sugerida) * 100)}% os acaba eligiendo` : "emprendedores"} />
            <Kpi label="Visitas a vuestra ficha" value={String(mia.visitas_ficha ?? 0)} sub="en el periodo" />
            <Kpi label="Posición en la red" value={mia.ranking_elegida ? `#${mia.ranking_elegida}` : "—"} sub={`media de la red: ${mia.media_elegida_red ?? 0} elecciones`} />
          </div>
        </>
      )}

      {red && (
        <>
          <h2 className="mt-8 text-lg font-bold">La red</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Emprendedores (total)" value={String(red.leads_total)} sub={`${red.leads_periodo} en el periodo`} />
            <Kpi label="Visitantes del buscador" value={String(e.visitas ?? 0)} sub="sesiones en el periodo" />
            <Kpi label="Entidades activas en el panel" value={String(red.entidades_activas ?? 0)} sub={`${red.usuarios_entidad_activos ?? 0} personas`} />
            <Kpi label="Candidaturas completas" value={`${red.candidaturas_completas ?? 0}`} sub="entidades con sus 2 startups" />
          </div>

          <div className="card mt-6 p-5">
            <h3 className="font-bold">Embudo del buscador</h3>
            <p className="text-xs text-slate-400">Sesiones que llegan a cada paso (desde que se activó el registro de actividad).</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[["Empiezan", e.inicio], ["Ven sus encajes", e.encajes], ["Llegan al contacto", e.contacto], ["Envían sus datos", e.enviado]].map(([l, n]: any) => (
                <div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{l}</p><p className="text-2xl font-extrabold text-[#4A5D8A]">{n ?? 0}</p><p className="text-xs text-slate-400">{pctE(n ?? 0)}</p></div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Bars title="Entidades más elegidas" data={aMapa(red.top_elegidas, "entidad")} total={Math.max(1, ...(red.top_elegidas ?? []).map((x: any) => x.n))} />
            <Bars title="Entidades más sugeridas" data={aMapa(red.top_sugeridas, "entidad")} total={Math.max(1, ...(red.top_sugeridas ?? []).map((x: any) => x.n))} />
            <Bars title="Emprendedores por fase" data={aMapa(red.por_fase, "fase")} total={Math.max(1, red.leads_total)} />
            <Bars title="Nuevos emprendedores por día" data={Object.fromEntries((red.leads_por_dia ?? []).map((x: any) => [new Date(x.dia).toLocaleDateString("es-ES"), x.n]))} total={Math.max(1, ...(red.leads_por_dia ?? []).map((x: any) => x.n))} />
          </div>
        </>
      )}

      {isSuperadmin && (
        <>
          <h2 className="mt-10 text-lg font-bold">Perfil de los emprendedores</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Kpi label="Impacto social" value={`${pct(social)}%`} sub={`${social} leads`} />
            <Kpi label="Necesitan inversión" value={`${pct(invest)}%`} sub={`${invest} leads`} />
            <Kpi label="En ronda" value={`${pct(round)}%`} sub={`${round} leads`} />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Bars title="Por fase" data={count(leads, (l) => stages[l.stage_id] ?? "Sin definir")} total={total} />
            <Bars title="Por ubicación" data={count(leads, (l) => l.location_region ?? l.location_country ?? "Sin definir")} total={total} />
          </div>

          <h2 className="mt-10 text-lg font-bold">Registro de actividad (últimos 150)</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-2">Cuándo</th><th className="p-2">Quién</th><th className="p-2">Entidad</th><th className="p-2">Qué</th><th className="p-2">Dónde</th></tr></thead>
              <tbody>
                {act.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="p-2 whitespace-nowrap">{new Date(a.created_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="p-2">{a.actor}</td>
                    <td className="p-2">{a.entity_id ? ents[a.entity_id] ?? "—" : "—"}</td>
                    <td className="p-2 font-semibold">{a.evento}</td>
                    <td className="p-2 text-slate-500">{(a.ruta ?? "").replace("/startups", "") || "/"}</td>
                  </tr>
                ))}
                {act.length === 0 && <tr><td className="p-4 text-slate-400" colSpan={5}>Sin actividad registrada todavía.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
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
      <p className="mt-1 text-3xl font-extrabold text-[#4A5D8A]">{value}</p>
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
              <div className="h-full rounded-full bg-[#4A5D8A]" style={{ width: `${total ? (v / total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">Sin datos todavía.</p>}
      </div>
    </div>
  )
}
