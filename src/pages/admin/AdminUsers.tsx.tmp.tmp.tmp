import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [entities, setEntities] = useState<any[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  async function load() {
    const { data } = await supabase.from("profiles").select("id,full_name,role,entity_id").order("created_at")
    setUsers(data ?? [])
  }
  useEffect(() => {
    load()
    supabase.from("entities").select("id,name").order("name").then(({ data }) => setEntities(data ?? []))
  }, [])

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id)
    setMsg(error ? "Error al guardar." : "Guardado.")
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Usuarios</h1>
      <p className="mt-1 text-slate-500">Asigna a cada usuario su rol y la entidad que gestiona.</p>
      {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}

      <div className="mt-6 space-y-2">
        {users.map((u) => (
          <div key={u.id} className="card flex flex-wrap items-center gap-3 p-4">
            <span className="flex-1 font-medium">{u.full_name ?? u.id.slice(0, 8)}</span>
            <select value={u.role} onChange={(e) => update(u.id, { role: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="entity_admin">Entidad</option>
              <option value="editor">Editor</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <select value={u.entity_id ?? ""} onChange={(e) => update(u.id, { entity_id: e.target.value || null })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">— Sin entidad —</option>
              {entities.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
            </select>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">
        Para dar de alta una nueva entidad, su responsable debe registrarse y luego asignarle aquí el rol "Entidad" y su organización.
      </p>
    </div>
  )
}
