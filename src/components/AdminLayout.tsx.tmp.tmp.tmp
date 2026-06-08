import { NavLink, Outlet, useNavigate, Link } from "react-router-dom"
import { useAuth } from "../lib/auth"

export default function AdminLayout() {
  const { profile, loading, session, isSuperadmin, signOut } = useAuth()
  const nav = useNavigate()

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>
  if (!session) { nav("/admin/login"); return null }

  const link = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"}`

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <img src="/logo-MSN.jpg" alt="MSN" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-sm font-extrabold leading-tight">MSN Panel</span>
        </Link>
        <nav className="flex-1 space-y-1">
          <NavLink to="/admin" end className={link}>Inicio</NavLink>
          <NavLink to="/admin/entidad" className={link}>Mi entidad</NavLink>
          <NavLink to="/admin/programas" className={link}>Mis programas</NavLink>
          <NavLink to="/admin/noticias" className={link}>Noticias</NavLink>
          {isSuperadmin && (
            <>
              <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Superadmin</p>
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
          <button onClick={signOut} className="text-sm font-medium text-red-600 hover:underline">Cerrar sesión</button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
