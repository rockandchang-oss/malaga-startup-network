import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { uploadImage } from "../../lib/storage"

type Post = Record<string, any>

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
}

export default function MyPosts() {
  const { profile, isSuperadmin, session } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState<Post | null>(null)

  async function load() {
    let q = supabase.from("posts").select("*").order("created_at", { ascending: false })
    if (!isSuperadmin && profile?.entity_id) q = q.eq("entity_id", profile.entity_id)
    const { data } = await q
    setPosts(data ?? [])
  }
  useEffect(() => { load() }, [profile, isSuperadmin])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Noticias / Blog</h1>
        <button onClick={() => setEditing({ status: "draft", title: "", entity_id: profile?.entity_id ?? null, author_id: session?.user.id })}
          className="btn-primary text-sm">+ Nueva entrada</button>
      </div>

      <div className="mt-6 space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-sm text-slate-500">{p.excerpt}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-1 text-xs ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{p.status}</span>
              <button onClick={() => setEditing(p)} className="text-sm font-medium text-brand-700 hover:underline">Editar</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-slate-400">Aún no hay entradas. Crea la primera.</p>}
      </div>

      {editing && <PostEditor post={editing} entityId={profile?.entity_id ?? null} authorId={session?.user.id ?? null} canPublish={isSuperadmin} onClose={() => { setEditing(null); load() }} />}
    </div>
  )
}

function PostEditor({ post, entityId, authorId, canPublish, onClose }: { post: Post; entityId: string | null; authorId: string | null; canPublish: boolean; onClose: () => void }) {
  const [p, setP] = useState<Post>(post)
  const [saving, setSaving] = useState(false)
  function set(k: string, v: any) { setP((s) => ({ ...s, [k]: v })) }

  async function onCover(file: File) {
    try { const url = await uploadImage(file, "posts"); set("cover_url", url) } catch { /* ignore */ }
  }

  async function save() {
    setSaving(true)
    const status = p.status
    const payload: any = {
      title: p.title, slug: p.slug || `${slugify(p.title || "entrada")}-${Math.random().toString(36).slice(2, 7)}`,
      excerpt: p.excerpt, body: p.body, cover_url: p.cover_url, status,
      send_newsletter: !!p.send_newsletter,
      entity_id: p.entity_id ?? entityId, author_id: p.author_id ?? authorId,
      published_at: status === "published" ? (p.published_at ?? new Date().toISOString()) : null,
    }
    if (p.id) await supabase.from("posts").update(payload).eq("id", p.id)
    else await supabase.from("posts").insert(payload)
    setSaving(false); onClose()
  }

  async function remove() {
    if (p.id && confirm("¿Eliminar esta entrada?")) { await supabase.from("posts").delete().eq("id", p.id); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">{p.id ? "Editar" : "Nueva"} entrada</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Título</span>
            <input value={p.title ?? ""} onChange={(e) => set("title", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Resumen</span>
            <textarea rows={2} value={p.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
          </label>
          <div>
            <span className="text-sm font-medium text-slate-700">Imagen de portada</span>
            <div className="mt-1 flex items-center gap-3">
              {p.cover_url && <img src={p.cover_url} alt="" className="h-14 w-24 rounded object-cover" />}
              <label className="btn-ghost cursor-pointer text-sm">Subir<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onCover(e.target.files[0])} /></label>
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Contenido</span>
            <textarea rows={10} value={p.body ?? ""} onChange={(e) => set("body", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!p.send_newsletter} onChange={(e) => set("send_newsletter", e.target.checked)} />
            <span className="text-slate-700">Incluir en la próxima newsletter</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Estado:</span>
            <select value={p.status} onChange={(e) => set("status", e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2">
              <option value="draft">Borrador</option>
              <option value="pending">Pendiente de revisión</option>
              {canPublish && <option value="published">Publicado</option>}
              <option value="archived">Archivado</option>
            </select>
            {!canPublish && <span className="text-xs text-slate-400">(la red revisa y publica)</span>}
          </label>
        </div>
        <div className="mt-6 flex items-center justify-between">
          {p.id ? <button onClick={remove} className="text-sm text-red-600 hover:underline">Eliminar</button> : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={save} disabled={saving || !p.title} className="btn-primary text-sm disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
