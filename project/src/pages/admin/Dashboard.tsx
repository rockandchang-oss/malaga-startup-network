import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"
import { TarjetaAviso, type Aviso } from "./Avisos"

const CAMPOS_FICHA: [string, string][] = [
  ["short_description", "descripción breve"], ["long_description", "descripción completa"], ["logo_url", "logo"],
  ["website", "web"], ["email", "email de contacto"], ["phone", "teléfono"], ["linkedin", "LinkedIn"],
]

export default function Dashboard() {
  const { profile, isSuperadmin, loading } = useAuth()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [s, setS] = useState<Record<string, number>>({})
  const [entidad, setEntidad] = useState<Record<string, any> | null>(null)
  const [faltan, setFaltan] = useState<string[]>([])

  useEffect(() => {
    if (loading) return
    supabase.from("avisos" as any).select("*").eq("publicado", true).order("fijado", { ascending: false })
      .order("fecha_evento", { ascending: true, nullsFirst: false }).then(({ data }) => {
        const ahora = Date.now() - 3 * 3600000
        setAvisos(((data ?? []) as any[]).filter((a) => !a.fecha_evento || new Date(a.fecha_evento).getTime() >= ahora).slice(0, 2))
      })
    ;(async () => {
      if (isSuperadmin) {
        const [l, e, p, c] = await Promise.all([
          supabase.from("leads").select("*", { count: "exact", head: true }),
          supabase.from("entities").select("id,slug"),
          supabase.from("programs").select("*", { count: "exact", head: true }),
          supabase.from("candidaturas" as any).select("entity_id").eq("edicion", 2026),
        ])
        const ents = ((e.data ?? []) as any[]).filter((x) => x.slug !== "entidad-prueba-msn")
        const porEnt: Record<string, number> = {}
        for (const r of (c.data ?? []) as any[]) porEnt[r.entity_id] = (porEnt[r.entity_id] ?? 0) + 1
        setS({ leads: l.count ?? 0, entidades: ents.length, programas: p.count ?? 0, completas: ents.filter((x) => (porEnt[x.id] ?? 0) >= 2).length })
      } else if (profile?.entity_id) {
        const id = profile.entity_id
        const [p, c, e, r] = await Promise.all([
          supabase.from("programs").select("*", { count: "exact", head: true }).eq("entity_id", id),
          supabase.from("candidaturas" as any).select("id").eq("edicion", 2026).eq("entity_id", id),
          supabase.from("entities").select("*").eq("id", id).maybeSingle(),
          supabase.rpc("leads_para_entidad" as any),
        ])
        const leads = (r.data ?? []) as any[]
        setS({ programas: p.count ?? 0, candidaturas: (c.data ?? []).length, elegido: leads.filter((x) => x.eligida_por_mi).length, leads: leads.length })
        setEntidad(e.data)
        setFaltan(CAMPOS_FICHA.filter(([k]) => !((e.data as any)?.[k])).map(([, n]) => n))
      }
    })()
  }, [loading, isSuperadmin, profile?.entity_id])

  const nombre = profile?.full_name && !profile.full_name.includes("@") ? profile.full_name.split(" ")[0] : null

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Hola{nombre ? `, ${nombre}` : ""}</h1>
      <p className="mt-1 text-slate-500">
        {isSuperadmin ? "Panel de administración de la red." : entidad ? `Panel de ${entidad.name} en Málaga Startup Network.` : "Panel de tu entidad."}
      </p>

      {!profile?.entity_id && !isSuperadmin && !loading && (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">Tu usuario aún no está vinculado a ninguna entidad. Contacta con el equipo de la red.</p>
      )}

      {avisos.length > 0 && (
        <div className="mt-6 space-y-3">
          {avisos.map((a) => <TarjetaAviso key={a.id} a={a} />)}
          <Link to="/admin/avisos" className="inline-block text-sm font-semibold text-[#4A5D8A] hover:underline">Ver todos los avisos →</Link>
        </div>
      )}

      {isSuperadmin ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Candidaturas: entidades con sus 2" value={`${s.completas ?? 0} / ${s.entidades ?? 0}`} to="/admin/candidaturas" />
          <Stat label="Leads" value={s.leads ?? 0} to="/admin/leads" />
          <Stat label="Entidades" value={s.entidades ?? 0} to="/admin/entidades" />
          <Stat label="Programas" value={s.programas ?? 0} to="/admin/programas" />
        </div>
      ) : profile?.entity_id && (
        <>
          <Link to="/admin/candidaturas" className={`mt-6 block rounded-2xl border p-5 hover:shadow-md ${(s.candidaturas ?? 0) >= 2 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Candidaturas 2026 · plazo hasta el 29 de septiembre</p>
            <p className="mt-1 text-lg font-extrabold text-[#2C3959]">
              {(s.candidaturas ?? 0) >= 2 ? "✓ Ya habéis propuesto vuestras 2 startups" : `Habéis propuesto ${s.candidaturas ?? 0} de 2 startups`}
            </p>
            <p className="mt-1 text-sm text-slate-600">{(s.candidaturas ?? 0) >= 2 ? "Podéis cambiarlas hasta la fecha límite →" : "Proponerlas ahora →"}</p>
          </Link>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label="Emprendedores que os han elegido" value={s.elegido ?? 0} to="/admin/emprendedores" />
            <Stat label="Emprendedores en la red" value={s.leads ?? 0} to="/admin/emprendedores" />
            <Stat label="Vuestros programas" value={s.programas ?? 0} to="/admin/programas" />
          </div>
          {faltan.length > 0 && (
            <Link to="/admin/entidad" className="card mt-4 block p-5 hover:shadow-md">
              <p className="font-bold text-[#2C3959]">Completa la ficha de vuestra entidad</p>
              <p className="mt-1 text-sm text-slate-600">Falta: {faltan.join(", ")}. Una ficha completa aparece mejor en el buscador de los emprendedores.</p>
            </Link>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, to }: { label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="card p-5 hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-[#4A5D8A]">{value}</p>
    </Link>
  )
}
