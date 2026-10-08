import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useEntidadActiva, SelectorEntidad } from "../../lib/entidadActiva"
import { uploadImage } from "../../lib/storage"

type Evento = Record<string, any>
const TIPOS = ["Jornada", "Formación / taller", "Networking / encuentro", "Convocatoria / concurso",
  "Financiación / subvención", "Inversión", "Aceleración / incubación", "Hackatón", "Feria / congreso", "Evento"]
const PROVS = ["Málaga", "Sevilla", "Granada", "Córdoba", "Cádiz", "Almería", "Huelva", "Jaén", "Online"]

function vacio(entityId: string): Evento {
  return { entity_id: entityId, origen: "entidad", estado: "publicado", fuente: "Entidad",
    titulo: "", descripcion: "", categoria: "Jornada", fecha_inicio: "", fecha_fin: "", hora: "",
    provincia: "Málaga", ciudad: "", online: false, url: "",
    inscripcion_inicio: "", inscripcion_fin: "", imagen_url: "" }
}

export default function MyEventos() {
  const { entityId, elegir, lista, isSuperadmin } = useEntidadActiva()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [ed, setEd] = useState<Evento | null>(null)
  const [msg, setMsg] = useState("")

  useEffect(() => { setEventos([]); setEd(null); if (entityId) load(entityId) }, [entityId])
  async function load(id: string) {
    const { data } = await supabase.from("eventos").select("*").eq("entity_id", id).order("fecha_inicio", { ascending: true })
    setEventos(data ?? [])
  }
  if (!entityId) return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">Tu usuario no está vinculado a ninguna entidad todavía.</p>

  async function guardar() {
    if (!ed) return
    if (!ed.titulo || !ed.fecha_inicio) { setMsg("Pon al menos título y fecha de inicio."); return }
    const row: Evento = {
      ...ed, entity_id: entityId, origen: "entidad", estado: "publicado",
      fuente: "Entidad", organizador: ed.organizador || null,
      fecha_fin: ed.fecha_fin || null, hora: ed.hora || null, ciudad: ed.ciudad || null,
      provincia: ed.online ? "Online" : (ed.provincia || null), url: ed.url || null,
      descripcion: ed.descripcion || null, imagen_url: ed.imagen_url || null,
      inscripcion_inicio: ed.inscripcion_inicio || null, inscripcion_fin: ed.inscripcion_fin || null,
      dedupe_key: ed.dedupe_key || ("ent_" + entityId.slice(0, 8) + "_" + Date.now().toString(36)),
    }
    const q = ed.id ? supabase.from("eventos").update(row).eq("id", ed.id) : supabase.from("eventos").insert(row)
    const { error } = await q
    if (error) { setMsg("No se pudo guardar: " + error.message); return }
    setMsg("Guardado y publicado en la agenda."); setEd(null); load(entityId)
  }
  async function borrar(id: string) {
    if (!confirm("¿Eliminar este evento?")) return
    await supabase.from("eventos").delete().eq("id", id); load(entityId)
  }

  const inp = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
  return (
    <div>
      {isSuperadmin && <SelectorEntidad entityId={entityId} elegir={elegir} lista={lista} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Mis eventos y convocatorias</h1>
          <p className="text-sm text-slate-500">Lo que publiques aquí aparece en la <b>Agenda</b> de la red, destacado sobre lo recopilado automáticamente.</p>
        </div>
        <button onClick={() => { setMsg(""); setEd(vacio(entityId)) }} className="btn-primary text-sm">+ Nuevo</button>
      </div>
      {msg && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">{msg}</p>}

      <div className="mt-6 space-y-3">
        {eventos.length === 0 && !ed && <p className="text-sm text-slate-400">Aún no has publicado eventos.</p>}
        {eventos.map((e) => (
          <div key={e.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{e.titulo}</p>
              <p className="text-sm text-slate-500">{e.categoria} · {e.fecha_inicio}{e.fecha_fin ? ` → ${e.fecha_fin}` : ""} · {e.provincia ?? "—"}
                {e.inscripcion_fin ? ` · inscripción hasta ${e.inscripcion_fin}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setMsg(""); setEd({ ...e }) }} className="text-sm font-medium text-brand-700 hover:underline">Editar</button>
              <button onClick={() => borrar(e.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {ed && (
        <div className="card mt-6 space-y-3 p-5">
          <h2 className="text-lg font-bold">{ed.id ? "Editar evento" : "Nuevo evento"}</h2>
          <input className={inp} placeholder="Título del evento o convocatoria" value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} />
          <textarea className={inp + " min-h-[80px]"} placeholder="Descripción (opcional)" value={ed.descripcion ?? ""} onChange={(e) => setEd({ ...ed, descripcion: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">Tipo
              <select className={inp} value={ed.categoria} onChange={(e) => setEd({ ...ed, categoria: e.target.value })}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></label>
            <label className="text-xs text-slate-500">Enlace (web del evento / inscripción)
              <input className={inp} placeholder="https://…" value={ed.url ?? ""} onChange={(e) => setEd({ ...ed, url: e.target.value })} /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs text-slate-500">Fecha inicio
              <input type="date" className={inp} value={ed.fecha_inicio ?? ""} onChange={(e) => setEd({ ...ed, fecha_inicio: e.target.value })} /></label>
            <label className="text-xs text-slate-500">Fecha fin (opcional)
              <input type="date" className={inp} value={ed.fecha_fin ?? ""} onChange={(e) => setEd({ ...ed, fecha_fin: e.target.value })} /></label>
            <label className="text-xs text-slate-500">Hora (opcional)
              <input className={inp} placeholder="10:00" value={ed.hora ?? ""} onChange={(e) => setEd({ ...ed, hora: e.target.value })} /></label>
            <label className="text-xs text-slate-500">Provincia
              <select className={inp} disabled={ed.online} value={ed.provincia ?? ""} onChange={(e) => setEd({ ...ed, provincia: e.target.value })}>{PROVS.filter(p => p !== "Online").map(p => <option key={p}>{p}</option>)}</select></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={!!ed.online} onChange={(e) => setEd({ ...ed, online: e.target.checked })} /> Es un evento online</label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
            {ed.imagen_url ? <img src={ed.imagen_url} alt="" className="h-10 w-16 rounded object-cover" /> : null}
            {ed.imagen_url ? "Imagen lista (pulsa para cambiarla)" : "📷 Imagen / cartel del evento (opcional)"}
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 3 * 1024 * 1024) { setMsg("La imagen debe pesar menos de 3 MB"); return } try { const u = await uploadImage(f, "eventos"); setEd((x: any) => ({ ...x, imagen_url: u })) } catch (er: any) { setMsg("No se pudo subir: " + (er?.message || er)) } }} />
          </label>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">Plazo de inscripción (si es una convocatoria)</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-amber-800">Inscripción desde
                <input type="date" className={inp} value={ed.inscripcion_inicio ?? ""} onChange={(e) => setEd({ ...ed, inscripcion_inicio: e.target.value })} /></label>
              <label className="text-xs text-amber-800">Inscripción hasta
                <input type="date" className={inp} value={ed.inscripcion_fin ?? ""} onChange={(e) => setEd({ ...ed, inscripcion_fin: e.target.value })} /></label>
            </div>
            <p className="mt-1 text-[11px] text-amber-700">Déjalo vacío si no hay inscripción con plazo. Se mostrará «Inscripción del … al …» en la agenda.</p>
          </div>

          <div className="flex gap-2">
            <button onClick={guardar} className="btn-primary text-sm">Guardar y publicar</button>
            <button onClick={() => setEd(null)} className="btn-ghost text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
