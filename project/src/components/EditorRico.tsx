import { useEffect, useRef } from "react"

// Editor con formato para noticias y avisos (mejora 7 de Joaquin, 16-nov-2026).
// Se escribe como en un procesador de textos (botones o pegando desde Word/Google Docs/web)
// y se guarda en el MISMO formato de siempre (## subtitulo, - lista, **negrita**, [texto](url), ![pie](url)),
// asi la web (TextoRico) y los correos de avisos siguen funcionando igual.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const URL_OK = /^https?:\/\/[^\s)]+$/

function enLineaHtml(t: string): string {
  const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g
  let out = "", ult = 0, m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    out += esc(t.slice(ult, m.index))
    if (m[1]) out += `<a href="${esc(m[2])}">${enLineaHtml(m[1])}</a>`
    else out += `<strong>${enLineaHtml(m[3])}</strong>`
    ult = m.index + m[0].length
  }
  return out + esc(t.slice(ult))
}

export function mdAHtml(md: string): string {
  const out: string[] = []
  let lista: string[] = [], parrafo: string[] = []
  const cerrar = () => {
    if (parrafo.length) { out.push(`<p>${parrafo.join("<br>")}</p>`); parrafo = [] }
    if (lista.length) { out.push(`<ul>${lista.map((x) => `<li>${x}</li>`).join("")}</ul>`); lista = [] }
  }
  for (const cruda of (md || "").replace(/\r\n/g, "\n").split("\n")) {
    const l = cruda.trim()
    if (!l) { cerrar(); continue }
    const img = l.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/)
    if (img) { cerrar(); out.push(`<p><img src="${esc(img[2])}" alt="${esc(img[1])}"></p>`); continue }
    if (/^#{2,3}\s+/.test(l)) { cerrar(); out.push(`<h2>${enLineaHtml(l.replace(/^#{2,3}\s+/, ""))}</h2>`); continue }
    if (/^[-•]\s+/.test(l)) { if (parrafo.length) cerrar(); lista.push(enLineaHtml(l.replace(/^[-•]\s+/, ""))); continue }
    if (lista.length) cerrar()
    parrafo.push(enLineaHtml(l))
  }
  cerrar()
  return out.join("") || "<p><br></p>"
}

const BLOQUES = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "FIGURE", "TABLE", "TR", "SECTION", "ARTICLE", "HEADER", "FOOTER"])

function esNegrita(el: HTMLElement): boolean {
  if (el.tagName === "B" || el.tagName === "STRONG") {
    // Google Docs envuelve todo en <b style="font-weight:normal">
    const fw = el.style?.fontWeight
    return !(fw === "normal" || fw === "400")
  }
  const fw = el.style?.fontWeight
  return fw === "bold" || (!!fw && Number(fw) >= 600)
}

// Texto en linea de un nodo: **negrita** y [texto](url); el resto, texto plano.
function enLineaMd(n: Node): string {
  if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").replace(/\s+/g, " ")
  if (n.nodeType !== Node.ELEMENT_NODE) return ""
  const el = n as HTMLElement
  if (["STYLE", "SCRIPT", "META", "TITLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) return ""
  if (el.tagName === "BR") return "\n"
  if (el.tagName === "IMG") return ""
  const dentro = Array.from(el.childNodes).map(enLineaMd).join("")
  if (el.tagName === "A") {
    const href = el.getAttribute("href") || ""
    const t = dentro.replace(/\*\*/g, "").trim()
    if (URL_OK.test(href) && t) return t === href ? href : `[${t}](${href})`
    return dentro
  }
  if (esNegrita(el)) {
    const t = dentro.replace(/\*\*/g, "")
    if (!t.trim()) return t
    const ini = t.match(/^\s*/)![0], fin = t.match(/\s*$/)![0]
    return `${ini}**${t.trim()}**${fin}`
  }
  return dentro
}

const limpia = (s: string) => s.split("\n").map((x) => x.replace(/[ \t ]+/g, " ").trim()).filter((x, i, a) => x || (i > 0 && a[i - 1])).join("\n").trim()

export function htmlAMd(raiz: HTMLElement): string {
  const bloques: string[] = []
  let suelto: Node[] = []
  const volcarSuelto = () => {
    if (!suelto.length) return
    const t = limpia(suelto.map(enLineaMd).join(""))
    if (t) bloques.push(t)
    suelto = []
  }
  const recorrer = (padre: Node) => {
    for (const n of Array.from(padre.childNodes)) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement
        if (["STYLE", "SCRIPT", "META", "TITLE", "NOSCRIPT", "TEMPLATE"].includes(el.tagName)) continue
        if (el.tagName === "IMG") {
          volcarSuelto()
          const src = el.getAttribute("src") || ""
          if (URL_OK.test(src)) bloques.push(`![${(el.getAttribute("alt") || "").replace(/[[\]]/g, "")}](${src})`)
          continue
        }
        if (/^H[1-6]$/.test(el.tagName)) {
          volcarSuelto()
          const t = limpia(enLineaMd(el)).replace(/\*\*/g, "").replace(/\n/g, " ")
          if (t) bloques.push(`## ${t}`)
          continue
        }
        if (el.tagName === "UL" || el.tagName === "OL") {
          volcarSuelto()
          const items: string[] = []
          el.querySelectorAll("li").forEach((li) => {
            const copia = li.cloneNode(true) as HTMLElement
            copia.querySelectorAll("ul,ol").forEach((x) => x.remove())
            const t = limpia(enLineaMd(copia)).replace(/\n/g, " ")
            if (t) items.push(`- ${t}`)
          })
          if (items.length) bloques.push(items.join("\n"))
          continue
        }
        if (BLOQUES.has(el.tagName)) {
          volcarSuelto()
          const tieneBloques = Array.from(el.children).some((c) => BLOQUES.has(c.tagName) || c.tagName === "IMG")
          if (tieneBloques) recorrer(el)
          else { const t = limpia(enLineaMd(el)); if (t) bloques.push(t) }
          continue
        }
        // Envoltorio en linea con bloques dentro (p. ej. el <b> que pone Google Docs): se recorre por dentro
        if (el.querySelector(Array.from(BLOQUES).join(",").toLowerCase() + ",img")) {
          const negrita = esNegrita(el)
          if (!negrita) { volcarSuelto(); recorrer(el); continue }
        }
      }
      suelto.push(n)
    }
  }
  recorrer(raiz)
  volcarSuelto()
  return bloques.join("\n\n")
}

// Pegar desde cualquier sitio: se queda solo el formato que entendemos.
function htmlPegadoSeguro(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return mdAHtml(htmlAMd(doc.body))
}

const BTN = "rounded-md px-2.5 py-1 text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-sm"

export default function EditorRico({ value, onChange, minAlto = 220, placeholder = "" }: { value: string; onChange: (md: string) => void; minAlto?: number; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const ultimo = useRef<string | null>(null)
  const norma = useRef<string>("")

  useEffect(() => {
    if (!ref.current) return
    if (value !== ultimo.current) { ref.current.innerHTML = mdAHtml(value); ultimo.current = value; norma.current = htmlAMd(ref.current) }
  }, [value])

  function emitir() {
    if (!ref.current) return
    const md = htmlAMd(ref.current)
    if (md === norma.current) return // sin cambios reales (solo foco o reordenacion interna)
    norma.current = md
    ultimo.current = md
    onChange(md)
  }

  function cmd(nombre: string, arg?: string) {
    ref.current?.focus()
    document.execCommand("defaultParagraphSeparator", false, "p")
    document.execCommand(nombre, false, arg)
    emitir()
  }

  function bloqueActual(): string {
    const sel = window.getSelection()
    let n: Node | null = sel?.anchorNode ?? null
    while (n && n !== ref.current) { if (n.nodeType === 1 && /^H[1-6]$/.test((n as HTMLElement).tagName)) return "h"; n = n.parentNode }
    return "p"
  }

  function enlace() {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) { alert("Selecciona primero el texto que quieres convertir en enlace."); return }
    const url = prompt("Dirección del enlace (https://…)", "https://")
    if (!url) return
    const u = url.trim()
    if (!URL_OK.test(u)) { alert("La dirección tiene que empezar por https:// o http://"); return }
    cmd("createLink", u)
  }

  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-500">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button type="button" className={BTN} title="Negrita" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("bold")}><b>N</b> Negrita</button>
        <button type="button" className={BTN} title="Subtítulo" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("formatBlock", bloqueActual() === "h" ? "<p>" : "<h2>")}>Subtítulo</button>
        <button type="button" className={BTN} title="Lista" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertUnorderedList")}>• Lista</button>
        <button type="button" className={BTN} title="Enlace" onMouseDown={(e) => e.preventDefault()} onClick={enlace}>🔗 Enlace</button>
        <button type="button" className={BTN} title="Quitar formato" onMouseDown={(e) => e.preventDefault()} onClick={() => { cmd("removeFormat"); cmd("unlink"); cmd("formatBlock", "<p>") }}>Quitar formato</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitir}
        onBlur={emitir}
        onPaste={(e) => {
          const html = e.clipboardData.getData("text/html")
          const txt = e.clipboardData.getData("text/plain")
          e.preventDefault()
          if (html) document.execCommand("insertHTML", false, htmlPegadoSeguro(html))
          else document.execCommand("insertHTML", false, mdAHtml(txt))
          emitir()
        }}
        className="editor-rico px-4 py-3 text-[15px] leading-relaxed text-slate-800 outline-none"
        style={{ minHeight: minAlto }}
      />
    </div>
  )
}
