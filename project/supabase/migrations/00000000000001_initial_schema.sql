-- ============================================================
-- MÁLAGA STARTUP NETWORK — Esquema inicial consolidado
-- Aplicado en Supabase project rsitqcrnuiglogtxljls (eu-west-3)
-- Migraciones 01-10. Fuente de verdad para Git.
-- ============================================================

create extension if not exists "pgcrypto";
create schema if not exists extensions;
create extension if not exists "unaccent" schema extensions;

-- ---------- ENUMS ----------
create type public.user_role as enum ('superadmin','entity_admin','editor');
create type public.entity_status as enum ('draft','published','archived');
create type public.program_status as enum ('draft','published','archived');
create type public.post_status as enum ('draft','pending','published','archived');
create type public.lead_status as enum ('new','contacted','qualified','converted','discarded');
create type public.seeking_type as enum ('seeks','helps','not_interested');
create type public.question_input as enum ('single_select','multi_select','text','number','email','phone','boolean');

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- PROFILES + auth triggers ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, avatar_url text,
  role public.user_role not null default 'entity_admin',
  entity_id uuid, phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- ROLE HELPERS ----------
create or replace function public.my_role() returns public.user_role
  language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid(); $$;
create or replace function public.is_superadmin() returns boolean
  language sql stable security definer set search_path = public as $$ select coalesce((select role='superadmin' from public.profiles where id=auth.uid()),false); $$;
create or replace function public.my_entity_id() returns uuid
  language sql stable security definer set search_path = public as $$ select entity_id from public.profiles where id = auth.uid(); $$;
create or replace function public.is_staff() returns boolean
  language sql stable security definer set search_path = public as $$ select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid()); $$;
create or replace function public.owns_entity(eid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select public.is_superadmin() or (eid is not null and eid = (select entity_id from public.profiles where id=auth.uid())); $$;

-- ---------- TAXONOMY ----------
create table public.entity_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text, icon text,
  sort_order int not null default 0, created_at timestamptz not null default now());

create table public.startup_stages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, description text,
  funding_min bigint, funding_max bigint, sort_order int not null default 0,
  created_at timestamptz not null default now());

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null,
  kind text not null default 'general', is_admin_only boolean not null default false,
  created_at timestamptz not null default now());
create index on public.tags (kind);

-- ---------- ENTITIES ----------
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null,
  category_id uuid references public.entity_categories(id) on delete set null,
  logo_url text, cover_url text, website text, email text, phone text, whatsapp text, linkedin text,
  location_city text default 'Málaga',
  short_description text, long_description text, history text,
  status public.entity_status not null default 'draft',
  is_featured boolean not null default false, sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on public.entities (category_id);
create index on public.entities (status);
create trigger trg_entities_updated before update on public.entities for each row execute function public.set_updated_at();

alter table public.profiles add constraint profiles_entity_fk
  foreign key (entity_id) references public.entities(id) on delete set null;

create table public.entity_private (
  entity_id uuid primary key references public.entities(id) on delete cascade,
  hidden_description text, admin_notes text, updated_at timestamptz not null default now());
create trigger trg_entity_private_updated before update on public.entity_private for each row execute function public.set_updated_at();

create table public.entity_admin_tags (
  entity_id uuid not null references public.entities(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (entity_id, tag_id));

create table public.entity_success_cases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  title text not null, startup_name text, description text, image_url text, url text,
  sort_order int not null default 0, created_at timestamptz not null default now());
create index on public.entity_success_cases (entity_id);

create table public.entity_seeking (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  type public.seeking_type not null, description text not null,
  sort_order int not null default 0, created_at timestamptz not null default now());
create index on public.entity_seeking (entity_id);

create table public.entity_tags (
  entity_id uuid not null references public.entities(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade, primary key (entity_id, tag_id));

create table public.entity_stages (
  entity_id uuid not null references public.entities(id) on delete cascade,
  stage_id uuid not null references public.startup_stages(id) on delete cascade, primary key (entity_id, stage_id));

-- ---------- PROGRAMS ----------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.entities(id) on delete cascade,
  slug text not null, name text not null, photo_url text,
  short_description text, long_description text, benefits text,
  cta_label text, cta_url text, needs_funding boolean, is_free boolean,
  status public.program_status not null default 'draft',
  is_featured boolean not null default false, sort_order int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (entity_id, slug));
create index on public.programs (entity_id);
create index on public.programs (status);
create trigger trg_programs_updated before update on public.programs for each row execute function public.set_updated_at();

create table public.program_stages (
  program_id uuid not null references public.programs(id) on delete cascade,
  stage_id uuid not null references public.startup_stages(id) on delete cascade, primary key (program_id, stage_id));
create table public.program_tags (
  program_id uuid not null references public.programs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade, primary key (program_id, tag_id));

-- ---------- ONBOARDING + LEADS ----------
create table public.onboarding_questions (
  id uuid primary key default gen_random_uuid(),
  step int not null default 1, prompt text not null, help_text text,
  input_type public.question_input not null default 'multi_select',
  is_required boolean not null default false, is_active boolean not null default true,
  sort_order int not null default 0, created_at timestamptz not null default now());

create table public.onboarding_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.onboarding_questions(id) on delete cascade,
  label text not null, value text, icon text,
  maps_to_tag_id uuid references public.tags(id) on delete set null,
  maps_to_stage_id uuid references public.startup_stages(id) on delete set null,
  sort_order int not null default 0, created_at timestamptz not null default now());
create index on public.onboarding_options (question_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  contact_name text, project_name text, email text, phone text, whatsapp text,
  stage_id uuid references public.startup_stages(id) on delete set null,
  location_city text, location_region text, location_country text default 'España',
  origin text, has_idea boolean, has_funding boolean, has_validated boolean,
  paying_customers int, revenue_band text, is_incorporated boolean, social_impact boolean,
  needs_investment boolean, needs_liquidity boolean, in_funding_round boolean,
  raw_answers jsonb not null default '{}'::jsonb,
  status public.lead_status not null default 'new', consent boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on public.leads (status);
create index on public.leads (stage_id);
create index on public.leads (created_at);
create trigger trg_leads_updated before update on public.leads for each row execute function public.set_updated_at();

create table public.lead_responses (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  question_id uuid references public.onboarding_questions(id) on delete set null,
  option_id uuid references public.onboarding_options(id) on delete set null,
  text_value text, number_value numeric, created_at timestamptz not null default now());
create index on public.lead_responses (lead_id);

create table public.lead_tags (
  lead_id uuid not null references public.leads(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade, primary key (lead_id, tag_id));

create table public.lead_suggestions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  score numeric, reason text, source text not null default 'ai',
  created_at timestamptz not null default now());
create index on public.lead_suggestions (lead_id);

create table public.lead_interests (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  created_at timestamptz not null default now());
create index on public.lead_interests (lead_id);

-- ---------- BLOG ----------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  slug text unique not null, title text not null, excerpt text, cover_url text, body text,
  status public.post_status not null default 'draft',
  send_newsletter boolean not null default false, published_social boolean not null default false,
  published_at timestamptz, views int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on public.posts (status);
create index on public.posts (entity_id);
create index on public.posts (published_at desc);
create trigger trg_posts_updated before update on public.posts for each row execute function public.set_updated_at();

create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade, primary key (post_id, tag_id));

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null, name text, source text default 'web',
  is_active boolean not null default true, created_at timestamptz not null default now());

-- ============================================================
-- RLS — ver migración 08 en el historial de Supabase para las políticas completas.
-- Todas las tablas tienen RLS activado. Resumen en docs/ARQUITECTURA.md §5.
-- ============================================================
