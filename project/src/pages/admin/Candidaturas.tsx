import { useEffect, useMemo, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuth } from "../../lib/auth"

const EDICION = 2026

type Conv = { edicion: number; titulo: string; descripcion: string | null; fecha_limite: string; abierta: boolean }
type Cand = {
  id?: string; edicion: number; entity_id: string; posicion: 1 | 2
  startup_nombre: string; web: string | null; contacto: string | null; motivo: string | null
  registrada_por_admin?: boolean; updated_at?: string
}
type Ent = { id: string; name: string; status: string; slug: string }

const vacia = (entity_id: string, posicion: 1 | 2): Cand =>
  ({ edicion: EDICION, entity_id, posicion, startup_nombre: "", web: "", contacto: "", motivo: "" })

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })
}
function quedan(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "Plazo cerrado"
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000)
  return d > 0 ? `Quedan ${d} día${d === 1 ? "" : "s"} y ${h} h` : `Quedan ${h} h`
}

export default function Candidaturas() {
  const { profile, isSuperadmin } = useAuth()
  const [conv, setConv] = useState<Conv | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.from("convocatorias").select("*").eq("edicion", EDICION).maybeSingle()
      .then(({ data }) => { setConv(data as Conv | null); setCargando(false) })
  }, [])

  if (cargando) return <p className="text-slate-400">Cargando…</p>
  if (!conv) return <p className="text-slate-500">No hay ninguna convocatoria activa.</p>

  const abierta = conv.abierta && new Date(conv.fecha_limite).getTime() > Date.now()

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{conv.titulo}</h1>
          <p className="mt-1 max-w-2xl text-slate-500">{conv.descripcion}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 text-sm ${abierta ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-slate-600"}`}>
          <p className="font-bold">{abierta ? quedan(conv.fecha_limite) : "Plazo cerrado"}</p>
          <p className="text-xs">Fecha límite: {fechaLarga(conv.fecha_limite)}</p>
        </div>
      </div>

      {isSuperadmin
        ? <VistaAdmin conv={conv} abierta={abierta} onConv={setConv} />
        : profile?.entity_id
          ? <FormEntidad entityId={profile.entity_id} editable={abierta} admin={false} />
          : <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
              Tu usuario aún no está vinculado a ninguna entidad. Contacta con el equipo de la red.
            </p>}
    </div>
  )
}

function FormEntidad({ entityId, editable, admin, onGuardado }: { entityId: string; editable: boolean; admin: boolean; onGuardado?: () => void }) {
  const [c, setC] = useState<Record<number, Cand>>({ 1: vacia(entityId, 1), 2: vacia(entityId, 2) })
  const [msg, setMsg] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const { data } = await supabase.from("candidaturas").select("*").eq("edicion", EDICION).eq("entity_id", entityId)
    const n: Record<number, Cand> = { 1: vacia(entityId, 1), 2: vacia(entityId, 2) }
    for (const r of (data ?? []) as Cand[]) n[r.posicion] = r
    setC(n)
  }
  useEffect(() => { setMsg(null); cargar() }, [entityId])

  const set = (p: 1 | 2, k: keyof Cand, v: string) => setC((s) => ({ ...s, [p]: { ...s[p], [k]: v } }))

  async function guardar() {
    setGuardando(true); setMsg(null)
    const errores: string[] = []
    for (const p of [1, 2] as const) {
      const r = c[p]
      const nombre = (r.startup_nombre || "").trim()
      if (!nombre) {
        if (r.id) {
          const { error } = await supabase.from("candidaturas").delete().eq("id", r.id)
          if (error) errores.push(`Startup ${p}: ${error.message}`)
        }
        continue
      }
      const fila = {
        edicion: EDICION, entity_id: entityId, posicion: p, startup_nombre: nombre,
        web: (r.web || "").trim() || null, contacto: (r.contacto || "").trim() || null,
        motivo: (r.motivo || "").trim() || null, registrada_por_admin: admin,
      }
      const { error } = await supabase.from("candidaturas").upsert(fila, { onConflict: "edicion,entity_id,posicion" })
      if (error) errores.push(`Startup ${p}: ${error.message}`)
    }
    setGuardando(false)
    setMsg(errores.length ? "❌ " + errores.join(" · ") : "✓ Candidaturas guardadas")
    await cargar()
    onGuardado?.()
  }

  const hechas = [1, 2].filter((p) => c[p].id).length

  return (
    <div className="mt-6">
      {!admin && (
        <p className="mb-4 text-sm text-slate-600">
          {hechas === 2 ? "✓ Ya habéis propuesto vuestras 2 startups. Podéis cambiarlas hasta la fecha límite."
            : hechas === 1 ? "Habéis propuesto 1 startup. Os queda 1 por proponer."
            : "Todavía no habéis propuesto ninguna startup."}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {([1, 2] as const).map((p) => (
          <div key={p} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Startup {p}</p>
              {c[p].id && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Guardada</span>}
            </div>
            <label className="mt-3 block text-sm font-semibold text-slate-700">Nombre de la startup *</label>
            <input className="input mt-1 w-full" disabled={!editable} value={c[p].startup_nombre || ""}
              onChange={(e) => set(p, "startup_nombre", e.target.value)} placeholder="Ej. Mothium" />
            <label className="mt-3 block text-sm font-semibold text-slate-700">Web o enlace</label>
            <input className="input mt-1 w-full" disabled={!editable} value={c[p].web || ""}
              onChange={(e) => set(p, "web", e.target.value)} placeholder="https://" />
            <label className="mt-3 block text-sm font-semibold text-slate-700">Persona de contacto</label>
            <input className="input mt-1 w-full" disabled={!editable} value={c[p].contacto || ""}
              onChange={(e) => set(p, "contacto", e.target.value)} placeholder="Nombre, email o teléfono" />
            <label className="mt-3 block text-sm font-semibold text-slate-700">¿Por qué la proponéis?</label>
            <textarea className="input mt-1 min-h-[110px] w-full" disabled={!editable} value={c[p].motivo || ""}
              onChange={(e) => set(p, "motivo", e.target.value)}
              placeholder="Texto libre: qué hace, en qué punto está, por qué encaja en el evento…" />
          </div>
        ))}
      </div>
      {editable ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={guardar} disabled={guardando} className="btn-primary">
            {guardando ? "Guardando…" : "Guardar candidaturas"}
          </button>
          <span className="text-xs text-slate-500">Para retirar una startup, borra su nombre y guarda.</span>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">El plazo está cerrado: las candidaturas ya no se pueden modificar.</p>
      )}
      {msg && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{msg}</p>}
    </div>
  )
}

function VistaAdmin({ conv, abierta, onConv }: { conv: Conv; abierta: boolean; onConv: (c: Conv) => void }) {
  const [ents, setEnts] = useState<Ent[]>([])
  const [cands, setCands] = useState<Cand[]>([])
  const [sel, setSel] = useState<string>("")
  const [filtro, setFiltro] = useState<"todas" | "pendientes" | "completas">("todas")
  const [fecha, setFecha] = useState(conv.fecha_limite.slice(0, 16))
  const [msg, setMsg] = useState<string | null>(null)

  async function cargar() {
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("entities").select("id,name,status,slug").order("name"),
      supabase.from("candidaturas").select("*").eq("edicion", EDICION),
    ])
    setEnts(((e ?? []) as Ent[]).filter((x) => x.slug !== "entidad-prueba-msn"))
    setCands((c ?? []) as Cand[])
  }
  useEffect(() => { cargar() }, [])

  const porEnt = useMemo(() => {
    const m: Record<string, Cand[]> = {}
    for (const c of cands) (m[c.entity_id] ??= []).push(c)
    return m
  }, [cands])

  const lista = ents.filter((e) => {
    const n = (porEnt[e.id] ?? []).length
    return filtro === "todas" || (filtro === "completas" ? n >= 2 : n < 2)
  })
  const completas = ents.filter((e) => (porEnt[e.id] ?? []).length >= 2).length
  const conAlguna = ents.filter((e) => (porEnt[e.id] ?? []).length > 0).length

  function exportar() {
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`
    const filas = [["Entidad", "Posición", "Startup", "Web", "Contacto", "Motivo", "Registrada por admin", "Actualizada"]]
    for (const e of ents) for (const c of (porEnt[e.id] ?? []).sort((a, b) => a.posicion - b.posicion))
      filas.push([e.name, String(c.posicion), c.startup_nombre, c.web ?? "", c.contacto ?? "", c.motivo ?? "", c.registrada_por_admin ? "sí" : "no", c.updated_at ?? ""])
    const csv = "﻿" + filas.map((f) => f.map(esc).join(";")).join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    a.download = `candidaturas-${EDICION}.csv`
    a.click()
  }

  async function guardarConv(cambios: Partial<Conv>) {
    const { data, error } = await supabase.from("convocatorias").update(cambios).eq("edicion", EDICION).select().single()
    if (error) setMsg("❌ " + error.message)
    else { onConv(data as Conv); setMsg("✓ Convocatoria actualizada") }
  }

  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-slate-500">Entidades con sus 2 startups</p><p className="mt-1 text-3xl font-extrabold text-brand-700">{completas} / {ents.length}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-500">Con al menos 1</p><p className="mt-1 text-3xl font-extrabold text-brand-700">{conAlguna}</p></div>
        <div className="card p-5"><p className="text-sm text-slate-500">Startups propuestas</p><p className="mt-1 text-3xl font-extrabold text-brand-700">{cands.length}</p></div>
      </div>

      <div className="card mt-4 flex flex-wrap items-end gap-3 p-4 text-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-500">Fecha límite (hora de Madrid)</label>
          <input type="datetime-local" className="input mt-1" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <button className="btn-ghost text-sm" onClick={() => guardarConv({ fecha_limite: new Date(fecha).toISOString() })}>Cambiar fecha</button>
        <button className="btn-ghost text-sm" onClick={() => guardarConv({ abierta: !conv.abierta })}>
          {conv.abierta ? "Cerrar convocatoria" : "Reabrir convocatoria"}
        </button>
        <button className="btn-primary text-sm" onClick={exportar}>Descargar CSV</button>
        <span className="text-xs text-slate-500">Estado: {abierta ? "abierta" : "cerrada"}</span>
      </div>
      {msg && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{msg}</p>}

      <div className="mt-6 flex gap-2 text-sm">
        {(["todas", "pendientes", "completas"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 font-semibold ${filtro === f ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Entidad</th><th className="p-3">Startup 1</th><th className="p-3">Startup 2</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {lista.map((e) => {
              const cs = porEnt[e.id] ?? []
              const s = (p: number) => cs.find((x) => x.posicion === p)
              return (
                <tr key={e.id} className="border-t border-slate-100 align-top">
                  <td className="p-3 font-semibold">{e.name}{e.status !== "published" && <span className="ml-2 text-xs font-normal text-slate-400">(borrador)</span>}</td>
                  {[1, 2].map((p) => (
                    <td key={p} className="p-3">
                      {s(p) ? <><p className="font-medium">{s(p)!.startup_nombre}</p>{s(p)!.motivo && <p className="line-clamp-2 text-xs text-slate-500">{s(p)!.motivo}</p>}</>
                        : <span className="text-xs text-amber-600">Pendiente</span>}
                    </td>
                  ))}
                  <td className="p-3 text-right">
                    <button className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setSel(sel === e.id ? "" : e.id)}>
                      {sel === e.id ? "Cerrar" : "Editar"}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sel && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold">Editando: {ents.find((e) => e.id === sel)?.name}</p>
          <p className="text-xs text-slate-500">Como superadmin puedes registrar o corregir las candidaturas que te lleguen por otros canales, aunque el plazo esté cerrado.</p>
          <FormEntidad entityId={sel} editable admin onGuardado={cargar} />
        </div>
      )}
    </div>
  )
}
