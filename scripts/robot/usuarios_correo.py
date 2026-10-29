"""Avisos por correo de 'Usuarios y accesos' (29-oct-2026). Lo llama notificar.py en cada pasada:
 - al aprobador (Isaac), cuando otro superadmin pide un cambio de usuarios (queda pendiente);
 - al que lo pidio, cuando se aprueba o se rechaza."""
PANEL = "https://malagastartupnetwork.com/startups/admin/usuarios"
TIPO = {"invitar": "Dar de alta", "cambiar_rol": "Cambiar rol", "quitar": "Quitar acceso", "reenviar_acceso": "Reenviar acceso"}
ROL = {"entity_admin": "administrador", "editor": "editor"}

def _desc(s, e):
    t = f'<b>{TIPO.get(s.get("tipo"), s.get("tipo"))}</b>: {e(s.get("full_name") + " · " if s.get("full_name") else "")}{e(s.get("email"))}'
    if s.get("entidad"): t += f' en <b>{e(s["entidad"])}</b>'
    if s.get("role") and s.get("tipo") in ("invitar", "cambiar_rol"): t += f' como {ROL.get(s["role"], s["role"])}'
    return t

def procesar(rpc, token, enviar, marco, boton, e, res):
    res["solicitudes_usuarios"] = 0
    d = rpc("robot_solicitudes_usuarios", {"token": token}) or {}
    aprob = [x for x in (d.get("aprobadores") or []) if x]
    for s in d.get("nuevas") or []:
        try:
            para = [x for x in aprob if x.lower() != (s.get("solicitante") or "").lower()]  # nadie aprueba lo suyo
            cuerpo = ('<h1 style="font-size:20px;margin:6px 0 12px">Solicitud pendiente de tu aprobación</h1>'
                      f'<p style="font-size:15px;line-height:1.6">{e(s.get("solicitante") or "Un superadmin")} pide:</p>'
                      f'<p style="font-size:15px;line-height:1.6;background:#FFF8E1;padding:12px;border-radius:8px">{_desc(s, e)}'
                      + (f'<br><span style="color:#6B7A99">Motivo: {e(s["motivo"])}</span>' if s.get("motivo") else "") + '</p>'
                      f'<p style="text-align:center;margin:20px 0">{boton(PANEL, "Revisar y aprobar")}</p>'
                      '<p style="font-size:12px;color:#6B7A99">No se aplica nada hasta que lo apruebes en el panel.</p>')
            if enviar(para, "[MSN] Solicitud de usuarios: " + TIPO.get(s.get("tipo"), "") + " " + (s.get("email") or ""), marco("Usuarios y accesos", cuerpo, "Aviso para aprobadores de Málaga Startup Network.")):
                rpc("robot_solicitud_avisada", {"token": token, "sid": s["id"], "cual": "aprobador"}); res["solicitudes_usuarios"] += 1
        except Exception as ex:
            res["errores"].append("solus " + str(ex)[:120])
    for s in d.get("resueltas") or []:
        try:
            if not s.get("solicitante"):
                rpc("robot_solicitud_avisada", {"token": token, "sid": s["id"], "cual": "resultado"}); continue
            est = {"ejecutada": "aprobada y aplicada", "rechazada": "rechazada", "error": "aprobada, pero falló al aplicarse"}.get(s.get("estado"), s.get("estado"))
            cuerpo = (f'<h1 style="font-size:20px;margin:6px 0 12px">Tu solicitud ha sido {est}</h1>'
                      f'<p style="font-size:15px;line-height:1.6">{_desc(s, e)}</p>'
                      + (f'<p style="font-size:14px;color:#4A5D8A">{e(s["resultado"])}</p>' if s.get("resultado") else "")
                      + f'<p style="text-align:center;margin:20px 0">{boton(PANEL, "Ver usuarios y accesos")}</p>')
            if enviar([s["solicitante"]], "[MSN] Solicitud " + est + ": " + (s.get("email") or ""), marco("Usuarios y accesos", cuerpo, "Málaga Startup Network")):
                rpc("robot_solicitud_avisada", {"token": token, "sid": s["id"], "cual": "resultado"}); res["solicitudes_usuarios"] += 1
        except Exception as ex:
            res["errores"].append("solus2 " + str(ex)[:120])
