import { useState } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth"

/** Botón flotante para reportar errores o proponer mejoras desde cualquier pantalla. */
export default function BotonFeedback() {
  const { profile, isSuperadmin } = useAuth()
  const loc = useLocation()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<"error" | "mejora" | "otro">("mejora")
  const [texto, setTexto] = useState("")
  const [email, setEmail] = useState("")
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle")
  const esPanel = loc.pathname.startsWith("/admin")

  async function enviar() {
    if (texto.trim().length < 3) return
    setEstado("enviando")
    const { error } = await supabase.from("feedback" as any).insert({
      tipo, texto: texto.trim().slice(0, 3000), email: email.trim() || null,
      ruta: (window.location.pathname + window.location.search).slice(0, 300),
      navegador: navigator.userAgent.slice(0, 300),
      user_id: profile?.id ?? null,
      actor: profile ? (isSuperadmin ? "superadmin" : "entidad") : (loc.pathname.startsWith("/empezar") ? "emprendedor" : "visitante"),
    } as any)
    setEstado(error ? "error" : "ok")
    if (!error) { setTexto(""); setTimeout(() => { setAbierto(false); setEstado("idle") }, 2200) }
  }

  const color = esPanel && !isSuperadmin ? "bg-[#4A5D8A] hover:bg-[#2C3959] text-white" : "bg-[#2C3959] hover:bg-[#4A5D8A] text-white"
  return (
    <>
      <button onClick={() => setAbierto(true)} aria-label="Enviar feedback"
        className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition ${color}`}>
        <span aria-hidden>💬</span><span className="hidden sm:inline">¿Algo falla o se puede mejorar?</span><span className="sm:hidden">Feedback</span>
      </button>
      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setAbierto(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {estado === "ok" ? (
              <div className="py-6 text-center"><p className="text-3xl">🙌</p><p className="mt-2 font-bold text-[#2C3959]">¡Gracias! Lo hemos recibido.</p></div>
            ) : (
              <>
                <h2 className="text-lg font-extrabold text-[#2C3959]">Cuéntanos</h2>
                <p className="mt-1 text-sm text-slate-500">Un error, algo que no entiendes o una mejora que te gustaría. Lo lee el equipo de la red.</p>
                <div className="mt-4 flex gap-2 text-sm">
                  {([["error", "🐞 Error"], ["mejora", "💡 Mejora"], ["otro", "💬 Otro"]] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setTipo(v)} className={`rounded-full px-3 py-1 font-semibold ${tipo === v ? "bg-[#2C3959] text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
                  ))}
                </div>
                <textarea autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={3000}
                  placeholder={tipo === "error" ? "¿Qué estabas haciendo y qué ha pasado?" : "¿Qué mejorarías?"}
                  className="mt-3 min-h-[120px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#4A5D8A]" />
                {!profile && (
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Tu email (opcional, por si necesitamos preguntarte)"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#4A5D8A]" />
                )}
                {estado === "error" && <p className="mt-2 text-sm text-red-600">No se pudo enviar. Inténtalo de nuevo.</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setAbierto(false)} className="rounded-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">Cancelar</button>
                  <button onClick={enviar} disabled={texto.trim().length < 3 || estado === "enviando"}
                    className="rounded-full bg-[#F9A825] px-5 py-2 text-sm font-bold text-[#2C3959] disabled:opacity-50">
                    {estado === "enviando" ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
