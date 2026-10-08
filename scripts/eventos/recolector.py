#!/usr/bin/env python3
"""Recolector de eventos de emprendimiento de Andalucía para MSN.
Fuentes: Portal Andaluz (Junta), Cámara de Comercio de Málaga, Meetup, FYCMA (Tribe REST),
RSS de eventos de universidades andaluzas (Symposium). Clasifica por tipo, deduplica cross-fuente
(clave canónica titulo+fecha), enriquece imagen (og:image) y provincia/online, e inserta en Supabase
vía RPC eventos_ingesta. Env: SB_URL, SB_KEY (publishable), ROBOT_TOKEN."""
import os, re, json, hashlib, unicodedata, urllib.request, datetime, html, email.utils
from collections import Counter

SB_URL=os.environ["SB_URL"].rstrip("/"); SB_KEY=os.environ["SB_KEY"]; TOKEN=os.environ["ROBOT_TOKEN"]
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
PA="https://www.juntadeandalucia.es/emprendimientoandaluz"

def get(u):
    r=urllib.request.Request(u,headers={"User-Agent":UA,"Accept":"text/html,application/json","Accept-Language":"es-ES,es"})
    return urllib.request.urlopen(r,timeout=12).read().decode("utf-8","ignore")

def rpc(nombre,datos):
    req=urllib.request.Request(f"{SB_URL}/rest/v1/rpc/{nombre}",data=json.dumps(datos).encode(),
        headers={"apikey":SB_KEY,"Authorization":f"Bearer {SB_KEY}","Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=60) as r:
        t=r.read().decode(); return json.loads(t) if t else None

def limpia(s): return re.sub(r"\s+"," ", re.sub(r"<[^>]+>","",s or "")).strip()
def norm(s):
    s=unicodedata.normalize("NFD",(s or "").lower()); s="".join(c for c in s if unicodedata.category(c)!="Mn")
    return re.sub(r"[^a-z0-9]+"," ",s).strip()

PROV={"malaga":"Málaga","sevilla":"Sevilla","granada":"Granada","cordoba":"Córdoba","cadiz":"Cádiz",
 "almeria":"Almería","huelva":"Huelva","jaen":"Jaén","algeciras":"Cádiz","jerez":"Cádiz","marbella":"Málaga",
 "dos hermanas":"Sevilla","roquetas":"Almería","linares":"Jaén","antequera":"Málaga","ronda":"Málaga",
 "motril":"Granada","ejido":"Almería","sanlucar":"Cádiz","utrera":"Sevilla","andujar":"Jaén",
 "velez malaga":"Málaga","fuengirola":"Málaga","torremolinos":"Málaga","benalmadena":"Málaga","mijas":"Málaga",
 "estepona":"Málaga","rincon de la victoria":"Málaga","alhaurin":"Málaga","cartama":"Málaga","nerja":"Málaga",
 "coin":"Málaga","pizarra":"Málaga","techpark":"Málaga","pta":"Málaga","polo digital":"Málaga",
 "ecija":"Sevilla","carmona":"Sevilla","moron":"Sevilla","alcala de guadaira":"Sevilla","lebrija":"Sevilla","cartuja":"Sevilla",
 "baeza":"Jaén","ubeda":"Jaén","martos":"Jaén","puente genil":"Córdoba","lucena":"Córdoba","montilla":"Córdoba",
 "baza":"Granada","loja":"Granada","guadix":"Granada","armilla":"Granada","chiclana":"Cádiz","puerto real":"Cádiz",
 "san fernando":"Cádiz","la linea":"Cádiz","conil":"Cádiz","vejer":"Cádiz","lepe":"Huelva","ayamonte":"Huelva",
 "cartaya":"Huelva","aracena":"Huelva","vera":"Almería","nijar":"Almería","adra":"Almería"}
TIPOS=[("Hackatón",["hackaton","hackathon","datathon"]),
 ("Financiación / subvención",["subvencion","ayuda","ayudas","financiacion","incentivo","microbank","enisa","credito","prestamo"]),
 ("Convocatoria / concurso",["convocatoria","concurso","premio","premios","certamen","reto","challenge"]),
 ("Inversión",["inversor","inversion","business angel","capital","ronda","venture","foro de inversion"]),
 ("Aceleración / incubación",["acelerad","incubad","lanzadera","vivero"]),
 ("Networking / encuentro",["networking","encuentro","meetup","afterwork","desayuno","cowork"]),
 ("Formación / taller",["taller","curso","formacion","webinar","masterclass","workshop","seminario","elevator","pitch"]),
 ("Jornada",["jornada","jornadas"]),
 ("Feria / congreso",["feria","congreso","summit","foro","expo","fest","conferencia"])]
ONLINE_RE=re.compile(r"\bonline\b|webinar|virtual|en linea|telem|streaming|zoom|teams|meet")
# Relevancia (solo para fuentes amplias: universidades, FYCMA)
REL=["emprend","startup","start up","innovac","inversion","inversor","business angel","acelerad","incubad",
 "lanzadera","vivero","financiacion","subvencion","convocatoria","concurso","premio","certamen","hackaton",
 "hackathon","pitch","venture","scaleup","spin off","spinoff","demo day","transferencia","otri","fintech",
 "deeptech","foro de inversion","networking","pyme","autonomo","negocio","transfiere","greencities",
 "digital enterprise","impact hub","propiedad intelectual","patente","comercializa","mentoriz","aceleracion",
 "financia","ayudas","industria 4","tech","tecnolog","digitaliza"]
def relevante(txt):
    n=norm(txt); return any(k in n for k in REL)

def clasifica(txt):
    n=norm(txt)
    for tipo,kws in TIPOS:
        if any(k in n for k in kws): return tipo
    return "Evento"
def provincia_txt(txt):
    n=norm(txt); prov=None
    for k,v in PROV.items():
        if re.search(r"\b"+re.escape(k)+r"\b",n): prov=v
    return prov

def mkitem(tit,des,start,end,hora,prov,cat,url,img,fuente,organizador=None,online=None):
    txt=tit+" "+(des or "")
    return {"titulo":tit,"descripcion":des,"fecha_inicio":start,"fecha_fin":end,"hora":hora,
     "ciudad":None,"provincia":prov,"online":(online if online is not None else bool(ONLINE_RE.search(norm(txt)))),
     "categoria":cat,"url":url,"imagen_url":img,"fuente":fuente,"organizador":organizador,"estado":"publicado",
     "dedupe_key":"ev_"+hashlib.sha1((norm(tit)+"|"+start).encode()).hexdigest()[:20]}

def og_image(url):
    try: h=get(url)
    except Exception: return None
    for pat in (r'<meta[^>]+property=["\']og:image(?::url)?["\'][^>]+content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image',
                r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)'):
        m=re.search(pat,h,re.I)
        if m:
            u=html.unescape(m.group(1)).strip()
            if u.startswith("//"): u="https:"+u
            if u.startswith("http"): return u
    return None

def _unfold(txt):
    out=[]
    for ln in txt.splitlines():
        if ln[:1] in (" ","\t") and out: out[-1]+=ln[1:]
        else: out.append(ln)
    return out

def ical_source(url, fuente, provincia_fija=None, organizador=None):
    try: raw=get(url)
    except Exception as ex: print("ERROR ical",fuente,ex); return []
    out=[]; cur=None
    for ln in _unfold(raw):
        if ln=="BEGIN:VEVENT": cur={}
        elif ln=="END:VEVENT" and cur is not None:
            tit=limpia(cur.get("SUMMARY","")).replace("\\,",",").replace("\\;",";")
            ds=cur.get("DTSTART",""); de=cur.get("DTEND","")
            m=re.search(r"(\d{8})",ds)
            if not tit or not m: cur=None; continue
            start=m.group(1); start=f"{start[:4]}-{start[4:6]}-{start[6:8]}"
            hm=re.search(r"T(\d{2})(\d{2})",ds); hora=f"{hm.group(1)}:{hm.group(2)}" if hm else None
            me=re.search(r"(\d{8})",de); end=None
            if me:
                e2=me.group(1); e2=f"{e2[:4]}-{e2[4:6]}-{e2[6:8]}"
                if e2!=start: end=e2
            u=limpia(cur.get("URL","")) or None
            loc=limpia(cur.get("LOCATION","")); des=limpia(cur.get("DESCRIPTION",""))[:500] or None
            prov=provincia_fija or provincia_txt(tit+" "+loc)
            txt=tit+" "+(des or "")
            out.append(mkitem(tit,des,start,end,hora,prov,clasifica(txt),u,None,fuente,organizador))
            cur=None
        elif cur is not None and ":" in ln:
            k=ln.split(":",1)[0].split(";")[0]; v=ln.split(":",1)[1]
            if k in ("SUMMARY","DTSTART","DTEND","URL","LOCATION","DESCRIPTION","UID"): cur[k]=v
    return out

def portal_andaluz():
    h=get(f"{PA}/listado-de-eventos")
    cands=re.findall(r'\[\{\\u0022title\\u0022:.*?borderColor\\u0022:\\u0022#[0-9a-fA-F]{6}\\u0022\}\]', h, re.S)
    if not cands: return []
    esc=max(cands,key=len); s=json.loads('"'+esc.replace('"','\\"')+'"'); arr=json.loads(s)
    out=[]
    for e in arr:
        tit=limpia(e.get("title",""))
        if not tit: continue
        tit=re.sub(r"[_\s]*\d{1,2}\s+(y|al)\s+\d{1,2}.*$","",tit).strip(" _")
        start=(e.get("start") or "")[:10]
        if not re.match(r"\d{4}-\d{2}-\d{2}",start): continue
        end=(e.get("end") or "")[:10]; end=end if end and end!=start else None
        hora=(e.get("start") or "")[11:16] or None
        url=e.get("url",""); url=("https://www.juntadeandalucia.es"+url) if url.startswith("/") else url
        des=limpia(e.get("des",""))
        it=mkitem(tit,des or None,start,end,hora,provincia_txt(tit+" "+des),clasifica(tit+" "+des),url,None,
                  "Portal Andaluz de Emprendimiento","Andalucía Emprende")
        it["_portal"]=True
        out.append(it)
    return out

def tribe_source(base, fuente, prov_default=None, solo_relevante=True, organizador=None):
    hoy=datetime.date.today().isoformat()
    url=base+("&" if "?" in base else "?")+f"per_page=50&start_date={hoy}"
    try: d=json.loads(get(url))
    except Exception as ex: print("ERROR tribe",fuente,ex); return []
    out=[]
    for e in d.get("events",[]):
        tit=limpia(e.get("title",""))
        if not tit: continue
        start=(e.get("start_date") or "")[:10]; end=(e.get("end_date") or "")[:10]
        if not re.match(r"\d{4}-\d{2}-\d{2}",start): continue
        end=end if end and end!=start else None
        des=limpia(e.get("description",""))[:500] or None
        img=e.get("image"); img=(img.get("url") if isinstance(img,dict) else img) or None
        v=e.get("venue") or {}; city=(v.get("city") if isinstance(v,dict) else "") or ""
        txt=tit+" "+(des or "")
        if solo_relevante and not relevante(txt): continue
        prov=provincia_txt(city+" "+tit+" "+(des or "")) or prov_default
        hm=re.search(r"T(\d{2}):(\d{2})",e.get("start_date") or ""); hora=f"{hm.group(1)}:{hm.group(2)}" if hm else None
        if hora=="00:00": hora=None
        out.append(mkitem(tit,des,start,end,hora,prov,clasifica(txt),e.get("url") or None,img,fuente,organizador))
    return out

def symposium_rss(url, fuente, prov_default=None):
    try: raw=get(url)
    except Exception as ex: print("ERROR rss",fuente,ex); return []
    out=[]
    for it in re.findall(r"<item>(.*?)</item>",raw,re.S):
        def g(tag):
            m=re.search(r"<"+tag+r">(.*?)</"+tag+r">",it,re.S); return m.group(1) if m else ""
        tit=limpia(html.unescape(g("title")))
        if not tit: continue
        pub=limpia(g("pubDate"))
        try: dt=email.utils.parsedate_to_datetime(pub)
        except Exception: continue
        start=dt.date().isoformat()
        link=limpia(html.unescape(g("link"))) or None
        des=re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",html.unescape(g("description")))).strip()[:500] or None
        txt=tit+" "+(des or "")
        if not relevante(txt): continue
        online=bool(ONLINE_RE.search(norm(des or "")))
        prov=provincia_txt(txt) or prov_default
        hora=dt.strftime("%H:%M") if (dt.hour or dt.minute) else None
        out.append(mkitem(tit,des,start,None,hora,("Online" if online and not prov else prov),clasifica(txt),link,None,fuente,None,online))
    return out

def main(dry=False):
    items=[]
    def add(fn,*a,**k):
        try: items.extend(fn(*a,**k))
        except Exception as ex: print("ERROR",getattr(fn,'__name__',fn),a[:1],ex)
    add(portal_andaluz)
    add(ical_source,"https://camaramalaga.com/events/?ical=1","Cámara de Comercio de Málaga","Málaga","Cámara de Comercio de Málaga")
    for g in ["python-malaga","aws-user-group-malaga","wordpress-malaga"]:
        add(ical_source,f"https://www.meetup.com/{g}/events/ical/", f"Meetup · {g}", "Málaga", g)
    add(tribe_source,"https://www.fycma.com/wp-json/tribe/events/v1/events","FYCMA · Palacio de Ferias","Málaga",True,"FYCMA")
    for dom,fu in [("eventos.uma.es","Universidad de Málaga"),("eventos.uco.es","Universidad de Córdoba"),
                   ("eventos.us.es","Universidad de Sevilla"),("eventos.uhu.es","Universidad de Huelva"),
                   ("eventos.ujaen.es","Universidad de Jaén"),("eventos.uca.es","Universidad de Cádiz")]:
        pv={"eventos.uma.es":"Málaga","eventos.uco.es":"Córdoba","eventos.us.es":"Sevilla",
            "eventos.uhu.es":"Huelva","eventos.ujaen.es":"Jaén","eventos.uca.es":"Cádiz"}[dom]
        add(symposium_rss,f"https://{dom}/rss.html",fu,pv)

    # dedup cross-fuente por clave canonica (titulo+fecha); fusiona rellenando huecos, prefiere con imagen
    vistos={}
    for it in items:
        k=it["dedupe_key"]; cur=vistos.get(k)
        if not cur: vistos[k]=it; continue
        for campo in ("imagen_url","url","descripcion","provincia","hora","fecha_fin","organizador"):
            if not cur.get(campo) and it.get(campo): cur[campo]=it[campo]
        if it.get("_portal"): cur["_portal"]=True
    items=list(vistos.values())
    hoy=(datetime.date.today()-datetime.timedelta(days=7)).isoformat()
    items=[i for i in items if i["fecha_inicio"]>=hoy]

    import concurrent.futures as _cf
    def _enriquecer(it):
        # Portal: ficha da provincia+online+imagen; resto: og:image de la URL si no tiene imagen
        if it.get("_portal") and it.get("url"):
            try:
                h=get(it["url"]); frag=""
                i=h.find("field--name-field-ubicacion")
                if i>=0: frag=re.sub(r"<[^>]+>"," ",h[i:i+600])
                else:
                    m=re.search(r"Lugar\s*[:<]",h)
                    if m: frag=re.sub(r"<[^>]+>"," ",h[m.start():m.start()+400])
                frag=re.sub(r"\s+"," ",frag).strip()
                prov=provincia_txt(frag); onl=bool(ONLINE_RE.search(norm(frag)))
                img=None; j=h.find("field--name-field-imagen-destacada")
                if j>=0:
                    mi=re.search(r'<img[^>]*src="([^"]+)"',h[j:j+600])
                    if mi:
                        img=mi.group(1)
                        if img.startswith("/"): img="https://www.juntadeandalucia.es"+img
                if prov and not it.get("provincia"): it["provincia"]=prov
                if img and not it.get("imagen_url"): it["imagen_url"]=img
                if onl:
                    it["online"]=True
                    if not it.get("provincia"): it["provincia"]="Online"
            except Exception: pass
        if not it.get("imagen_url") and it.get("url"):
            img=og_image(it["url"])
            if img: it["imagen_url"]=img
    with _cf.ThreadPoolExecutor(max_workers=12) as ex:
        list(ex.map(_enriquecer, items))
    for it in items: it.pop("_portal",None)

    print("total a enviar:",len(items))
    print("con imagen:",sum(1 for i in items if i.get("imagen_url")),"| con intervalo (fecha_fin):",sum(1 for i in items if i.get("fecha_fin")))
    print("por fuente:",dict(Counter(i["fuente"].split(" · ")[0] for i in items)))
    print("por provincia:",dict(Counter(i["provincia"] or "—" for i in items)))
    if dry:
        import json as _j
        print("MUESTRA:")
        for i in items[:8]: print("  ",i["fecha_inicio"],(i["fecha_fin"] or "   —    "),"|",(i["provincia"] or "—")[:8].ljust(8),"|img" if i["imagen_url"] else "|  ","|",i["fuente"][:28].ljust(28),"|",i["titulo"][:40])
        return
    for lote in [items[i:i+200] for i in range(0,len(items),200)]:
        if lote: print("ingesta:",rpc("eventos_ingesta",{"token":TOKEN,"items":lote}))

if __name__=="__main__":
    import sys; main(dry=("--dry" in sys.argv))
