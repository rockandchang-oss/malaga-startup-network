import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  loadQuestions, matchByAnswers, submitLead,
  type Question, type Answers, type Contact, type Suggestion, type Selection,
} from "../lib/onboarding"

const WHATSAPP = import.meta.env.VITE_CONTACT_WHATSAPP as string | undefined
const EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

type Phase = "questions" | "matching" | "suggestions" | "contact" | "done"

export default function Onboarding() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loadingQ, setLoadingQ] = useState(true)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [phase, setPhase] = useState<Phase>("questions")
  const [selection, setSelection] = useState<Selection | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [picks, setPicks] = useState<Set<number>>(new Set())
  const [contact, setContact] = useState<Contact>({ contact_name: "", project_name: "", email: "", whatsapp: "", consent: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadQuestions().then((qs) => { setQuestions(qs); setLoadingQ(false) }) }, [])

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
    } catch (e: any) {
      setError(e.message ?? "Error al calcular tus encajes."); setPhase("questions")
    }
  }

  async function submitContact() {
    if (!selection) return
    setSubmitting(true); setError(null)
    try {
      const chosen = Array.from(picks).map((i) => suggestions[i])
      await submitLead(selection, contact, chosen)
      setPhase("done")
    } catch (e: any) { setError(e.message ?? "No se pudo enviar. Inténtalo de nuevo.") }
    finally { setSubmitting(false) }
  }

  if (loadingQ) return <div className="container-x py-32 text-center text-slate-400">Preparando tus preguntas…</div>

  // ---------- DONE ----------
  if (phase === "done") {
    const waText = encodeURIComponent("¡Hola! Vengo de Málaga Startup Network y me interesan algunos programas.")
    return (
      <div className="container-x max-w-2xl py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl">✓</div>
        <h1 className="mt-6 text-3xl font-extrabold">¡Hecho, {contact.contact_name || "emprendedor"}!</h1>
        <p className="mt-3 text-slate-600">
          Hemos avisado a las entidades que elegiste de que hay un perfil que encaja con lo que buscan. Te
          contactarán pronto. Si quieres acelerar, escríbenos:
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {WHATSAPP && <a className="btn-sun" href={`https://wa.me/${WHATSAPP}?text=${waText}`} target="_blank" rel="noreferrer">Escribir por WhatsApp</a>}
          {EMAIL && <a className="btn-ghost" href={`mailto:${EMAIL}`}>Enviar un email</a>}
        </div>
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
    return (
      <div className="container-x max-w-5xl py-12">
        <ProgressBar progress={progress} label="Tus encajes" />
        <h1 className="text-3xl font-extrabold tracking-tight">Esto es lo que encaja contigo</h1>
        <p className="mt-2 text-slate-600">
          Estas entidades y programas pueden ayudarte según tu momento. Marca de cuáles quieres recibir
          información o que te contacten — puedes elegir <b>uno o varios</b>.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {suggestions.map((s, i) => {
            const selected = picks.has(i)
            return (
              <button key={i} onClick={() => setPicks((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })}
                className={`group relative overflow-hidden rounded-2xl border text-left transition ${selected ? "border-brand-500 ring-2 ring-brand-400" : "border-slate-200 hover:border-brand-300 hover:shadow-md"}`}>
                <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600">
                  {s.photo_url && <img src={s.photo_url} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} className="h-full w-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-700/85 via-brand-600/35 to-brand-500/10" />
                  <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 shadow-sm">
                    {s.logo_url && <img src={s.logo_url} alt="" className="h-5 w-5 object-contain" />}
                    <span className="text-xs font-semibold text-slate-700">{s.entity_name}</span>
                  </div>
                  <div className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${selected ? "bg-brand-500 text-brand-950" : "bg-white/90 text-slate-400"}`}>
                    {selected ? "✓" : "+"}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold leading-snug">{s.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                  {s.reason && <p className="mt-2 text-xs font-medium text-brand-700">Por qué encaja: {s.reason}</p>}
                  {s.cases && s.cases.length > 0 && (
                    <p className="mt-2 text-[11px] leading-snug text-slate-400">
                      <span className="font-semibold text-slate-500">Casos de éxito:</span> {s.cases.join(", ")}
                    </p>
                  )}
                  <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${selected ? "bg-brand-500 text-brand-950" : "bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700"}`}>
                    {selected ? "Seleccionado" : "Quiero información"}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="text-sm text-slate-400">{picks.size} seleccionado{picks.size === 1 ? "" : "s"}</span>
          <button disabled={picks.size === 0} onClick={() => setPhase("contact")}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  // ---------- CONTACT ----------
  if (phase === "contact") {
    const canSend = contact.consent && (contact.email || contact.whatsapp)
    return (
      <div className="container-x max-w-2xl py-12">
        <ProgressBar progress={progress} label="Último paso" />
        <h1 className="text-2xl font-extrabold tracking-tight">Casi está. ¿Cómo te contactamos?</h1>
        <p className="mt-2 text-slate-500">Avisaremos a las {picks.size} entidad{picks.size === 1 ? "" : "es"} que elegiste y te enviaremos los siguientes pasos.</p>
        <div className="mt-6 space-y-4">
          <Field label="Tu nombre" value={contact.contact_name} onChange={(v) => setContact({ ...contact, contact_name: v })} />
          <Field label="Nombre del proyecto" value={contact.project_name} onChange={(v) => setContact({ ...contact, project_name: v })} />
          <Field label="Email" type="email" value={contact.email} onChange={(v) => setContact({ ...contact, email: v })} />
          <Field label="WhatsApp / teléfono" value={contact.whatsapp} onChange={(v) => setContact({ ...contact, whatsapp: v })} />
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input type="checkbox" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} className="mt-1" />
            Acepto que Málaga Startup Network y las entidades seleccionadas traten mis datos para contactarme.
          </label>
        </div>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
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
