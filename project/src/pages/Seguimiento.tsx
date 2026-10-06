import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

const sb = supabase as any
type Info = { nombre: string; proyecto: string; entidades: string[]; valorado: boolean } | null

function Caja({ children }: { children: React.ReactNode }) {
  return <div className="container-x py-16"><div className="card mx-auto max-w-xl p-8">{children}</div></div>
}
function EnlaceInvalido() {
  return <Caja><h1 className="text-2xl font-extrabold text-brand-700">Enlace no válido</h1>
    <p className="mt-3 text-slate-600">Este enlace no es correcto o ha caducado. Si necesitas ayuda, usa el botón "¿Algo falla?" de abajo a la derecha.</p>
    <Link to="/" className="btn-primary mt-6 inline-block">Ir al inicio</Link></Caja>
}
function useLead() {
  const [sp] = useSearchParams()
  const t = sp.get("t") || ""
  const [info, setInfo] = useState<Info>(null)
  const [cargando, setCargando] = useState(true)
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(t)) { setCargando(false); return }
    sb.rpc("lead_publico", { t }).then(({ data }: any) => { setInfo(data || null); setCargando(false) })
  }, [t])
  return { t, sp, info, cargando }
}

type Ent = { id: string; nombre: string; logo?: string | null; valorada?: boolean }
type Voto = { puntuacion: number | null; nadie: boolean }
export function Valoracion() {
  const { t, sp, info, cargando } = useLead()
  const soloE = sp.get("e")
  const ents: Ent[] = (((info as any)?.entidades_det || []) as Ent[]).filter(x => !x.valorada && (!soloE || x.id === soloE))
  const [votos, setVotos] = useState<Record<string, Voto>>({})
  const [texto, setTexto] = useState("")
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "error">("")
  useEffect(() => {
    if (!ents.length) return
    const n = parseInt(sp.get("n") || "", 10); const nadie = sp.get("nadie") === "1"
    const v: Record<string, Voto> = {}
    ents.forEach(e => { v[e.id] = { puntuacion: !nadie && n >= 1 && n <= 5 ? n : null, nadie } })
    setVotos(v)
  }, [info])
  if (cargando) return <Caja><p className="text-slate-500">Cargando…</p></Caja>
  if (!info) return <EnlaceInvalido />
  const algunNadie = Object.values(votos).some(v => v.nadie)
  if (estado === "ok" || info.valorado || ents.length === 0) return <Caja>
    <h1 className="text-2xl font-extrabold text-brand-700">¡Gracias, {info.nombre}!</h1>
    <p className="mt-3 text-slate-600">{algunNadie ? "Hablaremos con las entidades que aún no te han contactado para que lo hagan lo antes posible." : "Tu opinión nos ayuda a mejorar la red para las próximas startups."}</p>
    <Link to="/entidades" className="btn-primary mt-6 inline-block">Ver entidades de la red</Link></Caja>
  const poner = (id: string, cambio: Partial<Voto>) => setVotos(v => ({ ...v, [id]: { ...(v[id] || { puntuacion: null, nadie: false }), ...cambio } }))
  const hayAlgo = Object.values(votos).some(v => v.puntuacion || v.nadie) || !!texto.trim()
  const enviar = async () => {
    if (!hayAlgo) return
    setEstado("enviando")
    const items = Object.entries(votos).map(([entity_id, v]) => ({ entity_id, puntuacion: v.nadie ? null : v.puntuacion, nadie: v.nadie }))
    const { data, error } = await sb.rpc("lead_valorar_entidades", { t, items, comentario: texto.trim() || null })
    setEstado(!error && data ? "ok" : "error")
  }
  return <Caja>
    <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{info.proyecto}</p>
    <h1 className="mt-1 text-2xl font-extrabold text-brand-700">¿Cómo ha ido tu conexión, {info.nombre}?</h1>
    <p className="mt-2 text-slate-600">{soloE ? "Valora el primer contacto con esta entidad." : "Valora a cada entidad que elegiste. Si alguna no te ha contactado, márcalo y la avisaremos."}</p>
    <div className="mt-5 space-y-3">
      {ents.map(e => { const v = votos[e.id] || { puntuacion: null, nadie: false }; return (
        <div key={e.id} className={`rounded-xl border p-4 ${v.nadie ? "border-orange-200 bg-orange-50" : "border-slate-200"}`}>
          <div className="flex items-center gap-3">
            {e.logo ? <img src={e.logo} alt="" className="h-9 w-9 rounded-lg object-contain bg-white" /> : null}
            <p className="font-bold text-brand-700">{e.nombre}</p>
          </div>
          <div className={`mt-2 flex gap-1 ${v.nadie ? "opacity-30 pointer-events-none" : ""}`} role="radiogroup" aria-label={`Valoración de ${e.nombre}`}>
            {[1, 2, 3, 4, 5].map(i => <button key={i} type="button" aria-label={`${i} de 5`} onClick={() => poner(e.id, { puntuacion: i, nadie: false })}
              className={`text-3xl leading-none transition ${v.puntuacion && i <= v.puntuacion ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}>★</button>)}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-orange-800">
            <input type="checkbox" checked={v.nadie} onChange={ev => poner(e.id, { nadie: ev.target.checked, puntuacion: ev.target.checked ? null : v.puntuacion })} />
            No me ha contactado
          </label>
        </div>) })}
    </div>
    <textarea className="input mt-4 min-h-[100px] w-full" placeholder="¿Algo que quieras contarnos? (opcional)" value={texto} onChange={e => setTexto(e.target.value)} maxLength={3000} />
    {estado === "error" && <p className="mt-2 text-sm text-red-600">No se pudo enviar. Inténtalo de nuevo.</p>}
    <button className="btn-primary mt-4 w-full" disabled={estado === "enviando" || !hayAlgo} onClick={enviar}>
      {estado === "enviando" ? "Enviando…" : "Enviar valoración"}</button>
  </Caja>
}

export function Incidencia() {
  const { t, info, cargando } = useLead()
  const [texto, setTexto] = useState("")
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "error">("")
  if (cargando) return <Caja><p className="text-slate-500">Cargando…</p></Caja>
  if (!info) return <EnlaceInvalido />
  if (estado === "ok") return <Caja>
    <h1 className="text-2xl font-extrabold text-brand-700">Recibido, {info.nombre}</h1>
    <p className="mt-3 text-slate-600">El equipo de Málaga Startup Network lo revisará y te escribirá a tu email.</p></Caja>
  const enviar = async () => {
    setEstado("enviando")
    const { data, error } = await sb.rpc("lead_incidencia", { t, texto })
    setEstado(!error && data ? "ok" : "error")
  }
  return <Caja>
    <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{info.proyecto}</p>
    <h1 className="mt-1 text-2xl font-extrabold text-brand-700">¿Algún problema?</h1>
    <p className="mt-2 text-slate-600">Cuéntanos qué ha pasado (por ejemplo, si nadie de <b>{info.entidades.join(", ") || "las entidades"}</b> te ha contactado) y lo revisamos.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {["Han pasado varios días y nadie me ha contactado.", "Me he equivocado al elegir las entidades.", "Mis datos de contacto no son correctos."].map(s =>
        <button key={s} type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-brand-400" onClick={() => setTexto(s)}>{s}</button>)}
    </div>
    <textarea className="input mt-4 min-h-[130px] w-full" placeholder="Escribe aquí…" value={texto} onChange={e => setTexto(e.target.value)} maxLength={3000} />
    {estado === "error" && <p className="mt-2 text-sm text-red-600">No se pudo enviar. Inténtalo de nuevo.</p>}
    <button className="btn-primary mt-4 w-full" disabled={estado === "enviando" || texto.trim().length < 3} onClick={enviar}>
      {estado === "enviando" ? "Enviando…" : "Enviar al equipo"}</button>
  </Caja>
}

export function Contactado() {
  const [sp] = useSearchParams()
  const t = sp.get("t") || ""
  const [info, setInfo] = useState<{ entidad: string; proyecto: string; contacto: string; ya: boolean } | null | undefined>(undefined)
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "error">("")
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(t)) { setInfo(null); return }
    sb.rpc("entidad_contactado_info", { t }).then(({ data }: any) => setInfo(data || null))
  }, [t])
  if (info === undefined) return <Caja><p className="text-slate-500">Cargando…</p></Caja>
  if (!info) return <EnlaceInvalido />
  if (info.ya || estado === "ok") return <Caja>
    <h1 className="text-2xl font-extrabold text-brand-700">¡Gracias, {info.entidad}!</h1>
    <p className="mt-3 text-slate-600">Hemos anotado que ya habéis contactado con <b>{info.proyecto}</b>. No os volveremos a recordar este contacto.</p>
    <a href="/startups/admin/emprendedores" className="btn-primary mt-6 inline-block">Ir al panel</a></Caja>
  const confirmar = async () => {
    setEstado("enviando")
    const { data, error } = await sb.rpc("entidad_marcar_contactado", { t })
    setEstado(!error && data ? "ok" : "error")
  }
  return <Caja>
    <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{info.entidad}</p>
    <h1 className="mt-1 text-2xl font-extrabold text-brand-700">¿Ya habéis contactado con {info.proyecto}?</h1>
    <p className="mt-2 text-slate-600">Confirmadlo y dejaremos de recordároslo. Pediremos a {info.contacto?.split(" ")[0] || "la startup"} que valore ese primer contacto.</p>
    {estado === "error" && <p className="mt-2 text-sm text-red-600">No se pudo guardar. Inténtalo de nuevo.</p>}
    <button className="btn-primary mt-6 w-full" disabled={estado === "enviando"} onClick={confirmar}>{estado === "enviando" ? "Guardando…" : "✓ Sí, ya le hemos contactado"}</button>
    <a href="/startups/admin/emprendedores" className="mt-3 block text-center text-sm text-slate-500 hover:underline">Todavía no — ver sus datos en el panel</a>
  </Caja>
}
