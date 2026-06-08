# Málaga Startup Network — Arquitectura

> Documento vivo. Última actualización: 8 de junio de 2026.
> Estado del proyecto: **backend (BD + seguridad) montado**. Frontend y conexión con Lovable/Git/Plesk pendientes de credenciales.

---

## 1. Visión

Punto de entrada único para startups, pymes y autónomos en cualquier estadio. El usuario llega, se
identifica en pocos pasos (onboarding) y la plataforma le muestra **qué programas y entidades de
Málaga Startup Network (MSN) encajan mejor con su momento**. Toda interacción acaba en base de datos
para consulta y cierra con un contacto (WhatsApp/email) y una CTA.

Tres grandes bloques:

1. **Front público** — home + onboarding + matching con IA + directorio de entidades + blog/noticias.
2. **Backoffice** — cada entidad gestiona su perfil, programas, casos de éxito y publica en el blog.
3. **Superadmin** — estadísticas, gestión global, y los campos *secretos* (descripción oculta y
   etiquetas especiales) que alimentan el matching con IA sin que la empresa los rellene.

---

## 2. Stack tecnológico

| Capa | Tecnología | Motivo |
|------|------------|--------|
| Base de datos | **Supabase (PostgreSQL)** plan gratuito | 0 €, Postgres estándar (portable), RLS, Auth y Storage incluidos. Open-source: autoalojable en el VPS de Digital Ocean cuando interese, sin reescribir nada. |
| Autenticación | **Supabase Auth** | Login de entidades y superadmin. Roles vía tabla `profiles`. |
| Almacenamiento | **Supabase Storage** | Logos, fotos de programas, portadas de blog. |
| Lógica de servidor | **Supabase Edge Functions** (Deno/TypeScript) | Matching IA, envío de WhatsApp/email, webhooks. Versionado en Git, **sin dependencia de Lovable**. |
| Frontend | **React + Vite + Tailwind** (formato que produce Lovable) | Lovable diseña el "caparazón" estético; la lógica (cliente Supabase, flujos) la mantiene Claude. |
| Matching IA | Edge Function → LLM | Combina info pública de la entidad + descripción oculta + etiquetas de superadmin. |
| Email / Newsletter | MailerLite (MCP conectado) o SMTP | Newsletter y notificaciones. |
| Hosting front | **Plesk** en VPS propio → subdominio `malaga-startup-network.rockandchange.es` | Despliegue del build estático. No tocar el resto de proyectos del VPS. |
| Automatizaciones opcionales | **n8n** (`n8n.n8nrock.com`) | Solo si conviene orquestar visualmente (p. ej. publicación en redes del blog). |

**Principio rector:** ningún edge function ni lógica crítica queda alojada en Lovable. Lovable es
solo el editor visual del front; el build se despliega en nuestro servidor y todo el "back" vive en
Supabase/VPS.

---

## 3. Proyecto Supabase

- **Nombre:** `malaga-startup-network`
- **Project ref:** `rsitqcrnuiglogtxljls`
- **Región:** `eu-west-3` (París, la más cercana a Málaga con buena latencia)
- **URL API:** `https://rsitqcrnuiglogtxljls.supabase.co`
- **Coste:** 0 €/mes (free tier)

Las claves (anon/publishable) están en `docs/CREDENCIALES.md` (no subir a Git público).

---

## 4. Modelo de datos

El esquema completo está en `supabase/migrations/`. Resumen por dominios:

### 4.1 Taxonomías (referencia, lectura pública)
- `entity_categories` — Públicas, Academia, Privadas, Inversión, Startups, Mentores.
- `startup_stages` — Pre-Seed, Seed, Serie A, Serie B+, Late/Scale-up (con tramos de financiación).
- `tags` — etiquetas para matching: `kind` ∈ situación / necesidad / sector / impacto. Las marcadas
  `is_admin_only` no se muestran en público.

### 4.2 Entidades (miembros de MSN)
- `entities` — datos públicos: logo, portada, web, contacto, WhatsApp, descripciones, historia, estado
  (`draft`/`published`).
- `entity_private` — **tabla separada y secreta**: `hidden_description` y `admin_notes`. Solo accesible
  por superadmin. Vive aparte porque RLS es por fila, no por columna: así la descripción oculta nunca
  puede filtrarse al público aunque alguien consulte la entidad.
- `entity_admin_tags` — etiquetas secretas que pone el superadmin (también solo-superadmin).
- `entity_tags` / `entity_stages` — asociaciones públicas (sectores y fases que apoya).
- `entity_success_cases` — casos de éxito (startups acompañadas).
- `entity_seeking` — a quién busca / a quién puede ayudar / a quién no le interesa (`seeking_type`).

### 4.3 Programas
- `programs` — lo que ofrece cada entidad: foto, descripciones, beneficios, CTA.
- `program_stages` / `program_tags` — criterios de matching (a qué fase y necesidades aplica).

### 4.4 Onboarding y leads (el embudo)
- `onboarding_questions` / `onboarding_options` — **onboarding configurable desde el backoffice**, sin
  tocar código. Cada opción puede mapear a una `tag` y/o a un `stage`, lo que rellena automáticamente el
  perfil del lead para el matching.
- `leads` — la startup/founder que entra. Campos estructurados para estadística (fase, ubicación,
  tiene idea, tiene financiación, validó, nº clientes que pagan, factura, constituida, impacto social,
  necesita inversión/liquidez, en ronda) + `raw_answers` (JSONB) para el paso conversacional.
- `lead_responses` / `lead_tags` — respuestas granulares y etiquetas inferidas.
- `lead_suggestions` — lo que el motor de IA propuso (programa, score, motivo).
- `lead_interests` — lo que el lead realmente eligió de las sugerencias.

### 4.5 Blog / Noticias
- `posts` — entradas de los miembros de MSN. Estado `draft`/`pending`/`published`. Flags
  `send_newsletter` y `published_social` para alimentar newsletter y redes.
- `post_tags`.
- `newsletter_subscribers`.

### 4.6 Usuarios y roles
- `profiles` (1:1 con `auth.users`) — `role` ∈ `superadmin` / `entity_admin` / `editor`, y `entity_id`
  para vincular al usuario con su entidad. Se crea automáticamente al registrarse (trigger). Un trigger
  de guarda impide que un usuario se auto-ascienda de rol.

---

## 5. Seguridad (RLS)

Row Level Security activado en **todas** las tablas. Resumen del modelo:

- **Lectura pública** de lo publicado: entidades/programas/posts con `status='published'`, taxonomías y
  configuración del onboarding.
- **Embudo público:** anónimos pueden *insertar* leads, respuestas, intereses y suscripciones de
  newsletter, pero **no pueden leerlos**. Solo el staff (autenticado) lee leads.
- **Propiedad por entidad:** un `entity_admin` solo edita su propia entidad, sus programas, casos,
  posts, etc. (función `owns_entity`).
- **Campos secretos:** `entity_private` y `entity_admin_tags` son **solo superadmin**. Ni siquiera la
  propia entidad ve su descripción oculta.
- **Servicio de IA:** la Edge Function de matching usa la *service role key* (salta RLS) para leer info
  pública + secreta y calcular sugerencias.

Hardening aplicado: `search_path` fijado en funciones, extensión `unaccent` fuera de `public`, y
funciones internas con grants mínimos. Los avisos restantes (INSERT anónimo en el embudo) son
intencionados y propios de un formulario público.

---

## 6. Matching con IA (diseño)

Flujo previsto (Edge Function `match-programs`):

1. El front crea el `lead` y sus `lead_responses`/`lead_tags` (onboarding).
2. Llama a la Edge Function con el `lead_id`.
3. La función (service role) recupera: tags y fase del lead + todos los programas publicados con sus
   `program_tags`/`program_stages` + la info de cada entidad **incluida su `hidden_description` y
   `entity_admin_tags`**.
4. Pre-filtra por reglas (fase y necesidades) y pasa los candidatos al LLM, que puntúa y explica el
   encaje (`score` + `reason`).
5. Escribe en `lead_suggestions` y devuelve el top N al front para mostrarlo con foto y descripción.
6. El usuario elige 1+ → `lead_interests` → cierre con WhatsApp/email + CTA.

Alternativa: orquestar los pasos 3-5 en n8n si se prefiere edición visual. Decisión por defecto:
Edge Function (todo en nuestro stack, versionado).

---

## 7. Estadísticas (superadmin)

Indicadores sobre `leads`: nuevos registros por periodo, origen/ubicación, distribución por fase
(pre-seed/seed/…), % con impacto social, % que necesita inversión o liquidez, % en ronda, y embudo
(sugeridos → elegidos → contactados → convertidos). Se sirven como vistas/consultas y, en el front,
como panel (posible *artifact* o página del backoffice).

---

## 8. Integraciones externas y despliegue

- **Git:** repositorio del front (a crear cuando haya credenciales). Migraciones SQL versionadas en
  `supabase/migrations/`.
- **Lovable:** proyecto nuevo conectado al repo de Git. Diseña la estética del front; Claude supervisa
  y aporta la lógica. Ningún edge/función queda en Lovable.
- **Plesk / DO:** subdominio `malaga-startup-network.rockandchange.es` para el build del front. Regla:
  no tocar elementos que afecten a otros proyectos del VPS.
- **n8n / NocoDB:** disponibles en el VPS como apoyo opcional.

---

## 9. Pendiente (bloqueado por credenciales)

Para avanzar necesito en la carpeta del proyecto el archivo de credenciales con accesos a: **Git**
(proveedor + token), **Lovable**, **n8n**, **Digital Ocean** y **Plesk**; además del **logo** y el
**archivo de contexto**. Con eso puedo: crear el repo, el proyecto en Lovable, desplegar el subdominio
y conectar n8n.

Roadmap inmediato una vez desbloqueado:
1. Scaffold del front (React/Vite + cliente Supabase) y conexión a Lovable.
2. Onboarding multipaso consumiendo `onboarding_questions`.
3. Edge Function de matching IA.
4. Backoffice de entidades + panel superadmin.
5. Blog + newsletter + publicación en redes.
6. Despliegue en `malaga-startup-network.rockandchange.es`.
