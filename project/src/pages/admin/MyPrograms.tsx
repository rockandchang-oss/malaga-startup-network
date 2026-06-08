import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { uploadImage } from "../../lib/storage"

type Program = Record<string, any>

export default function MyPrograms() {
  const { profile, isSuperadmin } = useAuth()
  const [entityId, setEntityId] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [editing, setEditing] = useState<Program | null>(null)

  useEffect(() => {
    (async () => {
      let id = profile?.entity_id ?? null
      if (!id && isSuperadmin) {
        const { data } = await supabase.from("entities").select("id").order("name").limit(1).maybeSingle()
        id = data?.id ?? null
      }
      setEntityId(id)
      if (id) load(id)
    })()
  }, [profile, isSuperadmin])

  async function load(id: string) {
    const { data } = await supabase.from("programs").select("*").eq("entity_id", id).order("sort_order")
    setPrograms(data ?? [])
  }

  if (!entityId) return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">Tu usuario no está vinculado a ninguna entidad todavía.</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Mis programas</h1>
        <button onClick={() => setEditing({ entity_id: entityId, status: "draft", name: "", slug: "" })} className="btn-primary text-sm">+ Nuevo programa</button>
      </div>

      <div className="mt-6 space-y-3">
        {programs.map((p) => (
          <div key={p.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-slate-500">{p.short_description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-1 text-xs ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{p.status}</span>
              <button onClick={() => setEditing(p)} className="text-sm font-medium text-brand-700 hover:underline">Editar</button>
            </div>
          </div>
        ))}
        {programs.length === 0 && <p className="text-slate-400">Aún no tienes programas. Crea el primero.</p>}
      </div>

      {editing && <ProgramEditor entityId={entityId} program={editing} onClose={() => { setEditing(null); load(entityId) }} />}
    </div>
  )
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function ProgramEditor({ entityId, program, onClose }: { entityId: string; program: Program; onClose: () => void }) {
  const [p, setP] = useState<Program>(program)
  const [tags, setTags] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [selTags, setSelTags] = useState<Set<string>>(new Set())
  const [selStages, setSelStages] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from("tags").select("id,name,kind").eq("is_admin_only", false).order("kind").then(({ data }) => setTags(data ?? []))
    supabase.from("startup_stages").select("id,name").order("sort_order").then(({ data }) => setStages(data ?? []))
    if (p.id) {
      supabase.from("program_tags").select("tag_id").eq("program_id", p.id).then(({ data }) => setSelTags(new Set((data ?? []).map((x: any) => x.tag_id))))
      supabase.from("program_stages").select("stage_id").eq("program_id", p.id).then(({ data }) => setSelStages(new Set((data ?? []).map((x: any) => x.stage_id))))
    }
  }, [p.id])

  function set(k: string, v: any) { setP((s) => ({ ...s, [k]: v })) }

  async function onPhoto(file: File) {
    try { const url = await uploadImage(file, "programs"); set("photo_url", url) } catch { /* ignore */ }
  }

  async function save() {
    setSaving(true)
    const payload = {
      entity_id: entityId,
      name: p.name, slug: p.slug || slugify(p.name || "programa"),
      short_description: p.short_description, long_description: p.long_description, benefits: p.benefits,
      cta_label: p.cta_label, cta_url: p.cta_url, photo_url: p.photo_url, status: p.status,
    }
    let pid = p.id
    if (pid) {
      await supabase.from("programs").update(payload).eq("id", pid)
    } else {
      const { data } = await supabase.from("programs").insert(payload).select("id").single()
      pid = data?.id
    }
    if (pid) {
      // sync tags
      await supabase.from("program_tags").delete().eq("program_id", pid)
      if (selTags.size) await supabase.from("program_tags").insert(Array.from(selTags).map((tag_id) => ({ program_id: pid, tag_id })))
      await supabase.from("program_stages").delete().eq("program_id", pid)
      if (selStages.size) await supabase.from("program_stages").insert(Array.from(selStages).map((stage_id) => ({ program_id: pid, stage_id })))
    }
    setSaving(false); onClose()
  }

  async function remove() {
    if (p.id && confirm("¿Eliminar este programa?")) { await supabase.from("programs").delete().eq("id", p.id); onClose() }
  }

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setFn(n)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{p.id ? "Editar" : "Nuevo"} programa</h2>
        <div className="mt-4 space-y-4">
          <Inp label="Nombre" value={p.name} onChange={(v) => set("name", v)} />
          <Area label="Descripción breve" value={p.short_description} onChange={(v) => set("short_description", v)} />
          <Area label="Descripción completa" value={p.long_description} onChange={(v) => set("long_description", v)} rows={4} />
          <Area label="Beneficios" value={p.benefits} onChange={(v) => set("benefits", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Inp label="Texto del botón (CTA)" value={p.cta_label} onChange={(v) => set("cta_label", v)} />
            <Inp label="Enlace del botón (URL)" value={p.cta_url} onChange={(v) => set("cta_url", v)} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700">Foto</span>
            <div className="mt-1 flex items-center gap-3">
              {p.photo_url && <img src={p.photo_url} alt="" className="h-12 w-20 rounded object-cover" />}
              <label className="btn-ghost cursor-pointer text-sm">Subir foto<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} /></label>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-slate-700">Fases a las que aplica</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {stages.map((s) => (
                <button key={s.id} onClick={() => toggle(selStages, setSelStages, s.id)}
                  className={`rounded-full px-3 py-1 text-sm ${selStages.has(s.id) ? "bg-brand-600 text-white" : "border border-slate-200"}`}>{s.name}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700">Etiquetas (necesidades / sectores)</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <button key={t.id} onClick={() => toggle(selTags, setSelTags, t.id)}
                  className={`rounded-full px-3 py-1 text-xs ${selTags.has(t.id) ? "bg-sun-500 text-white" : "border border-slate-200"}`}>{t.name}</button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Estado:</span>
            <select value={p.status} onChange={(e) => set("status", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {p.id ? <button onClick={remove} className="text-sm text-red-600 hover:underline">Eliminar</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={save} disabled={saving || !p.name} className="btn-primary text-sm disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Inp({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
    </label>
  )
}
function Area({ label, value, onChange, rows = 3 }: { label: string; value: any; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea rows={rows} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
    </label>
  )
}
