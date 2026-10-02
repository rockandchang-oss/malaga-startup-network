import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Entity = {
  id: string; name: string; slug: string; logo_url: string | null; cover_url: string | null
  website: string | null; email: string | null; location_city: string | null
  short_description: string | null; long_description: string | null; history: string | null
}
type Program = {
  id: string; name: string; short_description: string | null; photo_url: string | null; cta_url: string | null; cta_label: string | null
  long_description: string | null; benefits: string | null; vigencia: string | null; fecha_inicio: string | null; fecha_fin: string | null
  program_stages?: { startup_stages: { name: string } | null }[]; program_tags?: { tags: { name: string } | null }[]
}
function Parrafos({ texto, className = "" }: { texto: string | null | undefined; className?: string }) {
  if (!texto) return null
  return <>{texto.split(/\n\s*\n|\n/).map((t) => t.trim()).filter(Boolean).map((t, i) => <p key={i} className={`${className} ${i ? "mt-3" : ""}`}>{t}</p>)}</>
}
const fechaCorta = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
type SuccessCase = { id: string; title: string; startup_name: string | null; description: string | null; image_url: string | null; url: string | null }

export default function EntityDetail() {
  const { slug } = useParams()
  const [entity, setEntity] = useState<Entity | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [cases, setCases] = useState<SuccessCase[]>([])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    supabase.from("entities")
      .select("id,name,slug,logo_url,cover_url,website,email,location_city,short_description,long_description,history")
      .eq("slug", slug).eq("status", "published").maybeSingle()
      .then(async ({ data }) => {
        setEntity(data as Entity | null)
        if (data) {
          const [{ data: progs }, { data: sc }] = await Promise.all([
            supabase.from("programs").select("id,name,short_description,photo_url,cta_url,cta_label,long_description,benefits,vigencia,fecha_inicio,fecha_fin,program_stages(startup_stages(name)),program_tags(tags(name))")
              .eq("entity_id", data.id).eq("status", "published").order("sort_order"),
            supabase.from("entity_success_cases").select("id,title,startup_name,description,image_url,url")
              .eq("entity_id", data.id).order("sort_order"),
          ])
          setPrograms((progs ?? []) as any)
          setCases(sc ?? [])
        }
        setLoading(false)
      })
  }, [slug])

  if (loading) return <div className="container-x py-20 text-center text-slate-400">Cargando…</div>
  if (!entity) return (
    <div className="container-x py-20 text-center">
      <p className="text-slate-500">Entidad no encontrada.</p>
      <Link to="/entidades" className="btn-ghost mt-4">Volver al directorio</Link>
    </div>
  )

  return (
    <div className="container-x py-14">
      <Link to="/entidades" className="text-sm text-brand-700 hover:underline">← Entidades</Link>
      <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div className="grid h-24 w-40 place-items-center rounded-2xl border border-slate-200 bg-white p-4">
          {entity.logo_url
            ? <img src={entity.logo_url} alt={entity.name} className="max-h-16 object-contain" />
            : <span className="font-bold text-brand-700">{entity.name}</span>}
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{entity.name}</h1>
          <p className="mt-1 text-slate-500">{entity.location_city}</p>
          {entity.website && (
            <a href={entity.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">
              Visitar web →
            </a>
          )}
        </div>
      </div>

      {entity.long_description || entity.short_description ? (
        <div className="prose mt-8 max-w-3xl text-slate-700">
          <Parrafos texto={entity.long_description ?? entity.short_description} />
          {entity.history && <div className="mt-4 text-slate-600"><Parrafos texto={entity.history} /></div>}
        </div>
      ) : null}

      {programs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Programas</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {programs.map((p) => (
              <div key={p.id} className="card overflow-hidden">
                {p.photo_url && <img src={p.photo_url} alt={p.name} className="h-40 w-full object-cover" />}
                <div className="p-5">
                  <h3 className="font-bold">{p.name}</h3>
                  {p.vigencia === "temporal" && p.fecha_fin && (
                    <p className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Convocatoria abierta hasta el {fechaCorta(p.fecha_fin)}</p>
                  )}
                  <div className="mt-1 text-sm text-slate-600"><Parrafos texto={p.short_description} /></div>
                  {abierto === p.id && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-700">
                      {p.long_description && <div><Parrafos texto={p.long_description} /></div>}
                      {p.benefits && <div><p className="font-semibold text-slate-800">Beneficios</p><Parrafos texto={p.benefits} className="text-slate-600" /></div>}
                      {(p.program_stages ?? []).length > 0 && <p><span className="font-semibold text-slate-800">Fases: </span>{(p.program_stages ?? []).map((x) => x.startup_stages?.name).filter(Boolean).join(", ")}</p>}
                      {(p.program_tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">{(p.program_tags ?? []).map((x, i) => x.tags && <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{x.tags.name}</span>)}</div>
                      )}
                      {p.vigencia === "temporal" && p.fecha_inicio && <p className="text-xs text-slate-500">Abre el {fechaCorta(p.fecha_inicio)}</p>}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {p.cta_url && (
                      <a href={p.cta_url} target="_blank" rel="noreferrer" className="btn-primary text-sm">
                        {p.cta_label ?? "Más información"}
                      </a>
                    )}
                    {(p.long_description || p.benefits || (p.program_stages ?? []).length > 0) && (
                      <button onClick={() => setAbierto(abierto === p.id ? null : p.id)} className="text-sm font-semibold text-brand-700 hover:underline">
                        {abierto === p.id ? "Ver menos" : "Ver más detalle"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {cases.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold">Casos de éxito</h2>
          <p className="mt-1 text-slate-500">Startups y proyectos impulsados por {entity.name}.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <div key={c.id} className="card p-5">
                {c.image_url && <img src={c.image_url} alt={c.title} className="mb-3 h-24 w-full rounded-lg object-cover" />}
                {c.startup_name && c.startup_name.trim() !== c.title.trim() && <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{c.startup_name}</p>}
                <h3 className="font-bold text-brand-800">{c.title}</h3>
                <div className="mt-1 text-sm text-slate-600"><Parrafos texto={c.description} /></div>
                {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline">Visitar web{c.startup_name ? " de " + c.startup_name : ""} ↗</a>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
