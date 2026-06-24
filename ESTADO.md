# Estado del proyecto

## Último cambio (2026-06-24)
- **Bug fix**: El build anterior se generó sin `.env.local`, por lo que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` quedaron como `undefined` en el bundle.
- Se creó `/project/.env.local` con las credenciales del `.env.example` y se rehízo el build.
- El `index.html` raíz ahora contiene la URL real de Supabase (`rsitqcrnuiglogtxljls.supabase.co`).

## Problema actual (2026-06-24 — sin resolver)
- Los commits `8ef66a7` (rebuild con vars de Supabase) y `9f4b7e7` (ESTADO.md) **están locales pero NO se han hecho push a GitHub**.
- El hosting (Plesk en `malaga-startup-network.rockandchange.es`) sigue sirviendo el build antiguo sin las variables.
- Este entorno no tiene credenciales de GitHub ni SSH para hacer push.

## Acción requerida por Isaac
1. `git push origin main` (desde un terminal con credenciales de GitHub).
2. Si el deploy en Plesk es manual: subir el contenido de `project/dist/` al document root del subdominio via Plesk File Manager o FTP.

## Pendiente
- Verificar en producción que la web carga y conecta con Supabase correctamente tras el deploy.
- El `.env.local` no está en git (correcto), pero el agente de deploy debe crearlo antes de cada build.
