import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
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

const DIAS = ["L", "M", "X", "J", "V", "S", "D"]
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const fin = (e: Evento) => e.fecha_fin || e.fecha_inicio
const diasRango = (e: Evento) => Math.round((new Date(fin(e) + "T00:00:00").getTime() - new Date(e.fecha_inicio + "T00:00:00").getTime()) / 86400000)
function lugar(e: Evento) {
  if (e.online) return "💻 Online"
  if (e.provincia === "Málaga") return "★ Málaga"
  return e.provincia ?? "Andalucía"
}
/** Marcas que un evento pinta en un día concreto del almanaque. Rangos largos: solo apertura y cierre. */
function marcaDia(e: Evento, dia: string): string | null {
  const ini = e.fecha_inicio, f = fin(e)
  if (e.inscripcion_fin === dia && !(dia >= ini && dia <= f)) return "⏳"
  if (dia < ini || dia > f) return null
  if (diasRango(e) <= 7) return ""
  if (dia === ini) return "▶"
  if (dia === f) return "⏹"
  return null
}
const fCorta = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })

function Botones({ e }: { e: Evento }) {
  const cls = "inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 font-semibold transition hover:border-brand-400 hover:bg-brand-50"
  return (
    <>
      <button type="button" title="Añadir a Google Calendar" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); window.open(gcalUrl(e), "_blank", "noopener") }} className={`${cls} text-brand-700`}>📅 Agendar</button>
      <button type="button" title="Descargar .ics (Apple Calendar, Outlook)" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); descargaIcs(e) }} className={`${cls} text-slate-500`}>⬇ .ics</button>
    </>
  )
}

export default function Agenda() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState<string>("")
  const [prov, setProv] = useState<string>("")
  const hoyD = new Date(); const hoy = iso(hoyD)
  const [mes, setMes] = useState(() => new Date(hoyD.getFullYear(), hoyD.getMonth(), 1))
  const [dia, setDia] = useState<string>("")
  const [avisoEmp, setAvisoEmp] = useState(() => { try { return localStorage.getItem("msn_agenda_emp") !== "no" } catch { return true } })

  useEffect(() => {
    const desde = iso(new Date(hoyD.getFullYear(), hoyD.getMonth(), 1))
    ;(async () => {
      try {
        const { data } = await supabase.from("eventos").select("*").eq("estado", "publicado")
          .or(`fecha_inicio.gte.${desde},fecha_fin.gte.${desde}`).order("fecha_inicio", { ascending: true }).limit(600)
        setEventos((data ?? []) as Evento[])
      } catch { /* lista vacia */ }
      finally { setLoading(false) }
    })()
  }, [])

  const tipos = useMemo(() => Array.from(new Set(eventos.map(e => e.categoria).filter(Boolean))) as string[], [eventos])
  const filtrados = useMemo(() => eventos.filter(e =>
    (!tipo || e.categoria === tipo) &&
    (!prov || (prov === "Online" ? e.online : (e.provincia === prov || e.online)))), [eventos, tipo, prov])
  const rank = (e: Evento) => (e.origen === "entidad" ? 0 : 2) + ((!prov && e.provincia === "Málaga" && !e.online) ? 0 : 1)

  const destacados = useMemo(() => eventos.filter(e => e.origen === "entidad" && fin(e) >= hoy)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)).slice(0, 2), [eventos, hoy])

  // celdas del almanaque (lunes primero)
  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1)
    const off = (primero.getDay() + 6) % 7
    const n = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    const out: (string | null)[] = Array(off).fill(null)
    for (let d = 1; d <= n; d++) out.push(iso(new Date(mes.getFullYear(), mes.getMonth(), d)))
    while (out.length % 7) out.push(null)
    return out
  }, [mes])
  const porDia = useMemo(() => {
    const m: Record<string, { e: Evento; marca: string }[]> = {}
    for (const c of celdas) {
      if (!c) continue
      const l: { e: Evento; marca: string }[] = []
      for (const e of filtrados) { const k = marcaDia(e, c); if (k !== null) l.push({ e, marca: k }) }
      l.sort((a, b) => rank(a.e) - rank(b.e))
      m[c] = l
    }
    return m
  }, [celdas, filtrados, prov])

  const mesIni = iso(mes), mesFin = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0))
  const lista = useMemo(() => {
    let l: Evento[]
    if (dia) l = filtrados.filter(e => (dia >= e.fecha_inicio && dia <= fin(e)) || e.inscripcion_fin === dia)
    else {
      const desde = mesIni < hoy && mesFin >= hoy ? hoy : mesIni
      l = filtrados.filter(e => fin(e) >= desde && e.fecha_inicio <= mesFin)
    }
    return l.sort((a, b) => rank(a) - rank(b) || a.fecha_inicio.localeCompare(b.fecha_inicio))
  }, [filtrados, dia, mesIni, mesFin, hoy, prov])

  const cambiaMes = (d: number) => { setMes(new Date(mes.getFullYear(), mes.getMonth() + d, 1)); setDia("") }
  const cerrarAviso = () => { setAvisoEmp(false); try { localStorage.setItem("msn_agenda_emp", "no") } catch { /* */ } }

  return (
    <div className="container-x py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">Agenda de eventos</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Eventos, jornadas, convocatorias y ayudas para emprender en toda Andalucía, recopilados y clasificados
        automáticamente. <b className="text-brand-700">Destacamos los de Málaga</b> y los que publican las entidades de la red.
      </p>

      {avisoEmp && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-sun-500/40 bg-gradient-to-r from-amber-50 to-white p-4 sm:flex-row sm:items-center">
          <div className="text-2xl">🚀</div>
          <div className="flex-1">
            <p className="font-bold text-slate-800">¿Eres emprendedor o tienes una startup?</p>
            <p className="text-sm text-slate-600">Responde unas preguntas y te decimos qué programas y entidades de Málaga encajan contigo.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/empezar" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">Sí, empezar</Link>
            <button onClick={cerrarAviso} className="rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">No, solo miro</button>
          </div>
        </div>
      )}

      {destacados.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Próximos de las entidades de la red</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {destacados.map(e => (
              <a key={e.id} href={e.url ?? undefined} target="_blank" rel="noopener noreferrer"
                className="group flex gap-4 overflow-hidden rounded-2xl border-2 border-brand-200 bg-white p-3 shadow-sm transition hover:border-brand-400 hover:shadow-md">
                {e.imagen_url
                  ? <img src={e.imagen_url} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                  : <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-3xl">{EMOJI[e.categoria ?? ""] ?? "📌"}</div>}
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">Entidad de la red</span>
                  <h3 className="mt-1 line-clamp-2 font-bold text-slate-800 group-hover:text-brand-700">{e.titulo}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{fmtFecha(e.fecha_inicio, e.fecha_fin)} · {lugar(e)}{e.organizador ? ` · ${e.organizador}` : ""}</p>
                  {e.inscripcion_fin && <p className="mt-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">📝 Inscripción hasta el {fCorta(e.inscripcion_fin)}</p>}
                  <div className="mt-1.5 flex gap-1.5 text-[11px]"><Botones e={e} /></div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

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
      {prov && prov !== "Online" && <p className="mt-2 text-xs text-slate-400">Incluye también los eventos online, abiertos a cualquier provincia.</p>}

      {loading ? <p className="mt-10 text-slate-400">Cargando…</p> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ALMANAQUE */}
          <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <button onClick={() => cambiaMes(-1)} className="rounded-full px-3 py-1 text-lg text-slate-500 hover:bg-slate-100" aria-label="Mes anterior">‹</button>
              <div className="text-center">
                <h2 className="text-lg font-extrabold capitalize text-brand-700">{MES(mesIni)}</h2>
                {(mes.getMonth() !== hoyD.getMonth() || mes.getFullYear() !== hoyD.getFullYear()) &&
                  <button onClick={() => { setMes(new Date(hoyD.getFullYear(), hoyD.getMonth(), 1)); setDia("") }} className="text-xs text-brand-600 hover:underline">Volver a hoy</button>}
              </div>
              <button onClick={() => cambiaMes(1)} className="rounded-full px-3 py-1 text-lg text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente">›</button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 text-center text-[11px] font-semibold text-slate-400">
              {DIAS.map(d => <div key={d} className="bg-slate-50 py-1.5">{d}</div>)}
              {celdas.map((c, i) => {
                if (!c) return <div key={"x" + i} className="min-h-[52px] bg-slate-50/60 sm:min-h-[96px]" />
                const evs = porDia[c] ?? []
                const sel = dia === c, esHoy = c === hoy, pasado = c < hoy
                return (
                  <button key={c} onClick={() => setDia(sel ? "" : c)}
                    className={`group min-h-[52px] bg-white p-1 text-left align-top transition hover:bg-brand-50/60 sm:min-h-[96px] ${sel ? "ring-2 ring-inset ring-brand-500" : ""} ${pasado ? "opacity-60" : ""}`}>
                    <div className={`mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs ${esHoy ? "bg-brand-600 font-bold text-white" : "text-slate-600"}`}>{Number(c.slice(8))}</div>
                    {/* móvil: puntos */}
                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                      {evs.slice(0, 4).map(({ e }, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${e.origen === "entidad" ? "bg-brand-600" : e.provincia === "Málaga" && !e.online ? "bg-sun-500" : "bg-slate-400"}`} />)}
                    </div>
                    {/* escritorio: chips */}
                    <div className="hidden space-y-0.5 sm:block">
                      {evs.slice(0, 3).map(({ e, marca }, k) => (
                        <div key={k} title={`${e.titulo} — ${fmtFecha(e.fecha_inicio, e.fecha_fin)} · ${lugar(e)}`}
                          className={`truncate rounded px-1 py-px text-[10px] font-medium leading-tight ${e.origen === "entidad" ? "bg-brand-600 text-white" : (COLOR[e.categoria ?? ""] ?? "bg-slate-100 text-slate-600")}`}>
                          {marca && <span className="mr-0.5">{marca}</span>}{e.titulo}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="px-1 text-[10px] font-semibold text-brand-600">+{evs.length - 3} más</div>}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              <span className="mr-3"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-600" />Entidad de la red</span>
              <span className="mr-3">▶ abre · ⏹ cierra (convocatorias y periodos largos)</span>
              <span>⏳ fin de inscripción</span>
            </p>
          </section>

          {/* LISTADO LATERAL */}
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-slate-700">{dia ? `Eventos del ${fCorta(dia)}` : `Próximos · ${MES(mesIni)}`}</h3>
              {dia && <button onClick={() => setDia("")} className="text-xs text-brand-600 hover:underline">Ver todo el mes</button>}
            </div>
            <p className="text-[11px] text-slate-400">{lista.length} evento{lista.length === 1 ? "" : "s"}</p>
            {lista.length === 0 && <p className="mt-6 text-sm text-slate-400">No hay eventos con esos filtros.</p>}
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {lista.map(e => {
                const inner = (
                  <div className="flex gap-3 p-2.5 transition hover:bg-slate-50">
                    {e.imagen_url
                      ? <img src={e.imagen_url} alt="" loading="lazy" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.visibility = "hidden" }} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">{EMOJI[e.categoria ?? ""] ?? "📌"}</div>}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1">
                        {e.origen === "entidad" && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">Entidad</span>}
                        <span className={`text-[10px] ${e.provincia === "Málaga" && !e.online ? "font-semibold text-brand-600" : "text-slate-400"}`}>{lugar(e)}</span>
                        {e.categoria && <span className={`rounded-full px-1.5 text-[10px] font-semibold ${COLOR[e.categoria] ?? "bg-slate-100 text-slate-600"}`}>{e.categoria}</span>}
                      </div>
                      <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800">{e.titulo}</p>
                      <p className="text-[11px] text-slate-500">
                        {diasRango(e) > 0 ? `Del ${fCorta(e.fecha_inicio)} al ${fCorta(fin(e))}` : fCorta(e.fecha_inicio)}{e.hora ? ` · ${e.hora}` : ""}
                      </p>
                      {e.inscripcion_fin && <p className="mt-0.5 inline-block rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-800">📝 Inscripción {e.inscripcion_inicio ? `del ${fCorta(e.inscripcion_inicio)} al ${fCorta(e.inscripcion_fin)}` : `hasta el ${fCorta(e.inscripcion_fin)}`}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                        <Botones e={e} /><span className="truncate">{e.fuente}</span>
                      </div>
                    </div>
                  </div>
                )
                return <li key={e.id}>{e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a> : inner}</li>
              })}
            </ul>
          </aside>
        </div>
      )}
      <p className="mt-10 text-xs text-slate-400">Fuentes automáticas: Portal Andaluz de Emprendimiento (Junta), Polo de Contenidos Digitales, Cámara de Comercio de Málaga, FYCMA, EOI, CTA, El Referente, universidades andaluzas y comunidades tech. Las entidades de la red publican sus propios eventos y convocatorias, que salen destacados.</p>
    </div>
  )
}
