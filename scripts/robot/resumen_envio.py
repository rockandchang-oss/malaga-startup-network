#!/usr/bin/env python3
"""Informe quincenal de leads para las entidades de MSN.
  resumen_envio.py --prueba EMAIL [Entidad ...]   -> genera y manda SOLO a EMAIL (asunto [PRUEBA · entidad])
  resumen_envio.py --si-toca                      -> envio real a todas si han pasado >=14 dias desde el ultimo
  resumen_envio.py --forzar                       -> envio real ya (ignora el plazo)
Datos: RPC robot_resumen_red (token robot). Plantilla: resumen_red.py. Envio: enviar.sh (SES)."""
import os, sys, json, subprocess, datetime, urllib.request, tempfile
D=os.path.dirname(os.path.abspath(__file__))
MARCA=os.path.join(D,"resumen-ultimo.txt"); LOG=os.path.join(D,"resumen.log")
SB=os.environ["SB_URL"].rstrip("/"); K=os.environ["SB_KEY"]; T=os.environ["ROBOT_TOKEN"]

def log(m):
    line=f"{datetime.datetime.now():%Y-%m-%d %H:%M} {m}"; print(line)
    open(LOG,"a").write(line+"\n")

def datos():
    req=urllib.request.Request(f"{SB}/rest/v1/rpc/robot_resumen_red",data=json.dumps({"token":T}).encode(),
        headers={"apikey":K,"Authorization":f"Bearer {K}","Content-Type":"application/json"},method="POST")
    return json.load(urllib.request.urlopen(req,timeout=60))

def html_de(d,ent):
    with tempfile.NamedTemporaryFile("w",suffix=".json",delete=False) as f: json.dump(d,f,ensure_ascii=False); p=f.name
    try: return subprocess.run(["python3",os.path.join(D,"resumen_red.py"),p,ent],capture_output=True,text=True,check=True).stdout
    finally: os.unlink(p)

def enviar(asunto,html,para):
    r=subprocess.run([os.path.join(D,"enviar.sh")],input=json.dumps({"asunto":asunto,"html":html,"para":para}),capture_output=True,text=True)
    return (r.stdout.strip() or r.stderr.strip())[-400:]

def main():
    a=sys.argv[1:]
    if not a: print(__doc__); return
    d=datos(); hoy=datetime.date.today()
    asunto="Así se está moviendo la red · Málaga Startup Network"
    if a[0]=="--prueba":
        dest=a[1]; ents=a[2:] or [e[0] for e in d["ent"]][:3]
        for ent in ents:
            log(f"PRUEBA {ent} -> {dest}: "+enviar(f"[PRUEBA · {ent}] {asunto}",html_de(d,ent),[dest]))
        return
    if a[0]=="--si-toca" and os.path.exists(MARCA):
        ult=datetime.date.fromisoformat(open(MARCA).read().strip())
        if (hoy-ult).days<14: print(f"no toca (ultimo {ult})"); return
    if not d["leads"]: log("sin leads, no se envia"); return
    open(MARCA,"w").write(hoy.isoformat())   # marca ANTES de enviar: si algo falla a medias, no se reenvia en bucle
    tot=0
    for ent,_s,_e,_p,_c in d["ent"]:
        para=d["para"].get(ent) or []
        if not para: log(f"{ent}: sin destinatarios"); continue
        res=enviar(asunto,html_de(d,ent),para); tot+=len(para)
        log(f"ENVIO {ent} ({len(para)}): {res}")
    log(f"FIN envio real: {tot} destinatarios, {len(d['ent'])} entidades, {len(d['leads'])} leads")

if __name__=="__main__": main()
