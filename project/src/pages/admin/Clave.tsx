import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"

type Estado = "cargando" | "listo" | "sin-sesion" | "caducado"

export default function Clave() {
  const nav = useNavigate()
  const [pass, setPass] = useState("")
  const [pass2, setPass2] = useState("")
  const [estado, setEstado] = useState<Estado>("cargando")
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const h = window.location.hash || ""
    if (h.indexOf("otp_expired") >= 0 || h.indexOf("access_denied") >= 0) { setEstado("caducado"); return }
    supabase.auth.getSession().then(({ data }) => setEstado(data.session ? "listo" : "sin-sesion"))
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (pass.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return }
    if (pass !== pass2) { setError("Las dos contraseñas no coinciden."); return }
    setGuardando(true)
    const r = await supabase.auth.updateUser({ password: pass })
    setGuardando(false)
    if (r.error) setError(r.error.message)
    else { setOk(true); setTimeout(() => nav("/admin"), 1800) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link to="/admin/login" className="mb-6 flex items-center justify-center gap-2">
          <span className="font-extrabold">Málaga Startup Network</span>
        </Link>

        {estado === "cargando" && <p className="text-center text-slate-400">Comprobando el enlace…</p>}

        {estado === "caducado" && (
          <div className="card p-6 text-center">
            <h1 className="text-xl font-bold">El enlace ha caducado</h1>
            <p className="mt-2 text-sm text-slate-600">
              Los enlaces de invitación caducan a las 24 horas. Pide que te envíen uno nuevo
              y ábrelo cuanto antes.
            </p>
            <Link to="/admin/login" className="btn-ghost mt-5 inline-block text-sm">Ir al acceso</Link>
          </div>
        )}

        {estado === "sin-sesion" && (
          <div className="card p-6 text-center">
            <h1 className="text-xl font-bold">Necesitas abrir el enlace del correo</h1>
            <p className="mt-2 text-sm text-slate-600">
              Para establecer tu contraseña, entra desde el enlace de invitación que te
              hemos enviado por correo. Si ya tienes contraseña, accede con normalidad.
            </p>
            <Link to="/admin/login" className="btn-ghost mt-5 inline-block text-sm">Ir al acceso</Link>
          </div>
        )}

        {estado === "listo" && (
          <form onSubmit={guardar} className="card space-y-4 p-6">
            <h1 className="text-xl font-bold">Establece tu contraseña</h1>
            <p className="text-sm text-slate-500">
              Elige una contraseña para entrar al panel a partir de ahora.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Nueva contraseña</span>
              <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Repítela</span>
              <input type="password" required value={pass2} onChange={(e) => setPass2(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
            </label>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
            {ok && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Guardada. Entrando al panel…</p>}
            <button disabled={guardando || ok} className="btn-primary w-full disabled:opacity-50">
              {guardando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
