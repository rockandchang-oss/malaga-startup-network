import logoMSN from "../assets/logo-MSN.jpg"
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom"
import { useAuth } from "../lib/auth"
import { useEffect, useState } from "react"
import TourEntidad from "./TourEntidad"
import { supabase } from "../lib/supabase"

export default function AdminLayout() {
  const { profile, loading, session, isSuperadmin, signOut } = useAuth()
  const nav = useNavigate()
  const [tour, setTour] = useState(false)
  const [baja, setBaja] = useState<string | null>(null)
  useEffect(() => {
    if (!profile || profile.role === "superadmin" || !profile.entity_id) { setBaja(null); return }
    supabase.rpc("mi_entidad_de_baja" as any).then(({ data }) => setBaja((data as any) || null))
  }, [profile?.id])
  useEffect(() => {
    if (profile && profile.role !== "superadmin" && profile.entity_id && !profile.tour_visto_at) setTour(true)
  }, [profile?.id])

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>
  if (!session) { nav("/admin/login"); return null }
  if (baja) return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="card max-w-md p-8 text-center">
        <img src={logoMSN} alt="MSN" className="mx-auto h-14 w-14 rounded-xl object-cover" />
        <h1 className="mt-4 text-xl font-extrabold text-[#2C3959]">Acceso no disponible</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {baja} no figura actualmente como entidad activa de Málaga Startup Network, por lo que el panel no está disponible para esta cuenta.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">Si crees que es un error o quieres volver a formar parte de la red, ponte en contacto con el equipo de Málaga Startup Network.</p>
        <a href="https://malagastartupnetwork.com/#contacto" className="mt-5 inline-block rounded-full bg-[#4A5D8A] px-5 py-2.5 text-sm font-semibold text-white">Contactar con la red</a>
        <button onClick={signOut} className="mt-4 block w-full text-sm text-slate-500 hover:underline">Cerrar sesión</button>
      </div>
    </div>
  )

  const link = ({ isActive }: { isActive: boolean }) =>
    `block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${isActive ? (isSuperadmin ? "bg-brand-600 text-white" : "bg-[#4A5D8A] text-white") : "text-slate-600 hover:bg-slate-100"}`

  return (
    <div className="flex min-h-screen bg-slate-50">
      {tour && profile && <TourEntidad userId={profile.id} onClose={() => setTour(false)} />}
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src={logoMSN} alt="MSN" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-sm font-extrabold leading-tight">MSN Panel{!isSuperadmin && <span className="block text-[11px] font-semibold text-[#4A5D8A]">Entidades</span>}</span>
        </Link>
        <nav className="flex-1 space-y-1">
          <NavLink to="/admin" end className={link}>Inicio</NavLink>
          <NavLink to="/admin/entidad" className={link}>{isSuperadmin ? "Editar entidades" : "Mi entidad"}</NavLink>
          <NavLink to="/admin/programas" className={link}>{isSuperadmin ? "Programas" : "Mis programas"}</NavLink>
          <NavLink to="/admin/noticias" className={link}>Noticias</NavLink>
          <NavLink to="/admin/candidaturas" className={link}>Candidaturas 2026</NavLink>
          <NavLink to="/admin/avisos" className={link}>Avisos y reuniones</NavLink>
          <NavLink to="/admin/emprendedores" className={link}>Emprendedores</NavLink>
          {!isSuperadmin && <NavLink to="/admin/estadisticas" className={link}>Estadísticas</NavLink>}
          {isSuperadmin && (
            <>
              <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Superadmin</p>
              <NavLink to="/admin/revision" className={link}>Revisión</NavLink>
              <NavLink to="/admin/feedback" className={link}>Feedback</NavLink>
              <NavLink to="/admin/leads" className={link}>Leads</NavLink>
              <NavLink to="/admin/estadisticas" className={link}>Estadísticas</NavLink>
              <NavLink to="/admin/entidades" className={link}>Entidades</NavLink>
              <NavLink to="/admin/usuarios" className={link}>Usuarios</NavLink>
            </>
          )}
        </nav>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="truncate text-xs text-slate-500">{profile?.full_name}</p>
          <p className="mb-2 text-xs text-slate-400">{isSuperadmin ? "Superadmin" : "Entidad"}</p>
          {!isSuperadmin && <button onClick={() => setTour(true)} className="mb-2 block text-sm font-medium text-[#4A5D8A] hover:underline">Ver el tour</button>}
          <button onClick={signOut} className="text-sm font-medium text-red-600 hover:underline">Cerrar sesión</button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          <NavLink to="/admin" end className={link}>Inicio</NavLink>
          <NavLink to="/admin/entidad" className={link}>{isSuperadmin ? "Editar entidades" : "Mi entidad"}</NavLink>
          <NavLink to="/admin/programas" className={link}>Programas</NavLink>
          <NavLink to="/admin/noticias" className={link}>Noticias</NavLink>
          <NavLink to="/admin/candidaturas" className={link}>Candidaturas</NavLink>
          <NavLink to="/admin/avisos" className={link}>Avisos</NavLink>
          <NavLink to="/admin/emprendedores" className={link}>Emprendedores</NavLink>
          {isSuperadmin && <NavLink to="/admin/revision" className={link}>Revisión</NavLink>}
          {isSuperadmin && <NavLink to="/admin/leads" className={link}>Leads</NavLink>}
          {isSuperadmin && <NavLink to="/admin/usuarios" className={link}>Usuarios</NavLink>}
          <button onClick={signOut} className="shrink-0 px-3 py-2 text-sm font-medium text-red-600">Salir</button>
        </div>
        <div className="mx-auto max-w-5xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
