# Málaga Startup Network

Plataforma de apoyo a startups, pymes y autónomos: punto de entrada al ecosistema emprendedor de
Málaga. El usuario hace un onboarding, recibe los programas/entidades que mejor encajan con su
momento (matching con reglas + IA) y conecta por WhatsApp/email.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind. Diseño estético colaborando con Lovable.
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions). Plan gratuito.
- **Matching:** Edge Function `match-programs` (reglas por tags/fase + señales secretas del superadmin).

## Estructura
```
.
├── index.html
├── package.json
├── src/
│   ├── main.tsx               # router
│   ├── lib/supabase.ts        # cliente Supabase
│   ├── lib/onboarding.ts      # lógica del embudo + matching
│   ├── components/Layout.tsx
│   └── pages/                 # Home, Onboarding, Directory, EntityDetail, NotFound
├── supabase/
│   ├── migrations/            # esquema SQL (fuente de verdad para Git)
│   ├── functions/match-programs/  # edge function de matching
│   └── types/database.types.ts
└── docs/
    ├── ARQUITECTURA.md
    └── CREDENCIALES.md        # (no subir a Git público)
```

## Puesta en marcha (local)
```bash
npm install
cp .env.example .env.local      # rellena las claves de Supabase
npm run dev                     # http://localhost:5173
npm run build                   # build de producción en dist/
```

## Supabase
- Project ref: `rsitqcrnuiglogtxljls` · región eu-west-3 · URL https://rsitqcrnuiglogtxljls.supabase.co
- Esquema y RLS aplicados. Datos seed: 15 entidades reales, 6 categorías, 5 fases, 23 tags,
  onboarding de 3 preguntas y 8 programas de ejemplo.

## Estado
- [x] Backend: esquema, RLS, seed, edge function de matching (desplegada), storage.
- [x] Inteligencia de matching: descripción oculta + etiquetas secretas (dossier de contexto).
- [x] Frontend público: home, directorio, ficha de entidad, onboarding completo, blog/noticias.
- [x] Backoffice de entidades: perfil, casos de éxito, perfiles buscados, programas, noticias.
- [x] Superadmin: leads, estadísticas, gestión de campos secretos, usuarios.
- [ ] Conexión a Lovable (estética) — pendiente (requiere navegador).
- [ ] Despliegue en `malaga-startup-network.rockandchange.es` — guía en docs/DESPLIEGUE.md.

Acceso superadmin inicial: rockandchang@gmail.com / MSNadmin2026! (cambiar al entrar).

Ver `docs/ARQUITECTURA.md` para el detalle.
