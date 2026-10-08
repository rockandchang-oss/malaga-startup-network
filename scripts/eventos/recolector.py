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

def limpia(s): return re.sub(r"\s+"," ", html.unescape(re.sub(r"<[^>]+>","",html.unescape(s or "")))).strip()
def norm(s):
    s=unicodedata.normalize("NFD",(s or "").lower()); s="".join(c for c in s if unicodedata.category(c)!="Mn")
    return re.sub(r"[^a-z0-9]+"," ",s).strip()

PROV={"malaga":"Málaga","sevilla":"Sevilla","granada":"Granada","cordoba":"Córdoba","cadiz":"Cádiz",
 "almeria":"Almería","huelva":"Huelva","jaen":"Jaén","algeciras":"Cádiz","jerez":"Cádiz","marbella":"Málaga",
 "dos hermanas":"Sevilla","roquetas":"Almería","linares":"Jaén","antequera":"Málaga","ronda":"Málaga",
 "motril":"Granada","ejido":"Almería","sanlucar":"Cádiz","utrera":"Sevilla","andujar":"Jaén",
 "velez malaga":"Málaga","fuengirola":"Málaga","torremolinos":"Málaga","benalmadena":"Málaga","mijas":"Málaga",
 "estepona":"Málaga","rincon de la victoria":"Málaga","alhaurin":"Málaga","cartama":"Málaga","nerja":"Málaga",
 "coin":"Málaga","pizarra":"Málaga","malaga techpark":"Málaga","pta":"Málaga","polo digital":"Málaga",
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
# Relevancia (solo fuentes amplias: universidades, FYCMA). Palabras FUERTES, se miran en el TITULO;
# en la descripcion solo las inequivocas. Evita conciertos, cine, congresos academicos, etc.
REL_TIT=["emprend","startup","start up","inversion","inversor","business angel","acelerad","incubad",
 "lanzadera","venture","scaleup","scale up","spin off","spinoff","demo day","transferencia","transfiere",
 "otri","fintech","deeptech","hackaton","hackathon","pitch","idea de negocio","ideas de negocio",
 "modelo de negocio","plan de negocio","financiacion","subvencion","ayudas a","convocatoria","innovacion abierta",
 "andalucia trade","biznaga fest","wordcamp","talent land","digital enterprise","greencities","impact hub",
 "autonomo","pyme","propiedad industrial","patente"]
REL_DES=["emprendedor","emprendimiento","startup","business angel","inversores","aceleradora","incubadora",
 "spin off","transferencia de tecnologia","capital riesgo"]
def relevante(tit, des=""):
    t=norm(tit); d=norm(des or "")
    return any(k in t for k in REL_TIT)

def clasifica(txt):
    n=norm(txt)
    for tipo,kws in TIPOS:
        if any(k in n for k in kws): return tipo
    return "Evento"
PROV_BASE={"malaga":"Málaga","sevilla":"Sevilla","granada":"Granada","cordoba":"Córdoba","cadiz":"Cádiz",
 "almeria":"Almería","huelva":"Huelva","jaen":"Jaén"}
def provincia_txt(txt):
    """Primero nombres de provincia (gana el que aparece antes); si no hay, alias de municipios/lugares."""
    n=norm(txt); best=None
    for k,v in PROV_BASE.items():
        m=re.search(r"\b"+k+r"\b",n)
        if m and (best is None or m.start()<best[0]): best=(m.start(),v)
    if best: return best[1]
    for k,v in PROV.items():
        if k in PROV_BASE: continue
        m=re.search(r"\b"+re.escape(k)+r"\b",n)
        if m and (best is None or m.start()<best[0]): best=(m.start(),v)
    return best[1] if best else None

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
            mz=re.search(r"(\d{8})T(\d{6})Z",ds)
            if mz:
                try:
                    from zoneinfo import ZoneInfo
                    dtu=datetime.datetime.strptime(mz.group(1)+mz.group(2),"%Y%m%d%H%M%S").replace(tzinfo=datetime.timezone.utc).astimezone(ZoneInfo("Europe/Madrid"))
                    start=dtu.date().isoformat(); hora=dtu.strftime("%H:%M")
                except Exception: pass
            me=re.search(r"(\d{8})",de); end=None
            if me:
                e2=me.group(1); e2=f"{e2[:4]}-{e2[4:6]}-{e2[6:8]}"
                if e2!=start: end=e2
            u=limpia(cur.get("URL","")) or None
            loc=limpia(cur.get("LOCATION","")); des=limpia(cur.get("DESCRIPTION",""))[:500] or None
            prov=provincia_fija or provincia_txt(loc) or provincia_txt(tit)
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
        if solo_relevante and not relevante(tit, des): continue
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
        if not relevante(tit, des): continue
        online=bool(ONLINE_RE.search(norm(des or "")))
        prov=provincia_txt(txt) or prov_default
        hora=dt.strftime("%H:%M") if (dt.hour or dt.minute) else None
        out.append(mkitem(tit,des,start,None,hora,("Online" if online and not prov else prov),clasifica(txt),link,None,fuente,None,online))
    return out


# ---------- utilidades de fechas en español ----------
MESES={"enero":1,"febrero":2,"marzo":3,"abril":4,"mayo":5,"junio":6,"julio":7,"agosto":8,
 "septiembre":9,"setiembre":9,"octubre":10,"noviembre":11,"diciembre":12}
_MES_RE="(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)"
def _fecha(d,mes,anio,ref):
    try:
        y=int(anio) if anio else ref.year
        f=datetime.date(y,MESES[mes.lower()],int(d))
        if not anio and f < ref-datetime.timedelta(days=60): f=f.replace(year=y+1)
        return f
    except Exception: return None
def fechas_es(txt, ref=None):
    """Devuelve (inicio, fin|None) en ISO a partir de texto en español. ref = fecha de referencia para el año."""
    ref=ref or datetime.date.today(); t=" "+(txt or "")+" "
    m=re.search(r"\b(\d{1,2})\s+de\s+"+_MES_RE+r"(?:\s+de\s+(20\d\d))?\s+(?:al|hasta el|-)\s+(\d{1,2})\s+de\s+"+_MES_RE+r"(?:\s+de\s+(20\d\d))?",t,re.I)
    if m:
        a=_fecha(m.group(1),m.group(2),m.group(3) or m.group(6),ref); b=_fecha(m.group(4),m.group(5),m.group(6),ref)
        if a and b: return a.isoformat(), (b.isoformat() if b>a else None)
    m=re.search(r"\b(\d{1,2})\s*(?:al|y|-|–)\s*(\d{1,2})\s+de\s+"+_MES_RE+r"(?:,?\s+(?:de\s+)?(20\d\d))?",t,re.I)
    if m:
        a=_fecha(m.group(1),m.group(3),m.group(4),ref); b=_fecha(m.group(2),m.group(3),m.group(4),ref)
        if a and b: return a.isoformat(), (b.isoformat() if b>a else None)
    m=re.search(r"\b(\d{1,2})\s+(?:de\s+)?"+_MES_RE+r",?\s+(?:de\s+)?(20\d\d)?",t,re.I)
    if m:
        a=_fecha(m.group(1),m.group(2),m.group(3),ref)
        if a: return a.isoformat(), None
    return None, None

def _par(fn, xs, n=8):
    import concurrent.futures as _cf
    with _cf.ThreadPoolExecutor(max_workers=n) as ex: return list(ex.map(fn, xs))

def polo_digital():
    out=[]
    for tipo in ("evento","formacion"):
        try: lst=json.loads(get(f"https://www.polodigital.eu/wp-json/wp/v2/{tipo}?per_page=30"))
        except Exception as ex: print("ERROR polo",tipo,ex); continue
        if not isinstance(lst,list): continue
        def ficha(e):
            try: h=get(e["link"])
            except Exception: return None
            md=re.search(r'class="meta date">\s*([^<]+)<',h); mp=re.search(r'class="meta place">\s*([^<]+)<',h)
            if not md: return None
            ini,fin=fechas_es(html.unescape(md.group(1)))
            if not ini: return None
            place=limpia(html.unescape(mp.group(1))) if mp else ""
            tit=limpia(e.get("title",{}).get("rendered",""))
            des=limpia(re.sub(r"<[^>]+>"," ",e.get("excerpt",{}).get("rendered","")))[:500] or None
            img=og_image_html(h)
            onl=bool(ONLINE_RE.search(norm(place)))
            prov=provincia_txt(place) or ("Málaga" if not onl else None)
            return mkitem(tit,des,ini,fin,None,("Online" if onl and not prov else prov),clasifica(tit+" "+(des or "")),
                          e["link"],img,"Polo de Contenidos Digitales","Polo de Contenidos Digitales",onl)
        out+= [x for x in _par(ficha,lst) if x]
    return out

def og_image_html(h):
    for pat in (r'<meta[^>]+property=["\']og:image(?::url)?["\'][^>]+content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image'):
        m=re.search(pat,h,re.I)
        if m:
            u=html.unescape(m.group(1)).strip()
            if u.startswith("http"): return u
    return None

def cta():
    try: lst=json.loads(get("https://www.corporaciontecnologica.com/wp-json/wp/v2/eventos?per_page=25"))
    except Exception as ex: print("ERROR cta",ex); return []
    def ficha(e):
        try: h=get(e["link"])
        except Exception: return None
        body=re.sub(r"<script.*?</script>|<style.*?</style>"," ",h,flags=re.S)
        txt=re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]+>"," ",body)))
        ref=datetime.date.fromisoformat(e.get("date","")[:10]) if e.get("date") else datetime.date.today()
        m=re.search(r"Fecha:\s*(.{0,80})",txt)
        ini,fin=fechas_es(m.group(1) if m else "",ref)
        if not ini:
            mi=re.search(r"main|entry-content|elementor-widget-text-editor",h)
            ini,fin=fechas_es(txt[:4000],ref) if False else (None,None)
        if not ini: return None
        ml=re.search(r"(?:Lugar|Dirección|Ubicación):\s*(.{0,120})",txt)
        lugar=ml.group(1) if ml else ""
        tit=limpia(e.get("title",{}).get("rendered",""))
        onl=bool(ONLINE_RE.search(norm(lugar+" "+tit)))
        prov=provincia_txt(lugar+" "+tit)
        if not prov and not onl: return None
        des=limpia(re.sub(r"<[^>]+>"," ",e.get("excerpt",{}).get("rendered","")))[:500] or None
        return mkitem(tit,des,ini,fin,None,(prov or "Online"),clasifica(tit+" "+(des or "")),e["link"],og_image_html(h),
                      "CTA · Corporación Tecnológica de Andalucía","CTA",onl)
    return [x for x in _par(ficha,lst) if x]

def eoi():
    ids=set()
    for pg in range(0,4):
        try: h=get(f"https://www.eoi.es/es/actualidad?page={pg}")
        except Exception: break
        ids.update(re.findall(r"/es/eventos/(\d+)/",h))
    def uno(i):
        try: return ical_source(f"https://www.eoi.es/es/event/{i}/ics_download","EOI · Escuela de Organización Industrial",None,"EOI")
        except Exception: return []
    out=[]
    for lst in _par(uno,sorted(ids)):
        for it in lst:
            if it.get("provincia") or it.get("online"):
                if it.get("online") and not it.get("provincia"): it["provincia"]="Online"
                out.append(it)
    return out

def el_referente():
    out=[]
    for pg in (1,2,3):
        try: raw=get(f"https://elreferente.es/feed/?post_type=evento&paged={pg}")
        except Exception: break
        for i in re.findall(r"<item>(.*?)</item>",raw,re.S):
            def g(k):
                m=re.search(r"<"+k+r">(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</"+k+r">",i,re.S); return m.group(1) if m else ""
            tit=limpia(html.unescape(g("title"))); link=limpia(g("link")) or None
            c=g("content:encoded") or g("description")
            txt=re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]+>"," ",c)))
            try: ref=email.utils.parsedate_to_datetime(limpia(g("pubDate"))).date()
            except Exception: ref=datetime.date.today()
            prov=provincia_txt(tit+" "+txt); onl=bool(ONLINE_RE.search(norm(tit+" "+txt)))
            if not prov and not onl: continue
            ini,fin=fechas_es(tit+" . "+txt,ref)
            if not ini: continue
            out.append(mkitem(tit,txt[:500] or None,ini,fin,None,(prov or "Online"),clasifica(tit+" "+txt),link,None,"El Referente",None,onl))
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
    add(polo_digital); add(cta); add(eoi); add(el_referente)

    # dedup cross-fuente por clave canonica (titulo+fecha); fusiona rellenando huecos, prefiere con imagen
    vistos={}
    for it in items:
        k=it["dedupe_key"]; cur=vistos.get(k)
        if not cur: vistos[k]=it; continue
        for campo in ("imagen_url","url","descripcion","provincia","hora","fecha_fin","organizador"):
            if not cur.get(campo) and it.get(campo): cur[campo]=it[campo]
        if it.get("_portal"): cur["_portal"]=True
    items=list(vistos.values())
    # 2a red: fusion difusa el MISMO dia (palabras clave casi iguales entre fuentes distintas)
    STOP={"de","del","la","el","los","las","y","en","a","al","para","con","por","un","una","jornada","taller",
          "curso","evento","webinar","sesion","encuentro","2025","2026","2027","ii","iii","iv","i","v","edicion"}
    def toks(t): return {w for w in norm(t).split() if w not in STOP and len(w)>2}
    from collections import defaultdict
    pordia=defaultdict(list)
    for it in items: pordia[it["fecha_inicio"]].append(it)
    fuera=set()
    for dia,lst in pordia.items():
        for i in range(len(lst)):
            a=lst[i]
            if id(a) in fuera: continue
            ta=toks(a["titulo"])
            for b in lst[i+1:]:
                if id(b) in fuera or a["fuente"]==b["fuente"]: continue
                tb=toks(b["titulo"])
                if len(ta)<2 or len(tb)<2: continue
                inter=len(ta&tb); jac=inter/len(ta|tb)
                if jac>=0.7 or (inter>=3 and (ta<=tb or tb<=ta)):
                    for campo in ("imagen_url","url","descripcion","provincia","hora","fecha_fin","organizador"):
                        if not a.get(campo) and b.get(campo): a[campo]=b[campo]
                    fuera.add(id(b)); print("fusion difusa:",a["titulo"][:50],"<=",b["titulo"][:50])
    items=[i for i in items if id(i) not in fuera]
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
