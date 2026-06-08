import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

type Entity = {
  id: string; name: string; slug: string; logo_url: string | null
  short_description: string | null; location_city: string | null; category_id: string | null
}
type Category = { id: string; name: string; slug: string }

export default function Directory() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [active, setActive] = useState<string>("all")

  useEffect(() => {
    supabase.from("entities")
      .select("id,name,slug,logo_url,short_description,location_city,category_id")
      .eq("status", "published").order("is_featured", { ascending: false }).order("name")
      .then(({ data }) => setEntities(data ?? []))
    supabase.from("entity_categories").select("id,name,slug").order("sort_order")
      .then(({ data }) => setCategories(data ?? []))
  }, [])

  const filtered = useMemo(
    () => (active === "all" ? entities : entities.filter((e) => e.category_id === active)),
    [entities, active],
  )

  return (
    <div className="container-x py-14">
      <h1 className="text-4xl font-extrabold tracking-tight">Entidades de la red</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Organismos públicos, academia, sector privado, inversión y mentores que impulsan el
        emprendimiento en Málaga.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <button onClick={() => setActive("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${active === "all" ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          Todas
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActive(c.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${active === c.id ? "bg-brand-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <Link key={e.id} to={`/entidades/${e.slug}`} className="card flex flex-col p-6 hover:shadow-md">
            <div className="grid h-16 place-items-center">
              {e.logo_url
                ? <img src={e.logo_url} alt={e.name} className="h-14 max-w-[160px] object-contain" loading="lazy" />
                : <span className="text-lg font-bold text-brand-700">{e.name}</span>}
            </div>
            <h3 className="mt-4 font-bold">{e.name}</h3>
            <p className="mt-1 flex-1 text-sm text-slate-600 line-clamp-3">{e.short_description}</p>
            <span className="mt-3 text-xs font-medium text-slate-400">{e.location_city}</span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-slate-500">No hay entidades en esta categoría todavía.</p>
      )}
    </div>
  )
}
