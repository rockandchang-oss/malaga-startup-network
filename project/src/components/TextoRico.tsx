import { Fragment, ReactNode } from "react"

// Texto con formato mínimo para noticias y avisos, escrito a mano en un textarea:
//   ## Subtítulo            -> encabezado
//   - elemento / • elemento -> lista
//   **negrita**             -> negrita
//   [texto](https://…)      -> enlace con texto
//   https://…               -> enlace
//   ![pie de foto](https://…) en su propia línea -> imagen
// Una línea en blanco separa párrafos. No interpreta HTML (no hay riesgo de inyección).

const INLINE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g

function enLinea(texto: string, claseEnlace: string): ReactNode[] {
  const out: ReactNode[] = []
  let ultimo = 0
  let m: RegExpExecArray | null
  const re = new RegExp(INLINE.source, "g")
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) out.push(texto.slice(ultimo, m.index))
    const k = `${m.index}`
    if (m[1] && m[2]) out.push(<a key={k} href={m[2]} target="_blank" rel="noreferrer" className={claseEnlace}>{m[1]}</a>)
    else if (m[3]) out.push(<strong key={k}>{enLinea(m[3], claseEnlace)}</strong>)
    else if (m[4]) out.push(<a key={k} href={m[4]} target="_blank" rel="noreferrer" className={`${claseEnlace} break-all`}>{m[4]}</a>)
    ultimo = m.index + m[0].length
  }
  if (ultimo < texto.length) out.push(texto.slice(ultimo))
  return out
}

type Bloque = { tipo: "img"; url: string; pie: string } | { tipo: "h"; texto: string } | { tipo: "ul"; items: string[] } | { tipo: "p"; lineas: string[] }

function bloques(texto: string): Bloque[] {
  const res: Bloque[] = []
  for (const cruda of texto.replace(/\r\n/g, "\n").split("\n")) {
    const l = cruda.trim()
    const ult = res[res.length - 1]
    if (!l) { res.push({ tipo: "p", lineas: [] }); continue }
    const img = l.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/)
    if (img) { res.push({ tipo: "img", pie: img[1], url: img[2] }); continue }
    if (/^#{2,3}\s+/.test(l)) { res.push({ tipo: "h", texto: l.replace(/^#{2,3}\s+/, "") }); continue }
    if (/^[-•]\s+/.test(l)) {
      const item = l.replace(/^[-•]\s+/, "")
      if (ult && ult.tipo === "ul") ult.items.push(item); else res.push({ tipo: "ul", items: [item] })
      continue
    }
    if (ult && ult.tipo === "p") ult.lineas.push(l); else res.push({ tipo: "p", lineas: [l] })
  }
  return res.filter((b) => b.tipo !== "p" || b.lineas.length > 0)
}

export default function TextoRico({ texto, compacto = false, className = "" }: { texto: string; compacto?: boolean; className?: string }) {
  const enlace = "font-semibold text-[#4A5D8A] underline underline-offset-2 hover:text-[#2C3959]"
  const sep = compacto ? "space-y-2" : "space-y-4"
  return (
    <div className={`${sep} ${className}`}>
      {bloques(texto).map((b, i) => {
        if (b.tipo === "img") return (
          <figure key={i} className="my-2">
            <img src={b.url} alt={b.pie} loading="lazy" className="w-full rounded-2xl object-cover" />
            {b.pie && <figcaption className="mt-2 text-center text-sm text-slate-500">{b.pie}</figcaption>}
          </figure>
        )
        if (b.tipo === "h") return <h2 key={i} className={compacto ? "pt-1 text-sm font-bold text-[#2C3959]" : "pt-3 text-xl font-extrabold text-[#2C3959]"}>{enLinea(b.texto, enlace)}</h2>
        if (b.tipo === "ul") return (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => <li key={j}>{enLinea(it, enlace)}</li>)}
          </ul>
        )
        return <p key={i}>{b.lineas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{enLinea(l, enlace)}</Fragment>)}</p>
      })}
    </div>
  )
}
