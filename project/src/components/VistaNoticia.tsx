import type { ReactNode } from "react"
import TextoRico from "./TextoRico"

// Una noticia tal y como se ve publicada. La usan la página pública (BlogPost)
// y la vista previa del panel (Noticias y Revisión), para que lo que se revisa sea lo que sale.
export default function VistaNoticia({ post, entidad }: { post: any; entidad?: { name?: string; logo_url?: string } | null }) {
  const ent = entidad ?? post.entities ?? null
  return (
    <>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        {ent?.logo_url && <img src={ent.logo_url} alt="" className="h-6 w-6 object-contain" />}
        {ent?.name && <span>{ent.name}</span>}
        {post.published_at && <span>· {new Date(post.published_at).toLocaleDateString("es-ES")}</span>}
      </div>
      <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight">{post.title}</h1>
      {post.excerpt && <p className="mt-3 text-lg text-slate-600">{post.excerpt}</p>}
      {post.cover_url && <img src={post.cover_url} alt="" className="mt-6 w-full rounded-2xl object-cover" />}
      <TextoRico texto={post.body ?? ""} className="mt-8 text-[17px] leading-relaxed text-slate-700" />
    </>
  )
}

// Ventana de vista previa para el panel.
export function VistaPreviaNoticia({ post, entidad, onClose, acciones }: { post: any; entidad?: any; onClose: () => void; acciones?: ReactNode }) {
  const publicada = post.status === "published" && post.slug
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose} onKeyDown={(e) => { if (e.key === "Escape") onClose() }}>
      <div className="card max-h-[92vh] w-full max-w-4xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-amber-50 px-5 py-3 text-sm">
          <span className="font-semibold text-amber-900">
            {publicada ? "Así se ve publicada" : "Vista previa: así se verá cuando se publique"}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {publicada && <a href={`/startups/noticias/${post.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">Abrir en la web ↗</a>}
            {acciones}
            <button onClick={onClose} className="rounded-full px-3 py-1 text-slate-600 hover:bg-white">Cerrar ✕</button>
          </div>
        </div>
        <article className="mx-auto max-w-3xl px-6 pb-12 pt-4">
          <VistaNoticia post={post} entidad={entidad} />
        </article>
      </div>
    </div>
  )
}
