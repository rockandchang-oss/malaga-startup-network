import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

export default function Dashboard() {
  const { profile, isSuperadmin } = useAuth()
  const [stats, setStats] = useState({ leads: 0, programs: 0, entities: 0 })

  useEffect(() => {
    (async () => {
      if (isSuperadmin) {
        const [{ count: leads }, { count: entities }, { count: programs }] = await Promise.all([
          supabase.from("leads").select("*", { count: "exact", head: true }),
          supabase.from("entities").select("*", { count: "exact", head: true }),
          supabase.from("programs").select("*", { count: "exact", head: true }),
        ])
        setStats({ leads: leads ?? 0, entities: entities ?? 0, programs: programs ?? 0 })
      } else if (profile?.entity_id) {
        const { count } = await supabase.from("programs").select("*", { count: "exact", head: true }).eq("entity_id", profile.entity_id)
        setStats((s) => ({ ...s, programs: count ?? 0 }))
      }
    })()
  }, [isSuperadmin, profile])

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Hola, {profile?.full_name ?? "bienvenido"}</h1>
      <p className="mt-1 text-slate-500">
        {isSuperadmin ? "Panel de administración de la red." : "Gestiona el perfil y los programas de tu entidad."}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {isSuperadmin && <Stat label="Leads" value={stats.leads} to="/admin/leads" />}
        {isSuperadmin && <Stat label="Entidades" value={stats.entities} to="/admin/entidades" />}
        <Stat label="Programas" value={stats.programs} to="/admin/programas" />
      </div>

      {!profile?.entity_id && !isSuperadmin && (
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          Tu usuario aún no está vinculado a ninguna entidad. Contacta con el equipo de la red.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/admin/entidad" className="btn-primary">Editar mi entidad</Link>
        <Link to="/admin/programas" className="btn-ghost">Gestionar programas</Link>
      </div>
    </div>
  )
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="card p-5 hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-brand-700">{value}</p>
    </Link>
  )
}
