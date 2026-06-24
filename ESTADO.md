# Estado del proyecto

## Último cambio (2026-06-24)
- **Bug fix**: El build anterior se generó sin `.env.local`, por lo que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` quedaron como `undefined` en el bundle.
- Se creó `/project/.env.local` con las credenciales del `.env.example` y se rehízo el build.
- El `index.html` raíz ahora contiene la URL real de Supabase (`rsitqcrnuiglogtxljls.supabase.co`).

## Pendiente
- Verificar en producción que la web carga y conecta con Supabase correctamente.
- El `.env.local` no está en git (correcto), pero el agente de deploy debe crearlo antes de cada build.
