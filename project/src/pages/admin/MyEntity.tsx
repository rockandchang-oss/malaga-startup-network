import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { uploadImage } from "../../lib/storage"
import { useEntidadActiva, SelectorEntidad } from "../../lib/entidadActiva"
import logoMSN from "../../assets/logo-MSN.jpg"

type Entity = Record<string, any>

export default function MyEntity() {
  const { entityId, elegir, lista, isSuperadmin } = useEntidadActiva()
  const [e, setE] = useState<Entity | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    setE(null); setMsg(null)
    if (!entityId) return
    supabase.from("entities").select("*").eq("id", entityId).maybeSingle().then(({ data }) => { setE(data); setVersion((data as any)?.updated_at ?? null) })
  }, [entityId])

  if (!entityId) return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">Tu usuario no está vinculado a ninguna entidad todavía.</p>
  if (!e) return <p className="text-slate-400">Cargando…</p>

  function set(k: string, v: any) { setE((p) => ({ ...(p as Entity), [k]: v })) }

  async function onLogo(file: File) {
    setMsg("Subiendo logo…")
    try { const url = await uploadImage(file, "logos"); set("logo_url", url); setMsg("Logo subido. Recuerda guardar.") }
    catch { setMsg("Error subiendo el logo.") }
  }

  async function save(forzar = false) {
    setSaving(true); setMsg(null)
    if (!forzar) {
      const { data: actual } = await supabase.from("entities").select("updated_at").eq("id", entityId).maybeSingle()
      if (actual && version && (actual as any).updated_at !== version) {
        setSaving(false)
        if (window.confirm("Esta ficha se ha modificado desde otro sitio (otra pestaña u otra persona) desde que la abriste.\n\nAceptar = SOBRESCRIBIR con tus cambios\nCancelar = RECARGAR la versión guardada (perderás lo que has escrito aquí)")) return save(true)
        const { data } = await supabase.from("entities").select("*").eq("id", entityId).maybeSingle()
        setE(data); setVersion((data as any)?.updated_at ?? null); setMsg("Ficha recargada con la última versión guardada.")
        return
      }
    }
    const { data: guardada, error } = await supabase.from("entities").update({
      short_description: e.short_description, long_description: e.long_description, history: e.history,
      website: e.website, email: e.email, phone: e.phone, whatsapp: e.whatsapp, linkedin: e.linkedin,
      location_city: e.location_city, logo_url: e.logo_url, cover_url: e.cover_url,
    }).eq("id", entityId).select("updated_at").maybeSingle()
    setSaving(false)
    if (!error && guardada) setVersion((guardada as any).updated_at)
    setMsg(error ? "Error al guardar." : "Guardado correctamente.")
  }

  return (
    <div>
      {isSuperadmin && <SelectorEntidad entityId={entityId} elegir={elegir} lista={lista} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{e.name}</h1>
        {e.slug && <a href={`${import.meta.env.VITE_BASENAME || ""}/entidades/${e.slug}`} target="_blank" rel="noopener" className="rounded-full border border-[#4A5D8A] px-4 py-1.5 text-sm font-semibold text-[#4A5D8A] hover:bg-[#4A5D8A] hover:text-white">👁 Ver como startup ↗</a>}
      </div>
      <p className="mt-1 text-slate-500">Edita la información pública de tu entidad.</p>

      <div className="mt-6 grid gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <img src={e.logo_url || logoMSN} alt="logo" className="h-16 w-16 rounded-xl border object-contain p-1" />
            <label className="btn-ghost cursor-pointer text-sm">
              Cambiar logo
              <input type="file" accept="image/*" className="hidden" onChange={(ev) => ev.target.files?.[0] && onLogo(ev.target.files[0])} />
            </label>
          </div>
        </div>

        <Area label="Descripción breve" value={e.short_description} onChange={(v) => set("short_description", v)} rows={2} />
        <Area label="Descripción completa" value={e.long_description} onChange={(v) => set("long_description", v)} rows={5} />
        <Area label="Historia" value={e.history} onChange={(v) => set("history", v)} rows={4} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Inp label="Web" value={e.website} onChange={(v) => set("website", v)} />
          <Inp label="Email de contacto" value={e.email} onChange={(v) => set("email", v)} />
          <Inp label="Teléfono" value={e.phone} onChange={(v) => set("phone", v)} />
          <Inp label="WhatsApp" value={e.whatsapp} onChange={(v) => set("whatsapp", v)} />
          <Inp label="LinkedIn" value={e.linkedin} onChange={(v) => set("linkedin", v)} />
          <Inp label="Ciudad" value={e.location_city} onChange={(v) => set("location_city", v)} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={() => save()} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>

      <SuccessCases entityId={entityId} />
      <Seeking entityId={entityId} />
    </div>
  )
}

function Inp({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
    </label>
  )
}
function Area({ label, value, onChange, rows = 3 }: { label: string; value: any; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
    </label>
  )
}

// ---- Success cases ----
function SuccessCases({ entityId }: { entityId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ title: "", startup_name: "", description: "", url: "", image_url: "" })
  const [subiendo, setSubiendo] = useState("")
  async function subirLogo(file: File | undefined, id?: string) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert("El logo debe pesar menos de 2 MB"); return }
    setSubiendo(id || "nuevo")
    try {
      const u = await uploadImage(file, "casos")
      if (id) { await supabase.from("entity_success_cases").update({ image_url: u }).eq("id", id); load() } else setForm(f => ({ ...f, image_url: u }))
    } catch (e: any) { alert("No se pudo subir el logo: " + (e?.message || e)) } finally { setSubiendo("") }
  }
  const normUrl = (u: string) => { const t = (u || "").trim(); return !t ? null : (/^https?:\/\//i.test(t) ? t : "https://" + t) }
  async function guardarUrl(id: string, u: string) { await supabase.from("entity_success_cases").update({ url: normUrl(u) }).eq("id", id); load() }
  async function load() {
    const { data } = await supabase.from("entity_success_cases").select("*").eq("entity_id", entityId).order("sort_order")
    setItems(data ?? [])
  }
  useEffect(() => { load() }, [entityId])
  async function add() {
    if (!form.title) return
    await supabase.from("entity_success_cases").insert({ entity_id: entityId, ...form, url: normUrl(form.url) })
    setForm({ title: "", startup_name: "", description: "", url: "", image_url: "" }); load()
  }
  async function del(id: string) { await supabase.from("entity_success_cases").delete().eq("id", id); load() }
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">Casos de éxito</h2>
      <div className="mt-3 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
            <span className="flex items-center gap-2 text-sm">
              <label className="relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white text-[10px] text-slate-400" title="Subir / cambiar logo">
                {it.image_url ? <img src={it.image_url} alt="" className="h-full w-full object-contain" /> : (subiendo === it.id ? "…" : "Logo")}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => subirLogo(e.target.files?.[0], it.id)} />
              </label>
              <span><b>{it.title}</b>{it.startup_name ? ` — ${it.startup_name}` : ""}</span>
            </span>
            <span className="flex items-center gap-3">
              <input key={it.url || "sin"} defaultValue={it.url || ""} placeholder="Web de la startup" title="Se guarda al salir del campo"
                onBlur={(e) => { if ((e.target.value.trim() || null) !== (it.url || null)) guardarUrl(it.id, e.target.value) }}
                className="w-48 rounded-lg border border-slate-200 px-2 py-1 text-xs" />
              <button onClick={() => del(it.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input placeholder="Startup" value={form.startup_name} onChange={(e) => setForm({ ...form, startup_name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input placeholder="Web de la startup" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 sm:col-span-4">
          {form.image_url ? <img src={form.image_url} alt="" className="h-8 w-8 object-contain" /> : null}
          {subiendo === "nuevo" ? "Subiendo logo…" : form.image_url ? "Logo listo (pulsa para cambiarlo)" : "📷 Logo de la startup (PNG o JPG, máx. 2 MB)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => subirLogo(e.target.files?.[0])} />
        </label>
      </div>
      <button onClick={add} className="btn-ghost mt-2 text-sm">+ Añadir caso</button>
    </section>
  )
}

// ---- Seeking profiles ----
function Seeking({ entityId }: { entityId: string }) {
  const [items, setItems] = useState<any[]>([])
  const [form, setForm] = useState({ type: "seeks", description: "" })
  const labels: Record<string, string> = { seeks: "Busco", helps: "Puedo ayudar a", not_interested: "No me interesa" }
  async function load() {
    const { data } = await supabase.from("entity_seeking").select("*").eq("entity_id", entityId).order("sort_order")
    setItems(data ?? [])
  }
  useEffect(() => { load() }, [entityId])
  async function add() {
    if (!form.description) return
    await supabase.from("entity_seeking").insert({ entity_id: entityId, ...form })
    setForm({ type: "seeks", description: "" }); load()
  }
  async function del(id: string) { await supabase.from("entity_seeking").delete().eq("id", id); load() }
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">Perfiles que busco / puedo ayudar</h2>
      <div className="mt-3 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
            <span className="text-sm"><b>{labels[it.type]}:</b> {it.description}</span>
            <button onClick={() => del(it.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="seeks">Busco</option>
          <option value="helps">Puedo ayudar a</option>
          <option value="not_interested">No me interesa</option>
        </select>
        <input placeholder="Descripción del perfil" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button onClick={add} className="btn-ghost text-sm">Añadir</button>
      </div>
    </section>
  )
}
