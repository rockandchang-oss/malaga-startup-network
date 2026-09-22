import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"

const SITE = (import.meta.env.VITE_SITE_URL as string) || "https://malagastartupnetwork.com"
const BASE = (import.meta.env.VITE_BASENAME as string) || ""
const URL_CLAVE = SITE + BASE + "/admin/clave"

type Estado = "cargando" | "listo" | "sin-sesion" | "caducado"

export default function Clave() {
  const nav = useNavigate()
  const [pass, setPass] = useState("")
  const [pass2, setPass2] = useState("")
  const [estado, setEstado] = useState<Estado>("cargando")
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [correo, setCorreo] = useState("")
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
    const h = window.location.hash || ""
    if (h.indexOf("otp_expired") >= 0 || h.indexOf("access_denied") >= 0) { setEstado("caducado"); return }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sesion) => { if (sesion) setEstado("listo") })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setEstado("listo")
      else setTimeout(() => setEstado((v) => (v === "cargando" ? "sin-sesion" : v)), 2500)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function pedirEnlace(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const r = await supabase.auth.resetPasswordForEmail(correo, { redirectTo: URL_CLAVE })
    if (r.error) setError(r.error.message)
    else setEnviado(true)
  }

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

        

                {(estado === "sin-sesion" || estado === "caducado") && (
          <div className="card p-6">
            <h1 className="text-center text-xl font-bold">
              {estado === "caducado" ? "El enlace ha caducado" : "Necesitas el enlace del correo"}
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600">
              {estado === "caducado"
                ? "Los enlaces caducan a las 24 horas. Pide uno nuevo aquí mismo:"
                : "Escribe tu correo y te enviamos un enlace para establecer tu contraseña:"}
            </p>
            {enviado ? (
              <p className="mt-4 rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
                Enlace enviado. Revisa tu correo (y la carpeta de spam). Caduca en 24 horas.
              </p>
            ) : (
              <form onSubmit={pedirEnlace} className="mt-4 space-y-3">
                <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
                {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
                <button className="btn-primary w-full">Enviarme el enlace</button>
              </form>
            )}
            <p className="mt-4 text-center">
              <Link to="/admin/login" className="text-xs text-brand-700 hover:underline">Ya tengo contraseña, ir al acceso</Link>
            </p>
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
