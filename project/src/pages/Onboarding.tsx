import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  loadQuestions, matchByAnswers, submitLead,
  type Question, type Answers, type Contact, type Suggestion, type Selection,
} from "../lib/onboarding"
import { registrar } from "../lib/actividad"


type Phase = "questions" | "matching" | "suggestions" | "contact" | "done"
const CLAVE_FUNNEL = "msn_funnel_v1"

export default function Onboarding() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQ, setLoadingQ] = useState(true)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [phase, setPhase] = useState<Phase>("questions")
  const [selection, setSelection] = useState<Selection | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [picks, setPicks] = useState<Set<number>>(new Set())
  const [verMas, setVerMas] = useState(false)
  const [contact, setContact] = useState<Contact>({ contact_name: "", project_name: "", email: "", whatsapp: "", es_whatsapp: true, web: "", consent: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [restaurado, setRestaurado] = useState(false)
  useEffect(() => {
    loadQuestions().then((qs) => { setQuestions(qs); setLoadingQ(false) })
    // 1) recuperar el avance guardado (refresco, volver atras, abrir una ficha…)
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_FUNNEL) || "null")
      if (g && Date.now() - g.t < 24 * 3600 * 1000 && g.phase !== "done") {
        setStep(g.step ?? 0); setAnswers(g.answers ?? {}); setSelection(g.selection ?? null)
        setSuggestions(g.suggestions ?? []); setPicks(new Set(g.picks ?? []))
        setContact((c) => ({ ...c, ...(g.contact ?? {}), consent: false }))
        setPhase(g.phase === "matching" ? "questions" : (g.phase ?? "questions"))
      } else registrar("onboarding_inicio", undefined, true)
    } catch { registrar("onboarding_inicio", undefined, true) }
    setRestaurado(true)
  }, [])
  useEffect(() => {
    if (!restaurado) return
    try {
      if (phase === "done") localStorage.removeItem(CLAVE_FUNNEL)
      else localStorage.setItem(CLAVE_FUNNEL, JSON.stringify({ t: Date.now(), step, answers, phase, selection, suggestions, picks: Array.from(picks), contact: { ...contact, consent: false } }))
    } catch { /* sin almacenamiento */ }
  }, [restaurado, step, answers, phase, selection, suggestions, picks, contact])

  const currentQ = questions[step]
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined
  const totalSteps = questions.length + 2 // preguntas + encajes + contacto
  const stepIndex = phase === "questions" ? step : phase === "suggestions" ? questions.length : questions.length + 1
  const progress = Math.round((stepIndex / totalSteps) * 100)

  function toggleOption(q: Question, optionId: string) {
    setAnswers((prev) => {
      const existing = prev[q.id]?.optionIds ?? []
      const next = q.input_type === "single_select"
        ? [optionId]
        : existing.includes(optionId) ? existing.filter((x) => x !== optionId) : [...existing, optionId]
      return { ...prev, [q.id]: { optionIds: next } }
    })
  }

  const canNextQuestion = useMemo(() => {
    if (!currentQ) return false
    if (!currentQ.is_required) return true
    return (currentAnswer?.optionIds?.length ?? 0) > 0 || !!currentAnswer?.text
  }, [currentQ, currentAnswer])

  async function goToMatching() {
    setPhase("matching"); setError(null)
    try {
      const r = await matchByAnswers(questions, answers)
      setSelection(r.selection); setSuggestions(r.suggestions); setPhase("suggestions")
      registrar("onboarding_encajes", { n: r.suggestions.length }, true)
    } catch (e: any) {
      setError(e.message ?? "Error al calcular tus encajes."); setPhase("questions")
    }
  }

  async function submitContact() {
    if (!selection) return
    setSubmitting(true); setError(null)
    try {
      const chosen = Array.from(picks).map((i) => suggestions[i])
      await submitLead(selection, contact, chosen, suggestions.filter((s, i) => !s.extra || verMas || picks.has(i)))
      registrar("onboarding_enviado", { elegidas: chosen.length, entidades: chosen.map((c) => c.entity_id) }, true)
      setPhase("done")
    } catch (e: any) { setError(e.message ?? "No se pudo enviar. Inténtalo de nuevo.") }
    finally { setSubmitting(false) }
  }

  if (loadingQ) return <div className="container-x py-32 text-center text-slate-400">Preparando tus preguntas…</div>

  // ---------- DONE ----------
  if (phase === "done") {
    return (
      <div className="container-x max-w-2xl py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl">✓</div>
        <h1 className="mt-6 text-3xl font-extrabold">¡Hecho, {contact.contact_name || "emprendedor"}!</h1>
        <p className="mt-3 text-slate-600">
          Hemos compartido tu perfil con las entidades que elegiste. Te contactarán pronto por email o por teléfono.
        </p>
        <Link to="/entidades" className="mt-8 inline-block text-sm font-semibold text-brand-700 hover:underline">Explorar todas las entidades →</Link>
      </div>
    )
  }

  // ---------- MATCHING (loading) ----------
  if (phase === "matching") {
    return (
      <div className="container-x max-w-2xl py-32 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="mt-5 text-slate-500">Buscando los programas que mejor encajan contigo…</p>
      </div>
    )
  }

  // ---------- SUGGESTIONS ----------
  if (phase === "suggestions") {
    const showAndalucia = !!selection && selection.values.some((v) => ["malaga-capital", "malaga-provincia", "andalucia"].includes(v))
    return (
      <div className="container-x max-w-5xl py-12">
        <ProgressBar progress={progress} label="Tus encajes" />
        <h1 className="text-3xl font-extrabold tracking-tight">Programas que mejor se ajustan a tu perfil</h1>
        <p className="mt-2 text-slate-600">
          Ordenados de mayor a menor encaje con tus respuestas. <b>Pulsa en las tarjetas</b> que te interesen
          para que te contacten — puedes elegir <b>uno o varios</b>. "Más información" abre la ficha en otra pestaña.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {suggestions.map((s, i) => {
            const selected = picks.has(i)
            if (s.extra && !verMas && !selected) return null
            const toggle = () => setPicks((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })
            const href = s.entity_slug ? `/entidades/${s.entity_slug}` : null
            const header = (
              <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600">
                {s.photo_url && <img src={s.photo_url} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} className="h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-700/85 via-brand-600/35 to-brand-500/10" />
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm">
                  {s.logo_url && <img src={s.logo_url} alt="" className="h-5 w-5 object-contain" />}
                  <span className="text-xs font-semibold text-slate-700">{s.entity_name}</span>
                </div>
              </div>
            )
            const body = (
              <>
                {s.responde_rapido && <span title="Esta entidad suele contactar con las startups en pocos días" className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">⚡ Responde rápido</span>}
                <h3 className="font-bold leading-snug">{s.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                {s.reason && <p className="mt-2 text-xs font-medium text-brand-700">Por qué encaja: {s.reason}</p>}
                {s.cases && s.cases.length > 0 && (
                  <p className="mt-2 text-[11px] leading-snug text-slate-400">
                    <span className="font-semibold text-slate-500">Casos de éxito:</span> {s.cases.join(", ")}
                  </p>
                )}
              </>
            )
            return (
              <div key={i} role="button" tabIndex={0} onClick={toggle}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle() } }}
                aria-pressed={selected}
                className={`group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-2xl border text-left transition ${selected ? "border-brand-500 ring-2 ring-brand-400" : "border-slate-200 hover:border-brand-300 hover:shadow-md"}`}>
                {header}
                <button type="button" onClick={(e) => { e.stopPropagation(); toggle() }} aria-label={selected ? "Quitar selección" : "Me interesa"} title={selected ? "Quitar de mi selección" : "Añadir a mi selección para que te contacten"}
                  className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm transition ${selected ? "bg-brand-500 text-brand-950" : "bg-white text-brand-700 hover:bg-brand-50"}`}>
                  {selected ? "✓ Seleccionado" : "+ Me interesa"}
                </button>
                <div className="flex flex-1 flex-col p-5">
                  <div>{body}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggle() }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${selected ? "bg-brand-500 text-brand-950" : "bg-slate-100 text-slate-500 hover:bg-brand-100 hover:text-brand-700"}`}>
                      {selected ? "Seleccionado ✓" : "Quiero información"}
                    </button>
                    {href && <Link to={href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()} title="Se abre en una pestaña nueva; no pierdes tu selección" className="ml-auto text-xs font-semibold text-brand-700 hover:underline">Más información ↗</Link>}
                  </div>
                </div>
              </div>
            )
          })}

          {showAndalucia && (
            <Link to="/entidades/andalucia-emprende" target="_blank" rel="noopener"
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#4A5D8A]/30 bg-gradient-to-br from-[#4A5D8A] to-[#3a4a6f] text-left shadow-sm transition hover:shadow-lg">
              <div className="flex flex-1 flex-col p-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1.5 shadow-sm">
                    <img src="https://malagastartupnetwork.com/img/logos-startups/logo-AndaluciaEmprende.png" alt="Andalucía Emprende" className="h-full w-full object-contain" />
                  </span>
                  <div>
                    <p className="text-sm font-bold leading-tight">Andalucía Emprende</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">Agenda de eventos</p>
                  </div>
                </div>
                <h3 className="mt-4 text-base font-bold leading-snug">¿Quieres ver la agenda de actividades relacionadas con el emprendimiento en Andalucía?</h3>
                <p className="mt-2 text-sm text-white/80">Talleres, formación y eventos para emprender en toda la comunidad.</p>
                <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#4A5D8A] shadow-sm transition group-hover:gap-2.5">
                  Ver la agenda →
                </span>
              </div>
            </Link>
          )}
        </div>

        {!verMas && suggestions.some((s) => s.extra) && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => { setVerMas(true); registrar("onboarding_ver_mas", { n: suggestions.filter((s) => s.extra).length }, true) }}
              className="rounded-full border-2 border-brand-500 bg-white px-6 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50">
              Ver más sugerencias ({suggestions.filter((s) => s.extra).length})
            </button>
            <p className="mt-2 text-xs text-slate-400">Más programas de la red que también encajan contigo, ordenados por encaje.</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-slate-400">{picks.size} seleccionado{picks.size === 1 ? "" : "s"}</span>
          <button disabled={picks.size === 0} onClick={() => { setPhase("contact"); registrar("onboarding_contacto", { elegidas: picks.size }, true) }}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  // ---------- CONTACT ----------
  if (phase === "contact") {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim())
    const telOk = contact.whatsapp.replace(/\D/g, "").length >= 9
    const faltan = [
      !contact.contact_name.trim() && "tu nombre", !contact.project_name.trim() && "el nombre del proyecto",
      !emailOk && "un email válido", !telOk && "un teléfono válido", !contact.consent && "aceptar el tratamiento de datos",
    ].filter(Boolean) as string[]
    const canSend = faltan.length === 0
    return (
      <div className="container-x max-w-2xl py-12">
        <ProgressBar progress={progress} label="Último paso" />
        <h1 className="text-2xl font-extrabold tracking-tight">Casi está. ¿Cómo te contactamos?</h1>
        <p className="mt-2 text-slate-500">Avisaremos a las {picks.size} entidad{picks.size === 1 ? "" : "es"} que elegiste y te enviaremos los siguientes pasos.</p>
        <div className="mt-6 space-y-4">
          <Field label="Tu nombre *" value={contact.contact_name} onChange={(v) => setContact({ ...contact, contact_name: v })} />
          <Field label="Nombre del proyecto *" value={contact.project_name} onChange={(v) => setContact({ ...contact, project_name: v })} />
          <Field label="Email *" type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
          <Field label="Teléfono *" type="tel" value={contact.whatsapp} onChange={(v) => setContact({ ...contact, whatsapp: v })} />
          <Field label="Web de tu startup (opcional)" value={contact.web} onChange={(v) => setContact({ ...contact, web: v })} />
          <label className="-mt-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={contact.es_whatsapp} onChange={(e) => setContact({ ...contact, es_whatsapp: e.target.checked })} />
            Este número tiene WhatsApp (las entidades podrán escribirte por ahí)
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} className="mt-1" />
            Acepto que Málaga Startup Network y las entidades seleccionadas traten mis datos para contactarme.
          </label>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        {!canSend && <p className="mt-4 text-sm text-slate-500">Para enviar falta: {faltan.join(", ")}.</p>}
        <div className="mt-8 flex items-center justify-between">
          <button onClick={() => setPhase("suggestions")} className="text-sm font-medium text-slate-500">← Volver a los encajes</button>
          <button onClick={submitContact} disabled={!canSend || submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "Enviando…" : "Enviar y que me contacten →"}
          </button>
        </div>
      </div>
    )
  }

  // ---------- QUESTIONS ----------
  return (
    <div className="container-x max-w-2xl py-12">
      <ProgressBar progress={progress} label={`Paso ${step + 1} de ${totalSteps}`} />
      {currentQ && (
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{currentQ.prompt}</h1>
          {currentQ.help_text && <p className="mt-2 text-slate-500">{currentQ.help_text}</p>}
          <div className="mt-6 space-y-3">
            {currentQ.options.map((o) => {
              const sel = currentAnswer?.optionIds?.includes(o.id)
              return (
                <button key={o.id} onClick={() => toggleOption(currentQ, o.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-4 text-left transition ${sel ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-bold leading-none ${sel ? "border-brand-500 bg-brand-500 text-brand-950" : "border-slate-300"}`}>{sel && "✓"}</span>
                  <span className="font-medium">{o.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <div className="mt-8 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="text-sm font-medium text-slate-500 disabled:opacity-0">← Atrás</button>
        {step < questions.length - 1 ? (
          <button onClick={() => setStep((s) => s + 1)} disabled={!canNextQuestion} className="btn-primary disabled:opacity-50">Continuar →</button>
        ) : (
          <button onClick={goToMatching} disabled={!canNextQuestion} className="btn-primary disabled:opacity-50">Ver mis encajes →</button>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="mb-8">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-400">{label}</p>
    </div>
  )
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
    </label>
  )
}
