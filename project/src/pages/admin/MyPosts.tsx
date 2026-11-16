import { useEffect, useRef, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { uploadImage } from "../../lib/storage"
import EditorRico from "../../components/EditorRico"
import { VistaPreviaNoticia } from "../../components/VistaNoticia"

type Post = Record<string, any>

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// Mejora 10 (SEO): direccion con las palabras clave del titulo, sin palabras vacias ni codigos al final.
const VACIAS = new Set("a al ante con contra de del desde el en entre es este esta estos estas hacia hasta la las lo los mas o para por que se segun sin sobre su sus tras un una unos unas y e ni u".split(" "))
function slugSEO(titulo: string) {
  const palabras = slugify(titulo || "").split("-").filter((w) => w && !VACIAS.has(w))
  let out = ""
  for (const w of palabras) { if ((out + "-" + w).length > 70) break; out = out ? out + "-" + w : w }
  return out || "noticia"
}

export default function MyPosts() {
  const { profile, isSuperadmin, session } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [editing, setEditing] = useState<Post | null>(null)
  const [viendo, setViendo] = useState<Post | null>(null)
  const [entidades, setEntidades] = useState<Record<string, any>>({})
  useEffect(() => {
    supabase.from("entities").select("id,name,logo_url").then(({ data }) => {
      const m: Record<string, any> = {}
      for (const e of (data ?? []) as any[]) m[e.id] = e
      setEntidades(m)
    })
  }, [])

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
          <div key={p.id} role="button" tabIndex={0} title="Ver la noticia"
            onClick={() => setViendo(p)} onKeyDown={(e) => { if (e.key === "Enter") setViendo(p) }}
            className="group card flex cursor-pointer items-center justify-between gap-4 p-4 transition hover:border-brand-300 hover:shadow-md">
            {p.cover_url && <img src={p.cover_url} alt="" className="hidden h-14 w-20 shrink-0 rounded-lg object-cover sm:block" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold group-hover:underline">{p.title}</p>
              <p className="line-clamp-2 text-sm text-slate-500">{p.excerpt}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setViendo(p)} className="text-sm font-medium text-slate-600 hover:underline">{p.status === "published" ? "Ver" : "Vista previa"}</button>
              <span className={`rounded-full px-2 py-1 text-xs ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{({ published: "Publicada", draft: "Borrador", pending: "Pendiente de revisión", archived: "Archivada" } as Record<string, string>)[p.status] ?? p.status}</span>
              <button onClick={() => setEditing(p)} className="text-sm font-medium text-brand-700 hover:underline">Editar</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-slate-400">Aún no hay entradas. Crea la primera.</p>}
      </div>

      {viendo && <VistaPreviaNoticia post={viendo} entidad={entidades[viendo.entity_id]} onClose={() => setViendo(null)}
        acciones={<button onClick={() => { const p = viendo; setViendo(null); setEditing(p) }} className="font-semibold text-brand-700 hover:underline">Editar</button>} />}
      {editing && <PostEditor post={editing} entityId={profile?.entity_id ?? null} authorId={session?.user.id ?? null} canPublish={isSuperadmin} onClose={() => { setEditing(null); load() }} />}
    </div>
  )
}

function PostEditor({ post, entityId, authorId, canPublish, onClose }: { post: Post; entityId: string | null; authorId: string | null; canPublish: boolean; onClose: () => void }) {
  // Mejora 5 (16-nov-2026): lo escrito no se pierde. Clic fuera no cierra, Cancelar pregunta si hay cambios
  // y se guarda una copia en este navegador mientras se escribe (se ofrece recuperarla al volver a abrir).
  const clave = `msn-borrador-noticia-${post.id ?? "nueva"}`
  const [p, setP] = useState<Post>(post)
  const [saving, setSaving] = useState(false)
  const [copia, setCopia] = useState<Post | null>(() => {
    try { const c = JSON.parse(localStorage.getItem(clave) || "null"); return c && (c.title || c.body || c.excerpt) ? c : null } catch { return null }
  })
  const cambiado = useRef(false)
  const yaPublicada = post.status === "published" && !!post.slug
  function set(k: string, v: any) { cambiado.current = true; setP((s) => ({ ...s, [k]: v })) }

  useEffect(() => {
    if (!cambiado.current) return
    try { localStorage.setItem(clave, JSON.stringify({ ...p, _guardado: new Date().toISOString() })) } catch { /* sin almacenamiento */ }
  }, [p])

  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => { if (cambiado.current) { e.preventDefault(); e.returnValue = "" } }
    window.addEventListener("beforeunload", aviso)
    return () => window.removeEventListener("beforeunload", aviso)
  }, [])

  function olvidarCopia() { try { localStorage.removeItem(clave) } catch { /* nada */ } }
  function cancelar() {
    if (cambiado.current && !confirm("Tienes cambios sin guardar. ¿Seguro que quieres cerrar y descartarlos?")) return
    olvidarCopia(); onClose()
  }

  async function onCover(file: File) {
    try { const url = await uploadImage(file, "posts"); set("cover_url", url) } catch { /* ignore */ }
  }

  async function save() {
    setSaving(true)
    const status = p.status
    const base = yaPublicada ? post.slug : (slugify(p.slug_manual ?? "").slice(0, 80).replace(/-$/, "") || slugSEO(p.title))
    const payload: any = {
      title: p.title, slug: base,
      excerpt: p.excerpt, body: p.body, cover_url: p.cover_url, status,
      send_newsletter: !!p.send_newsletter,
      entity_id: p.entity_id ?? entityId, author_id: p.author_id ?? authorId,
      published_at: status === "published" ? (p.published_at ?? new Date().toISOString()) : null,
    }
    // Si la direccion ya existe se anade -2, -3...
    let error: any = null
    for (let n = 1; n <= 20; n++) {
      payload.slug = n === 1 ? base : `${base}-${n}`
      const r = p.id ? await supabase.from("posts").update(payload).eq("id", p.id) : await supabase.from("posts").insert(payload)
      error = r.error
      if (!error || error.code !== "23505") break
    }
    if (error) { setSaving(false); alert("No se pudo guardar: " + error.message); return }
    cambiado.current = false; olvidarCopia()
    setSaving(false); onClose()
  }

  async function remove() {
    if (p.id && confirm("¿Eliminar esta entrada?")) { await supabase.from("posts").delete().eq("id", p.id); cambiado.current = false; olvidarCopia(); onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onKeyDown={(e) => { if (e.key === "Escape") cancelar() }}>
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h2 className="text-xl font-bold">{p.id ? "Editar" : "Nueva"} entrada</h2>
        {copia && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <span>Hay un borrador sin guardar de esta entrada{copia._guardado ? ` (${new Date(copia._guardado).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })})` : ""}.</span>
            <button type="button" className="font-semibold underline" onClick={() => { const { _guardado, ...resto } = copia; cambiado.current = true; setP({ ...post, ...resto }); setCopia(null) }}>Recuperarlo</button>
            <button type="button" className="text-amber-700 hover:underline" onClick={() => { olvidarCopia(); setCopia(null) }}>Descartarlo</button>
          </div>
        )}
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Título</span>
            <input value={p.title ?? ""} onChange={(e) => set("title", e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-brand-500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Dirección de la noticia</span>
            {yaPublicada ? (
              <span className="mt-1 block break-all rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-500">malagastartupnetwork.com/startups/noticias/<b>{post.slug}</b> <span className="text-xs">(ya publicada: no se cambia para no romper los enlaces compartidos)</span></span>
            ) : (
              <>
                <div className="mt-1 flex items-center overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500">
                  <span className="hidden shrink-0 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 sm:block">…/noticias/</span>
                  <input value={p.slug_manual ?? slugSEO(p.title ?? "")} onChange={(e) => set("slug_manual", e.target.value)} className="w-full px-3 py-2.5 text-sm outline-none" />
                </div>
                <span className="mt-1 block text-xs text-slate-500">Se crea sola con las palabras clave del título (bueno para Google). Puedes ajustarla: usa 3-6 palabras que alguien buscaría.{p.slug_manual != null && <button type="button" className="ml-2 font-semibold text-brand-700 hover:underline" onClick={() => setP((x) => { const { slug_manual, ...r } = x; return r })}>Volver a la automática</button>}</span>
              </>
            )}
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
          <div>
            <span className="text-sm font-medium text-slate-700">Contenido</span>
            <EditorRico value={p.body ?? ""} onChange={(md) => { if (md !== (p.body ?? "")) set("body", md) }} placeholder="Escribe o pega aquí la noticia (desde Word, Google Docs o una web se mantiene el formato)…" />
            <span className="mt-1 block text-xs text-slate-500">Usa los botones para negrita, subtítulos, listas y enlaces, o pega el texto ya con formato.</span>
          </div>
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
            <button onClick={cancelar} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={save} disabled={saving || !p.title} className="btn-primary text-sm disabled:opacity-50">{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
