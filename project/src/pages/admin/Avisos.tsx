import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { uploadImage } from "../../lib/storage"
import TextoRico from "../../components/TextoRico"

export type Aviso = {
  id?: string; titulo: string; cuerpo: string | null; tipo: "reunion" | "aviso" | "plazo"
  fecha_evento: string | null; lugar: string | null; enlace: string | null
  enlace_texto?: string | null; adjunto_url?: string | null; adjunto_nombre?: string | null
  publicado: boolean; fijado: boolean; created_at?: string
}
const vacio: Aviso = { titulo: "", cuerpo: "", tipo: "reunion", fecha_evento: null, lugar: "", enlace: "", enlace_texto: "", adjunto_url: null, adjunto_nombre: null, publicado: true, fijado: false }
const TIPOS: Record<string, string> = { reunion: "Reunión", aviso: "Aviso", plazo: "Plazo" }

export function fechaEvento(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
}
function aLocal(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function TarjetaAviso({ a }: { a: Aviso }) {
  const pasado = a.fecha_evento && new Date(a.fecha_evento).getTime() < Date.now()
  return (
    <div className={`card p-5 ${pasado ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <span className="rounded-full bg-[#4A5D8A] px-2 py-0.5 text-white">{TIPOS[a.tipo]}</span>
        {a.fijado && <span className="text-[#4A5D8A]">Destacado</span>}
        {pasado && <span className="text-slate-400">Ya celebrado</span>}
      </div>
      <h3 className="mt-2 text-lg font-extrabold text-[#2C3959]">{a.titulo}</h3>
      {(a.fecha_evento || a.lugar) && (
        <p className="mt-1 text-sm font-semibold text-slate-700">
          {a.fecha_evento && <span className="capitalize">{fechaEvento(a.fecha_evento)}</span>}
          {a.fecha_evento && a.lugar && " · "}
          {a.lugar}
        </p>
      )}
      {a.cuerpo && <TextoRico texto={a.cuerpo} compacto className="mt-2 text-sm leading-relaxed text-slate-600" />}
      {(a.enlace || a.adjunto_url) && (
        <div className="mt-3 flex flex-wrap gap-3">
          {a.enlace && <a href={a.enlace} target="_blank" rel="noreferrer" className="btn-primary text-sm">{a.enlace_texto?.trim() || "Más información / unirse"} →</a>}
          {a.adjunto_url && <a href={a.adjunto_url} target="_blank" rel="noreferrer" download className="btn-ghost text-sm">📄 {a.adjunto_nombre?.trim() || "Descargar documento"}</a>}
        </div>
      )}
    </div>
  )
}

export default function Avisos() {
  const { isSuperadmin } = useAuth()
  const [lista, setLista] = useState<Aviso[]>([])
  const [ed, setEd] = useState<Aviso | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)

  async function subirAdjunto(file: File | undefined) {
    if (!file || !ed) return
    if (file.size > 15 * 1024 * 1024) { setMsg("❌ El documento pesa más de 15 MB"); return }
    setSubiendo(true)
    try {
      const url = await uploadImage(file, "avisos")
      setEd({ ...ed, adjunto_url: url, adjunto_nombre: ed.adjunto_nombre || file.name.replace(/\.[^.]+$/, "") })
    } catch (e: any) { setMsg("❌ No se pudo subir: " + (e?.message ?? e)) }
    setSubiendo(false)
  }

  async function cargar() {
    const { data } = await supabase.from("avisos" as any).select("*")
      .order("fijado", { ascending: false }).order("fecha_evento", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false })
    setLista((data ?? []) as any)
  }
  useEffect(() => { cargar() }, [])

  async function guardar() {
    if (!ed) return
    if (!ed.titulo.trim()) { setMsg("❌ Pon un título"); return }
    const fila = { titulo: ed.titulo.trim(), cuerpo: ed.cuerpo || null, tipo: ed.tipo, fecha_evento: ed.fecha_evento, lugar: ed.lugar || null, enlace: ed.enlace || null, enlace_texto: ed.enlace_texto || null, adjunto_url: ed.adjunto_url || null, adjunto_nombre: ed.adjunto_nombre || null, publicado: ed.publicado, fijado: ed.fijado }
    const r = ed.id ? await supabase.from("avisos" as any).update(fila).eq("id", ed.id) : await supabase.from("avisos" as any).insert(fila)
    if (r.error) setMsg("❌ " + r.error.message); else { setMsg("✓ Guardado"); setEd(null); cargar() }
  }
  async function borrar(a: Aviso) {
    if (!a.id || !window.confirm("¿Borrar este aviso?")) return
    const r = await supabase.from("avisos" as any).delete().eq("id", a.id)
    setMsg(r.error ? "❌ " + r.error.message : "✓ Borrado"); cargar()
  }

  const proximos = lista.filter((a) => !a.fecha_evento || new Date(a.fecha_evento).getTime() >= Date.now() - 3 * 3600000)
  const pasados = lista.filter((a) => !proximos.includes(a))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Avisos y reuniones</h1>
          <p className="mt-1 text-slate-500">{isSuperadmin ? "Lo que publiques aquí lo ven todas las entidades al entrar al panel." : "Próximas reuniones y avisos de la red."}</p>
        </div>
        {isSuperadmin && <button className="btn-primary text-sm" onClick={() => { setMsg(null); setEd({ ...vacio }) }}>+ Nuevo aviso</button>}
      </div>
      {msg && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{msg}</p>}

      {ed && (
        <div className="card mt-6 space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Título *
              <input className="input mt-1 w-full" value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} placeholder="Ej. Reunión de la red – octubre" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Tipo
              <select className="input mt-1 w-full" value={ed.tipo} onChange={(e) => setEd({ ...ed, tipo: e.target.value as any })}>
                <option value="reunion">Reunión</option><option value="aviso">Aviso</option><option value="plazo">Plazo</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Fecha y hora
              <input type="datetime-local" className="input mt-1 w-full" value={aLocal(ed.fecha_evento)} onChange={(e) => setEd({ ...ed, fecha_evento: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Lugar
              <input className="input mt-1 w-full" value={ed.lugar ?? ""} onChange={(e) => setEd({ ...ed, lugar: e.target.value })} placeholder="Dirección o 'Online'" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Enlace (opcional)
              <input className="input mt-1 w-full" value={ed.enlace ?? ""} onChange={(e) => setEd({ ...ed, enlace: e.target.value })} placeholder="Meet, Teams, formulario…" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Texto del botón del enlace
              <input className="input mt-1 w-full" value={ed.enlace_texto ?? ""} onChange={(e) => setEd({ ...ed, enlace_texto: e.target.value })} placeholder="Más información / unirse" />
            </label>
            <div className="block text-sm font-semibold text-slate-700 sm:col-span-2">Documento adjunto (PDF, imagen…)
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <input type="file" className="text-sm font-normal" onChange={(e) => subirAdjunto(e.target.files?.[0])} disabled={subiendo} />
                {subiendo && <span className="font-normal text-slate-500">Subiendo…</span>}
                {ed.adjunto_url && !subiendo && (
                  <>
                    <input className="input w-56" value={ed.adjunto_nombre ?? ""} onChange={(e) => setEd({ ...ed, adjunto_nombre: e.target.value })} placeholder="Nombre que verá la entidad" />
                    <a href={ed.adjunto_url} target="_blank" rel="noreferrer" className="font-normal text-[#4A5D8A] underline">ver</a>
                    <button type="button" className="font-normal text-red-600 hover:underline" onClick={() => setEd({ ...ed, adjunto_url: null, adjunto_nombre: null })}>quitar</button>
                  </>
                )}
              </div>
            </div>
          </div>
          <label className="block text-sm font-semibold text-slate-700">Texto
            <textarea className="input mt-1 min-h-[120px] w-full" value={ed.cuerpo ?? ""} onChange={(e) => setEd({ ...ed, cuerpo: e.target.value })} placeholder="Orden del día, qué traer, confirmación de asistencia…" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Formato: **negrita**, [texto del enlace](https://…), líneas que empiezan por "- " = lista, "## " = subtítulo.</span>
          </label>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={ed.publicado} onChange={(e) => setEd({ ...ed, publicado: e.target.checked })} /> Visible para las entidades</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={ed.fijado} onChange={(e) => setEd({ ...ed, fijado: e.target.checked })} /> Destacar arriba</label>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary text-sm" onClick={guardar}>Guardar</button>
            <button className="btn-ghost text-sm" onClick={() => setEd(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {proximos.length === 0 && <div className="card p-8 text-center text-slate-500">No hay avisos próximos.</div>}
        {proximos.map((a) => (
          <div key={a.id}>
            <TarjetaAviso a={a} />
            {isSuperadmin && (
              <div className="mt-1 flex gap-4 px-2 text-xs">
                {!a.publicado && <span className="font-semibold text-amber-600">Oculto</span>}
                <button className="font-semibold text-slate-600 hover:underline" onClick={() => setEd({ ...a })}>Editar</button>
                <button className="font-semibold text-red-600 hover:underline" onClick={() => borrar(a)}>Borrar</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {pasados.length > 0 && (
        <details className="mt-8"><summary className="cursor-pointer text-sm font-semibold text-slate-500">Anteriores ({pasados.length})</summary>
          <div className="mt-3 space-y-3">{pasados.map((a) => <TarjetaAviso key={a.id} a={a} />)}</div>
        </details>
      )}
    </div>
  )
}
