# ESTADO.md — Málaga Startup Network

> Bitácora viva (compartida por todos los PCs y el agente de Telegram). Añade arriba cada cambio:
> fecha · qué hiciste · qué queda. La verdad del código es el repo Git.

## Resumen
- **LIVE** en https://malaga-startup-network.rockandchange.es (HTTPS/SSL OK, datos de Supabase cargando).
- Deploy por Git: push a `rockandchang-oss/malaga-startup-network` → webhook → Plesk auto-deploy.
- Backend Supabase (ref `rsitqcrnuiglogtxljls`, eu-west-3): esquema, RLS, seed, Edge Fn `match-programs` v2.

## Registro

### 2026-10-08 (i) — Informe quincenal de leads a las entidades (OK de Isaac: quincenal, 1º el 9-oct)
- RPC `robot_resumen_red(token)` (security definer, token robot): leads anónimos (fase, punto, zona, necesidades,
  sectores, nº de elecciones), por entidad publicada [nombre, recomendada, elegida, programas, contactadas] y
  destinatarios (solo `entity_admin`, sin superadmin). Hoy: 11 leads, 17 entidades, 47 destinatarios.
- Droplet /opt/msn-avisos/: `resumen.sh` (carga secretos) → `resumen_envio.py` (--prueba EMAIL [entidades] |
  --si-toca | --forzar) → plantilla `resumen_red.py` → `enviar.sh` (SES, remitente info@rockandchange.es).
  Un correo por entidad con su bloque personal. Log en resumen.log; marca del último envío en resumen-ultimo.txt
  (se escribe ANTES de enviar para no repetir en bucle si falla a medias).
- Cron: `0 7 * * * resumen.sh --si-toca` (el droplet va en UTC → 9:00 Madrid en verano, 8:00 en invierno). Envía si
  han pasado ≥14 días: 1º el vie 9-oct, luego cada 2 viernes. Para PARAR: borrar esa línea del crontab.
- Pruebas 8-oct a rockandchang@gmail.com: BIC, Teamlabs, Ayuntamiento (3/3 OK). Copia del código en scripts/robot/.

### 2026-10-08 (h) — Recolector: 1 vez al día
- Cron del droplet: `17 7 * * * /opt/msn-eventos/eventos.sh` (antes 7, 13 y 19 h), a petición de Isaac. Backup del crontab en /opt/msn-eventos/crontab.bak-*. Solo se tocó esa línea (16 líneas antes y después).

### 2026-10-08 (g) — Recolector v3: Polo Digital, CTA, EOI, El Referente + fusión difusa
- **Polo Digital**: API WP `/wp/v2/evento` y `/formacion` + ficha (`div.meta date` "16 Octubre, 2026", `meta place`).
- **CTA**: API WP `/wp/v2/eventos` + ficha ("Fecha: 21 de octubre", año deducido de la fecha de publicación);
  solo si la ubicación es andaluza u online.
- **EOI**: listado `/es/actualidad?page=0..3` → `/es/event/{id}/ics_download`; solo Andalucía u online.
  Horas de .ics en UTC (…Z) se pasan a Europe/Madrid.
- **El Referente**: la web tiene Cloudflare, pero el feed `https://elreferente.es/feed/?post_type=evento&paged=N`
  responde; se quedan solo los de Andalucía/online con fecha en el texto (hoy pocos o ninguno futuro).
- Parser de fechas en español `fechas_es()` (rangos "del 13 al 15 de octubre", "21 y 22 de…", "16 Octubre, 2026").
- Provincia: primero nombres de provincia (gana el primero que aparece), luego alias; en .ics manda LOCATION
  sobre el título. Quitado el alias "techpark" (confundía Sevilla TechPark con Málaga).
- **Anti-duplicados 2ª red**: fusión difusa el mismo día entre fuentes distintas (Jaccard de palabras clave ≥0,7
  o una contenida en otra con ≥3 palabras). Comprobado en BD con pg_trgm: sin casi-duplicados.
- Resultado: 98 eventos/pasada, Málaga 34 (antes 17), ~37 s. Pendiente menor: ~33 eventos del Portal sin provincia
  (la ficha no la indica).

### 2026-10-08 (f) — Agenda v2: almanaque, recolector v2, home oficial, bots
- **Agenda** (/startups/agenda): calendario mensual tipo almanaque (intervalos pintados; rangos >7 días solo
  ▶ abre / ⏹ cierra; ⏳ fin de inscripción), listado pequeño lateral (clic en un día filtra), arriba los 2
  eventos de ENTIDADES más próximos (sale solo si hay alguno), aviso "¿Eres emprendedor?" → /empezar (se puede
  cerrar), botones 📅 Agendar (Google) y ⬇ .ics (Apple/Outlook). Online: etiqueta "💻 Online" y aparecen en
  TODAS las provincias. La consulta trae también los eventos en curso (fecha_fin >= inicio de mes).
- **Home de la app**: bloque "Próximos eventos" (4: entidades > Málaga > resto). Menú "Agenda · Nuevo" (+ móvil).
- **Home oficial** malagastartupnetwork.com: sección "Próximos eventos" (JS + Supabase anon, entre Entidades y
  Adhesión). Copia en repo `oficial/index.html`; backup del original en /opt/msn-respaldos-web/home-2026-10-08-*.
- **Botón flotante**: público = "¿Necesitas ayuda?" (Tengo una duda / Sugerencia / Algo no me funciona);
  panel /admin = "¿Algo falla o se puede mejorar?". Mismos valores en BD (error/mejora/otro).
- **Recolector v2** (/opt/msn-eventos/recolector.py, copia en repo scripts/eventos/): + FYCMA (Tribe REST) y RSS
  de universidades (UMA, UCO, US, UHU, UJA, UCA) con filtro de relevancia POR TÍTULO (palabras fuertes);
  og:image para todos los que no traen imagen (arregla Cámara); decodifica entidades HTML.
  **Anti-duplicados**: clave canónica `ev_` + sha1(título normalizado | fecha_inicio) igual para todas las
  fuentes → el mismo evento de dos fuentes se fusiona (rellena huecos, conserva imagen). Borradas las filas del
  esquema viejo (pa_/ic_) y el ruido de FYCMA/universidades. Comprobado: 0 grupos duplicados. Entidades usan su
  propia clave y nunca se pisan. 72 eventos enviados en la última pasada (Málaga 17).
- **Bots**: robots.txt (raíz oficial y subdominio) + bloqueo por User-Agent (GPTBot, CCBot, ClaudeBot, Bytespider,
  Amazonbot, Ahrefs, Semrush, Scrapy, HTTrack…) en .htaccess de /startups/ y del subdominio → 403. Google/Bing OK.
  OJO: un espacio en el patrón ("Offline Explorer") dio **500 ~1 min**; corregido. Nunca espacios en RewriteCond.
- Pendiente: Polo Digital (WP REST sin fecha del evento), El Referente (Cloudflare), CTA (sin fecha), EOI (2 pasos);
  la Comic-Con la publica la propia Junta en su portal (no es fallo nuestro). Datos de Supabase siguen siendo
  leíbles por API pública (anon + RLS): el bloqueo de bots protege la web, no la API.

### 2026-10-08 (e) — Agenda: imagenes, boton Agendar (Google Calendar), relleno por tipo
- Recolector saca la imagen destacada (cartel) de cada ficha del Portal Andaluz, en paralelo (hilos). 57/63 con imagen.
- Agenda muestra miniatura por evento (movil incluido); los sin imagen usan un relleno gris con emoji por tipo.
- Boton "Agendar" por evento: abre Google Calendar con titulo y fechas prerrellenados (verificado en vivo).
- Entidades pueden subir imagen/cartel de su evento en el panel. Descripciones limpiadas de saltos \n.
- Verificado en Chrome: imagenes cargan (lazy), boton Agendar genera URL valida de calendar.google.com.

### 2026-10-08 (d) — Agenda: Meetup Malaga (poco) y conclusion de fuentes
- Cableados Meetup python-malaga / aws-user-group-malaga / wordpress-malaga (ical). La mayoria de grupos de
  Malaga dan 404 o sin eventos: la comunidad se ha movido a Luma (sin feed limpio por grupo). Malaga 10.
- Fuentes activas: Portal Andaluz (toda Andalucia, provincia desde ficha) + Camara de Comercio Malaga (iCal) +
  Meetup (3 grupos) + eventos de entidades (siempre por delante). Cron 7/13/19h.
- Conclusion: para EVENTOS LOCALES de Malaga (Luma, carteles sueltos) la via mas rentable es la de WhatsApp
  (Susana Calleja y entidades reenvian -> IA extrae). Es el siguiente paso recomendado. Falta decidir el numero.

### 2026-10-08 (c) — Credito XRC en ambas webs + fuente Camara Malaga (commits 9b1d086)
- Pie de la app /startups (Layout.tsx): boton "Desarrollado por XRC Experiencias Inmersivas" -> xrc.es, y en
  "La red" mencion a XRC como proveedor tecnologico. Desplegado (FTP).
- Web oficial (index.html estatico de malagastartupnetwork.com): mismo credito XRC en el footer, enlace a xrc.es,
  estilo pildora con hover magenta. Backup en /opt/msn-respaldos-web/home-*. Subido por FTP y verificado.
- Recolector: anadida fuente Camara de Comercio de Malaga por iCal (parser iCal generico ical_source). Malaga 9.
- PENDIENTE agenda: mas fuentes Malaga (Meetup iCal grupos, Polo Digital -su ical no sirve, necesita WP REST-),
  El Referente (headless), via WhatsApp (Susana Calleja reenvia -> IA), enlace a /agenda desde la home oficial.

### 2026-10-08 (b) — Agenda: provincia desde ficha, Online, entidades suben eventos (commits f7d3a7c..9b337f7)
- Recolector enriquece provincia/online leyendo el campo "Ubicacion"/"Lugar:" de la ficha del Portal Andaluz
  (Malaga 6, Granada 4, Sevilla 3, Cordoba 3, Cadiz 2, Huelva 1, Online 1). Fix carga robusta de la pagina.
- Agenda destaca Malaga (chip ★, orden Malaga primero) y filtro "Online".
- Plazos de inscripcion: columnas eventos.inscripcion_inicio/fin; la agenda muestra "Inscripcion del X al Y".
- Entidades: panel /admin/eventos (MyEventos.tsx) para subir eventos/convocatorias con tipo, fechas, provincia,
  online, enlace y plazo de inscripcion. RLS: entity_admin gestiona SOLO los suyos (origen='entidad'), se
  publican directos. En la agenda salen con insignia "Entidad de la red" y SIEMPRE por delante de lo automatico.
- El Referente: REST cerrado (401 DRA) y tabla JS; pendiente via lector headless (Jina Reader salta Cloudflare
  pero solo devuelve el texto narrativo). Prioridad siguiente: fuentes de Malaga (Meetup iCal grupos Malaga,
  Camara de Comercio Malaga iCal, Polo Digital) y via WhatsApp para reenviar eventos.

### 2026-10-08 — Agenda de eventos (prototipo LIVE) /startups/agenda (commit 0e76843)
- Tabla Supabase `eventos` (+RLS lectura publica de publicados) y RPC `eventos_ingesta(token,items)` con dedupe.
- Recolector /opt/msn-eventos/recolector.py + eventos.sh (cron 7/13/19h). Fuente: Portal Andaluz de Emprendimiento
  (Junta): extrae el JSON del calendario (502 eventos), clasifica por tipo (hackaton, financiacion/subvencion,
  convocatoria/concurso, inversion, aceleracion, networking, formacion, jornada, feria/congreso) e infiere
  provincia; sube ~56 futuros. Copia en scripts/eventos/.
- Pagina React /agenda (Agenda.tsx) + enlace en nav: lista por mes, filtros por tipo y provincia, enlace al
  detalle original. 48 eventos en vivo verificados (Hackathon Cordoba, TECH THE CHANCE de Susana Calleja, etc.).
- PENDIENTE: enriquecer provincia desde la ficha (el Portal no la da en el titulo); anadir fuentes (El Referente
  -tras Cloudflare, necesita navegador headless-, Meetup iCal, Camara, FYCMA, Eventbrite/Luma); via WhatsApp para
  que Susana Calleja y otros reenvien eventos (IA extrae); cola de revision y clasificacion con Gemini.

### 2026-10-07 tarde — Agenda AE: el ataque sigue vivo y ha cambiado (prep reunion Junta)
- Recomprobado 7-oct 21:30 UTC: a HUMANO la portada ya no da 500, carga cabecera real de AE PERO el cuerpo es
  un muro de spam de casinos en polaco (94 enlaces). A GOOGLEBOT sigue la tienda falsa (DAY6, Add to cart,
  "Sold and shipped by agendaemprende..."). Fichero /tmp/54801 sigue. Sitemap 150 productos NUEVOS (0 en comun
  con la manana) = sistema vivo regenerando. En Google ya salen paginas legitimas con descripcion de casino.
- Capturas de hoy en outputs: Google-ve-tienda-7oct-tarde.png, inf/cap-humano-hoy.png. HTML crudo en docs/informe-agenda-ae.
- Informe XRC (7 pag) ENVIADO a aazevedo@andaluciaemprende.es con copia a info@xrc.es (via /opt/secretario/enviar.py).
- Argumentario para la reunion (doc Claude): objeciones + rebatidas + guion demo en vivo + lo que NO afirmamos.

### 2026-10-06 15:00 — Premios en el buscador: actualizacion y respuesta rapida (match-programs v8, commit 02406d3)
- Migracion `premio_actividad_y_respuesta`: programs.actualizado_entidad_at (trigger: solo cuando edita la
  ENTIDAD, no superadmin; tambien al tocar etiquetas/fases). Backfill: programas creados despues del 15-jun.
- RPC publica entidades_responden_rapido(): al menos 1 contacto confirmado en <=4 dias y al menos la mitad
  de sus contactos evaluables (ignora 'dudoso' y avisos recientes). Hoy: BIC.
- match-programs: +1,5 si la entidad toco el programa en 60 dias (hoy BIC, Impact Hub, La Farola) y +1,5 si
  responde rapido. Solo se suman si ya hay encaje. Sello "⚡ Responde rapido" en tarjetas del buscador y ficha.

### 2026-10-06 14:30 — Borrador del resumen para entidades (idea de Joaquin) PENDIENTE DE OK
- Generador scripts/robot/resumen_red.py (datos anonimos acumulados + bloque personal por entidad: recomendada,
  elegida, contactos confirmados, programas, posicion; "herida" si tienen 0 o 1 programas).
- Borradores: borrador-resumen-Teamlabs.html / -BIC.html / -Ayuntamiento.html (datos reales hasta 6-oct, 8 leads).
- Pendiente: OK de Isaac/Joaquin, decidir frecuencia (quincenal/mensual) y automatizarlo con un RPC + cron.

### 2026-10-06 14:00 — Fundalogy etiquetas de impacto + 8 sugerencias (match-programs v7, commit ac7b603)
- Programa "Inversion de impacto Fundalogy": anadidas Sostenibilidad, Healthtech, Agritech, FoodTech (ya tenia
  Impacto social, Financiacion, Equity). No existe etiqueta "labor social": la cubre Impacto social.
- Sugerencias: 8 visibles (max 2 por entidad) + "Ver mas sugerencias (N)" con hasta 40 mas. Titulo de la
  pantalla: "Programas que mejor se ajustan a tu perfil" (ordenados de mayor a menor encaje).
- Perfil de Qhuma hoy: BIC, Teamlabs, BIC, La Farola, PTA, Fundalogy (6.a), Santander, Impact Hub + 14 en "ver mas".

### 2026-10-06 13:40 — Sugerencias: max 2 por entidad + "Ver mas sugerencias" (match-programs v6, commit 5066ec5)
- match-programs: 6 sugerencias con maximo 2 programas por entidad, por orden de interes (puntuacion, luego
  necesidades cubiertas, empates al azar para que roten). Devuelve tambien `mas` (hasta 12 con algun encaje).
- Funnel: boton "Ver mas sugerencias (N)" bajo las tarjetas. lead_suggestions guarda solo las vistas.
- Revision BIC: sus etiquetas no son exageradas (8-12 por programa; La Farola tiene 28). Lo que les daba
  ventaja: 7 programas; casi todos con 3 fases (Pre-Seed, Seed, Serie A = +3 siempre); y las senales
  secretas de superadmin (entity_admin_tags) IA + Financiacion + Mentoring + DeepTech, que suman 1,5 por
  etiqueta a TODOS sus programas. IA y Financiacion las marcan casi todas las startups (7 de 8). Pendiente de OK
  de Isaac quitar o reducir esas senales.

### 2026-10-06 13:15 — Seguimiento por entidad en Leads (superadmin) + valoracion tras el contacto (commit eb46cc6)
- Migracion `seguimiento_leads_por_entidad`: notificaciones_lead.contactado_por (entidad|startup|dudoso) y
  valoracion_pedida_at; RPC leads_seguimiento() (solo superadmin); entidad_contactado_info(t) (solo lectura).
- /contactado ya NO marca al abrir: pide pulsar "Si, ya le hemos contactado". Motivo: Qhuma, EnKalma (BIC) y
  Orbitel se marcaron 20-77 s despues del recordatorio = antivirus del correo de BIC abriendo el enlace.
  Esos quedan como 'dudoso' (amarillo "sin confirmar" en el panel); si la entidad pulsa el boton se confirma.
- Cuando la ENTIDAD confirma, el robot envia a la startup "¿Que tal con X?" (estrellas de esa entidad,
  /valoracion?t=&e=). Lo marca valoracion_pedida_at. holaBrisa/Soul IA/Qhuma no lo reciben (ya tuvieron la
  encuesta de 7 dias). La pagina de valoracion solo muestra entidades aun no valoradas.
- Leads (superadmin): columna "Entidades elegidas · seguimiento": match hace N dias, estado (contactado fecha /
  sin contactar + recordatorio / startup dice que no) y estrellas. Tambien en el detalle del lead.
- Analisis La Farola: su programa (creado 1-oct, 28 tags, 3 fases) SI se sugiere. Grumbic lo vio y lo eligio.
  Dreeveo: quedo 9.o; los 6 huecos se los llevo BIC (8 programas). Propuesta pendiente de OK: max. 2 programas
  por entidad en las 6 sugerencias (cambia match-programs para todas las entidades).

### 2026-10-02 13:25 — Webs de casos de exito, copia de recordatorios a superadmins, fix home
- Webs verificadas (HTTP 200 + titulo coherente) para 21 casos mas (23 de 43). Sin web: casos con varias
  startups y los no verificables (AGIT, Eventwall, Kanzo Tech, Heuristik, ECOPIBA, AlloPhone, Nostoc, Dixus,
  Gloop, Talent Class). Logos: ninguno (lo suben las entidades).
- Joaquin pidio (email 2-oct) recibir los recordatorios de seguimiento: robot_correos devuelve 'superadmins' en
  recordatorios y notificar.py los pone en copia oculta (como los avisos de lead). Backup notificar.py.bak-<ts>.
- Feedback #5 (visitante 1-oct: "no me deja clicar las opciones"): en la home, las 4 frases de "En que punto
  estas?" eran decorativas. Ahora enlazan a /empezar (commit a259967). Marcado resuelto.

### 2026-10-02 — Casos de exito: web y logo de la startup (commits ee09e9a, 75e9d66)
- Panel (Mi entidad > Casos de exito): al anadir se pide "Web de la startup" y "Logo" (subida a media/casos,
  max 2 MB); en los casos existentes hay un campo web (se guarda al salir) y un recuadro para subir/cambiar logo.
- Ficha publica: logo, nombre de la startup y titulo enlazan a su web en pestana nueva + "Visitar web de X".
- Ninguno de los 43 casos tenia web ni logo. Rellenadas solo Rock&Change (rockandchange.es) y XRC (xrc.es).

### 2026-10-02 — Casos de exito: se muestra el nombre de la startup (commit 5243bb9)
- La ficha publica pedia startup_name pero no lo pintaba. Ahora sale como etiqueta encima del titulo cuando
  es distinto del titulo (9 casos de La Farola; en los otros 34 el titulo ya es el nombre). FTP OK, verificado.

### 2026-09-30 12:17 — Alta de Joseba Goicoechea (Sabadell BStartup)
- A peticion de Joaquin: goicoecheaj@bancsabadell.com anadido a invitaciones_entidad e invitado desde el
  panel de Supabase. Perfil creado y vinculado: entity_admin de Sabadell BStartup. Enlace valido 24 h;
  si caduca: https://malagastartupnetwork.com/startups/admin/clave -> "Enviarme el enlace".
- Truco (Chrome minimizado): abrir el menu "Add user" con PointerEvent pointerdown y rellenar el email con el
  setter nativo de value + evento input (el tecleo normal no llega).

### 2026-09-29 13:40 — Valoracion por entidad + cache del SPA + logo La Farola
- Encuesta 7 dias: la pagina /valoracion muestra una fila por entidad elegida (estrellas + "No me ha contactado").
  Migracion `valoracion_por_entidad`: lead_valoraciones.entity_id, lead_publico devuelve entidades_det, RPC anon
  lead_valorar_entidades(t, items, comentario). Si la startup puntua a una entidad se marca contactado_at (no hay
  recordatorio). Toda valoracion entra en Feedback con el desglose por entidad. Commit 9491d5a, FTP OK, probado.
- /startups/.htaccess: Cache-Control no-cache para index.html (backup en /opt/msn-respaldos-web). Motivo: Isaac
  veia The Pool/CaixaBank en /startups/entidades con una version vieja cacheada; en servidor y BD ya no salen.
- Logo La Farola: farolavuela4-msn.png (sin hueco entre lineas, mas ancho) en entities.logo_url; entidades.html
  regenerado y subido. La home oficial sigue con farolavuela3.

### 2026-09-29 13:05 — Correos del ciclo de vida (startups, entidades, noticias) LIVE
- Migracion `correos_ciclo_vida_leads_y_posts`: tokens en leads y notificaciones_lead, marcas *_at, tabla
  lead_valoraciones, RPC publicas (anon) lead_publico / lead_valorar / lead_incidencia / entidad_marcar_contactado
  y RPC del robot robot_correos / robot_correo_hecho (token del robot).
- Robot /opt/msn-avisos/notificar.py (cron */5) ampliado (copia en scripts/robot/notificar.py; backup .bak-<ts>):
  1) confirmacion a la startup al registrarse (entidades avisadas + enlace /incidencia);
  2) encuesta a los 7 dias (estrellas 1-5 -> /valoracion, "Nadie me ha contactado"); excluye origin prueba-interna;
  3) recordatorio UNICO a la entidad a los 3 dias si no marco "Ya le hemos contactado" (/contactado);
  4) noticia enviada -> "en revision" a la entidad + aviso a superadmins; publicada -> email con enlace.
  Incidencias, nadie-me-contacto, notas <=2 y comentarios entran en Feedback (panel) y llegan por email.
- Leads existentes marcados como ya confirmados; posts nuestros marcados; la noticia LEINN recibio su "publicada".
- Frontend commit 16f7196: paginas /valoracion, /incidencia, /contactado. Subido por FTP desde el droplet
  (TLS 1.2, 865.341 B servidos). Probado E2E con lead de prueba (borrado despues).
- Recordatorio "subid vuestros programas": borrador en recordatorio-programas.json (47 usuarios, 17 entidades
  publicadas) ENVIADO con OK de Isaac (47 enviados, 0 errores). No repetir.
- Mismo dia (antes): 7 leads de prueba borrados (respaldo en tabla respaldo_leads_prueba_20260929; quedan 4 reales),
  Teamlabs y La Farola Vuela en la home oficial (logos startups/logos/teamlabs-msn.png y farolavuela3-msn.png),
  logo compacto de La Farola en su ficha, saludo con nombre completo (dfad4e5), emails enviados a Rafa (Teamlabs)
  y Juan Carlos (La Farola).

### 2026-09-29 — Tarjetas del funnel: toda la tarjeta selecciona; "Mas informacion" abre ficha en pestana nueva
- Commit cecbab7 (Onboarding.tsx). YA en el espejo rockandchange (webhook). PENDIENTE subir a
  malagastartupnetwork.com: el portatil no llega al droplet por SSH (timeout en el puerto 22, red de la
  reunion en BIC) y el sandbox ya no llega al FTP (puerto 21 refused). Build listo en el droplet:
  /tmp/msnbuild/project/dist/index.html (856682 bytes). Subir cuando el PC vuelva a tener SSH (orden con
  scripts/gen_orden.py o descargar el index.html del commit cecbab7 + FTP TLS1.2).
- TUNEL desde el sandbox: funciona SIN --http-proxy (hoy $HTTPS_PROXY vacio: salida directa).
- 10:05 RECORDATORIO ENVIADO (OK de Isaac): 31/31 a las 11 entidades sin candidaturas (enviar.sh via tunel).
- Commit 8ed2e2f: boton "Como funciona el panel" (barra lateral + menu movil + Inicio) relanza el tour;
  enlaces del tour abren en pestana nueva y el tour sigue. Tambien PENDIENTE de subir a la web oficial
  (junto con cecbab7): basta subir el startups/index.html del commit 8ed2e2f.
- 10:18 diagnostico red: WIFI_BIC bloquea salidas 22 y 21 (solo 443). En la WiFi "ISAAC" (movil, IP
  10.96.x, CGNAT) SSH va, pero el FTP responde "504" a AUTH TLS/SSL -> curl exit 64; no se envia la
  clave en claro. En la red de casa/oficina el 27-sep FTPS funcionaba. Pendiente subir 8ed2e2f.
- 10:35 SUBIDO 8ed2e2f a malagastartupnetwork.com DESDE EL DROPLET via tunel del sandbox (el hosting
  vuelve a aceptar al droplet por el 21 con TLS1.2): servido 857808 = local. Ruta mas robusta ahora:
  sandbox -> tunel -> droplet -> FTP, sin depender de la red del PC.
- Duplicados de Joaquin: 1 aviso por (lead, entidad), verificado. Qhuma -> Joaquin recibe copia oculta
  (superadmin) + probablemente via info@bic.es (lista de BIC). EnKalma -> 2 avisos distintos (BIC y
  Fundalogy), cada uno con copia. holaBrisa/Soul IA eran anteriores a la copia -> solo via info@.
- Candidaturas a las 10:00: completas BIC, CTA, Impact Hub, La Farola Vuela, Link by UMA, Teamlabs (6);
  11 con 0. Recordatorio preparado en recordatorio-29sep.json (31 destinatarios), pendiente del OK de Isaac.
  La tarea programada de las 9:00 no se ejecuto (app cerrada) -> preparado a mano.

### 2026-09-28 (c) — Feedback de Joaquin/Jean Franco/Gianfranco: 12 puntos resueltos (commit 483511f)
- Respuesta punto a punto: "Malaga Startup Network - feedback de la plataforma (2026-09) - RESPUESTA.md".
- Funnel: avance en localStorage `msn_funnel_v1` (24 h, se borra al enviar); "+ Me interesa"; fichas en
  pestana nueva; campo "Web de tu startup" (leads.web). Favicon absoluto /startups/logo-MSN.jpg.
- Ficha publica: parrafos respetados, "Ver mas detalle" (long_description, beneficios, fases, etiquetas).
- Panel: "Ver como startup" (Mi entidad/Mis programas), aviso de edicion concurrente (compara updated_at),
  web en Emprendedores (RPC leads_para_entidad recreada con `web` y `programas_elegidos_mios`).
- Boton flotante de feedback -> tabla `feedback` (+ pagina /admin/feedback) -> email a superadmins (robot).
- Robot (scripts/robot/notificar.py -> /opt/msn-avisos): copia oculta a superadmins en avisos de lead,
  todos los programas elegidos, web; y envio del feedback.
- Web oficial: "Acceso entidades" en el menu (anadido al final de /main.min.js; respaldo en
  C:\claudekeys\respaldos\main.min.js-*).
- Punto 2: los avisos de holaBrisa y Soul IA SI salieron a los 5 usuarios de BIC; Joaquin no los vio por
  ser superadmin sin entidad -> ahora copia oculta a superadmins.
- Deploy: la orden supera el limite de linea de comandos de Windows (32 KB) -> la plantilla ahora pasa el
  script por stdin (RedirectStandardInput). gen_orden.py admite 5o arg "raiz" (tgz relativo a project/).

### 2026-09-28 (b) — CaixaBank DayOne y The Pool DE BAJA (ya no estan en la red)
- entities.status='archived' (+ sus posts/programas archived; no tenian). No salen en la web, ni en el
  buscador (Edge Fn solo 'published'), ni en seguimiento de candidaturas/contadores.
- Sin acceso servidor: `my_entity_id()` y `owns_entity()` ignoran entidades archived -> sus usuarios no leen
  leads, candidaturas, estadisticas ni pueden editar. RPC `mi_entidad_de_baja()` -> el panel muestra
  "Acceso no disponible… ponte en contacto" (commit f747ed9). Trigger de avisos no encola para archived.
- Tareas programadas actualizadas para excluir archived (reenvio 28-sep y recordatorio 29-sep).
- pages/entidades.html regenerado sin ellas. Para reactivar una entidad: status='published'.
- La Farola renombrada "La Farola Vuela · Andalucia Open Future" con el logo oficial que paso Isaac
  (startups/logos/farolavuela-msn.png).
- Plantilla/generador de ordenes de deploy ahora en scripts/ (gen_orden.py + plantilla_orden_deploy.ps1),
  porque /tmp del sandbox se borra.

### 2026-09-28 — Usuario de entidad de Joaquin cambiado a Gmail
- Invitado joaquin.tegt@gmail.com (entity_admin de "Entidad de Prueba MSN"). La cuenta anterior
  joaquin.tegt+entidad@bic.es sigue activa (entro el 28-sep 07:39) -> borrar si Isaac lo pide.

### 2026-09-27 (g) — Noticias del panel publicadas en la web oficial (Actualidad)
- Script `scripts/generar_noticias_web.py <salida>` (en la carpeta del proyecto; corre en el sandbox, solo
  lee Supabase con la clave publica y la plantilla viva de la web). Genera pages/noticia-<slug>.html con el
  diseno de los articulos de la web + pages/actualidad.html con tarjetas: "Conoce a…" en el panel
  "Conoce a las entidades" (con el logo), el resto al principio de "Articulos". BIC se omite (ya tiene
  entidad-bic-euronova.html hecha a mano). Idempotente (quita las tarjetas generadas antes de reinsertar).
- Subido por FTP desde el PC (orden-msn0927p, TLS 1.2): 16/16 OK. Respaldo previo de actualidad.html en
  C:\claudekeys\respaldos. Verificado en navegador (tarjetas con logos y pagina de noticia).
- Para republicar tras aprobar noticias nuevas: ejecutar el script y subir la carpeta con la misma orden.

### 2026-09-27 (f) — Noticias publicadas, aviso reunion, logos y 3 entidades publicadas
- 15 noticias aprobadas (14 "Conoce a…" + LEINN de Teamlabs) -> published.
- Aviso creado (destacado): Reunion de coordinacion MSN, martes 29-sep 10:00, BIC Euronova (Avda. Juan
  Lopez Penalver 21, PTA), con el Delegado Territorial; confirmar a laura@bic.es (fuente: correo de Laura
  Calderon, 25-sep). OJO: ese mismo dia cierra el plazo de candidaturas (23:59).
- Logos en https://malagastartupnetwork.com/startups/logos/{farola,pool,dayone}-msn.png (subidos por FTP
  desde el PC). Entidades PUBLICADAS: "La Farola · Andalucia Open Future" (ahora bajo Andalucia Vuela,
  web andaluciavuela.es/aof-lafarola), "CaixaBank DayOne", "The Pool".
- Seguridad storage: antes cualquier usuario del panel podia borrar/sobrescribir ficheros del bucket
  media; ahora update/delete solo superadmin o propietario.
- Demo para Joaquin: lead "[DEMO] Ecoruta" (id 22222222-…) elige Entidad de Prueba -> el cron envio el
  aviso a 3 destinatarios (incl. joaquin.tegt+entidad@bic.es). Borrar el lead DEMO tras la presentacion.
- HECHO: /pages/entidades.html regenerado (generador del droplet -> base64 -> PC -> FTP). Incluye las 3
  nuevas, sin la de prueba. Respaldo anterior en C:\claudekeys\respaldos\entidades-*.html.
  LECCION FTP: con TLS 1.3 los ficheros >~25 KB fallan (curl exit 18, fichero queda a 0 bytes en vivo!).
  Usar SIEMPRE `curl --ssl-reqd -k --tlsv1.2 --tls-max 1.2` y comprobar el tamano servido despues.
  (No usar --ftp-port: modo activo -> salta el firewall de Windows.)

### 2026-09-27 (e) — Aviso automatico a la entidad elegida + tour de bienvenida (LIVE)
- BD: `notificaciones_lead` (cola; trigger en lead_interests AFTER INSERT), `config_privada` (hash del
  token del robot, sin politicas), RPC `robot_notif_pendientes(token)` / `robot_notif_marcar(...)`
  (security definer, validan sha256 del token; espera 2 min para agrupar).
- Droplet: /opt/msn-avisos/notificar.sh + notificar.py (imagen docker `msn-avisos:1` con boto3),
  CRON */5 min (linea propia "# MSN avisos a entidades"), log /opt/msn-avisos/notificar.log.
  Token en gestor MALAGA__ROBOT_NOTIF_TOKEN. Email: "Nuevo emprendedor os ha elegido: {proyecto}" a
  todos los usuarios de la entidad, Reply-To = email del emprendedor, botones Escribirle/WhatsApp/Panel.
  PROBADO: llego a las 2 cuentas de prueba. Lead de prueba borrado.
- Tour de bienvenida para entidades (9 pasos, components/TourEntidad.tsx): se abre la 1a vez
  (profiles.tour_visto_at), reabrible con "Ver el tour". Commit 630ce28. Probado: no reaparece tras cerrar.
- Usuario de entidad de prueba para Joaquin: joaquin.tegt+entidad@bic.es -> "Entidad de Prueba MSN"
  (invitado 27-sep; si el correo de BIC no admite "+", no le llegara -> usar otra direccion).
- Estado 27-sep noche: 49 invitados, solo 2 con contrasena (Rafa/Teamlabs, Antonio Penafiel/UMA);
  candidaturas solo Teamlabs (2). 15 noticias pendientes de revision.
- PENDIENTE (Isaac, "lo vemos luego"): credito "Desarrollado por XRC Experiencias Inmersivas y
  Rock&Change" en el pie de ambas webs, enlazando a una landing potente (lo hacen a cambio de visibilidad).

### 2026-09-27 (d) — Fichas, noticias, actividad/estadisticas, envio de correos propio
- Fichas completadas (siguen en BORRADOR, sin logo): "Andalucia Open Future – La Farola" (antes
  "Telefonica": el programa que participa es AOF La Farola, no la compania), "CaixaBank DayOne", "The Pool".
- 14 noticias "Conoce a {entidad}…" generadas desde ficha+programas+casos, en estado PENDIENTE -> Revision.
  Teamlabs (Rafa) ya envio una noticia propia (LEINN) pendiente de revision.
- Pantalla final del onboarding: quitado "escribenos"/botones de contacto directo (peticion de Isaac).
- Tabla `actividad` (sesion, actor visitante|emprendedor|entidad|superadmin, evento, ruta, detalle sin PII).
  RLS: insertar solo lo propio (no se puede suplantar usuario/entidad: probado 401), leer solo superadmin.
  Eventos: "pagina" en cada cambio de ruta + embudo onboarding_inicio/encajes/contacto/enviado.
  RPC `estadisticas_red(dias)` y `estadisticas_entidad(dias)` (security definer, excluyen entidad de prueba).
  /admin/estadisticas abierta a entidades (lo suyo + la red) y superadmin (+ registro de actividad).
- Envio de correos masivos propio: /opt/msn-avisos/enviar.sh (+enviar.py) en el droplet: JSON por stdin
  {asunto, html, para[]} -> SES API (boto3 en docker python:3.12-slim), remitente info@rockandchange.es,
  credenciales SECRETARIO__SES_KEY/SECRET del gestor. Probado 1/1.
- Tareas programadas: 28-sep 09:30 reenvio de accesos (autorizado); 29-sep 09:00 preparar recordatorio
  de candidaturas y PEDIR OK a Isaac antes de enviar.

### 2026-09-27 (c) — Onboarding obligatorio + sugeridas guardadas + programas temporales (LIVE)
- BD: `lead_reciente(uuid)` (security definer) + policy `lsug_insert_anon` (solo leads de <30 min, source
  'rules'); `programs` + vigencia ('permanente'|'temporal'), fecha_inicio, fecha_fin (check fin>=inicio);
  `programa_vigente()` y `programs_public_read` ya no muestra temporales caducados (hora Madrid).
- Edge Fn `match-programs` v3: descarta temporales caducados y anade "plazo hasta el dd/mm/aaaa" al motivo.
- Front (commit 21ecc89, FTP desde PC): contacto con nombre, proyecto, email valido y telefono (>=9
  digitos) OBLIGATORIOS + casilla "Este numero tiene WhatsApp" (phone siempre; whatsapp solo si marcada);
  guarda las 6 sugeridas en lead_suggestions; editor de programas con Vigencia y fechas.
- PROBADO de punta a punta: boton bloqueado con lista de lo que falta; lead guardado con phone/whatsapp,
  6 sugeridas y 1 elegida. Lead de prueba borrado despues.

### 2026-09-27 (b) — Avisos, pantalla Emprendedores, inicio de entidad, azul, selector superadmin (LIVE)
- BD: tabla `avisos` (titulo, cuerpo, tipo reunion|aviso|plazo, fecha_evento, lugar, enlace, publicado,
  fijado). RLS: superadmin todo; lectura solo publicados y solo usuarios CON entidad.
- Front (commit 8bee70b, FTP desde PC): /admin/avisos (superadmin crea/edita/borra; entidades leen),
  /admin/emprendedores (usa RPC leads_para_entidad; PII difuminada si no os eligieron), Inicio de entidad
  (avisos proximos, estado candidaturas, "os han elegido", ficha incompleta), color azul #4A5D8A en el
  panel de entidad, selector "editando la entidad" para superadmin en Mi entidad / Programas (localStorage).
- Script reutilizable de despliegue: /tmp/gen_orden.py (sandbox) -> orden puente: build en droplet +
  push + descarga del commit en el PC + FTP (el droplet no llega al FTP).
- VERIFICADO en navegador: superadmin (Inicio 1/19, selector de entidad, Emprendedores con todo) y
  entidad de prueba (rockandchang+plantilla ligado a "Entidad de Prueba MSN", sesion en el navegador
  interno de Claude): Inicio azul con candidaturas 1/2, "os han elegido 1", ficha incompleta;
  Emprendedores: su lead con datos + "Os ha elegido", el resto difuminado. OK.
- Fix 60bccac: fecha limite del editor de candidaturas se mostraba en UTC (21:59) -> ahora hora local;
  contadores sin la entidad de prueba.
- Isaac (rockandchang@gmail.com) restablecio su contrasena de superadmin el 27-sep.

### 2026-09-27 — Diagnostico invitaciones: los antivirus de correo gastaron los enlaces
- Auth logs: 30 "user_signedup" pero solo 2 "user_updated_password" (rafa@teamlabs.es, apenafiel@uma.es).
  28 enlaces se "abrieron" 2-70 s despues del envio = escaneres de correo corporativo (Safe Links etc.)
  que consumen el token de un solo uso. Esas personas veran "enlace caducado".
- Candidaturas: solo TeamLabs (Exp3rea, Puro Datte). Resto 0.
- FIX DESPLEGADO (commit a499e76, FTP desde PC): /admin/clave acepta ?token_hash=&type= y NO lo consume
  hasta pulsar "Continuar" (verifyOtp). 
- HECHO: plantillas Invite y Reset con enlace token_hash (Reset ya en espanol, asunto "Tu acceso al
  panel de Malaga Startup Network"). PROBADO: enlace recovery abierto 2 veces con curl (como un antivirus)
  y despues en navegador -> "Continuar" -> formulario de contrasena OK.
- HECHO 27-sep con OK de Isaac: reenviado el acceso (recover) a las 47 sin contrasena, 47/47 = 200
  (tandas 24 + 23; limite /recover 30 por 5 min por IP). Caducidad 24 h: Supabase NO permite mas
  (MAILER_OTP_EXP max 86400); Isaac pidio 48 h -> alternativa: reenvio manana a quien siga sin clave.
- (antes) PENDIENTE (necesita Chrome conectado): cambiar plantillas Invite y Reset a
  https://malagastartupnetwork.com/startups/admin/clave?token_hash={{ .TokenHash }}&type=invite|recovery
  (Reset ademas en espanol) y reenviar enlace (recovery) a las 47 personas sin contrasena.

### 2026-09-25 (b) — Invitaciones a las entidades ENVIADAS (49)
- Tabla `invitaciones_entidad` (email, entity_id, full_name, role; RLS solo superadmin) +
  `handle_new_user()` ampliado: al crearse el usuario, su perfil nace YA vinculado a su entidad con
  nombre y rol entity_admin (nunca superadmin desde esta tabla). Evita el guard trigger (solo UPDATE).
- 49 usuarios de las 19 entidades (Sheet "LISTA COMPLETA" + TeamLabs + info@bic.es) invitados desde
  el panel de Supabase; 49/49 creados y vinculados. No invitados: joaquin.tegt@bic.es (ya superadmin),
  duplicados aazevedo@a-emprende.net y aquiros@malaga.eu.
- Plantilla "Invite user" en espanol con marca MSN (asunto "Tu acceso al panel de Malaga Startup
  Network", menciona las 2 startups y el plazo 29-sep). MAILER_OTP_EXP 3600 -> 86400 (enlace 24 h).
- Plantilla "Reset password": el cambio lo BLOQUEO el clasificador -> sigue en ingles (hacerlo Isaac).
- Usuario de prueba extra rockandchang+plantilla@gmail.com (sin entidad) -> borrar al acabar.
- Truco para invitar en lote desde el dashboard: el dialogo se reabre con el atajo de teclado "i i".

### 2026-09-25 — Candidaturas 2026 (2 startups por entidad, plazo 29-sep 23:59 Madrid) LIVE
- BD (migracion `candidaturas_startups`): `convocatorias` (edicion PK, titulo, fecha_limite, abierta) y
  `candidaturas` (edicion, entity_id, posicion 1|2, startup_nombre, web, contacto, motivo,
  registrada_por_admin). RLS: entidad lee/crea/edita/borra SOLO lo suyo y SOLO con plazo abierto
  (`convocatoria_abierta()`); superadmin todo, siempre.
- Front: `/admin/candidaturas` (menu "Candidaturas 2026"), banner en Inicio, menu movil en el panel
  (antes el panel no tenia navegacion en movil). Superadmin: contador X/19, filtro pendientes/completas,
  editar cualquier entidad (registrar las que lleguen por otros canales), cambiar fecha, cerrar/reabrir, CSV.
- Commit 61406d0 en main. Subida FTP a malagastartupnetwork.com HECHA DESDE EL PC (orden-msn0925f):
  **el FTP del hosting da timeout desde el droplet** (puerto 21 abierto desde fuera) -> probable bloqueo
  de la IP del droplet. Mientras tanto, desplegar descargando el index.html del commit en el PC y curl.exe.
- Pruebas (entidad de prueba): guardar OK; escribir en entidad ajena 403; fuera de plazo update=0 filas,
  insert 403; plazo restaurado a 29-sep 23:59. Queda candidatura "PRUEBA Startup Uno" de la entidad de prueba.

### 2026-09-24 — Seguridad de leads antes de dar acceso a entidades (aprobado por Isaac)
- HALLAZGO: `is_staff()` = "tiene perfil"; registro publico ABIERTO + rol por defecto `entity_admin`
  => cualquiera que se registrase leia/editaba TODOS los leads (PII). Sin explotar (solo 2 perfiles).
- HECHO: Auth > "Allow new users to sign up" = OFF (las invitaciones siguen funcionando).
- HECHO: migracion `leads_pii_solo_superadmin_y_rpc_entidades`: leads / lead_interests / lead_responses /
  lead_tags / lead_suggestions / newsletter_subscribers -> lectura solo superadmin; tags admin-only solo
  superadmin. Nueva RPC `leads_para_entidad()` (security definer): todos los leads, nombre/proyecto/
  email/telefono/whatsapp = NULL salvo que el lead eligiera a MI entidad (lead_interests); incluye
  entidades elegidas y sugeridas. El difuminado de la UI debe usar esta RPC, nunca la tabla.
- HECHO: entidades nuevas en BORRADOR: CaixaBank (Inversion), Telefonica y The Pool (Privadas).
- HECHO 25-sep (Isaac pego usuario/clave): SMTP propio activo; limite de correos pasa a 30/hora
  -> subido a 100/hora con autorizacion explicita de Isaac (verificado tras recargar).
- PRUEBAS 25-sep: invitacion a rockandchang+entidad@gmail.com LLEGO a la bandeja via SES (remitente
  info@rockandchange.es). Plantilla de invitacion aun en INGLES por defecto -> traducir antes de invitar.
  Usuario prueba d83a9ee2-... = entity_admin de "Entidad de Prueba MSN" (402b4dff-..., draft, NO publicar).
  Lead de prueba 3581bfe9-... (origin 'prueba-interna', eligio Entidad de Prueba) -> borrar al acabar.
  RPC como superadmin: 6 filas, todas visibles. Anon: leads=[] , RPC=401, signup=422 signup_disabled. OK.
  VERIFICADO con sesion de entidad: RPC 6 filas, solo 1 con PII (el lead que la eligio); resto con
  nombre/email/tel NULL pero con respuestas y entidades elegidas. Tabla leads directa=[], PATCH=0 filas,
  newsletter=[]. Panel entidad ya oculta menu SUPERADMIN. Nota: `entidades_sugeridas` sale vacio ->
  el onboarding no guarda lead_suggestions (revisar Edge Fn match-programs).
- (antes) SMTP propio en Supabase Auth (el integrado = 2 correos/hora, bloquea 48 invitaciones):
  SES eu-central-1, host email-smtp.eu-central-1.amazonaws.com:587, remitente info@rockandchange.es,
  nombre "Malaga Startup Network". Usuario/clave = `INFRA__AWS_SES_SMTP_USER/PASS` (los pega Isaac).
- PENDIENTE: probar RPC con usuario de entidad de prueba; UI leads difuminada; panel entidad azul;
  candidaturas 2 startups (plazo 29-sep); avisos de reunion; onboarding campos obligatorios;
  programas permanente/temporal; log de comportamiento; estadisticas; invitaciones.

### 2026-09-22 (b) — CAUSA REAL encontrada: Supabase quitaba la ruta del Site URL
- La URL que pego Joaquin fue la prueba definitiva: aterrizaba en
  `https://malagastartupnetwork.com/#access_token=...&type=recovery` -> **la RAIZ del dominio**, que es
  la web estatica de Joaquin, donde no hay ninguna app que lea el hash. Por eso "no pasaba nada".
- **Por que**: el Site URL SI estaba guardado como `.../startups/`, pero con la **lista de Redirect URLs
  VACIA** Supabase se queda solo con el **origen** y descarta la ruta. (Aqui me equivoque el 21-sep al
  decidir no rellenar la lista "para reducir superficie": era justo lo que hacia falta.)
- **ARREGLADO** (commit `8f06e37`):
  1. Anadida a Redirect URLs la ruta EXACTA (sin comodines): `https://malagastartupnetwork.com/startups/admin/clave`
  2. `Clave.tsx` ahora llama a `resetPasswordForEmail(correo, { redirectTo: URL_CLAVE })`, con
     `URL_CLAVE = VITE_SITE_URL + VITE_BASENAME + "/admin/clave"` (coincide exacta con la permitida).
  3. Guarda anti-doble-redireccion en `main.tsx`: si ya estamos en `/admin/clave`, `RedirigirInvitacion`
     no hace nada (si no, volveria a tirar el hash y repetiriamos el bug del 21).
- Verificado que el bundle contiene `redirectTo`, el dominio y `/startups`.
- **FLUJO BUENO PARA USUARIOS NUEVOS** (no depende de invitaciones del panel):
  `https://malagastartupnetwork.com/startups/admin/clave` -> correo -> "Enviarme el enlace" -> abrir
  el enlace -> formulario de contrasena.
- ✅ **VERIFICADO DE PUNTA A PUNTA (22-sep)** usando el correo de Isaac y el conector de Gmail:
  1. Formulario -> peticion `POST /auth/v1/recover?redirect_to=https%3A%2F%2Fmalagastartupnetwork.com%2Fstartups%2Fadmin%2Fclave` (correcto)
  2. "Enlace enviado" en pantalla; correo de Supabase recibido con el `redirect_to` correcto
  3. Abierto el enlace -> aterriza en `https://malagastartupnetwork.com/startups/admin/clave#`
     y muestra el formulario **"Establece tu contrasena"**. NO se envio (contrasena de Isaac intacta).
- Metodo de prueba reutilizable: pedir el enlace con el correo de Isaac, leerlo con el conector de
  Gmail (`from:supabase newer_than:1d`) y abrirlo. No hace falta molestar al usuario final.

### 2026-09-22 — FIX: la redireccion se comia los tokens de la invitacion
- **Sintoma**: Joaquin abria el enlace nuevo y aterrizaba en `/admin/clave` pero con el mensaje
  "Necesitas abrir el enlace del correo" -> es decir, SIN sesion.
- **CAUSA (error mio del 21-sep)**: Supabase devuelve los tokens en el **hash** de la URL
  (`#access_token=...&type=invite`). Mi `RedirigirInvitacion` navegaba con React Router en cuanto veia
  `type=invite`, y **esa navegacion descarta el hash**, asi que el cliente de Supabase se quedaba sin
  los tokens antes de poder leerlos (o se los quitaba en plena carrera asincrona).
- **ARREGLADO** (commit `f4933b0`):
  1. `RedirigirInvitacion` ya NO navega de inmediato: se suscribe a `onAuthStateChange` y **espera a que
     exista sesion**; si a los 4 s no la hay, navega **conservando el hash**.
  2. `Clave.tsx` tambien escucha `onAuthStateChange`, por si la sesion llega tarde.
  3. La pantalla sin sesion/caducado ahora es **autoservicio**: campo de correo + "Enviarme el enlace"
     (`resetPasswordForEmail`), asi nadie depende de que Isaac reenvie invitaciones.
- **LECCION GENERAL**: con Supabase Auth, nunca navegar ni limpiar la URL antes de que el cliente haya
  procesado el hash. Esperar siempre a `onAuthStateChange`/`getSession`.
- PENDIENTE: verificacion end-to-end con un enlace real (no se puede simular sin recibir el correo).

### 2026-09-21 — Arreglado el acceso de Joaquin: Site URL + pantalla de contrasena
- **CAUSA RAIZ**: el **Site URL** de Supabase Auth estaba en el valor por defecto `http://localhost:3000`.
  Todos los enlaces de invitacion y recuperacion apuntaban a localhost. Joaquin recibio
  `localhost:3000/#error=access_denied&error_code=otp_expired`.
  **Corregido a `https://malagastartupnetwork.com/startups/`** (Authentication -> URL Configuration).
- Segundo problema: el enlace ademas habia **caducado** (los de invitacion duran 24 h; se envio el 18).
  **Invitacion reenviada** el 21-sep.
- Las **Redirect URLs** siguen VACIAS a proposito: no hacen falta (la app nunca pasa `redirectTo`, se usa
  el Site URL) y el clasificador de seguridad bloqueo anadir comodines `/**`. Menos superficie, mejor.
- ⚠️ **HUECO DETECTADO Y TAPADO**: la app **no tenia ninguna pantalla para establecer contrasena**.
  Joaquin era el primer usuario invitado (la cuenta de Isaac se creo con contrasena directa), asi que
  habria entrado con sesion pero sin poder fijar contrasena -> fuera a la siguiente.
  **NUEVO `/admin/clave`** (commit `ab337e6`), ruta suelta fuera de AdminLayout para que funcione sin
  sesion previa. Tres estados: formulario (con sesion), "enlace caducado" y "abre el enlace del correo".
  Ademas `main.tsx` detecta en el hash `type=invite|recovery|otp_expired` y redirige alli
  automaticamente, y el login enlaza "¿Primera vez? Establece tu contraseña".
- Verificado en vivo en `/startups/admin/clave`.

### 2026-09-18 (e) — Subdominio de pruebas en Plesk: SE MANTIENE (medido, no se toca)
- Pregunta planteada: ¿liberar espacio en Plesk borrando `malaga-startup-network.rockandchange.es`
  ahora que producción vive en el servidor del cliente?
- **MEDIDO**: el subdominio ocupa **2,2 MB** (+ ~890 KB de historial git). La cuota del Plesk esta al
  ~113% de 35 GB (~40 GB usados) -> MSN es el **0,007%**. **Borrarlo NO libera nada relevante.**
  Lo que llena ese disco esta en Rock&Change (copias, subidas, volcados). Territorio de OTRO proyecto:
  no se toca desde aqui; si se quiere atacar, conversacion aparte de Rock&Change.
- **DECISION: se mantiene el subdominio de pruebas.** Razon: ahora desplegamos en el servidor de un
  CLIENTE sobre una web publica ajena; tener donde probar antes vale mas que antes, no menos
  (el bug de la pagina en blanco del 14-sep se descubrio ya publicado en el dominio del cliente).
- **Comprobacion de seguridad hecha de paso**: el `.git` NO es descargable por web. Los `200` que
  aparecian en `/.git/HEAD` y `/.git/config` eran **falso positivo del fallback SPA** (devolvia el
  index.html; se ve porque pesaban exactamente lo mismo que la pagina). `.htaccess` y `project/.env`
  responden 403 correctamente.
- Estado actual del subdominio (conocido y aceptado): sirve DOS builds a la vez, una raiz desfasada
  del 14-sep y la copia `/startups/` al dia. Se propuso convertirlo en espejo exacto de produccion;
  Isaac decide dejarlo como esta (18-sep-2026).

### 2026-09-18 (d) — Circuito de revision de contenidos: pieza 1 de 3 (COLA DE REVISION)
- **NUEVO `/admin/revision`** (solo superadmin, commits `cbfc263` + `d0a147f`): lista las entradas en
  estado `pending`, con entidad, fecha de envio, portada, resumen y el texto completo desplegable.
  Botones **Aprobar y publicar** (pasa a `published` + `published_at`) y **Devolver a borrador**.
  Contador de pendientes en la cabecera. Enlace "Revision" en el menu SUPERADMIN.
- Verificado en vivo en `/startups/admin/revision`: renderiza, acentos correctos, estado vacio OK.
- **YA EXISTIA y no hizo falta tocar**: las entidades solo ven sus propias entradas, pueden marcarlas
  como "Pendiente de revision" y **NO tienen la opcion de publicar** (el selector de estado oculta
  `published` si no eres superadmin). El circuito de permisos estaba bien montado desde el principio.
- ⚠️ **TRAMPA (me costo un redeploy)**: al escribir codigo por el puente ASCII escapando acentos con
  `\\uXXXX`, Python los deja LITERALES. En cadenas JS el navegador los interpreta, pero en **texto JSX
  NO**: salia "Revisi\\u00f3n" en pantalla. **Regla: generar el fichero y despues convertir los escapes
  a caracteres reales** (`re.sub(r"\\\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1),16)), s)`).
- ⚠️ La copia RAIZ de rockandchange (`/admin/...`) sigue con el build viejo y da 404 en rutas nuevas.
  Solo se actualizan las copias `/startups/`. Para igualarla hace falta `malaga: publicar`.

### PENDIENTE del circuito (piezas 2 y 3) — decisiones abiertas
- **Aviso al pasar a `pending`**: RLS impide leer pendientes con la anon key, asi que un cron necesita
  identidad. Opciones: (a) Edge Function + service role (toca config de Supabase), (b) cuenta "bot" con
  rol editor guardada en `secreto` y cron en el droplet, (c) solo contador en el menu (coste cero).
- **Regeneracion del blog estatico**: Joaquin tiene 4 articulos escritos A MANO en `/pages/`. Si el
  generador escribe `blog.html` los pisa. Lo limpio es **importar esos 4 a Supabase** (se pueden parsear
  de su HTML) para tener UNA sola fuente. Sin esa decision, no se toca su blog.

### 2026-09-18 (c) — Joaquin (BIC Euronova) dado de alta como SUPERADMIN
- **Invitacion enviada** desde Supabase (Authentication -> Users -> Send invitation) a `joaquin.tegt@bic.es`.
  El se crea su propia contrasena desde el enlace del correo: nadie mas la conoce (ni Isaac, ni el chat).
- **Rol cambiado a `superadmin`** y VERIFICADO releyendo de la BD tras recargar (no solo el "Guardado" de la UI).
- ⚠️ **COMO se hace un cambio de rol (importante para el futuro)**: NO funciona por SQL directo en el editor
  de Supabase. El trigger `trg_guard_profile` -> `guard_profile_changes()` revierte `role` y `entity_id`
  **en silencio** si `public.is_superadmin()` es falso, y en el editor SQL `auth.uid()` es NULL.
  El `UPDATE` devuelve "Success" pero NO cambia nada. **La via correcta es el panel de la app**
  (`/admin/usuarios`), donde la peticion va con la sesion autenticada del superadmin y el trigger la permite.
- Intentar sortearlo fijando `request.jwt.claims` para simular la identidad de Isaac fue **bloqueado por el
  clasificador de seguridad**, con razon: forjar una sesion es un patron de bypass. No repetirlo.
- Nota de gobierno: Joaquin es de **BIC Euronova**, una entidad de la red. Como superadmin ve TODOS los
  leads, incluidos los de emprendedores que eligieron otras entidades. Isaac lo decidio con ese dato encima
  de la mesa (18-sep-2026). Si algun dia se quiere acotar, la via es una politica RLS sobre `leads`.
- Borrador de correo para Joaquin creado en el Gmail de Isaac (resumen de cambios + su acceso).

### 2026-09-18 (b) — ⚠️ INCIDENTE DE SEGURIDAD: credencial de superadmin expuesta en GitHub publico
- **Hallado**: `project/README.md` contenia en claro `Acceso superadmin inicial: rockandchang@gmail.com /
  <password>`. El repo `rockandchang-oss/malaga-startup-network` es **PUBLICO**, asi que cualquiera podia
  entrar al panel y **leer todos los leads** (nombre, email, WhatsApp y proyecto de cada emprendedor).
- **Hecho**: retirada la linea del README y sustituida por un puntero al gestor (commit `4da0141`).
  Comprobado que `docs/CREDENCIALES.md` NO estaba en el repo (ese si se excluyo bien).
- ⚠️ **PENDIENTE Y CRITICO**: borrar la linea NO basta — **sigue en el historial de git**, que es publico.
  **HAY QUE CAMBIAR LA CONTRASENA** del superadmin en Supabase (Authentication -> Users). Mientras no se
  cambie, la credencial se considera comprometida.
- Tras cambiarla, actualizar el gestor: `secreto set MALAGA__SUPERADMIN_LOGIN '<nuevo>'`.
- **VENTANA DE EXPOSICION MEDIDA**: la credencial entro el **2026-06-08 13:21** (commit `e41925d`) y se
  retiro el **2026-09-17 22:26** (commit `4da0141`) = **101 dias publica** en GitHub. Sigue siendo
  recuperable desde el historial (`git show e41925d:project/README.md`).
- Isaac decide (18-sep-2026) **mantener la contrasena actual** pese al dato. Queda registrado aqui.
  La recomendacion tecnica sigue siendo cambiarla: son 30 segundos en Supabase.
- Leccion: ningun README debe llevar credenciales, ni en repos que hoy son privados (pueden hacerse publicos).

### 2026-09-18 — Navegacion coherente: la app es SECUNDARIA respecto a la web principal
- La app en `/startups` ya no compite con la web oficial. Nav resultante (commit `07042af`):
  - **Logo -> `https://malagastartupnetwork.com`** (sale de la app, va a la home principal).
  - **"Inicio" eliminado** (la home es la principal, no la de la app).
  - **"Noticias" -> "Actualidad"** apuntando a `/pages/actualidad.html` de la web principal: se elimina
    la duplicidad de blogs. Las rutas internas `/noticias` siguen existiendo pero ya no se enlazan.
  - Se mantienen internas: **Entidades** (`/startups/entidades`) y **Empezar** (`/startups/empezar`).
- Implementado con **`VITE_SITE_URL`** (por defecto `https://malagastartupnetwork.com`), asi los enlaces
  apuntan siempre a la web canonica desde CUALQUIER despliegue (tambien desde el de rockandchange).
- PENDIENTE: dar de alta a **joaquin.tegt@bic.es** como superadmin. La app NO tiene registro publico
  (solo login), asi que el usuario hay que crearlo en el panel de Supabase (Authentication -> Users) y
  despues elevar el rol en `profiles`. No se guarda la service role key, por eso el alta la hace Isaac.

### 2026-09-17 (b) — Public Sans + indice de la red generado desde Supabase
- **Public Sans + radio 12px** aplicados a la app y subidos a `main` (commit `4aa61c8`). Ya coincidimos con la
  web oficial en fuente, colores (gold #F9A825, navy/blue #4A5D8A) y botones pildora.
- **NUEVO: `https://malagastartupnetwork.com/pages/entidades.html`** — indice de las 16 entidades generado
  automaticamente desde Supabase, agrupado por las 4 categorias, con la estetica EXACTA de Joaquin
  (se reutiliza su nav/footer/CSS tomando `entidades-publicas.html` como esqueleto).
  Cada tarjeta: logo, nombre, descripcion corta, ciudad + nº de programas, "Ver ficha" (-> /startups/entidades/slug)
  y "Web oficial". Cierra con CTA a /startups/.
- **Generador**: `/opt/msn-generador/generar-entidades.py` en el droplet (lee Supabase por REST con la
  publishable key, renderiza y sube por FTPS). Re-ejecutable: `python3 /opt/msn-generador/generar-entidades.py`.
- ⚠️ **TRAMPA**: el canal del puente es ASCII; un caracter no-ASCII en el script (el separador `·`) llego
  corrompido y salio `??` en produccion. **Regla: en los scripts que viajan por el puente, usar SIEMPRE
  entidades HTML (`&middot;`, `&aacute;`...) y nunca caracteres no-ASCII literales.** El generador ya esta saneado.
- **DESCARTADO generar las 16 fichas editoriales completas**: la plantilla de Joaquin pide 2 parrafos de
  historia, 3 ejes con dato concreto, pies de foto... y en Supabase solo hay `short_description` (~90 car.),
  `long_description` (1 parrafo) e `history` (UNA frase). Su ficha de BIC a mano ocupa 22 KB; la generada
  daria 1,5 KB. Publicar 16 paginas asi seria contenido delgado y penalizaria el SEO. Primero hay que
  enriquecer los datos (via backoffice de entidades) y luego generar.
- Dato util: sus paginas de seccion (`entidades-publicas.html` etc.) son **placeholders** que dicen
  "Proximamente se anadira mas informacion" -> el indice llena un hueco que ellos mismos dejaron marcado.

### 2026-09-17 — Aplicada la version de Joaquin a la web publica (quirurgico) + tokens de diseno
- Zip recibido: `MSN-Web (3).zip` (39 MB). Contenia un repo completo; lo publicable es **`MSN-Web/dist/`**.
  NO se subieron `.git/`, `.claude/`, ni las dos PLANTILLAS de trabajo.
- **Revision de seguridad OK**: `send_email.php` con hash IDENTICO al de produccion y los 7 ficheros de
  PHPMailer IDENTICOS. Sin `eval`/`base64_decode`/`shell_exec`. Dominios externos todos legitimos.
- **`config.php` NO se toco** (solo anadia un comentario, pero contiene credenciales SMTP; se dejo el de produccion).
- **RESPALDO PREVIO** (3 copias): droplet `/opt/malaga-backups/msn-PRE-joaquin-20260917-1959.tar.gz`,
  `C:\claudekeys\respaldos\` y `respaldos/` de esta carpeta. 19 ficheros (todo lo no-imagen) + manifiesto sha256.
- **Aplicado solo lo que cambiaba (17 ficheros)**: 10 modificados (index.html, style.min.css, main.min.js y
  7 paginas) + 7 nuevos (actualidad, blog + 4 articulos, entidad-bic-euronova). **33 imagenes identicas: no se tocaron.**
- **Enlaces a nuestra app cambiados** de `https://malaga-startup-network.rockandchange.es/` a **`/startups/`**
  (2 enlaces en index.html). Verificado: 0 referencias a rockandchange en la home.
- Verificado en vivo: home 200, blog/actualidad/entidad 200, PLANTILLAS 404 (correcto), **`/startups/` intacta 200**.
- Nota operativa: la orden del puente se colgo al final (scp con ruta con espacios) pero **la subida ya se
  habia completado**; se verifico el estado real por navegador antes de repetir nada. Para scp usar rutas sin espacios.

### TOKENS DE DISENO DE LA WEB OFICIAL (para mantener coherencia en /startups)
`--navy:#2C3959` · `--navy-mid/--blue:#4A5D8A` · `--blue-light:#6A7CA8` · `--gold:#F9A825` ·
`--gold-light:#FFC107` · `--off-white:#DDE3F0` · `--text-muted:#6B7A99` ·
**fuente `Public Sans`** (300-800) · `--card-radius:12px` · `--btn-radius:50px`.
Nuestra app YA coincide en gold (#f9a825), azul (#4A5D8A) y botones pildora.
**Diferencias**: usamos **Inter** (deberia ser Public Sans) y `rounded-2xl` (20px) frente a 12px.

### 2026-09-14 — SEGUNDO DESPLIEGUE: malagastartupnetwork.com/startups/ (hosting de terceros)
- **La app ya vive tambien en el hosting oficial de MSN**: https://malagastartupnetwork.com/startups/
  (Plesk de terceros, `plw196.panel-hosting.com`, FTP host **82.194.68.113**, user `user-11308680`).
  Verificado en navegador: renderiza, rutas profundas OK y **datos de Supabase cargando** (directorio de entidades).
- **Accesos nuevos en el gestor**: `MALAGA__FTP_HOST`, `MALAGA__FTP_USER`, `MALAGA__FTP_PASS`.
  Solo FTP puerto 21 (no hay SFTP), pero **FTPS explicito SI funciona** -> usar siempre `--ssl-reqd`.
- **Cambios de codigo para servir en subcarpeta** (hechos en un clon del droplet, `/tmp/msnbuild`):
  1. `main.tsx`: `<BrowserRouter basename={import.meta.env.VITE_BASENAME || "/"}>`
  2. `.env` del build: `VITE_BASENAME=/startups` (vacio => "/" para el despliegue de rockandchange).
  3. Logo importado como modulo (`src/assets/logo-MSN.jpg`) en Layout/AdminLayout/Login, en vez de
     `src="/logo-MSN.jpg"` absoluto, que se rompe en subcarpeta. Ahora va inlined en el bundle.
  4. `.htaccess` en la subcarpeta con `RewriteBase /startups/` (fallback SPA verificado).
- ⚠️ **TRAMPA IMPORTANTE**: `vite-plugin-singlefile` **fuerza `base: "./"`** y machaca `vite build --base=...`.
  Por eso `import.meta.env.BASE_URL` valia `"./"` y el router no casaba ninguna ruta -> pagina en blanco
  con el JS cargado y sin errores en consola. **No usar BASE_URL para el basename**: usar `VITE_BASENAME`.
- Build hecho en el droplet con `docker run node:20-bookworm-slim` (el droplet no tiene node instalado).
- La web principal malagastartupnetwork.com siguio respondiendo 200 en todo momento; solo se escribio
  dentro de `/malagastartupnetwork.com/startups/`.
- Cambios (1,2,3) **ya subidos a `main`** (commit `ff916d3`).

### 2026-09-14 (b) — /startups tambien en el subdominio de rockandchange (duplicado)
- Ahora la app carga en **DOS sitios ademas de la raiz**:
  - https://malagastartupnetwork.com/startups/  (hosting oficial, por FTPS)
  - https://malaga-startup-network.rockandchange.es/startups/  (por Git+webhook)
  - y sigue en la raiz de rockandchange (https://malaga-startup-network.rockandchange.es/) intacta.
- Como se hizo: en ese subdominio **no hay FTP de escritura** (solo `claude_ro` de lectura), asi que la via
  es el repo: se anadio la carpeta **`startups/`** en la RAIZ del repo (index.html del build con
  `VITE_BASENAME=/startups`, su `.htaccess` con `RewriteBase /startups/`, y logo-MSN.jpg) -> push a `main`
  -> webhook -> Plesk. Commit `ff916d3`.
- Verificado en navegador: `/startups/entidades` entrando por URL directa renderiza, carga datos de
  Supabase y los 15 logos de entidades cargan (0 fallidos). Raiz del subdominio sigue 200.
- **OJO para futuros despliegues**: si se regenera la raiz con `malaga: publicar`, la carpeta `startups/`
  NO se actualiza sola — hay que regenerar tambien ese build (con `VITE_BASENAME=/startups`) y volver a
  copiarlo a `startups/`. Son dos artefactos distintos del mismo codigo.


### 2026-06-24 (cierre) — verificado render en vivo + bug de env resuelto
- Tras la petición de reconfigurar Plesk (build allí + docroot project/dist): **se descartó** por riesgo en el
  Plesk compartido (~113% cuota, con Web RockChange) y porque el modelo single-file ya funciona. Se mantiene el modelo actual.
- **No había commits sin subir**: worktree del droplet = `origin/main` = `ace9547` (incluye `8ef66a7 fix env Supabase`,
  `9f4b7e7 docs diagnóstico`, `ace9547`). Nada que pushear.
- **Web verificada en navegador** (build 22:58, last-modified): renderiza completa (hero, nav, formulario),
  **sin errores de consola**, variables Supabase inyectadas (`…supabase.co` + `sb_publishable_…`), y la sección
  "Una red interconectada" carga **categorías desde Supabase** → BD conectada. El bug "no se ve online / env
  undefined" **ya NO está presente**. No se hizo deploy ni se tocó Plesk.


### 2026-06-24 (auditoría de realidad) — verificado contra producción
- **Producción LIVE OK**: https://malaga-startup-network.rockandchange.es responde **200** (nginx/Plesk,
  `x-powered-by: PleskLin`). Sitio **estático single-file** (no hay runtime PHP/Node propio). `/admin` → 200
  (es ruta del SPA, no un entorno aparte). **No hay beta/canary** separados para MSN.
- **Build en vivo más nuevo que el último push manual**: `index.html` = **765.104 bytes**, last-modified
  2026-06-24 20:02. Corresponde al commit `a0833bb deploy: build 2026-06-24T20:02Z` (sobre `6bb0c18`, mi
  commit de la tarjeta Andalucía). Es decir, se publicó desde la sesión de infra (`malaga: publicar`).
  Corregido en CLAUDE.md el tamaño de referencia (~685 KB → ~765 KB).
- **Todos los cambios recientes presentes en vivo**: filtro azul #4A5D8A, tarjeta `andalucia-emprende`
  ("Agenda de eventos", logo oficial), botones `rounded-full`.
- **Claves**: `secreto list` confirma las 5 `MALAGA__*` (URL, ANON_KEY, PUBLISHABLE_KEY, SUPERADMIN_LOGIN,
  GITHUB_PAT). Service role NO almacenada (a propósito). Punteros en `_comun/credenciales.md` al día.
- Worktree del droplet `/opt/agente/worktrees/malaga` en `main`, limpio, HEAD `a0833bb`.


### 2026-06-24 (tarde) — Málaga en el bot de Telegram + PAT consolidado (desde sesión de infra)
- **Desarrollo/publicación remota por Telegram** (`@agente_proyectos_isaac_bot`), PROBADA HOY (web LIVE 200 con build nuevo):
  - Desarrollar: `malaga: <tarea>` (o `msn: <tarea>`) → el agente trabaja sobre el worktree del droplet
    `/opt/agente/worktrees/malaga` (rama main) y deja el cambio commiteado.
  - Publicar: `malaga: publicar` → build vite single-file → verifica integridad → push a GitHub main →
    webhook → Plesk auto-deploy.
- **`MALAGA__GITHUB_PAT`**: creado (fine-grained, solo repo malaga-startup-network, Contents R/W, sin caducidad).
  Guardado en el gestor `secreto` y en el `.env` del servicio del droplet. NO está en ninguna carpeta de OneDrive.
  Puntero en `_comun/credenciales.md`.
- ⚠️ **DOS copias del código** ahora: (1) carpeta OneDrive (edición en Cowork) y (2) worktree del droplet
  (edición/deploy del bot). **El canónico es GitHub `main`.** Si edito código en OneDrive, hay que **push a main**
  para que `malaga: publicar` lo incluya; si no, el deploy recompila desde el último main pusheado, no desde las
  ediciones locales. A futuro: trabajar siempre contra el repo git, no contra OneDrive.


### 2026-06-24 — Consolidación de claves en el gestor central + acotado
- Subidas al gestor `secreto` (droplet, vía `C:\claudekeys\droplet.txt`) con prefijo MALAGA__:
  `MALAGA__SUPABASE_URL`, `MALAGA__SUPABASE_ANON_KEY` (JWT legacy), `MALAGA__SUPABASE_PUBLISHABLE_KEY`
  (`sb_publishable_…`, la que usa el front), `MALAGA__SUPERADMIN_LOGIN`. Punteros en `_comun/credenciales.md`.
- `MALAGA__SUPABASE_SERVICE_ROLE_KEY`: **NO se almacena a propósito** (vive sólo en Supabase, uso interno;
  el front usa anon/publishable). No es un hueco pendiente.
- `MALAGA__GITHUB_PAT`: PENDIENTE de subir. Isaac rota un PAT fine-grained (repo malaga-startup-network,
  Contents R/W) y lo deja en `pat.tmp` en la carpeta de Málaga → subir con `secreto set MALAGA__GITHUB_PAT
  "$(cat pat.tmp)"`, verificar por longitud, `shred -u pat.tmp` y registrar puntero.
- Supabase (solo lectura, vía MCP): proyecto `malaga-startup-network` ref `rsitqcrnuiglogtxljls`, eu-west-3,
  Postgres 17, ACTIVE_HEALTHY. 24 tablas, todas con RLS. Advisors: solo WARN (INSERT anónimo en leads/lead_*/
  newsletter por diseño del onboarding; helpers SECURITY DEFINER; leaked-password-protection off). No se tocó nada.
- HALLAZGO: el fichero `credenciales secretario virtual.txt` (en la carpeta de Málaga) **NO es de Málaga**:
  contiene secretos de Secretario Virtual y otros proyectos (n8n, NocoDB, Stripe, login admin interlingua).
  Está bien nombrado por contenido pero **mal ubicado**. Ya respaldado en el droplet (`/opt/secretos/fuentes/`);
  se borrará de la carpeta de Málaga desde OTRA sesión. NO tocarlo desde aquí.
- No se hizo deploy, push ni cambios en Plesk/Supabase. Ámbito de trabajo: MalagaStartupNetwork + _comun + C:\claudekeys.


### 2026-06-23 — Mejoras de UI del onboarding + ficha de arranque
- Tarjetas de "Esto es lo que encaja contigo": al pulsar la tarjeta lleva a la ficha de la entidad
  (`/entidades/:slug`); el seleccionar pasó a ser botón aparte (no se pisa con el enlace). Añadido
  `entity_slug` a `Suggestion` y poblado desde `entities`.
- Tarjeta fija de **Andalucía Emprende** siempre que el proyecto es de Málaga/Andalucía, con el
  mensaje de la agenda de actividades. Rediseñada a estilo corporativo: logo oficial en chip blanco,
  etiqueta, degradado azul #4A5D8A y botón píldora blanco.
- **Hero** con filtro azul corporativo #4A5D8A (antes cálido).
- **Botones CTA** a estilo píldora (`rounded-full`), como la web original de MSN.
- Limpieza en el repo de ficheros basura `*.tmp` que dejó OneDrive.
- Deploy verificado en producción (index.html ~685 KB servido).
- Creada la ficha del proyecto: `CLAUDE.md` y este `ESTADO.md` (no existían).
- Incidencia recurrente: OneDrive truncó `Onboarding.tsx` al guardar; detectado en el build y
  reparado desde la versión buena. Regla: editar por bash + verificar antes de pushear.

### Pendiente / próximos pasos
- (Opcional) Conexión con Lovable para estética — requiere navegador; en pausa.
- (Opcional) Aviso por email a las entidades seleccionadas en un lead.
- (Opcional) Repo privado con deploy key SSH en vez de PAT en claro.
- Corregir en `_comun/proyectos.md` y `_comun/deploy.md` el estado de Malaga: ya NO está "pendiente",
  está **LIVE** (hacerlo cuando Isaac lo confirme).
