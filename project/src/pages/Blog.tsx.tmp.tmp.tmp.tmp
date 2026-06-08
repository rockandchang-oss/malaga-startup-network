import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Post = {
  id: string; slug: string; title: string; excerpt: string | null
  cover_url: string | null; published_at: string | null
  entities: { name: string; logo_url: string | null } | null
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from("posts")
      .select("id,slug,title,excerpt,cover_url,published_at,entities(name,logo_url)")
      .eq("status", "published").order("published_at", { ascending: false })
      .then(({ data }) => { setPosts((data ?? []) as any); setLoading(false) })
  }, [])

  return (
    <div className="container-x py-14">
      <h1 className="text-4xl font-extrabold tracking-tight">Noticias del ecosistema</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Novedades, programas y casos de éxito publicados por las entidades de Málaga Startup Network.
      </p>

      {loading ? (
        <p className="mt-10 text-slate-400">Cargando…</p>
      ) : posts.length === 0 ? (
        <p className="mt-10 text-slate-500">Todavía no hay noticias publicadas.</p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} to={`/noticias/${p.slug}`} className="card overflow-hidden hover:shadow-md">
              {p.cover_url
                ? <img src={p.cover_url} alt="" className="h-44 w-full object-cover" />
                : <div className="h-44 w-full bg-gradient-to-br from-brand-100 to-brand-50" />}
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {p.entities?.logo_url && <img src={p.entities.logo_url} alt="" className="h-5 w-5 object-contain" />}
                  <span>{p.entities?.name}</span>
                  {p.published_at && <span>· {new Date(p.published_at).toLocaleDateString("es-ES")}</span>}
                </div>
                <h2 className="mt-2 font-bold leading-snug">{p.title}</h2>
                <p className="mt-1 text-sm text-slate-600 line-clamp-3">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
