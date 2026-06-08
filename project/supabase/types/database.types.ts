// Tipos generados desde Supabase (project rsitqcrnuiglogtxljls).
// Regenerar: supabase gen types typescript --project-id rsitqcrnuiglogtxljls
// NO editar a mano.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      entities: {
        Row: {
          category_id: string | null; cover_url: string | null; created_at: string
          created_by: string | null; email: string | null; history: string | null
          id: string; is_featured: boolean; linkedin: string | null
          location_city: string | null; logo_url: string | null; long_description: string | null
          name: string; phone: string | null; short_description: string | null
          slug: string; sort_order: number; status: Database["public"]["Enums"]["entity_status"]
          updated_at: string; website: string | null; whatsapp: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["entities"]["Row"]> & { name: string; slug: string }
        Update: Partial<Database["public"]["Tables"]["entities"]["Row"]>
        Relationships: []
      }
      entity_categories: {
        Row: { created_at: string; description: string | null; icon: string | null; id: string; name: string; slug: string; sort_order: number }
        Insert: { name: string; slug: string; description?: string | null; icon?: string | null; sort_order?: number }
        Update: Partial<Database["public"]["Tables"]["entity_categories"]["Row"]>
        Relationships: []
      }
      startup_stages: {
        Row: { created_at: string; description: string | null; funding_max: number | null; funding_min: number | null; id: string; name: string; slug: string; sort_order: number }
        Insert: { name: string; slug: string; description?: string | null; funding_min?: number | null; funding_max?: number | null; sort_order?: number }
        Update: Partial<Database["public"]["Tables"]["startup_stages"]["Row"]>
        Relationships: []
      }
      tags: {
        Row: { created_at: string; id: string; is_admin_only: boolean; kind: string; name: string; slug: string }
        Insert: { name: string; slug: string; kind?: string; is_admin_only?: boolean }
        Update: Partial<Database["public"]["Tables"]["tags"]["Row"]>
        Relationships: []
      }
      entity_private: {
        Row: { admin_notes: string | null; entity_id: string; hidden_description: string | null; updated_at: string }
        Insert: { entity_id: string; admin_notes?: string | null; hidden_description?: string | null }
        Update: Partial<Database["public"]["Tables"]["entity_private"]["Row"]>
        Relationships: []
      }
      entity_admin_tags: { Row: { entity_id: string; tag_id: string }; Insert: { entity_id: string; tag_id: string }; Update: Partial<{ entity_id: string; tag_id: string }>; Relationships: [] }
      entity_tags: { Row: { entity_id: string; tag_id: string }; Insert: { entity_id: string; tag_id: string }; Update: Partial<{ entity_id: string; tag_id: string }>; Relationships: [] }
      entity_stages: { Row: { entity_id: string; stage_id: string }; Insert: { entity_id: string; stage_id: string }; Update: Partial<{ entity_id: string; stage_id: string }>; Relationships: [] }
      entity_success_cases: {
        Row: { created_at: string; description: string | null; entity_id: string; id: string; image_url: string | null; sort_order: number; startup_name: string | null; title: string; url: string | null }
        Insert: { entity_id: string; title: string; description?: string | null; image_url?: string | null; startup_name?: string | null; url?: string | null; sort_order?: number }
        Update: Partial<Database["public"]["Tables"]["entity_success_cases"]["Row"]>
        Relationships: []
      }
      entity_seeking: {
        Row: { created_at: string; description: string; entity_id: string; id: string; sort_order: number; type: Database["public"]["Enums"]["seeking_type"] }
        Insert: { entity_id: string; description: string; type: Database["public"]["Enums"]["seeking_type"]; sort_order?: number }
        Update: Partial<Database["public"]["Tables"]["entity_seeking"]["Row"]>
        Relationships: []
      }
      programs: {
        Row: {
          benefits: string | null; created_at: string; cta_label: string | null; cta_url: string | null
          entity_id: string; id: string; is_featured: boolean; is_free: boolean | null
          long_description: string | null; name: string; needs_funding: boolean | null; photo_url: string | null
          short_description: string | null; slug: string; sort_order: number
          status: Database["public"]["Enums"]["program_status"]; updated_at: string
        }
        Insert: { entity_id: string; name: string; slug: string } & Partial<Database["public"]["Tables"]["programs"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["programs"]["Row"]>
        Relationships: []
      }
      program_stages: { Row: { program_id: string; stage_id: string }; Insert: { program_id: string; stage_id: string }; Update: Partial<{ program_id: string; stage_id: string }>; Relationships: [] }
      program_tags: { Row: { program_id: string; tag_id: string }; Insert: { program_id: string; tag_id: string }; Update: Partial<{ program_id: string; tag_id: string }>; Relationships: [] }
      onboarding_questions: {
        Row: { created_at: string; help_text: string | null; id: string; input_type: Database["public"]["Enums"]["question_input"]; is_active: boolean; is_required: boolean; prompt: string; sort_order: number; step: number }
        Insert: { prompt: string } & Partial<Database["public"]["Tables"]["onboarding_questions"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["onboarding_questions"]["Row"]>
        Relationships: []
      }
      onboarding_options: {
        Row: { created_at: string; icon: string | null; id: string; label: string; maps_to_stage_id: string | null; maps_to_tag_id: string | null; question_id: string; sort_order: number; value: string | null }
        Insert: { question_id: string; label: string } & Partial<Database["public"]["Tables"]["onboarding_options"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["onboarding_options"]["Row"]>
        Relationships: []
      }
      leads: {
        Row: {
          consent: boolean; contact_name: string | null; created_at: string; email: string | null
          has_funding: boolean | null; has_idea: boolean | null; has_validated: boolean | null; id: string
          in_funding_round: boolean | null; is_incorporated: boolean | null; location_city: string | null
          location_country: string | null; location_region: string | null; needs_investment: boolean | null
          needs_liquidity: boolean | null; origin: string | null; paying_customers: number | null
          phone: string | null; project_name: string | null; raw_answers: Json; revenue_band: string | null
          social_impact: boolean | null; stage_id: string | null; status: Database["public"]["Enums"]["lead_status"]
          updated_at: string; whatsapp: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>
        Relationships: []
      }
      lead_responses: {
        Row: { created_at: string; id: string; lead_id: string; number_value: number | null; option_id: string | null; question_id: string | null; text_value: string | null }
        Insert: { lead_id: string } & Partial<Database["public"]["Tables"]["lead_responses"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["lead_responses"]["Row"]>
        Relationships: []
      }
      lead_tags: { Row: { lead_id: string; tag_id: string }; Insert: { lead_id: string; tag_id: string }; Update: Partial<{ lead_id: string; tag_id: string }>; Relationships: [] }
      lead_suggestions: {
        Row: { created_at: string; entity_id: string | null; id: string; lead_id: string; program_id: string | null; reason: string | null; score: number | null; source: string }
        Insert: { lead_id: string } & Partial<Database["public"]["Tables"]["lead_suggestions"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["lead_suggestions"]["Row"]>
        Relationships: []
      }
      lead_interests: {
        Row: { created_at: string; entity_id: string | null; id: string; lead_id: string; program_id: string | null }
        Insert: { lead_id: string } & Partial<Database["public"]["Tables"]["lead_interests"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["lead_interests"]["Row"]>
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null; body: string | null; cover_url: string | null; created_at: string
          entity_id: string | null; excerpt: string | null; id: string; published_at: string | null
          published_social: boolean; send_newsletter: boolean; slug: string
          status: Database["public"]["Enums"]["post_status"]; title: string; updated_at: string; views: number
        }
        Insert: { title: string; slug: string } & Partial<Database["public"]["Tables"]["posts"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>
        Relationships: []
      }
      post_tags: { Row: { post_id: string; tag_id: string }; Insert: { post_id: string; tag_id: string }; Update: Partial<{ post_id: string; tag_id: string }>; Relationships: [] }
      newsletter_subscribers: {
        Row: { created_at: string; email: string; id: string; is_active: boolean; name: string | null; source: string | null }
        Insert: { email: string; name?: string | null; source?: string | null; is_active?: boolean }
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Row"]>
        Relationships: []
      }
      profiles: {
        Row: { avatar_url: string | null; created_at: string; entity_id: string | null; full_name: string | null; id: string; phone: string | null; role: Database["public"]["Enums"]["user_role"]; updated_at: string }
        Insert: { id: string } & Partial<Database["public"]["Tables"]["profiles"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>
        Relationships: []
      }
    }
    Enums: {
      user_role: "superadmin" | "entity_admin" | "editor"
      entity_status: "draft" | "published" | "archived"
      program_status: "draft" | "published" | "archived"
      post_status: "draft" | "pending" | "published" | "archived"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "discarded"
      seeking_type: "seeks" | "helps" | "not_interested"
      question_input: "single_select" | "multi_select" | "text" | "number" | "email" | "phone" | "boolean"
    }
  }
}
