import { supabase } from "./supabase"

type Actor = "visitante" | "emprendedor" | "entidad" | "superadmin"
let actor: Actor = "visitante"
let entidad: string | null = null
let usuario: string | null = null

function sesion(): string {
  try {
    let s = sessionStorage.getItem("msn_sesion")
    if (!s) { s = (crypto.randomUUID?.() ?? String(Math.random()).slice(2) + Date.now()).replace(/-/g, ""); sessionStorage.setItem("msn_sesion", s) }
    return s
  } catch { return "sinstorage" + Date.now() }
}

/** Lo llama AuthProvider al cargar/cambiar el perfil */
export function fijarActor(perfil: { id: string; role: string; entity_id: string | null } | null) {
  if (!perfil) { actor = "visitante"; entidad = null; usuario = null; return }
  usuario = perfil.id
  actor = perfil.role === "superadmin" ? "superadmin" : "entidad"
  entidad = perfil.role === "superadmin" ? null : perfil.entity_id
}

/** Registro de comportamiento. Nunca rompe la app si falla. Sin datos personales en "detalle". */
export function registrar(evento: string, detalle?: Record<string, any>, comoEmprendedor = false) {
  try {
    const fila = {
      sesion: sesion(), evento: evento.slice(0, 40),
      actor: comoEmprendedor && actor === "visitante" ? "emprendedor" : actor,
      user_id: usuario, entity_id: entidad,
      ruta: window.location.pathname.slice(0, 200), detalle: detalle ?? null,
    }
    supabase.from("actividad" as any).insert(fila as any).then(() => {}, () => {})
  } catch { /* nunca bloquear */ }
}
