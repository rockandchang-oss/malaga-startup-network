import { Link, NavLink, Outlet } from "react-router-dom"

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img src="/logo-MSN.jpg" alt="Málaga Startup Network" className="h-9 w-9 rounded-xl object-cover" />
      <span className="font-extrabold leading-tight tracking-tight">
        Málaga <span className="text-brand-600">Startup</span> Network
      </span>
    </Link>
  )
}

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${isActive ? "text-brand-700" : "text-slate-600 hover:text-brand-700"}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/" className={navClass} end>Inicio</NavLink>
            <NavLink to="/entidades" className={navClass}>Entidades</NavLink>
            <NavLink to="/noticias" className={navClass}>Noticias</NavLink>
          </nav>
          <Link to="/empezar" className="btn-primary !px-4 !py-2 text-sm">Empezar</Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-slate-100 bg-slate-50">
        <div className="container-x grid gap-8 py-12 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-slate-500">
              El punto de entrada al ecosistema emprendedor de Málaga. Conectamos startups con las
              entidades y programas que mejor encajan con su momento.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Explorar</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link to="/empezar" className="hover:text-brand-700">Encontrar mi programa</Link></li>
              <li><Link to="/entidades" className="hover:text-brand-700">Entidades de la red</Link></li>
              <li><a href="https://malagastartupnetwork.com" className="hover:text-brand-700">Web oficial</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">La red</h4>
            <p className="mt-3 text-sm text-slate-500">
              Una iniciativa colaborativa de las entidades públicas y privadas que impulsan el
              emprendimiento en Málaga.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200 py-5">
          <div className="container-x flex items-center justify-between text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Málaga Startup Network. Todos los derechos reservados.</span>
            <Link to="/admin/login" className="hover:text-brand-700">Acceso entidades</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
