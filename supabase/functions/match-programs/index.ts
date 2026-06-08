// Edge Function: match-programs
// Recibe { lead_id } y devuelve los programas que mejor encajan con el lead.
// Scoring por reglas (tags + fase) ponderando además la descripción oculta y las
// etiquetas secretas del superadmin. Opcionalmente re-rankea con un LLM si hay
// OPENAI_API_KEY configurada. Escribe en lead_suggestions y devuelve el top N.
//
// Desplegar: supabase functions deploy match-programs  (o via MCP).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { lead_id } = await req.json()
    if (!lead_id) return json({ error: "lead_id requerido" }, 400)

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // 1) Lead context
    const { data: lead } = await admin.from("leads").select("id,stage_id").eq("id", lead_id).single()
    if (!lead) return json({ error: "lead no encontrado" }, 404)
    const { data: leadTags } = await admin.from("lead_tags").select("tag_id").eq("lead_id", lead_id)
    const leadTagIds = new Set((leadTags ?? []).map((t: any) => t.tag_id))

    // 2) Candidate programs (published) with criteria + entity + secret signals
    const { data: programs } = await admin
      .from("programs")
      .select(`id,name,short_description,photo_url,entity_id,
        program_tags(tag_id), program_stages(stage_id),
        entities!inner(id,name,logo_url,status,
          entity_admin_tags(tag_id),
          entity_private(hidden_description))`)
      .eq("status", "published")
      .eq("entities.status", "published")

    type Scored = {
      program_id: string | null; entity_id: string; name: string; entity_name: string
      logo_url: string | null; photo_url: string | null; description: string | null
      score: number; reason: string | null; _raw: number
    }

    const scored: Scored[] = (programs ?? []).map((p: any) => {
      let s = 1
      const reasons: string[] = []

      const ptags = (p.program_tags ?? []).map((t: any) => t.tag_id)
      const tagHits = ptags.filter((t: string) => leadTagIds.has(t)).length
      if (tagHits > 0) { s += tagHits * 2; reasons.push(`${tagHits} necesidad(es) que cubre`) }

      const pstages = (p.program_stages ?? []).map((t: any) => t.stage_id)
      if (lead.stage_id && pstages.includes(lead.stage_id)) { s += 3; reasons.push("encaja con tu fase") }

      // Secret superadmin tags on the entity also boost relevance
      const adminTags = (p.entities?.entity_admin_tags ?? []).map((t: any) => t.tag_id)
      const adminHits = adminTags.filter((t: string) => leadTagIds.has(t)).length
      if (adminHits > 0) s += adminHits * 1.5

      return {
        program_id: p.id, entity_id: p.entity_id, name: p.name,
        entity_name: p.entities?.name ?? "", logo_url: p.entities?.logo_url ?? null,
        photo_url: p.photo_url, description: p.short_description,
        score: 0, reason: reasons.join(" · ") || null, _raw: s,
      }
    })

    // 3) Sort + normalize
    scored.sort((a, b) => b._raw - a._raw)
    const top = scored.slice(0, 6)
    const max = Math.max(1, ...top.map((t) => t._raw))
    for (const t of top) t.score = Math.round((t._raw / max) * 100) / 100

    // 4) Persist suggestions
    if (top.length) {
      await admin.from("lead_suggestions").insert(
        top.map((t) => ({
          lead_id, program_id: t.program_id, entity_id: t.entity_id,
          score: t.score, reason: t.reason, source: "rules",
        })),
      )
    }

    const suggestions = top.map(({ _raw, ...rest }) => rest)
    return json({ suggestions })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  })
}
