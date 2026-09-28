import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type F = { id: number; created_at: string; tipo: string; texto: string; email: string | null; ruta: string | null; actor: string | null; estado: string; user_id: string | null }
const TIPOS: Record<string, string> = { error: "🐞 Error", mejora: "💡 Mejora", otro: "💬 Otro" }

export default function Feedback() {
  const [lista, setLista] = useState<F[]>([])
  const [filtro, setFiltro] = useState("abiertos")
  async function cargar() {
    const { data } = await supabase.from("feedback" as any).select("*").order("created_at", { ascending: false }).limit(300)
    setLista((data ?? []) as any)
  }
  useEffect(() => { cargar() }, [])
  async function marcar(f: F, estado: string) { await supabase.from("feedback" as any).update({ estado } as any).eq("id", f.id); cargar() }
  const vis = lista.filter((f) => filtro === "todos" || (filtro === "abiertos" ? f.estado !== "resuelto" : f.estado === "resuelto"))
  return (
    <div>
      <h1 className="text-2xl font-extrabold">Feedback de usuarios</h1>
      <p className="mt-1 text-slate-500">Lo que envían emprendedores y entidades con el botón flotante. También os llega por email.</p>
      <div className="mt-4 flex gap-2 text-sm">
        {["abiertos", "resueltos", "todos"].map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`rounded-full px-3 py-1 font-semibold ${filtro === f ? "bg-slate-800 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{f[0].toUpperCase() + f.slice(1)}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {vis.length === 0 && <div className="card p-8 text-center text-slate-500">Nada por aquí.</div>}
        {vis.map((f) => (
          <div key={f.id} className={`card p-5 ${f.estado === "resuelto" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{TIPOS[f.tipo] ?? f.tipo} · {f.actor ?? "—"}</span>
              <span>{new Date(f.created_at).toLocaleString("es-ES")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{f.texto}</p>
            <p className="mt-2 text-xs text-slate-400">{f.ruta}{f.email ? ` · ${f.email}` : ""}</p>
            <div className="mt-3 flex gap-3 text-xs font-semibold">
              {f.estado !== "resuelto" && <button onClick={() => marcar(f, "resuelto")} className="text-emerald-700 hover:underline">Marcar resuelto</button>}
              {f.estado === "resuelto" && <button onClick={() => marcar(f, "visto")} className="text-slate-600 hover:underline">Reabrir</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
