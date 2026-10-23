import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

type Ent = { id: string; name: string; logo_url: string | null; activa: boolean }

/** Muestra la entidad con la que se trabaja y permite cambiar si el usuario gestiona varias. */
export default function SelectorEntidad({ compacto = false }: { compacto?: boolean }) {
  const [ents, setEnts] = useState<Ent[]>([])
  const [cambiando, setCambiando] = useState(false)
  useEffect(() => {
    supabase.rpc("mis_entidades" as any).then(({ data }) => setEnts(((data as any) ?? []) as Ent[]))
  }, [])
  if (!ents.length) return null
  const activa = ents.find(e => e.activa) ?? ents[0]
  async function cambiar(id: string) {
    if (id === activa.id) return
    setCambiando(true)
    const { error } = await supabase.rpc("cambiar_entidad" as any, { eid: id } as any)
    if (error) { setCambiando(false); alert("No se pudo cambiar de entidad."); return }
    const base = String(import.meta.env.VITE_BASENAME || "").replace(/\/$/, "")
    window.location.assign(base + "/admin")
  }
  if (ents.length === 1) {
    return compacto ? null : (
      <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Entidad<b className="block truncate text-sm text-[#2C3959]">{activa.name}</b></div>
    )
  }
  return (
    <label className={compacto ? "flex shrink-0 items-center gap-1 text-xs text-slate-500" : "mb-4 block rounded-lg border border-[#4A5D8A]/30 bg-[#4A5D8A]/5 px-3 py-2 text-xs font-semibold text-[#4A5D8A]"}>
      {!compacto && <span className="mb-1 block">Estás gestionando</span>}
      <select value={activa.id} disabled={cambiando} onChange={e => cambiar(e.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-semibold text-[#2C3959]">
        {ents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      {cambiando && <span className="mt-1 block font-normal">Cambiando…</span>}
    </label>
  )
}
