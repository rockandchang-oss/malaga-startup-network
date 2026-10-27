"""Avisos de la red por correo (27-oct-2026).
Lo llama notificar.py en cada pasada: envia los avisos publicados con 'enviar_correo' y aun sin enviar
a todos los miembros de las entidades publicadas (cada persona una sola vez) y aparte a los superadmins.
Marca cada aviso con robot_aviso_hecho para no repetir."""
import html, re
from datetime import datetime, timezone, timedelta

PANEL_AVISOS = "https://malagastartupnetwork.com/startups/admin/avisos"
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
TIPOS = {"reunion": "Reunión de la red", "aviso": "Aviso de la red", "plazo": "Plazo"}


def _enlinea(t):
    t = html.escape(t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" style="color:#4A5D8A;font-weight:700">\1</a>', t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return t


def texto_a_html(texto):
    """Mismo formato que la web: ## subtitulo, - lista, **negrita**, [texto](url), ![pie](url)."""
    out, lista, parrafo = [], [], []
    def cerrar():
        if parrafo:
            out.append('<p style="font-size:15px;line-height:1.55;margin:0 0 14px">' + "<br>".join(parrafo) + "</p>"); parrafo.clear()
        if lista:
            out.append('<ul style="font-size:15px;line-height:1.55;margin:0 0 14px;padding-left:20px">' + "".join(f"<li>{x}</li>" for x in lista) + "</ul>"); lista.clear()
    for cruda in (texto or "").replace("\r\n", "\n").split("\n"):
        l = cruda.strip()
        if not l: cerrar(); continue
        m = re.match(r"^!\[([^\]]*)\]\((https?://[^\s)]+)\)$", l)
        if m:
            cerrar(); out.append(f'<img src="{html.escape(m.group(2))}" alt="{html.escape(m.group(1))}" style="width:100%;max-width:512px;border-radius:10px;margin:0 0 14px">'); continue
        if re.match(r"^#{2,3}\s+", l):
            cerrar(); out.append('<h2 style="font-size:17px;margin:18px 0 8px;color:#2C3959">' + _enlinea(re.sub(r"^#{2,3}\s+", "", l)) + "</h2>"); continue
        if re.match(r"^[-•]\s+", l):
            if parrafo: cerrar()
            lista.append(_enlinea(re.sub(r"^[-•]\s+", "", l))); continue
        if lista: cerrar()
        parrafo.append(_enlinea(l))
    cerrar()
    return "".join(out)


def _fecha(iso):
    try:
        d = datetime.fromisoformat(str(iso).replace("Z", "+00:00")).astimezone(timezone.utc)
        # hora de Madrid aproximada (CET/CEST): ultimo domingo de marzo a ultimo domingo de octubre = +2
        def ult_domingo(anio, mes):
            x = datetime(anio, mes, 31, 1, tzinfo=timezone.utc)
            return x - timedelta(days=(x.weekday() + 1) % 7)
        off = 2 if ult_domingo(d.year, 3) <= d < ult_domingo(d.year, 10) else 1
        d = d + timedelta(hours=off)
        return f"{d.day} de {MESES[d.month - 1]} de {d.year}, {d.hour:02d}:{d.minute:02d}"
    except Exception:
        return ""


def html_aviso(a, quien, marco, boton, e):
    partes = [f'<h1 style="font-size:21px;line-height:1.3;margin:10px 0 12px">{e(a.get("titulo"))}</h1>']
    linea = " · ".join(x for x in (_fecha(a["fecha_evento"]) if a.get("fecha_evento") else "", a.get("lugar") or "") if x)
    if linea: partes.append(f'<p style="font-size:14px;font-weight:700;color:#4A5D8A;margin:0 0 14px">{e(linea)}</p>')
    partes.append(texto_a_html(a.get("cuerpo") or ""))
    botones = []
    if a.get("enlace"): botones.append(boton(a["enlace"], e((a.get("enlace_texto") or "").strip() or "Más información")))
    if a.get("adjunto_url"): botones.append(boton(a["adjunto_url"], "📄 " + e((a.get("adjunto_nombre") or "").strip() or "Descargar documento"), "#ffffff", "#2C3959", "#2C3959"))
    if botones: partes.append('<div style="text-align:center;margin:18px 0 8px">' + "<br>".join(botones) + "</div>")
    partes.append(f'<p style="font-size:13px;color:#6B7A99;text-align:center;margin:14px 0 0">También lo tienes en los <a href="{PANEL_AVISOS}" style="color:#4A5D8A">avisos de tu panel</a>.</p>')
    return marco(TIPOS.get(a.get("tipo"), "Aviso de la red"), "".join(partes), quien)


def procesar(rpc, token, enviar, marco, boton, e, res):
    res["avisos_red"] = 0
    for a in rpc("robot_avisos_correo", {"token": token}) or []:
        try:
            ya, total = set(), 0
            asunto = (a.get("titulo") or "Aviso de la red")[:150]
            for ent, para in sorted((a.get("para") or {}).items()):
                para = [x for x in (para or []) if x and x.lower() not in ya]
                if not para: continue
                if enviar(para, asunto, html_aviso(a, f"Recibes este aviso como miembro de {e(ent)} en Málaga Startup Network.", marco, boton, e)):
                    ya.update(x.lower() for x in para); total += len(para)
            sup = [x for x in (a.get("superadmins") or []) if x and x.lower() not in ya]
            if sup and enviar(sup, "[Copia superadmin] " + asunto, html_aviso(a, "Copia para superadmins: este aviso se ha enviado a todas las entidades de la red.", marco, boton, e)):
                total += len(sup)
            rpc("robot_aviso_hecho", {"token": token, "aid": a["id"], "n": total})
            res["avisos_red"] += 1
        except Exception as ex:
            res["errores"].append("aviso " + str(ex)[:120])
