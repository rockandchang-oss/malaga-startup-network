# Despliegue — malaga-startup-network.rockandchange.es (Plesk)

Objetivo: publicar el front (build estático de Vite) en un subdominio del Plesk de
rockandchange.es, sin afectar a los demás proyectos del servidor.

## 0. Aviso de cuota
El servidor Plesk está al ~113% de cuota de disco (40.5 GB / 35 GB). El build pesa ~1-2 MB,
así que cabe, pero conviene liberar espacio o ampliar la suscripción antes para evitar errores
de escritura. NO tocar las bases de datos ni los archivos de otros dominios.

## 1. Crear el subdominio
En Plesk (hc5193.ervers.com:8443, usuario rockandch):
- Sitios web y dominios → Añadir subdominio.
- Nombre: `malaga-startup-network`  ·  Dominio padre: `rockandchange.es`.
- Document root sugerido: `malaga-startup-network.rockandchange.es` (por defecto).
- Tras crearlo, en SSL/TLS emitir un certificado Let's Encrypt para el subdominio.
- DNS: Plesk crea el registro A automáticamente (la zona de rockandchange.es se gestiona aquí
  y se sincroniza a los secundarios nsprimario). Verificar que resuelve a la IP del servidor.

## 2. Generar el build
En local (o donde se tenga Node 18+), dentro de la carpeta del proyecto:
```bash
npm install
cp .env.example .env.local   # ya trae la URL y la clave pública de Supabase
npm run build                # genera dist/
```
El `dist/` resultante incluye `index.html`, `assets/`, `logo-MSN.jpg` y `.htaccess` (routing SPA).

## 3. Subir el build
Subir TODO el contenido de `dist/` al document root del subdominio mediante el
Administrador de archivos de Plesk o FTP (usuario rockandch). El `.htaccess` ya gestiona el
enrutado de la SPA (rutas como /empezar, /admin, /noticias funcionan al recargar).

## 4. Verificar
- https://malaga-startup-network.rockandchange.es carga la home.
- /empezar ejecuta el onboarding y guarda el lead (revisar en el panel superadmin).
- /admin/login permite entrar con la cuenta superadmin.

## Alternativa (Digital Ocean droplet 188.166.35.107)
El droplet ya tiene Docker + Caddy sirviendo *.n8nrock.com. Se podría servir el `dist/` con un
contenedor estático y una entrada en el Caddyfile, apuntando un subdominio. Requiere acceso SSH
con la clave privada de Isaac (no disponible desde el entorno de Claude).
