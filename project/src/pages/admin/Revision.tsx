import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type Post = Record<string, any>

export default function Revision() {
  const [posts, setPosts] = useState<Post[]>([])
  const [entidades, setEntidades] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  async function load() {
    setCargando(true)
    const { data } = await supabase.from("posts").select("*").eq("status", "pending").order("updated_at", { ascending: false })
    setPosts(data ?? [])
    setCargando(false)
  }

  useEffect(() => {
    load()
    supabase.from("entities").select("id,name").then(({ data }) => {
      const m: Record<string, string> = {}
      for (const e of data ?? []) m[(e as any).id] = (e as any).name
      setEntidades(m)
    })
  }, [])

  async function aprobar(p: Post) {
    const { error } = await supabase.from("posts")
      .update({ status: "published", published_at: p.published_at ?? new Date().toISOString() })
      .eq("id", p.id)
    setMsg(error ? "\u274c No se pudo publicar: " + error.message : "\u2713 Publicado: " + p.title)
    load()
  }

  async function devolver(p: Post) {
    const { error } = await supabase.from("posts").update({ status: "draft" }).eq("id", p.id)
    setMsg(error ? "\u274c No se pudo devolver: " + error.message : "\u21a9 Devuelto a borrador: " + p.title)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Revisi\u00f3n de contenidos</h1>
        {posts.length > 0 && (
          <span className="rounded-full bg-brand-500 px-3 py-1 text-sm font-bold text-brand-950">
            {posts.length} pendiente{posts.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <p className="mt-1 text-slate-500">
        Entradas que las entidades han enviado para revisar. Nada se publica sin que lo apruebes aqu\u00ed.
      </p>

      {msg && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{msg}</p>}

      {cargando && <p className="mt-6 text-slate-400">Cargando\u2026</p>}

      {!cargando && posts.length === 0 && (
        <div className="card mt-6 p-8 text-center">
          <p className="text-lg font-semibold text-slate-700">No hay nada pendiente</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando una entidad env\u00ede una entrada para revisi\u00f3n, aparecer\u00e1 aqu\u00ed.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-start gap-4 p-5">
              {p.cover_url && <img src={p.cover_url} alt="" className="h-20 w-32 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-[240px] flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {entidades[p.entity_id] ?? "Sin entidad"}
                  {p.updated_at ? " \u00b7 enviado el " + new Date(p.updated_at).toLocaleDateString("es-ES") : ""}
                </p>
                <h2 className="mt-1 text-lg font-bold leading-snug">{p.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{p.excerpt}</p>
                <button onClick={() => setAbierto(abierto === p.id ? null : p.id)}
                  className="mt-2 text-sm font-semibold text-brand-700 hover:underline">
                  {abierto === p.id ? "Ocultar el texto" : "Leer el texto completo"}
                </button>
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button onClick={() => aprobar(p)} className="btn-primary text-sm">Aprobar y publicar</button>
                <button onClick={() => devolver(p)} className="btn-ghost text-sm">Devolver a borrador</button>
              </div>
            </div>
            {abierto === p.id && (
              <div className="border-t border-slate-100 bg-slate-50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{p.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
        Al aprobar, la entrada pasa a <b>Publicada</b> y queda visible. Al devolverla, vuelve a
        <b> Borrador</b> y la entidad puede editarla y reenviarla.
        <Link to="/admin/noticias" className="ml-1 font-semibold text-brand-700 hover:underline">
          Ver todas las entradas
        </Link>
      </p>
    </div>
  )
}
