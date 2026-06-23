import { supabase } from "./supabase"

export type Option = {
  id: string; label: string; value: string | null
  maps_to_tag_id: string | null; maps_to_stage_id: string | null; sort_order: number
}
export type Question = {
  id: string; step: number; prompt: string; help_text: string | null
  input_type: "single_select" | "multi_select" | "text" | "number" | "email" | "phone" | "boolean"
  is_required: boolean; sort_order: number; options: Option[]
}
export type Answers = Record<string, { optionIds: string[]; text?: string }>
export type Contact = { contact_name: string; project_name: string; email: string; whatsapp: string; consent: boolean }
export type Suggestion = {
  program_id: string | null; entity_id: string | null; name: string; entity_name: string
  logo_url: string | null; photo_url: string | null; description: string | null; score: number; reason: string | null
  cases?: string[]; entity_slug?: string | null
}
export type Selection = {
  stageId: string | null; tagIds: string[]; values: string[]
  raw: Record<string, any>; responses: { question_id: string | null; option_id: string | null; text_value?: string }[]
}

export async function loadQuestions(): Promise<Question[]> {
  const { data: qs } = await supabase
    .from("onboarding_questions")
    .select("id,step,prompt,help_text,input_type,is_required,sort_order")
    .eq("is_active", true).order("step").order("sort_order")
  if (!qs) return []
  const { data: opts } = await supabase
    .from("onboarding_options")
    .select("id,question_id,label,value,maps_to_tag_id,maps_to_stage_id,sort_order").order("sort_order")
  return qs.map((q: any) => ({ ...q, options: (opts ?? []).filter((o: any) => o.question_id === q.id) }))
}

function structuredFromValues(values: string[]) {
  const v = new Set(values); const lead: Record<string, any> = {}
  if (v.has("idea")) lead.has_idea = true
  if (v.has("sin_fin")) lead.has_funding = false
  if (v.has("mvp")) lead.has_validated = true
  if (v.has("clientes")) { lead.paying_customers = 10; lead.has_validated = true }
  if (v.has("facturo")) lead.revenue_band = "recurrente"
  if (v.has("constituida")) lead.is_incorporated = true
  if (v.has("ronda")) { lead.in_funding_round = true; lead.needs_investment = true }
  if (v.has("impacto")) lead.social_impact = true
  if (v.has("malaga-capital")) { lead.location_city = "Málaga"; lead.location_region = "Málaga" }
  else if (v.has("malaga-provincia")) lead.location_region = "Málaga"
  else if (v.has("andalucia")) lead.location_region = "Andalucía"
  else if (v.has("espana")) lead.location_country = "España"
  else if (v.has("internacional")) lead.location_country = "Internacional"
  if (v.has("financiacion")) lead.needs_investment = true
  return lead
}

function computeSelection(questions: Question[], answers: Answers): Selection {
  const allOptions = questions.flatMap((q) => q.options)
  const selectedIds = new Set(Object.values(answers).flatMap((a) => a.optionIds))
  const selected = allOptions.filter((o) => selectedIds.has(o.id))
  const values = selected.map((o) => o.value ?? "").filter(Boolean)
  const stageId = selected.find((o) => o.maps_to_stage_id)?.maps_to_stage_id ?? null
  const tagIds = Array.from(new Set(selected.map((o) => o.maps_to_tag_id).filter(Boolean))) as string[]
  const raw: Record<string, any> = {}
  const responses: Selection["responses"] = []
  for (const q of questions) {
    const a = answers[q.id]; if (!a) continue
    if (a.text) { raw[q.prompt] = a.text; responses.push({ question_id: q.id, option_id: null, text_value: a.text }) }
    else {
      raw[q.prompt] = q.options.filter((o) => a.optionIds.includes(o.id)).map((o) => o.label)
      for (const o of q.options) if (a.optionIds.includes(o.id)) responses.push({ question_id: q.id, option_id: o.id })
    }
  }
  return { stageId, tagIds, values, raw, responses }
}

// Calcula los encajes SIN crear lead (stateless). El lead se crea al final.
export async function matchByAnswers(questions: Question[], answers: Answers): Promise<{ selection: Selection; suggestions: Suggestion[] }> {
  const selection = computeSelection(questions, answers)
  let suggestions: Suggestion[] = []
  try {
    const { data, error } = await supabase.functions.invoke("match-programs", {
      body: { tag_ids: selection.tagIds, stage_id: selection.stageId },
    })
    if (!error && data?.suggestions) suggestions = data.suggestions
  } catch { /* fallback */ }
  if (suggestions.length === 0) suggestions = await fallbackMatch()
  await attachSuccessCases(suggestions)
  return { selection, suggestions }
}

async function fallbackMatch(): Promise<Suggestion[]> {
  const { data: programs } = await supabase
    .from("programs").select("id,name,short_description,photo_url,entity_id,entities(name,logo_url)")
    .eq("status", "published").limit(8)
  if (programs && programs.length) return programs.map((p: any) => ({
    program_id: p.id, entity_id: p.entity_id, name: p.name, entity_name: p.entities?.name ?? "",
    logo_url: p.entities?.logo_url ?? null, photo_url: p.photo_url, description: p.short_description, score: 0.5, reason: null,
  }))
  const { data: ents } = await supabase.from("entities").select("id,name,logo_url,short_description").eq("status", "published").eq("is_featured", true).limit(8)
  return (ents ?? []).map((e: any) => ({
    program_id: null, entity_id: e.id, name: e.name, entity_name: e.name,
    logo_url: e.logo_url, photo_url: null, description: e.short_description, score: 0.4, reason: null,
  }))
}

async function attachSuccessCases(suggestions: Suggestion[]) {
  const entityIds = Array.from(new Set(suggestions.map((s) => s.entity_id).filter(Boolean))) as string[]
  if (!entityIds.length) return
  const { data } = await supabase.from("entity_success_cases").select("entity_id,title").in("entity_id", entityIds).order("sort_order")
  const byEntity: Record<string, string[]> = {}
  for (const c of data ?? []) { (byEntity[(c as any).entity_id] ??= []).push((c as any).title) }
  for (const s of suggestions) if (s.entity_id) s.cases = (byEntity[s.entity_id] ?? []).slice(0, 3)
  // Slugs para enlazar cada tarjeta a la ficha de la entidad
  const { data: ents } = await supabase.from("entities").select("id,slug").in("id", entityIds)
  const slugById: Record<string, string> = {}
  for (const e of ents ?? []) slugById[(e as any).id] = (e as any).slug
  for (const s of suggestions) if (s.entity_id) s.entity_slug = slugById[s.entity_id] ?? null
}

// Crea el lead UNA sola vez con todo (anon puede INSERTAR, no actualizar).
export async function submitLead(selection: Selection, contact: Contact, picks: Suggestion[]) {
  const leadId = crypto.randomUUID()
  const { error } = await supabase.from("leads").insert({
    id: leadId,
    contact_name: contact.contact_name || null,
    project_name: contact.project_name || null,
    email: contact.email || null,
    whatsapp: contact.whatsapp || null,
    consent: contact.consent,
    stage_id: selection.stageId,
    raw_answers: selection.raw,
    status: picks.length ? "qualified" : "new",
    ...structuredFromValues(selection.values),
  })
  if (error) throw new Error(error.message)

  if (selection.responses.length)
    await supabase.from("lead_responses").insert(selection.responses.map((r) => ({ lead_id: leadId, ...r })))
  if (selection.tagIds.length)
    await supabase.from("lead_tags").insert(selection.tagIds.map((tag_id) => ({ lead_id: leadId, tag_id })))
  if (picks.length)
    await supabase.from("lead_interests").insert(picks.map((p) => ({ lead_id: leadId, program_id: p.program_id, entity_id: p.entity_id })))
  return leadId
}
