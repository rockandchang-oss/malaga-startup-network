import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AdminEntities() {
  const [entities, setEntities] = useState<any[]>([])
  const [sel, setSel] = useState<any | null>(null)

  async function load() {
    const { data } = await supabase.from("entities").select("id,name,slug,status,logo_url").order("name")
    setEntities(data ?? [])
  }
  useEffect(() => { load() }, [])

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Entidades</h1>
      <p className="mt-1 text-slate-500">Gestiona el estado, la descripción oculta y las etiquetas secretas (alimentan el matching con IA).</p>

      <div className="mt-6 space-y-2">
        {entities.map((e) => (
          <div key={e.id} className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <img src={e.logo_url || "/logo-MSN.jpg"} alt="" className="h-9 w-9 rounded object-contain" />
              <span className="font-semibold">{e.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${e.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{e.status}</span>
            </div>
            <button onClick={() => setSel(e)} className="text-sm font-medium text-brand-700 hover:underline">Gestionar</button>
          </div>
        ))}
      </div>

      {sel && <EntityAdminModal entity={sel} onClose={() => { setSel(null); load() }} />}
    </div>
  )
}

function EntityAdminModal({ entity, onClose }: { entity: any; onClose: () => void }) {
  const [hidden, setHidden] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState(entity.status)
  const [tags, setTags] = useState<any[]>([])
  const [selTags, setSelTags] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    supabase.from("entity_private").select("hidden_description,admin_notes").eq("entity_id", entity.id).maybeSingle()
      .then(({ data }) => { setHidden(data?.hidden_description ?? ""); setNotes(data?.admin_notes ?? "") })
    supabase.from("tags").select("id,name,kind").order("kind").then(({ data }) => setTags(data ?? []))
    supabase.from("entity_admin_tags").select("tag_id").eq("entity_id", entity.id)
      .then(({ data }) => setSelTags(new Set((data ?? []).map((x: any) => x.tag_id))))
  }, [entity.id])

  function toggle(id: string) { const n = new Set(selTags); n.has(id) ? n.delete(id) : n.add(id); setSelTags(n) }

  async function save() {
    setSaving(true); setMsg(null)
    await supabase.from("entities").update({ status }).eq("id", entity.id)
    await supabase.from("entity_private").upsert({ entity_id: entity.id, hidden_description: hidden, admin_notes: notes })
    await supabase.from("entity_admin_tags").delete().eq("entity_id", entity.id)
    if (selTags.size) await supabase.from("entity_admin_tags").insert(Array.from(selTags).map((tag_id) => ({ entity_id: entity.id, tag_id })))
    setSaving(false); setMsg("Guardado.")
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{entity.name}</h2>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Estado:</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="archived">Archivado</option>
          </select>
        </label>

        <div className="mt-5">
          <span className="text-sm font-semibold text-slate-700">🔒 Descripción oculta (solo superadmin · alimenta la IA)</span>
          <textarea rows={6} value={hidden} onChange={(e) => setHidden(e.target.value)}
            className="mt-1 w-full rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-2.5 text-sm outline-none focus:border-amber-400" />
        </div>

        <div className="mt-4">
          <span className="text-sm font-semibold text-slate-700">Notas internas</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
        </div>

        <div className="mt-4">
          <span className="text-sm font-semibold text-slate-700">🔒 Etiquetas secretas (objetivo real de la entidad)</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <button key={t.id} onClick={() => toggle(t.id)}
                className={`rounded-full px-3 py-1 text-xs ${selTags.has(t.id) ? "bg-brand-700 text-white" : "border border-slate-200"}`}>
                {t.name}<span className="ml-1 opacity-50">{t.kind}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {msg && <span className="text-sm text-green-600">{msg}</span>}
          <button onClick={onClose} className="btn-ghost text-sm">Cerrar</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  )
}
