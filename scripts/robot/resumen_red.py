#!/usr/bin/env python3
"""Resumen periodico para las entidades de MSN (borrador). Uso: resumen_red.py datos.json "Nombre entidad" > salida.html
datos.json: {"desde": "...", "leads": [...anonimos...], "ent": [[nombre, sugerida, elegida, programas, contactadas], ...]}"""
import json, sys, html
from collections import Counter
D = json.load(open(sys.argv[1])); YO = sys.argv[2]
L = D["leads"]; E = D["ent"]; N = len(L)
e = lambda x: html.escape(str(x))
PANEL = "https://malagastartupnetwork.com/startups/admin"

def estado(l):
    p = " ".join(l["punto"])
    if "facturo" in p or "clientes que me pagan" in p: return ("Ya factura / tiene clientes", "#047857", "#d1fae5")
    if "constituido" in p: return ("Empresa constituida", "#1d4ed8", "#dbeafe")
    if "MVP" in p: return ("Idea validada / MVP", "#b45309", "#fef3c7")
    return ("Idea", "#475569", "#f1f5f9")
def chip(t, fg, bg): return f'<span style="display:inline-block;background:{bg};color:{fg};border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;margin:1px 2px 1px 0">{e(t)}</span>'
def corto(n): return {"Financiación / inversión":"Financiación","Contactos / networking":"Networking","Ayudas y subvenciones públicas":"Ayudas públicas",
    "Salir al mercado internacional":"Internacionalización","Mentoring y asesoramiento":"Mentoring","Ayuda para constituir mi empresa":"Constituir empresa",
    "Espacio de trabajo / coworking":"Espacio / coworking"}.get(n, n)
def barras(cnt, total, color="#4A5D8A"):
    f = ""
    for k, v in cnt.most_common():
        w = max(4, round(v / total * 100))
        f += (f'<tr><td style="padding:3px 8px 3px 0;font-size:13px;white-space:nowrap">{e(k)}</td>'
              f'<td style="width:100%;padding:3px 0"><div style="background:{color};height:10px;border-radius:5px;width:{w}%"></div></td>'
              f'<td style="padding:3px 0 3px 8px;font-size:13px;font-weight:700;text-align:right">{v}</td></tr>')
    return f'<table style="width:100%;border-collapse:collapse">{f}</table>'
def caja(titulo, cuerpo): return f'<div style="margin:22px 0 0"><h2 style="font-size:16px;margin:0 0 10px;color:#2C3959">{titulo}</h2>{cuerpo}</div>'

est = Counter(estado(l)[0] for l in L)
fact = est["Ya factura / tiene clientes"]
nec = Counter(corto(n) for l in L for n in l["nec"])
sect = Counter(s for l in L for s in l["sect"] if not s.startswith("Otro"))
fase = Counter(l["fase"] or "Sin indicar" for l in L)
zona = Counter(l["zona"] for l in L)
elecciones = sum(l["el"] for l in L)
financ = nec["Financiación"]

kpi = lambda n, t: f'<td style="width:25%;text-align:center;padding:12px 4px;background:#f4f6fa;border-radius:10px"><div style="font-size:26px;font-weight:800;color:#2C3959">{n}</div><div style="font-size:11px;color:#6B7A99;line-height:1.3">{t}</div></td>'
kpis = (f'<table style="width:100%;border-collapse:separate;border-spacing:6px 0;margin:4px -6px 0"><tr>{kpi(N,"startups inscritas")}{kpi(elecciones,"veces que eligieron una entidad")}'
        f'{kpi(f"{fact}/{N}","ya facturan o tienen clientes")}{kpi(f"{financ}/{N}","buscan financiación")}</tr></table>')

filas = ""
for l in sorted(L, key=lambda x: x["f"], reverse=True):
    t, fg, bg = estado(l)
    d = "/".join(reversed(l["f"].split("-")[1:]))
    filas += (f'<tr style="border-top:1px solid #e3e7ef"><td style="padding:8px 6px 8px 0;font-size:12px;color:#6B7A99;vertical-align:top;white-space:nowrap">{d}</td>'
              f'<td style="padding:8px 0;font-size:13px;vertical-align:top"><b>{e(l["fase"] or "Fase sin indicar")}</b> · {e(", ".join(s for s in l["sect"] if not s.startswith("Otro")) or "Sector sin definir")} · {e(l["zona"])}<br>'
              f'{chip(t, fg, bg)}<span style="font-size:12px;color:#6B7A99"> Busca: {e(", ".join(corto(n) for n in l["nec"]))}</span></td></tr>')
lista = f'<table style="width:100%;border-collapse:collapse">{filas}</table><p style="font-size:11px;color:#6B7A99;margin:6px 0 0">Datos anónimos: no mostramos nombres ni contactos de las startups.</p>'

ranking = sorted(E, key=lambda x: (-x[2], -x[1], x[0]))
pos = next(i for i, x in enumerate(ranking) if x[0] == YO) + 1
top = "".join(f'<tr><td style="padding:5px 8px 5px 0;font-size:18px">{m}</td><td style="font-size:14px;font-weight:700;width:100%">{e(x[0])}</td>'
              f'<td style="font-size:13px;white-space:nowrap;text-align:right">elegida <b>{x[2]}</b> · recomendada <b>{x[1]}</b></td></tr>'
              for m, x in zip(["🥇", "🥈", "🥉"], ranking[:3]) if x[2] > 0)
yo = next(x for x in E if x[0] == YO)
_, sug, eleg, progs, cont = yo
mio = (f'<table style="width:100%;border-collapse:separate;border-spacing:6px 0;margin:4px -6px 0"><tr>{kpi(sug,"veces que el buscador os recomendó")}'
       f'{kpi(eleg,"startups que os eligieron")}{kpi(cont,"contactos confirmados")}{kpi(progs,"programas publicados")}</tr></table>'
       f'<p style="font-size:14px;margin:12px 0 0">Posición en la red por startups que os eligieron: <b>{pos}.º de {len(E)}</b>.</p>')
if progs == 0:
    herida = (f'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-top:14px"><p style="margin:0;font-size:14px;line-height:1.55;color:#9a3412">'
              f'<b>Todavía no tenéis ningún programa publicado, así que el buscador no puede recomendaros.</b> {financ} de las {N} startups buscaban financiación y {nec["Networking"]} networking. '
              'Si subís vuestros programas y servicios, empezaremos a enviaros las que encajen.</p></div>')
elif progs == 1 and eleg == 0:
    herida = (f'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-top:14px"><p style="margin:0;font-size:14px;line-height:1.55;color:#9a3412">'
              f'<b>Solo tenéis 1 programa publicado.</b> Las startups que llegan buscan sobre todo {", ".join(k for k,_ in nec.most_common(3))}. '
              'Cada programa o servicio que añadáis, con sus necesidades y fases bien marcadas, es una oportunidad más de que el buscador os recomiende.</p></div>')
else:
    herida = ('<p style="font-size:14px;line-height:1.55;margin:14px 0 0">Para seguir apareciendo, mantened vuestros programas al día: '
              'añadid las convocatorias nuevas y marcad bien las necesidades y fases a las que se dirigen.</p>')
boton = lambda url, t: f'<a href="{url}" style="background:#F9A825;color:#2C3959;text-decoration:none;font-weight:700;font-size:15px;padding:12px 24px;border-radius:50px;display:inline-block;margin:4px">{t}</a>'

cuerpo = f'''<h1 style="font-size:22px;margin:4px 0 6px">Así se está moviendo la red</h1>
<p style="font-size:14px;color:#4A5D8A;margin:0 0 14px">Resumen acumulado desde el {e(D["desde"])} · Málaga Startup Network</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 6px">Estas son las startups que han usado el buscador de la red y lo que buscan. Os lo contamos para que sepáis qué está llegando aunque no entréis al panel.</p>
{kpis}
{caja("Qué startups están llegando", lista)}
{caja("En qué fase están", barras(fase, N))}
{caja("Qué necesitan", barras(nec, N, "#F9A825"))}
{caja("Sectores", barras(sect, N))}
{caja("De dónde vienen", barras(zona, N))}
{caja("Entidades más elegidas", f'<table style="width:100%;border-collapse:collapse">{top}</table>')}
<div style="margin:26px 0 0;border:2px solid #2C3959;border-radius:12px;padding:16px">
<h2 style="font-size:16px;margin:0 0 10px;color:#2C3959">{e(YO)}: vuestros datos</h2>{mio}{herida}
<p style="text-align:center;margin:16px 0 0">{boton(PANEL + "/programas", "Añadir / revisar programas")}{boton(PANEL + "/emprendedores", "Ver emprendedores")}</p></div>'''

print(f'''<div style="background:#f4f6fa;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#2C3959">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e7ef">
<div style="background:#2C3959;padding:20px 24px"><img src="https://malagastartupnetwork.com/startups/logo-MSN.jpg" width="40" height="40" style="border-radius:8px;vertical-align:middle"><span style="color:#fff;font-size:17px;font-weight:700;vertical-align:middle;margin-left:10px">Málaga Startup Network</span></div>
<div style="padding:24px">{cuerpo}</div>
<div style="background:#f4f6fa;padding:14px 24px;font-size:11px;color:#6B7A99">Recibís este resumen como entidad de Málaga Startup Network. Las recomendaciones del buscador se reparten desde el 6-oct con un máximo de 2 programas por entidad.</div></div></div>''')
