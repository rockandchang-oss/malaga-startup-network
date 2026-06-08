import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    supabase.from("posts")
      .select("title,body,cover_url,published_at,excerpt,entities(name,logo_url,slug)")
      .eq("slug", slug).eq("status", "published").maybeSingle()
      .then(({ data }) => { setPost(data); setLoading(false) })
  }, [slug])

  if (loading) return <div className="container-x py-20 text-center text-slate-400">Cargando…</div>
  if (!post) return (
    <div className="container-x py-20 text-center">
      <p className="text-slate-500">Noticia no encontrada.</p>
      <Link to="/noticias" className="btn-ghost mt-4">Volver a noticias</Link>
    </div>
  )

  return (
    <article className="container-x max-w-3xl py-14">
      <Link to="/noticias" className="text-sm text-brand-700 hover:underline">← Noticias</Link>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        {post.entities?.logo_url && <img src={post.entities.logo_url} alt="" className="h-6 w-6 object-contain" />}
        <span>{post.entities?.name}</span>
        {post.published_at && <span>· {new Date(post.published_at).toLocaleDateString("es-ES")}</span>}
      </div>
      <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">{post.title}</h1>
      {post.excerpt && <p className="mt-3 text-lg text-slate-600">{post.excerpt}</p>}
      {post.cover_url && <img src={post.cover_url} alt="" className="mt-6 w-full rounded-2xl object-cover" />}
      <div className="prose mt-8 max-w-none whitespace-pre-line leading-relaxed text-slate-700">{post.body}</div>
    </article>
  )
}
