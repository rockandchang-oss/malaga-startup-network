import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import heroBg from "../assets/hero-bg.jpg"

type Entity = { id: string; name: string; slug: string; logo_url: string | null }
type Category = { id: string; name: string; slug: string; description: string | null }
type Ev = { id: string; titulo: string; fecha_inicio: string; fecha_fin: string | null; provincia: string | null; online: boolean; categoria: string | null; url: string | null; imagen_url: string | null; origen: string | null }
const fC = (s: string) => new Date(s + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })

export default function Home() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [eventos, setEventos] = useState<Ev[]>([])

  useEffect(() => {
    supabase.from("entities").select("id,name,slug,logo_url").eq("status", "published").order("sort_order")
      .then(({ data }) => setEntities(data ?? []))
    supabase.from("entity_categories").select("id,name,slug,description").order("sort_order")
      .then(({ data }) => setCategories(data ?? []))
    const hoy = new Date().toISOString().slice(0, 10)
    supabase.from("eventos").select("id,titulo,fecha_inicio,fecha_fin,provincia,online,categoria,url,imagen_url,origen")
      .eq("estado", "publicado").or(`fecha_inicio.gte.${hoy},fecha_fin.gte.${hoy}`).order("fecha_inicio").limit(80)
      .then(({ data }) => {
        const l = ((data ?? []) as Ev[]).slice()
        const r = (e: Ev) => (e.origen === "entidad" ? 0 : 2) + (e.provincia === "Málaga" && !e.online ? 0 : 1)
        l.sort((a, b) => r(a) - r(b) || a.fecha_inicio.localeCompare(b.fecha_inicio))
        setEventos(l.slice(0, 4).sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio)))
      })
  }, [])

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Fondo: imagen sutil + degradado para legibilidad */}
        <div className="absolute inset-0 -z-10">
          <img src={heroBg} alt="" className="h-full w-full scale-105 object-cover blur-[1.5px]" />
          <div className="absolute inset-0 bg-[#4A5D8A]/45 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/65 to-white" />
        </div>
        <div className="container-x grid items-center gap-10 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              Ecosistema emprendedor de Málaga
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-brand-950 sm:text-5xl">
              Aterriza tu proyecto en el <span className="text-brand-600">ecosistema de emprendimiento</span> malagueño.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Responde unas preguntas clave sobre tu momento y te mostramos qué programas y entidades
              de la red pueden ayudarte hoy. Gratis y en 2 minutos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/empezar" className="btn-primary text-base">Empezar ahora →</Link>
              <Link to="/entidades" className="btn-ghost text-base">Ver entidades</Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
              <span>✓ Idea, validación, tracción o ronda</span>
              <span>✓ Cualquier sector</span>
            </div>
          </div>

          <div className="relative">
            <div className="card p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-slate-500">¿En qué punto estás?</p>
              <div className="mt-4 space-y-2">
                {[
                  "Tengo una idea pero no tengo financiación",
                  "He validado la idea / tengo un MVP",
                  "Tengo más de 10 clientes que me pagan",
                  "Estoy levantando una ronda de inversión",
                ].map((t) => (
                  <Link key={t} to="/empezar" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-sm transition hover:border-brand-400 hover:bg-white">
                    <span className="h-4 w-4 rounded-md border-2 border-brand-400" />
                    {t}
                  </Link>
                ))}
              </div>
              <Link to="/empezar" className="btn-primary mt-5 w-full">Descubrir mis programas</Link>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="container-x py-16">
        <h2 className="text-center text-3xl font-extrabold tracking-tight">Cómo funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Cuéntanos tu momento", d: "Marca las frases con las que te identificas y dónde estás." },
            { n: "2", t: "Recibe tus encajes", d: "Te mostramos los programas y entidades que mejor encajan, con foto y descripción." },
            { n: "3", t: "Conecta", d: "Eliges los que te interesan y te ponemos en contacto por WhatsApp o email." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sun-500 font-bold text-white">{s.n}</div>
              <h3 className="mt-4 text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      {categories.length > 0 && (
        <section className="bg-slate-50 py-16">
          <div className="container-x">
            <h2 className="text-3xl font-extrabold tracking-tight">Una red interconectada</h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Entidades públicas, academia, sector privado, inversión y mentores trabajando juntos por
              el emprendimiento malagueño.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <div key={c.id} className="card p-5">
                  <h3 className="font-bold text-brand-800">{c.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRÓXIMOS EVENTOS */}
      {eventos.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Agenda del ecosistema</p>
              <h2 className="text-3xl font-extrabold tracking-tight">Próximos eventos</h2>
              <p className="mt-1 text-slate-600">Jornadas, convocatorias, ayudas e inversión en Málaga y Andalucía.</p>
            </div>
            <Link to="/agenda" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">Ver agenda completa →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {eventos.map((e) => (
              <a key={e.id} href={e.url ?? undefined} target="_blank" rel="noopener noreferrer" className="card group overflow-hidden p-0 hover:shadow-md">
                {e.imagen_url
                  ? <img src={e.imagen_url} alt="" loading="lazy" className="h-32 w-full object-cover" />
                  : <div className="h-32 w-full bg-gradient-to-br from-brand-100 to-brand-50" />}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {e.origen === "entidad" && <span className="rounded-full bg-brand-600 px-2 py-0.5 font-semibold text-white">Entidad de la red</span>}
                    <span className="font-semibold text-brand-700">{e.fecha_fin && e.fecha_fin !== e.fecha_inicio ? `${fC(e.fecha_inicio)} – ${fC(e.fecha_fin)}` : fC(e.fecha_inicio)}</span>
                    <span className="text-slate-400">· {e.online ? "💻 Online" : e.provincia ?? "Andalucía"}</span>
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 font-semibold text-slate-800 group-hover:text-brand-700">{e.titulo}</h3>
                  {e.categoria && <p className="mt-1 text-xs text-slate-400">{e.categoria}</p>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ENTIDADES */}
      {entities.length > 0 && (
        <section className="container-x py-16">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-extrabold tracking-tight">Entidades de la red</h2>
            <Link to="/entidades" className="text-sm font-semibold text-brand-700 hover:underline">Ver todas →</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {entities.map((e) => (
              <Link key={e.id} to={`/entidades/${e.slug}`} className="card grid place-items-center p-5 hover:shadow-md">
                {e.logo_url
                  ? <img src={e.logo_url} alt={e.name} className="h-12 w-full object-contain" loading="lazy" />
                  : <span className="text-sm font-semibold text-slate-500">{e.name}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="bg-brand-700">
        <div className="container-x flex flex-col items-center gap-5 py-16 text-center">
          <h2 className="text-3xl font-extrabold text-white">¿Listo para encontrar tu programa?</h2>
          <p className="max-w-xl text-brand-50">
            Tardarás menos de 2 minutos y darás el siguiente paso con el apoyo adecuado.
          </p>
          <Link to="/empezar" className="btn bg-white text-brand-700 hover:bg-brand-50 text-base">Empezar ahora →</Link>
        </div>
      </section>
    </>
  )
}
