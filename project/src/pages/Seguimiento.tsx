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

export function Valoracion() {
  const { t, sp, info, cargando } = useLead()
  const [nota, setNota] = useState<number | null>(null)
  const [nadie, setNadie] = useState(false)
  const [texto, setTexto] = useState("")
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "error">("")
  useEffect(() => {
    const n = parseInt(sp.get("n") || "", 10); if (n >= 1 && n <= 5) setNota(n)
    if (sp.get("nadie") === "1") setNadie(true)
  }, [sp])
  if (cargando) return <Caja><p className="text-slate-500">Cargando…</p></Caja>
  if (!info) return <EnlaceInvalido />
  if (estado === "ok" || info.valorado) return <Caja>
    <h1 className="text-2xl font-extrabold text-brand-700">¡Gracias, {info.nombre}!</h1>
    <p className="mt-3 text-slate-600">{nadie ? "Lo revisamos y hablamos con las entidades para que te contacten lo antes posible." : "Tu opinión nos ayuda a mejorar la red para las próximas startups."}</p>
    <Link to="/entidades" className="btn-primary mt-6 inline-block">Ver entidades de la red</Link></Caja>
  const enviar = async () => {
    if (!nota && !nadie && !texto.trim()) return
    setEstado("enviando")
    const { data, error } = await sb.rpc("lead_valorar", { t, puntuacion: nota, comentario: texto.trim() || null, nadie })
    setEstado(!error && data ? "ok" : "error")
  }
  return <Caja>
    <p className="text-xs font-bold uppercase tracking-wide text-brand-500">{info.proyecto}</p>
    <h1 className="mt-1 text-2xl font-extrabold text-brand-700">¿Cómo ha ido tu conexión, {info.nombre}?</h1>
    <p className="mt-2 text-slate-600">Elegiste a <b>{info.entidades.join(", ") || "entidades de la red"}</b>.</p>
    <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label="Valoración de 1 a 5">
      {[1, 2, 3, 4, 5].map(i => <button key={i} type="button" aria-label={`${i} de 5`} onClick={() => setNota(i)}
        className={`text-4xl transition ${nota && i <= nota ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}>★</button>)}
    </div>
    <label className="mt-6 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
      <input type="checkbox" className="mt-1" checked={nadie} onChange={e => setNadie(e.target.checked)} />
      <span><b>Nadie me ha contactado todavía.</b> Lo revisaremos con las entidades.</span>
    </label>
    <textarea className="input mt-4 min-h-[110px] w-full" placeholder="¿Algo que quieras contarnos? (opcional)" value={texto} onChange={e => setTexto(e.target.value)} maxLength={3000} />
    {estado === "error" && <p className="mt-2 text-sm text-red-600">No se pudo enviar. Inténtalo de nuevo.</p>}
    <button className="btn-primary mt-4 w-full" disabled={estado === "enviando" || (!nota && !nadie && !texto.trim())} onClick={enviar}>
      {estado === "enviando" ? "Enviando…" : "Enviar"}</button>
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
  const [r, setR] = useState<{ entidad: string; proyecto: string } | null | undefined>(undefined)
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(t)) { setR(null); return }
    sb.rpc("entidad_marcar_contactado", { t }).then(({ data }: any) => setR(data || null))
  }, [t])
  if (r === undefined) return <Caja><p className="text-slate-500">Guardando…</p></Caja>
  if (!r) return <EnlaceInvalido />
  return <Caja>
    <h1 className="text-2xl font-extrabold text-brand-700">¡Gracias, {r.entidad}!</h1>
    <p className="mt-3 text-slate-600">Hemos anotado que ya habéis contactado con <b>{r.proyecto}</b>. No os volveremos a recordar este contacto.</p>
    <a href="/startups/admin/emprendedores" className="btn-primary mt-6 inline-block">Ir al panel</a></Caja>
}
