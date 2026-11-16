import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import VistaNoticia from "../components/VistaNoticia"

const SITE = (import.meta.env.VITE_SITE_URL as string) || "https://malagastartupnetwork.com"
const ACTUALIDAD = SITE + "/pages/actualidad.html#articulos"

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
      <a href={ACTUALIDAD} className="btn-ghost mt-4">Volver a Actualidad</a>
    </div>
  )

  return (
    <article className="container-x max-w-3xl py-14">
      <a href={ACTUALIDAD} className="text-sm text-brand-700 hover:underline">← Actualidad</a>
      <VistaNoticia post={post} />
    </article>
  )
}
