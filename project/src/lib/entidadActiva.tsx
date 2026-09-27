import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import { useAuth } from "./auth"

const CLAVE = "msn_admin_entidad"
type Ent = { id: string; name: string; status: string }

/** Entidad sobre la que se trabaja. Entidad: la suya. Superadmin: la que elija (se recuerda). */
export function useEntidadActiva() {
  const { profile, isSuperadmin, loading } = useAuth()
  const [entityId, setId] = useState<string | null>(null)
  const [lista, setLista] = useState<Ent[]>([])

  useEffect(() => {
    if (loading) return
    if (!isSuperadmin) { setId(profile?.entity_id ?? null); return }
    supabase.from("entities").select("id,name,status").order("name").then(({ data }) => {
      const l = ((data ?? []) as Ent[])
      setLista(l)
      let guardada: string | null = null
      try { guardada = localStorage.getItem(CLAVE) } catch { /* sin storage */ }
      const valida = l.find((e) => e.id === guardada)
      setId(valida ? valida.id : l[0]?.id ?? null)
    })
  }, [loading, isSuperadmin, profile?.entity_id])

  function elegir(id: string) {
    setId(id)
    try { localStorage.setItem(CLAVE, id) } catch { /* sin storage */ }
  }
  return { entityId, elegir, lista, isSuperadmin }
}

export function SelectorEntidad({ entityId, elegir, lista }: { entityId: string | null; elegir: (id: string) => void; lista: Ent[] }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
      <span className="font-semibold text-amber-800">Superadmin · editando la entidad:</span>
      <select className="input py-1.5" value={entityId ?? ""} onChange={(e) => elegir(e.target.value)}>
        {lista.map((e) => <option key={e.id} value={e.id}>{e.name}{e.status !== "published" ? " (borrador)" : ""}</option>)}
      </select>
    </div>
  )
}
