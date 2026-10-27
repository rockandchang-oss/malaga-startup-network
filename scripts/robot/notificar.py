#!/usr/bin/env python3
"""Robot MSN (cron cada 5 min en el droplet, /opt/msn-avisos):
 1) avisa por email a los usuarios de la entidad cuando un emprendedor la elige (copia oculta a superadmins);
 2) reenvia a los superadmins el feedback que dejan usuarios con el boton flotante.
Lee las colas via RPC (robot_notif_pendientes / robot_feedback_pendientes) con un token propio."""
import json, os, html, urllib.request, boto3

URL = os.environ["SB_URL"].rstrip("/"); KEY = os.environ["SB_KEY"]; TOKEN = os.environ["ROBOT_TOKEN"]
PANEL = "https://malagastartupnetwork.com/startups/admin/emprendedores"
FROM = "Málaga Startup Network <info@rockandchange.es>"

def rpc(nombre, datos):
    req = urllib.request.Request(f"{URL}/rest/v1/rpc/{nombre}", data=json.dumps(datos).encode(),
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        t = r.read().decode(); return json.loads(t) if t else None

def e(x): return html.escape(str(x or ""))
def marco(titulo_sup, cuerpo, pie):
    return f'''<div style="background:#f4f6fa;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#2C3959">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e7ef">
<div style="background:#2C3959;padding:20px 24px"><img src="https://malagastartupnetwork.com/startups/logo-MSN.jpg" width="40" height="40" style="border-radius:8px;vertical-align:middle"><span style="color:#fff;font-size:17px;font-weight:700;vertical-align:middle;margin-left:10px">Málaga Startup Network</span></div>
<div style="padding:24px"><p style="font-size:13px;font-weight:700;color:#4A5D8A;text-transform:uppercase;margin:0">{titulo_sup}</p>{cuerpo}</div>
<div style="background:#f4f6fa;padding:14px 24px;font-size:11px;color:#6B7A99">{pie}</div></div></div>'''

def cuerpo_lead(n):
    tel = n.get("phone") or n.get("whatsapp") or ""
    wa = "".join(c for c in (n.get("whatsapp") or "") if c.isdigit())
    if wa and len(wa) == 9: wa = "34" + wa
    filas = ""
    for k, v in (n.get("raw_answers") or {}).items():
        val = ", ".join(v) if isinstance(v, list) else v
        filas += f'<tr><td style="padding:4px 8px;color:#6B7A99;font-size:13px;vertical-align:top">{e(k)}</td><td style="padding:4px 8px;font-size:13px">{e(val)}</td></tr>'
    web = n.get("web") or ""
    web_url = web if web.startswith("http") else ("https://" + web if web else "")
    btn_wa = f'<a href="https://wa.me/{wa}" style="background:#25D366;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:50px;display:inline-block;margin:4px">WhatsApp</a>' if wa else ""
    c = f'''<h1 style="font-size:21px;margin:6px 0 4px">{e(n.get("project_name") or "Nuevo proyecto")}</h1>
<p style="margin:0 0 14px;font-size:15px">{e(n.get("contact_name"))} os ha elegido en el buscador de la red{(" para <b>" + e(n["programa"]) + "</b>") if n.get("programa") else ""}.</p>
<table style="width:100%;border-collapse:collapse;background:#f4f6fa;border-radius:8px;margin-bottom:14px">
<tr><td style="padding:8px;font-size:14px"><b>Email:</b> <a href="mailto:{e(n.get("email"))}" style="color:#4A5D8A">{e(n.get("email"))}</a></td></tr>
<tr><td style="padding:8px;font-size:14px"><b>Teléfono:</b> {e(tel)}</td></tr>
{f'<tr><td style="padding:8px;font-size:14px"><b>Web:</b> <a href="{e(web_url)}" style="color:#4A5D8A">{e(web)}</a></td></tr>' if web else ''}</table>
<table style="width:100%;border-collapse:collapse;margin-bottom:10px">{filas}</table>
<p style="font-size:12px;color:#6B7A99;margin:0 0 16px">Entidades que ha elegido: {e(n.get("elegidas"))}</p>
<p style="text-align:center;margin:18px 0"><a href="mailto:{e(n.get("email"))}" style="background:#F9A825;color:#2C3959;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:50px;display:inline-block;margin:4px">Escribirle</a>{btn_wa}
<a href="{PANEL}" style="border:1px solid #4A5D8A;color:#4A5D8A;text-decoration:none;font-weight:700;padding:9px 18px;border-radius:50px;display:inline-block;margin:4px">Ver en el panel</a></p>
<p style="font-size:12px;color:#6B7A99;margin:0">Os recomendamos contactar en las próximas 48 horas: es cuando el emprendedor está más receptivo.</p>'''
    return marco(f"Nuevo emprendedor para {e(n['entidad'])}", c,
        f"Recibes este aviso porque perteneces a {e(n['entidad'])} en Málaga Startup Network. El emprendedor ha dado su consentimiento para que le contactéis.")

ses = boto3.client("ses", region_name="eu-central-1")
res = {"avisos": 0, "feedback": 0, "errores": []}

for n in rpc("robot_notif_pendientes", {"token": TOKEN}) or []:
    para = [x for x in (n.get("para") or []) if x]
    copia = [x for x in (n.get("copia") or []) if x and x not in para]
    if not para and not copia:
        rpc("robot_notif_marcar", {"token": TOKEN, "nid": n["id"], "ok": True, "n_dest": 0, "err": "sin destinatarios"}); continue
    try:
        ses.send_email(Source=FROM,
            Destination={"ToAddresses": para or copia, "BccAddresses": copia if para else []},
            ReplyToAddresses=[n["email"]] if n.get("email") else [],
            Message={"Subject": {"Data": f"Nuevo emprendedor os ha elegido: {n.get('project_name') or n.get('contact_name')}", "Charset": "UTF-8"},
                     "Body": {"Html": {"Data": cuerpo_lead(n), "Charset": "UTF-8"}}})
        rpc("robot_notif_marcar", {"token": TOKEN, "nid": n["id"], "ok": True, "n_dest": len(para) + len(copia), "err": None}); res["avisos"] += 1
    except Exception as ex:
        rpc("robot_notif_marcar", {"token": TOKEN, "nid": n["id"], "ok": False, "n_dest": len(para), "err": str(ex)[:250]}); res["errores"].append(str(ex)[:120])

TIPOS = {"error": "🐞 Error", "mejora": "💡 Mejora", "otro": "💬 Comentario"}
for f in rpc("robot_feedback_pendientes", {"token": TOKEN}) or []:
    para = [x for x in (f.get("para") or []) if x]
    if not para: rpc("robot_feedback_marcar", {"token": TOKEN, "fid": f["id"]}); continue
    quien = f.get("entidad") or f.get("actor") or "visitante"
    c = f'''<h1 style="font-size:19px;margin:6px 0 10px">{TIPOS.get(f["tipo"], f["tipo"])} de {e(quien)}</h1>
<p style="white-space:pre-wrap;font-size:15px;line-height:1.5;background:#f4f6fa;border-radius:8px;padding:12px">{e(f["texto"])}</p>
<p style="font-size:13px;color:#6B7A99">Página: {e(f.get("ruta"))}<br>Contacto: {e(f.get("email") or "no indicado")}</p>'''
    try:
        ses.send_email(Source=FROM, Destination={"ToAddresses": para},
            ReplyToAddresses=[f["email"]] if f.get("email") and "@" in f["email"] else [],
            Message={"Subject": {"Data": f"[Feedback MSN] {TIPOS.get(f['tipo'], '')} de {quien}", "Charset": "UTF-8"},
                     "Body": {"Html": {"Data": marco("Feedback de la plataforma", c, "Enviado con el botón de feedback de la plataforma."), "Charset": "UTF-8"}}})
        rpc("robot_feedback_marcar", {"token": TOKEN, "fid": f["id"]}); res["feedback"] += 1
    except Exception as ex:
        res["errores"].append("fb " + str(ex)[:120])

# ===== Correos del ciclo de vida (confirmacion, encuesta 7 dias, recordatorio entidad, noticias) =====
BASE = "https://malagastartupnetwork.com/startups"
def boton(url, texto, color="#F9A825", fg="#2C3959", borde="#F9A825"):
    return ('<a href="%s" style="background:%s;color:%s;border:2px solid %s;text-decoration:none;font-weight:700;font-size:15px;'
            'padding:11px 22px;border-radius:50px;display:inline-block;margin:4px">%s</a>') % (url, color, fg, borde, texto)
def enviar(para, asunto, cuerpo_html, bcc=None):
    para = [x for x in (para or []) if x]
    if not para: return False
    dest = {"ToAddresses": para}
    if bcc: dest["BccAddresses"] = [x for x in bcc if x and x not in para]
    ses.send_email(Source=FROM, Destination=dest,
        Message={"Subject": {"Data": asunto, "Charset": "UTF-8"}, "Body": {"Html": {"Data": cuerpo_html, "Charset": "UTF-8"}}})
    return True
def lista(ents): return ", ".join(ents) if ents else "las entidades que elegiste"
def nombre1(n): return (n or "").strip().split(" ")[0]
def hecho(tipo, rid): rpc("robot_correo_hecho", {"token": TOKEN, "tipo": tipo, "rid": str(rid)})

c = rpc("robot_correos", {"token": TOKEN}) or {}
for k in ("confirmaciones", "encuestas", "recordatorios", "posts"): res[k] = 0

for l in c.get("confirmaciones", []):
    try:
        cuerpo = (f'<h1 style="font-size:21px;margin:6px 0 12px">¡Solicitud recibida, {e(nombre1(l.get("contact_name")))}!</h1>'
          f'<p style="font-size:15px;line-height:1.6">Hemos registrado <b>{e(l.get("project_name"))}</b> y ya hemos avisado a <b>{e(lista(l.get("entidades")))}</b>. '
          'Tienen tus datos y se pondrán en contacto contigo en los próximos días.</p>'
          '<p style="font-size:15px;line-height:1.6">Mientras tanto, puedes seguir explorando el ecosistema en '
          '<a href="https://malagastartupnetwork.com" style="color:#4A5D8A">malagastartupnetwork.com</a>.</p>'
          '<div style="background:#f4f6fa;border-radius:10px;padding:14px 16px;margin-top:18px">'
          '<p style="font-size:14px;margin:0 0 8px"><b>¿Algún problema?</b> Si pasan varios días y nadie te ha contactado, o algo no ha ido bien, cuéntanoslo:</p>'
          f'<a href="{BASE}/incidencia?t={l["token"]}" style="color:#4A5D8A;font-weight:700;font-size:14px">Tengo un problema / no me han contactado →</a></div>')
        if enviar([l["email"]], "Hemos recibido tu solicitud · Málaga Startup Network",
                  marco("Solicitud recibida", cuerpo, "Recibes este correo porque has usado el buscador de Málaga Startup Network.")):
            res["confirmaciones"] += 1
        hecho("confirmacion", l["id"])
    except Exception as ex: res["errores"].append("conf " + str(ex)[:120])

for l in c.get("encuestas", []):
    try:
        t = l["token"]
        estrellas = "".join(f'<a href="{BASE}/valoracion?t={t}&n={i}" style="text-decoration:none;font-size:32px;color:#F9A825;margin:0 4px" title="{i} de 5">★</a>' for i in range(1, 6))
        cuerpo = (f'<h1 style="font-size:21px;margin:6px 0 12px">¿Cómo ha ido tu conexión, {e(nombre1(l.get("contact_name")))}?</h1>'
          f'<p style="font-size:15px;line-height:1.6">Hace una semana elegiste a <b>{e(lista(l.get("entidades")))}</b> para <b>{e(l.get("project_name"))}</b>. '
          'Nos ayuda mucho saber qué tal ha ido.</p>'
          f'<p style="text-align:center;margin:18px 0 4px">{estrellas}</p>'
          '<p style="text-align:center;font-size:12px;color:#6B7A99;margin:0 0 16px">Pulsa una puntuación: en la página podrás valorar a cada entidad por separado</p>'
          f'<p style="text-align:center;margin:10px 0">{boton(BASE + "/valoracion?t=" + t + "&nadie=1", "Alguna no me ha contactado", "#ffffff", "#c2410c", "#c2410c")}</p>')
        if enviar([l["email"]], "¿Cómo ha ido tu conexión? · Málaga Startup Network",
                  marco("Tu opinión", cuerpo, "Solo te escribimos esta vez para preguntarte. Gracias por usar el buscador.")):
            res["encuestas"] += 1
        hecho("encuesta", l["id"])
    except Exception as ex: res["errores"].append("enc " + str(ex)[:120])

for r in c.get("recordatorios", []):
    try:
        cuerpo = (f'<h1 style="font-size:20px;margin:6px 0 12px">¿Habéis contactado ya con {e(r.get("project_name") or r.get("contact_name"))}?</h1>'
          f'<p style="font-size:15px;line-height:1.6">Hace unos días <b>{e(r.get("contact_name"))}</b> eligió a <b>{e(r.get("entidad"))}</b> en el buscador de la red. '
          'Una respuesta rápida marca la diferencia para una startup que empieza.</p>'
          f'<p style="font-size:14px;line-height:1.6;background:#f4f6fa;border-radius:8px;padding:10px 12px"><b>Email:</b> <a href="mailto:{e(r.get("email"))}" style="color:#4A5D8A">{e(r.get("email"))}</a>'
          + (f'<br><b>Teléfono:</b> {e(r.get("phone"))}' if r.get("phone") else '') + '</p>'
          f'<p style="text-align:center;margin:18px 0 6px">{boton(BASE + "/contactado?t=" + r["token"], "✓ Ya le hemos contactado")}'
          f'{boton(PANEL, "Ver en el panel", "#ffffff", "#2C3959", "#2C3959")}</p>')
        if enviar(r.get("para") or [], f"Recordatorio: {r.get('project_name') or r.get('contact_name')} espera vuestro contacto",
                  marco("Recordatorio", cuerpo, "Solo os enviamos este recordatorio una vez por cada emprendedor."), bcc=r.get("superadmins")):
            res["recordatorios"] += 1
        hecho("recordatorio", r["id"])
    except Exception as ex: res["errores"].append("rec " + str(ex)[:120])

for v in c.get("valoraciones", []):
    try:
        t = v["token"]; eid = v["entity_id"]
        estrellas = "".join(f'<a href="{BASE}/valoracion?t={t}&e={eid}&n={i}" style="text-decoration:none;font-size:32px;color:#F9A825;margin:0 4px" title="{i} de 5">★</a>' for i in range(1, 6))
        cuerpo = (f'<h1 style="font-size:21px;margin:6px 0 12px">¿Qué tal con {e(v.get("entidad"))}, {e(nombre1(v.get("contact_name")))}?</h1>'
          f'<p style="font-size:15px;line-height:1.6"><b>{e(v.get("entidad"))}</b> nos dice que ya se ha puesto en contacto contigo por <b>{e(v.get("project_name"))}</b>. '
          '¿Cómo valorarías ese primer contacto?</p>'
          f'<p style="text-align:center;margin:18px 0 4px">{estrellas}</p>'
          '<p style="text-align:center;font-size:12px;color:#6B7A99;margin:0 0 16px">Pulsa de 1 a 5 estrellas (después podrás dejar un comentario)</p>'
          f'<p style="text-align:center;margin:10px 0">{boton(BASE + "/valoracion?t=" + t + "&e=" + eid + "&nadie=1", "En realidad no me han contactado", "#ffffff", "#c2410c", "#c2410c")}</p>')
        if enviar([v["email"]], f"¿Qué tal con {v.get('entidad')}? · Málaga Startup Network",
                  marco("Tu opinión", cuerpo, "Tu valoración nos ayuda a que las entidades de la red respondan mejor.")):
            res["valoraciones"] = res.get("valoraciones", 0) + 1
        hecho("valoracion", v["id"])
    except Exception as ex: res["errores"].append("val " + str(ex)[:120])

for p in c.get("posts_revision", []):
    try:
        cuerpo = ('<h1 style="font-size:20px;margin:6px 0 12px">Hemos recibido vuestra noticia</h1>'
          f'<p style="font-size:15px;line-height:1.6"><b>“{e(p["title"])}”</b> está ahora <b>en revisión</b> por el equipo de Málaga Startup Network. '
          'Os escribiremos en cuanto esté publicada, con el enlace para compartirla.</p>')
        enviar(p.get("para") or [], "Tu noticia está en revisión · Málaga Startup Network",
               marco("Noticias", cuerpo, "Enviada desde el panel de " + e(p.get("entidad") or "vuestra entidad") + "."))
        c2 = ('<h1 style="font-size:20px;margin:6px 0 12px">Nueva noticia para revisar</h1>'
          f'<p style="font-size:15px"><b>{e(p.get("entidad") or "—")}</b> ha enviado “{e(p["title"])}”.</p>'
          f'<p style="text-align:center">{boton(BASE + "/admin/revision", "Revisar ahora")}</p>')
        enviar(p.get("superadmins") or [], "[MSN] Noticia pendiente de revisión: " + (p["title"] or "")[:60], marco("Revisión", c2, "Aviso para superadmins."))
        hecho("post_revision", p["id"]); res["posts"] += 1
    except Exception as ex: res["errores"].append("prev " + str(ex)[:120])

for p in c.get("posts_publicados", []):
    try:
        url = BASE + "/noticias/" + p["slug"]
        cuerpo = ('<h1 style="font-size:20px;margin:6px 0 12px">¡Vuestra noticia ya está publicada!</h1>'
          f'<p style="font-size:15px;line-height:1.6"><b>“{e(p["title"])}”</b> ya se puede leer en Málaga Startup Network. ¡Compartidla en vuestras redes!</p>'
          f'<p style="text-align:center;margin:20px 0">{boton(url, "Ver la noticia publicada")}</p>'
          f'<p style="font-size:12px;color:#6B7A99;word-break:break-all">{url}</p>')
        enviar(p.get("para") or [], "Tu noticia ya está publicada · Málaga Startup Network", marco("Noticias", cuerpo, "Gracias por contar lo que hacéis en la red."))
        hecho("post_publicado", p["id"]); res["posts"] += 1
    except Exception as ex: res["errores"].append("ppub " + str(ex)[:120])

# ===== Avisos de la red por correo (desde 27-oct-2026; ver avisos_correo.py) =====
try:
    import avisos_correo
    avisos_correo.procesar(rpc, TOKEN, enviar, marco, boton, e, res)
except Exception as ex:
    res["errores"].append("avisos_red " + str(ex)[:120])

print(json.dumps(res, ensure_ascii=False))
