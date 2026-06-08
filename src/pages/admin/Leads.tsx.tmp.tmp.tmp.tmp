import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Lead = Record<string, any>

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [sel, setSel] = useState<Lead | null>(null)
  const [detail, setDetail] = useState<{ responses: any[]; interests: any[] } | null>(null)

  useEffect(() => {
    supabase.from("leads").select("*, startup_stages(name)").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setLeads(data ?? []))
  }, [])

  async function open(l: Lead) {
    setSel(l)
    const [{ data: responses }, { data: interests }] = await Promise.all([
      supabase.from("lead_responses").select("text_value, onboarding_questions(prompt), onboarding_options(label)").eq("lead_id", l.id),
      supabase.from("lead_interests").select("programs(name), entities(name)").eq("lead_id", l.id),
    ])
    setDetail({ responses: responses ?? [], interests: interests ?? [] })
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("leads").update({ status }).eq("id", id)
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)))
    if (sel?.id === id) setSel({ ...sel, status })
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Leads</h1>
      <p className="mt-1 text-slate-500">{leads.length} registros del onboarding.</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr className="border-b">
              <th className="py-2">Fecha</th><th>Contacto</th><th>Proyecto</th><th>Fase</th><th>Ubicación</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="cursor-pointer border-b hover:bg-slate-50" onClick={() => open(l)}>
                <td className="py-2">{new Date(l.created_at).toLocaleDateString("es-ES")}</td>
                <td>{l.contact_name ?? "—"}<br /><span className="text-xs text-slate-400">{l.email ?? l.whatsapp}</span></td>
                <td>{l.project_name ?? "—"}</td>
                <td>{l.startup_stages?.name ?? "—"}</td>
                <td>{l.location_region ?? l.location_city ?? "—"}</td>
                <td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setSel(null)}>
          <div className="card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold">{sel.contact_name ?? "Lead"} {sel.project_name ? `· ${sel.project_name}` : ""}</h2>
            <p className="text-sm text-slate-500">{sel.email} {sel.whatsapp ? `· ${sel.whatsapp}` : ""}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {["new", "contacted", "qualified", "converted", "discarded"].map((s) => (
                <button key={s} onClick={() => setStatus(sel.id, s)}
                  className={`rounded-full px-3 py-1 text-xs ${sel.status === s ? "bg-brand-600 text-white" : "border border-slate-200"}`}>{s}</button>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-700">Respuestas</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {detail?.responses.map((r, i) => (
                <li key={i}>· {r.onboarding_questions?.prompt}: <b>{r.onboarding_options?.label ?? r.text_value}</b></li>
              ))}
            </ul>

            <h3 className="mt-5 text-sm font-semibold text-slate-700">Intereses elegidos</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {detail?.interests.map((it, i) => (
                <li key={i}>· {it.programs?.name ?? it.entities?.name}</li>
              ))}
              {detail?.interests.length === 0 && <li className="text-slate-400">—</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
