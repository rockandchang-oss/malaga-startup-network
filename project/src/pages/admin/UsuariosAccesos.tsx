import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"

// Usuarios y accesos por entidad, con doble validacion (pedido de Joaquin, OK de Isaac 29-oct-2026).
// Lo que pide un superadmin que no es aprobador queda pendiente; el aprobador lo aprueba o rechaza aqui.
// Los cambios los ejecuta la Edge Function gestion-usuarios (service role dentro de Supabase).

type Miembro = { user_id: string; email: string; full_name: string | null; role: string; activa: boolean; ultimo_acceso: string | null; invitado: string | null; bloqueado: boolean; otras: string[] }
type Entidad = { id: string; name: string; slug: string; status: string; miembros: Miembro[] }
type Solicitud = { id: number; tipo: string; email: string; full_name: string | null; entity_id: string | null; entidad: string | null; role: string | null; motivo: string | null; estado: string; solicitante: string | null; solicitado_at: string; revisor: string | null; revisado_at: string | null; resultado: string | null }
type Datos = { aprobador: boolean; entidades: Entidad[]; superadmins: { email: string; full_name: string | null; ultimo_acceso: string | null }[]; solicitudes: Solicitud[] }

const ROL: Record<string, string> = { entity_admin: "Administrador", editor: "Editor", superadmin: "Superadmin" }
const TIPO: Record<string, string> = { invitar: "Dar de alta", cambiar_rol: "Cambiar rol", quitar: "Quitar acceso", reenviar_acceso: "Reenviar acceso" }
const ESTADO: Record<string, string> = { pendiente: "Pendiente de aprobación", ejecutada: "Hecho", rechazada: "Rechazada", error: "Error" }
const COLOR: Record<string, string> = { pendiente: "bg-amber-100 text-amber-800", ejecutada: "bg-emerald-100 text-emerald-800", rechazada: "bg-slate-200 text-slate-700", error: "bg-red-100 text-red-700" }

function fecha(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
}
function estadoMiembro(m: Miembro) {
  if (m.bloqueado) return { t: "Bloqueado", c: "text-red-600" }
  if (m.ultimo_acceso) return { t: "Último acceso: " + fecha(m.ultimo_acceso), c: "text-slate-500" }
  return { t: "Invitado, aún no ha entrado", c: "text-amber-700" }
}

export default function UsuariosAccesos() {
  const [d, setD] = useState<Datos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [abierta, setAbierta] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [alta, setAlta] = useState<{ entity_id: string; email: string; full_name: string; role: string; motivo: string } | null>(null)

  async function cargar() {
    const { data, error } = await supabase.rpc("admin_usuarios_por_entidad" as any)
    if (error) setError(error.message); else { setD(data as any); setError(null) }
  }
  useEffect(() => { cargar() }, [])

  async function llamar(cuerpo: Record<string, unknown>, confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return
    setEnviando(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke("gestion-usuarios", { body: cuerpo })
    setEnviando(false)
    let texto: string
    if (error) {
      let det = error.message
      try { const j = await (error as any).context?.json?.(); if (j?.error) det = j.error } catch { /* nada */ }
      texto = "❌ " + det
    } else if ((data as any)?.estado === "pendiente") texto = "⏳ " + ((data as any).mensaje ?? "Solicitud enviada, pendiente de aprobación.")
    else if ((data as any)?.estado === "error") texto = "❌ " + (data as any).resultado
    else if ((data as any)?.estado === "rechazada") texto = "✓ Solicitud rechazada."
    else texto = "✓ " + ((data as any)?.resultado ?? "Hecho")
    setMsg(texto); cargar()
    return data
  }
  const solicitar = (tipo: string, extra: Record<string, unknown>, confirmar?: string) => llamar({ accion: "solicitar", tipo, ...extra }, confirmar)
  const verbo = d?.aprobador ? "" : " (quedará pendiente de aprobación)"

  const pendientes = (d?.solicitudes ?? []).filter((s) => s.estado === "pendiente")
  const historial = (d?.solicitudes ?? []).filter((s) => s.estado !== "pendiente")
  const entidades = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return (d?.entidades ?? []).filter((e) => !q || e.name.toLowerCase().includes(q) || e.miembros.some((m) => (m.email + " " + (m.full_name ?? "")).toLowerCase().includes(q)))
  }, [d, busca])

  if (error) return <div className="card p-6 text-red-700">No se pudo cargar: {error}</div>
  if (!d) return <p className="text-slate-400">Cargando…</p>

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Usuarios y accesos</h1>
      <p className="mt-1 text-slate-500">
        Quién tiene acceso a cada entidad. {d.aprobador
          ? "Eres aprobador: tus cambios se aplican al momento y aquí apruebas o rechazas lo que pidan otros superadmins."
          : "Los cambios que pidas quedan como solicitud y se aplican cuando los aprueba Isaac (le llega un aviso por correo)."}
      </p>
      {msg && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{msg}</p>}

      {pendientes.length > 0 && (
        <section className="card mt-6 border-amber-300 p-5">
          <h2 className="text-lg font-extrabold text-[#2C3959]">Solicitudes pendientes ({pendientes.length})</h2>
          <div className="mt-3 space-y-3">
            {pendientes.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm">
                <div>
                  <b>{TIPO[s.tipo]}</b>: {s.full_name ? `${s.full_name} · ` : ""}{s.email}
                  {s.entidad && <> en <b>{s.entidad}</b></>}{s.role && s.tipo !== "quitar" && <> como {ROL[s.role] ?? s.role}</>}
                  <div className="text-xs text-slate-500">Pedido por {s.solicitante ?? "—"} el {fecha(s.solicitado_at)}{s.motivo && <> · «{s.motivo}»</>}</div>
                </div>
                {d.aprobador && (
                  <div className="flex gap-2">
                    <button disabled={enviando} className="btn-primary text-sm" onClick={() => llamar({ accion: "aprobar", id: s.id }, `¿Aprobar y aplicar: ${TIPO[s.tipo]} ${s.email}?`)}>Aprobar</button>
                    <button disabled={enviando} className="btn-ghost text-sm" onClick={() => { const m = window.prompt("Motivo del rechazo (opcional):") ; if (m !== null) llamar({ accion: "rechazar", id: s.id, motivo: m }) }}>Rechazar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input className="input w-full sm:w-80" placeholder="Buscar entidad, persona o correo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <span className="text-sm text-slate-500">{d.entidades.length} entidades · {d.entidades.reduce((n, e) => n + e.miembros.length, 0)} accesos</span>
      </div>

      <div className="mt-4 space-y-3">
        {entidades.map((e) => {
          const abiertaEsta = abierta === e.id || (busca.trim() !== "" && entidades.length <= 3)
          return (
            <div key={e.id} className="card overflow-hidden">
              <button className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50" onClick={() => setAbierta(abiertaEsta ? null : e.id)}>
                <span className="font-bold text-[#2C3959]">{e.name}{e.status !== "published" && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{e.status === "draft" ? "borrador" : e.status}</span>}</span>
                <span className="text-sm text-slate-500">{e.miembros.length} {e.miembros.length === 1 ? "persona" : "personas"} {abiertaEsta ? "▲" : "▼"}</span>
              </button>
              {abiertaEsta && (
                <div className="border-t border-slate-100 p-4">
                  {e.miembros.length === 0 && <p className="text-sm text-slate-500">Nadie tiene acceso todavía.</p>}
                  <ul className="divide-y divide-slate-100">
                    {e.miembros.map((m) => {
                      const st = estadoMiembro(m)
                      const esSuper = m.role === "superadmin"
                      return (
                        <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="text-sm">
                            <div className="font-semibold text-slate-800">{m.full_name || m.email}</div>
                            <div className="text-slate-500">{m.email}{m.otras.length > 0 && <> · también en {m.otras.join(", ")}</>}</div>
                            <div className={`text-xs ${st.c}`}>{st.t}</div>
                          </div>
                          {esSuper ? <span className="text-xs font-semibold text-[#4A5D8A]">Superadmin</span> : (
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <select className="input py-1.5" value={m.role} disabled={enviando}
                                onChange={(ev) => solicitar("cambiar_rol", { email: m.email, role: ev.target.value, entity_id: e.id }, `¿Cambiar el rol de ${m.email} a ${ROL[ev.target.value]}${verbo}?`)}>
                                <option value="entity_admin">Administrador</option><option value="editor">Editor</option>
                              </select>
                              <button disabled={enviando} className="font-semibold text-slate-600 hover:underline" onClick={() => solicitar("reenviar_acceso", { email: m.email, entity_id: e.id }, `¿Enviar a ${m.email} un correo para entrar (crear o recuperar contraseña)${verbo}?`)}>Reenviar acceso</button>
                              <button disabled={enviando} className="font-semibold text-red-600 hover:underline" onClick={() => solicitar("quitar", { email: m.email, entity_id: e.id }, `¿Quitar a ${m.email} de ${e.name}${verbo}? Si no tiene otras entidades, su acceso quedará bloqueado.`)}>Quitar</button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {alta?.entity_id === e.id ? (
                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                      <input className="input" placeholder="Correo *" value={alta.email} onChange={(ev) => setAlta({ ...alta, email: ev.target.value })} />
                      <input className="input" placeholder="Nombre y apellidos" value={alta.full_name} onChange={(ev) => setAlta({ ...alta, full_name: ev.target.value })} />
                      <select className="input" value={alta.role} onChange={(ev) => setAlta({ ...alta, role: ev.target.value })}>
                        <option value="entity_admin">Administrador (gestiona la ficha, programas y leads)</option><option value="editor">Editor</option>
                      </select>
                      <input className="input" placeholder="Motivo o quién lo pide (opcional)" value={alta.motivo} onChange={(ev) => setAlta({ ...alta, motivo: ev.target.value })} />
                      <div className="flex gap-2 sm:col-span-2">
                        <button disabled={enviando || !alta.email.trim()} className="btn-primary text-sm" onClick={async () => { const r = await solicitar("invitar", { ...alta }); if (r && (r as any).estado !== "error") setAlta(null) }}>
                          {d.aprobador ? "Dar de alta y enviar invitación" : "Solicitar el alta"}
                        </button>
                        <button className="btn-ghost text-sm" onClick={() => setAlta(null)}>Cancelar</button>
                      </div>
                      <p className="text-xs text-slate-500 sm:col-span-2">Si la persona ya tiene cuenta en otra entidad, se le añade esta sin cambiar su contraseña.</p>
                    </div>
                  ) : (
                    <button className="mt-3 text-sm font-semibold text-[#4A5D8A] hover:underline" onClick={() => setAlta({ entity_id: e.id, email: "", full_name: "", role: "entity_admin", motivo: "" })}>+ Dar de alta a una persona en {e.name}</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-extrabold text-[#2C3959]">Superadmins</h2>
        <p className="text-sm text-slate-500">{d.superadmins.map((s) => s.full_name || s.email).join(" · ")}</p>
      </section>

      {historial.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600">Registro de cambios ({historial.length})</summary>
          <div className="mt-3 space-y-2">
            {historial.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR[s.estado]}`}>{ESTADO[s.estado]}</span>
                <b>{TIPO[s.tipo]}</b>: {s.email}{s.entidad && <> · {s.entidad}</>}
                <div className="text-xs text-slate-500">
                  Pedido por {s.solicitante ?? "—"} ({fecha(s.solicitado_at)}){s.revisor && <> · resuelto por {s.revisor} ({fecha(s.revisado_at)})</>}{s.resultado && <> · {s.resultado}</>}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
