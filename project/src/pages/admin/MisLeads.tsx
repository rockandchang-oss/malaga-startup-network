import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

type L = {
  id: string; created_at: string; status: string; contact_name: string | null; project_name: string | null
  email: string | null; phone: string | null; whatsapp: string | null; web: string | null; visible: boolean
  eligida_por_mi: boolean; sugerida_a_mi: boolean; location_city: string | null
  raw_answers: Record<string, any> | null; entidades_elegidas: string[]; entidades_sugeridas: string[]
}

function Oculto({ largo = 10 }: { largo?: number }) {
  return <span className="select-none rounded bg-slate-200 px-1 text-slate-200 blur-[3px]" title="Solo visible si el emprendedor os elige">{"x".repeat(largo)}</span>
}
function valor(v: any) { return Array.isArray(v) ? v.join(", ") : typeof v === "object" && v ? Object.values(v).join(", ") : String(v ?? "") }

export default function MisLeads() {
  const { isSuperadmin } = useAuth()
  const [leads, setLeads] = useState<L[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<"todos" | "mios">("todos")
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc("leads_para_entidad" as any).then(({ data, error }) => {
      if (error) setErr(error.message); else setLeads((data ?? []) as any)
      setCargando(false)
    })
  }, [])

  const lista = useMemo(() => leads.filter((l) => filtro === "todos" || l.eligida_por_mi), [leads, filtro])
  const mios = leads.filter((l) => l.eligida_por_mi).length

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Emprendedores</h1>
      <p className="mt-1 max-w-3xl text-slate-500">
        Todos los emprendedores que han pasado por el buscador. Sus datos de contacto solo se muestran cuando os han elegido;
        del resto veis en qué punto están, qué necesitan y qué entidades han elegido.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-slate-500">Emprendedores en la red</p><p className="mt-1 text-3xl font-extrabold text-[#4A5D8A]">{leads.length}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-500">{isSuperadmin ? "Con datos visibles" : "Os han elegido"}</p><p className="mt-1 text-3xl font-extrabold text-[#4A5D8A]">{isSuperadmin ? leads.length : mios}</p></div>
      </div>

      {!isSuperadmin && (
        <div className="mt-5 flex gap-2 text-sm">
          {(["todos", "mios"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`rounded-full px-3 py-1 font-semibold ${filtro === f ? "bg-[#4A5D8A] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
              {f === "todos" ? "Todos" : "Os han elegido"}
            </button>
          ))}
        </div>
      )}

      {cargando && <p className="mt-6 text-slate-400">Cargando…</p>}
      {err && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</p>}
      {!cargando && !err && lista.length === 0 && <div className="card mt-6 p-8 text-center text-slate-500">Todavía no hay emprendedores {filtro === "mios" ? "que os hayan elegido" : ""}.</div>}

      <div className="mt-4 space-y-3">
        {lista.map((l) => (
          <div key={l.id} className={`card p-5 ${l.eligida_por_mi ? "ring-2 ring-[#4A5D8A]" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-[#2C3959]">{l.visible ? (l.project_name || "Sin nombre de proyecto") : <Oculto largo={14} />}</p>
                <p className="text-sm text-slate-600">{l.visible ? l.contact_name : <Oculto />}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                {new Date(l.created_at).toLocaleDateString("es-ES")}
                {l.eligida_por_mi && <p className="mt-1 rounded-full bg-[#4A5D8A] px-2 py-0.5 font-semibold text-white">Os ha elegido</p>}
                {!l.eligida_por_mi && l.sugerida_a_mi && <p className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">Os fuisteis sugeridos</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span><b>Email:</b> {l.visible ? (l.email ? <a className="text-[#4A5D8A] hover:underline" href={`mailto:${l.email}`}>{l.email}</a> : "—") : <Oculto largo={16} />}</span>
              <span><b>Teléfono:</b> {l.visible ? (l.phone || l.whatsapp || "—") : <Oculto largo={9} />}</span>
              <span><b>Web:</b> {l.visible ? (l.web ? <a className="text-[#4A5D8A] hover:underline" target="_blank" rel="noreferrer" href={l.web.startsWith("http") ? l.web : "https://" + l.web}>{l.web}</a> : "—") : <Oculto largo={12} />}</span>
              {l.visible && l.whatsapp && <a className="font-semibold text-emerald-700 hover:underline" target="_blank" rel="noreferrer" href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>}
            </div>
            {l.raw_answers && Object.keys(l.raw_answers).length > 0 && (
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {Object.entries(l.raw_answers).map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="text-slate-700">{valor(v)}</dd></div>
                ))}
              </dl>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {l.entidades_elegidas?.length > 0 && <span><b>Eligió:</b> {l.entidades_elegidas.join(", ")}</span>}
              {l.entidades_sugeridas?.length > 0 && <span><b>Le sugerimos:</b> {l.entidades_sugeridas.join(", ")}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
