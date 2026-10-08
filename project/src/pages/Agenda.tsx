import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Evento = {
  id: string; titulo: string; descripcion: string | null
  fecha_inicio: string; fecha_fin: string | null; hora: string | null
  ciudad: string | null; provincia: string | null; online: boolean
  categoria: string | null; url: string | null; fuente: string | null; organizador: string | null
  origen: string | null; inscripcion_inicio: string | null; inscripcion_fin: string | null; imagen_url: string | null
}

const COLOR: Record<string, string> = {
  "Hackatón": "bg-fuchsia-100 text-fuchsia-700",
  "Financiación / subvención": "bg-emerald-100 text-emerald-700",
  "Convocatoria / concurso": "bg-amber-100 text-amber-700",
  "Inversión": "bg-indigo-100 text-indigo-700",
  "Aceleración / incubación": "bg-sky-100 text-sky-700",
  "Networking / encuentro": "bg-rose-100 text-rose-700",
  "Formación / taller": "bg-blue-100 text-blue-700",
  "Jornada": "bg-cyan-100 text-cyan-700",
  "Feria / congreso": "bg-violet-100 text-violet-700",
  "Evento": "bg-slate-100 text-slate-600",
}
const EMOJI: Record<string,string> = {"Hackatón":"💡","Financiación / subvención":"💶","Convocatoria / concurso":"🏆","Inversión":"📈","Aceleración / incubación":"🚀","Networking / encuentro":"🤝","Formación / taller":"🎓","Jornada":"🗓️","Feria / congreso":"🎪","Evento":"📌"}
const PROVINCIAS = ["Málaga", "Sevilla", "Granada", "Córdoba", "Cádiz", "Almería", "Huelva", "Jaén", "Online"]

function fmtFecha(ini: string, fin: string | null) {
  const d = new Date(ini + "T00:00:00")
  const o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const s = d.toLocaleDateString("es-ES", o)
  if (fin && fin !== ini) {
    const d2 = new Date(fin + "T00:00:00")
    return `${d.getDate()}–${d2.toLocaleDateString("es-ES", o)}`
  }
  return s
}
const MES = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" })
function gcalUrl(e: Evento) {
  const d = (s: string) => s.replace(/-/g, "")
  const fin = new Date((e.fecha_fin || e.fecha_inicio) + "T00:00:00"); fin.setDate(fin.getDate() + 1)
  const endExcl = `${fin.getFullYear()}${String(fin.getMonth() + 1).padStart(2, "0")}${String(fin.getDate()).padStart(2, "0")}`
  const det = [e.descripcion || "", e.url ? `Más info: ${e.url}` : "", "Vía Málaga Startup Network"].filter(Boolean).join("\n\n")
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.titulo, dates: `${d(e.fecha_inicio)}/${endExcl}`, details: det, location: e.online ? "Online" : (e.provincia || "Andalucía") })
  return "https://calendar.google.com/calendar/render?" + p.toString()
}

function icsText(e: Evento) {
  const d = (s: string) => s.replace(/-/g, "")
  const fin = new Date((e.fecha_fin || e.fecha_inicio) + "T00:00:00"); fin.setDate(fin.getDate() + 1)
  const endExcl = `${fin.getFullYear()}${String(fin.getMonth() + 1).padStart(2, "0")}${String(fin.getDate()).padStart(2, "0")}`
  const esc = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")
  const desc = [e.descripcion ? esc(e.descripcion.replace(/\s+/g, " ").trim()) : "", e.url ? "Mas info: " + e.url : "", "Via Malaga Startup Network"].filter(Boolean).join("\\n\\n")
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Malaga Startup Network//Agenda//ES", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", "UID:" + e.id + "@malagastartupnetwork",
    "DTSTAMP:" + stamp, "DTSTART;VALUE=DATE:" + d(e.fecha_inicio), "DTEND;VALUE=DATE:" + endExcl,
    "SUMMARY:" + esc(e.titulo), "DESCRIPTION:" + desc,
    "LOCATION:" + esc(e.online ? "Online" : (e.provincia || "Andalucia")),
    e.url ? "URL:" + e.url : "", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n")
}
function descargaIcs(e: Evento) {
  const blob = new Blob([icsText(e)], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url
  a.download = (e.titulo || "evento").replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase() + ".ics"
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export default function Agenda() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState<string>("")
  const [prov, setProv] = useState<string>("")

  useEffect(() => {
    const hoy = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    ;(async () => {
      try {
        const { data } = await supabase.from("eventos").select("*").eq("estado", "publicado")
          .gte("fecha_inicio", hoy).order("fecha_inicio", { ascending: true }).limit(300)
        setEventos((data ?? []) as Evento[])
      } catch { /* dejamos lista vacia */ }
      finally { setLoading(false) }
    })()
  }, [])

  const tipos = useMemo(() => Array.from(new Set(eventos.map(e => e.categoria).filter(Boolean))) as string[], [eventos])
  const filtrados = useMemo(() => eventos.filter(e =>
    (!tipo || e.categoria === tipo) && (!prov || e.provincia === prov)), [eventos, tipo, prov])

  const porMes = useMemo(() => {
    const m: Record<string, Evento[]> = {}
    for (const e of filtrados) { const k = e.fecha_inicio.slice(0, 7); (m[k] ??= []).push(e) }
    const rank = (e: Evento) => (e.origen === "entidad" ? 0 : 2) + ((!prov && e.provincia === "Málaga") ? 0 : 1)
    for (const k in m) m[k].sort((a, b) => rank(a) - rank(b) || a.fecha_inicio.localeCompare(b.fecha_inicio))
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b))
  }, [filtrados])

  return (
    <div className="container-x py-14">
      <h1 className="text-4xl font-extrabold tracking-tight">Agenda de eventos</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Eventos, jornadas, convocatorias y ayudas para emprender en toda Andalucía. Recopilados y
        clasificados automáticamente; pulsa cualquiera para ver el detalle original. <b class="text-brand-700">Destacamos los de Málaga</b>, pero puedes ver los de toda Andalucía.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setTipo("")} className={`rounded-full px-3 py-1 text-sm ${!tipo ? "bg-brand-600 text-white" : "border border-slate-200"}`}>Todos</button>
        {tipos.map(t => (
          <button key={t} onClick={() => setTipo(t)} className={`rounded-full px-3 py-1 text-sm ${tipo === t ? "bg-brand-600 text-white" : "border border-slate-200"}`}>{t}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setProv("")} className={`rounded-full px-3 py-1 text-xs ${!prov ? "bg-sun-500 text-brand-950 font-semibold" : "border border-slate-200 text-slate-500"}`}>Toda Andalucía</button>
        {PROVINCIAS.map(p => (
          <button key={p} onClick={() => setProv(p)} className={`rounded-full px-3 py-1 text-xs ${prov === p ? "bg-sun-500 text-brand-950 font-semibold" : p === "Málaga" ? "border border-brand-400 text-brand-700 font-semibold" : "border border-slate-200 text-slate-500"}`}>{p === "Málaga" ? "★ Málaga" : p === "Online" ? "💻 Online" : p}</button>
        ))}
      </div>

      {loading ? <p className="mt-10 text-slate-400">Cargando…</p> : (
        <>
          <p className="mt-6 text-sm text-slate-400">{filtrados.length} evento{filtrados.length === 1 ? "" : "s"}</p>
          {porMes.length === 0 && <p className="mt-10 text-slate-400">No hay eventos con esos filtros.</p>}
          {porMes.map(([mes, evs]) => (
            <section key={mes} className="mt-8">
              <h2 className="text-lg font-bold capitalize text-brand-700">{MES(evs[0].fecha_inicio)}</h2>
              <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {evs.map(e => {
                  const inner = (
                    <div className="flex items-start gap-4 p-4 transition hover:bg-slate-50">
                      {e.imagen_url
                        ? <img src={e.imagen_url} alt="" loading="lazy" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none" }} className="h-14 w-20 shrink-0 rounded-lg object-cover sm:h-16 sm:w-24" />
                        : <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl sm:h-16 sm:w-24">{e.categoria ? (EMOJI[e.categoria] ?? "📌") : "📌"}</div>}
                      <div className="w-14 shrink-0 text-center">
                        <div className="text-lg font-extrabold leading-none text-brand-700">{new Date(e.fecha_inicio + "T00:00:00").getDate()}</div>
                        <div className="text-[11px] uppercase text-slate-400">{new Date(e.fecha_inicio + "T00:00:00").toLocaleDateString("es-ES", { month: "short" })}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.origen === "entidad" && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">Entidad de la red</span>}
                          {e.categoria && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${COLOR[e.categoria] ?? "bg-slate-100 text-slate-600"}`}>{e.categoria}</span>}
                          <span className={`text-[11px] ${e.provincia === "Málaga" ? "font-semibold text-brand-600" : "text-slate-400"}`}>{e.provincia === "Málaga" ? "★ Málaga" : e.provincia === "Online" ? "💻 Online" : (e.provincia ?? "Andalucía")}{e.hora ? ` · ${e.hora}` : ""}</span>
                        </div>
                        <h3 className="mt-1 font-semibold text-slate-800">{e.titulo}</h3>
                        {e.inscripcion_fin && <p className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">📝 Inscripción {e.inscripcion_inicio ? `del ${new Date(e.inscripcion_inicio+"T00:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})} al ${new Date(e.inscripcion_fin+"T00:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})}` : `hasta el ${new Date(e.inscripcion_fin+"T00:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short"})}`}</p>}
                        {e.descripcion && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{e.descripcion.replace(/\\n|\s+/g, " ").trim()}</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                          <span>{fmtFecha(e.fecha_inicio, e.fecha_fin)} · {e.fuente}{e.url ? " · ver detalle ↗" : ""}</span>
                          <button type="button" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); window.open(gcalUrl(e), "_blank", "noopener") }} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50">📅 Agendar</button>
                          <button type="button" title="Descargar .ics (Apple Calendar, Outlook)" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); descargaIcs(e) }} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 font-semibold text-slate-500 transition hover:border-brand-400 hover:bg-brand-50">⬇ .ics</button>
                        </div>
                      </div>
                    </div>
                  )
                  return e.url
                    ? <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
                    : <div key={e.id}>{inner}</div>
                })}
              </div>
            </section>
          ))}
          <p className="mt-10 text-xs text-slate-400">Fuentes automáticas: Portal Andaluz de Emprendimiento (Junta), Cámara de Comercio de Málaga, Polo Digital, FYCMA, Universidad de Málaga, CTA, EOI, El Referente y más. Las entidades de la red también publican sus propios eventos y convocatorias, que salen destacados.</p>
        </>
      )}
    </div>
  )
}
