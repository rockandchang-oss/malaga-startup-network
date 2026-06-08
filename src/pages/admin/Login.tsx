import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError("Credenciales incorrectas. Revisa el email y la contraseña.")
    else nav("/admin")
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <img src="/logo-MSN.jpg" alt="MSN" className="h-10 w-10 rounded-xl object-cover" />
          <span className="font-extrabold">Málaga Startup Network</span>
        </Link>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h1 className="text-xl font-bold">Acceso al panel</h1>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Contraseña</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500" />
          </label>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">Acceso reservado a entidades de la red.</p>
      </div>
    </div>
  )
}
