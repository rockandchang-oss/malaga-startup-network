import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { uploadImage } from "../../lib/storage"

type Entity = Record<string, any>

export default function MyEntity() {
  const { profile, isSuperadmin } = useAuth()
  const [entityId, setEntityId] = useState<string | null>(null)
  const [e, setE] = useState<Entity | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      let id = profile?.entity_id ?? null
      // superadmin without entity: let them edit the first one as fallback
      if (!id && isSuperadmin) {
        const { data } = await supabase.from("entities").select("id").order("name").limit(1).maybeSingle()
        id = data?.id ?? null
      }
      setEntityId(id)
      if (id) {
        const { data } = await supabase.from("entities").select("*").eq("id", id).maybeSingle()
        setE(data)
      }
    })()
  }, [profile, isSuperadmin])

  if (!entityId) return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">Tu usuario no está vinculado a ninguna entidad todavía.</p>
  if (!e) return <p className="text-slate-400">Cargando…</p>

  function set(k: string, v: any) { setE((p) => ({ ...(p as Entity), [k]: v })) }

  async function onLogo(file: File) {
    setMsg("Subiendo logo…")
    try { const url = await uploadImage(file, "logos"); set("logo_url", url); setMsg("Logo subido. Recuerda guardar.") }
    catch { setMsg("Error subiendo el logo.") }
  }

  async function save() {
    setSaving(true); setMsg(null)
    const { error } = await supabase.from("entities").update({
      short_description: e.short_description, long_description: e.long_description, history: e.history,
      website: e.website, email: e.email, phone: e.phone, whatsapp: e.whatsapp, linkedin: e.linkedin,
      location_city: e.location_city, logo_url: e.logo_url, cover_url: e.cover_url,
    }).eq("id", entityId)
    setSaving(false)
    setMsg(error ? "Error al guardar." : "Guardado correctamente.")
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">{e.name}</h1>
      <p className="mt-1 text-slate-500">Edita la información pública de tu entidad.</p>

      <div className="mt-6 grid gap-5">
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <img src={e.logo_url || "/logo-MSN.jpg"} alt="logo" className="h-16 w-16 rounded-xl border object-contain p-1" />
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
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
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
  const [form, setForm] = useState({ title: "", startup_name: "", description: "" })
  async function load() {
    const { data } = await supabase.from("entity_success_cases").select("*").eq("entity_id", entityId).order("sort_order")
    setItems(data ?? [])
  }
  useEffect(() => { load() }, [entityId])
  async function add() {
    if (!form.title) return
    await supabase.from("entity_success_cases").insert({ entity_id: entityId, ...form })
    setForm({ title: "", startup_name: "", description: "" }); load()
  }
  async function del(id: string) { await supabase.from("entity_success_cases").delete().eq("id", id); load() }
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">Casos de éxito</h2>
      <div className="mt-3 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
            <span className="text-sm"><b>{it.title}</b>{it.startup_name ? ` — ${it.startup_name}` : ""}</span>
            <button onClick={() => del(it.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input placeholder="Startup" value={form.startup_name} onChange={(e) => setForm({ ...form, startup_name: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
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
