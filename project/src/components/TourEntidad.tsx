import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { registrar } from "../lib/actividad"

type Paso = { icono: string; titulo: string; texto: string; ir?: string; boton?: string }

const PASOS: Paso[] = [
  { icono: "👋", titulo: "Bienvenidos al panel de Málaga Startup Network",
    texto: "Desde aquí gestionáis la presencia de vuestra entidad en la red. Los emprendedores responden unas preguntas en el buscador y les recomendamos los programas que encajan con su momento. En 1 minuto os enseñamos cada parte." },
  { icono: "🏢", titulo: "Mi entidad: vuestra ficha pública", ir: "/admin/entidad", boton: "Completar la ficha",
    texto: "Es lo que ven los emprendedores: logo, descripción, web, contacto… Cuanto más completa, mejor aparecéis. En Inicio os avisamos de lo que falta." },
  { icono: "🎯", titulo: "Mis programas", ir: "/admin/programas", boton: "Ver mis programas",
    texto: "Cada programa (incubación, financiación, formación…) es lo que el buscador recomienda. Marcad a qué fases y necesidades aplica para que el encaje sea bueno. Pueden ser PERMANENTES o TEMPORALES (convocatorias con plazo): los temporales desaparecen solos al pasar la fecha de cierre." },
  { icono: "🚀", titulo: "Emprendedores", ir: "/admin/emprendedores", boton: "Ver emprendedores",
    texto: "Veis todos los emprendedores de la red: en qué punto están y qué necesitan. Sus datos de contacto solo aparecen cuando OS ELIGEN a vosotros (el resto sale difuminado). Cuando alguien os elige, os llega además un EMAIL AUTOMÁTICO con sus datos para que le contactéis en las siguientes 48 h." },
  { icono: "🏆", titulo: "Candidaturas 2026", ir: "/admin/candidaturas", boton: "Proponer startups",
    texto: "Cada entidad propone 2 startups para el evento anual. Texto libre: nombre, web, contacto y por qué la proponéis. Podéis cambiarlas hasta la fecha límite." },
  { icono: "📅", titulo: "Avisos y reuniones", ir: "/admin/avisos", boton: "Ver avisos",
    texto: "Aquí publicamos las próximas reuniones de la red, plazos y avisos importantes. Los más próximos también salen en vuestro Inicio." },
  { icono: "📰", titulo: "Noticias", ir: "/admin/noticias", boton: "Escribir una noticia",
    texto: "Podéis enviar noticias de vuestra entidad (eventos, convocatorias, logros). El equipo de la red las revisa antes de publicarlas en la web." },
  { icono: "📊", titulo: "Estadísticas", ir: "/admin/estadisticas", boton: "Ver estadísticas",
    texto: "Cuántos emprendedores os sugiere el buscador, cuántos os eligen, visitas a vuestra ficha y vuestra posición frente a la media de la red." },
  { icono: "✅", titulo: "¡Listo!", ir: "/admin/entidad", boton: "Empezar por mi ficha",
    texto: "Podéis volver a verlo cuando queráis con el botón “🧭 Cómo funciona el panel” del menú. ¿Dudas? Escribid al equipo de Málaga Startup Network." },
]

export default function TourEntidad({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const p = PASOS[i]

  async function cerrar(ir?: string) {
    registrar(i === PASOS.length - 1 ? "tour_completado" : "tour_cerrado", { paso: i + 1 })
    await supabase.from("profiles").update({ tour_visto_at: new Date().toISOString() } as any).eq("id", userId)
    onClose()
    if (ir) nav(ir)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#2C3959]/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-1.5 bg-slate-100"><div className="h-full bg-[#4A5D8A] transition-all" style={{ width: `${((i + 1) / PASOS.length) * 100}%` }} /></div>
        <div className="p-7">
          <p className="text-xs font-semibold text-slate-400">Paso {i + 1} de {PASOS.length}</p>
          <div className="mt-3 text-4xl">{p.icono}</div>
          <h2 className="mt-3 text-xl font-extrabold text-[#2C3959]">{p.titulo}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{p.texto}</p>
          {p.ir && i > 0 && i < PASOS.length - 1 && (
            <a href={`${import.meta.env.VITE_BASENAME || ""}${p.ir}`} target="_blank" rel="noopener"
              title="Se abre en otra pestaña; el tour sigue aquí"
              className="mt-4 inline-block text-sm font-semibold text-[#4A5D8A] hover:underline">{p.boton} ↗</a>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-7 py-4">
          <button onClick={() => cerrar()} className="text-sm text-slate-500 hover:underline">Saltar</button>
          <div className="flex gap-2">
            {i > 0 && <button onClick={() => setI(i - 1)} className="btn-ghost px-4 py-2 text-sm">Atrás</button>}
            {i < PASOS.length - 1
              ? <button onClick={() => setI(i + 1)} className="rounded-full bg-[#4A5D8A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2C3959]">Siguiente</button>
              : <button onClick={() => cerrar(p.ir)} className="rounded-full bg-[#4A5D8A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2C3959]">{p.boton}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
