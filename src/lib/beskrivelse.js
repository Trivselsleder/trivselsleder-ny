// Trygg tolkning av den importerte lek-beskrivelsen (ressurs_innhold.beskrivelse).
// 1115 av radene er HTML (p, br, strong, b, em, i, ul, ol, li, h3 — INGEN a/img/iframe/table),
// 8 er ren tekst. Vi tolker HTML med DOMParser mot en HVITELISTE og bygger enten React-
// elementer (skjerm) eller enkle blokker (PDF). Vi bruker ALDRI dangerouslySetInnerHTML:
// alt som ikke står i hvitelisten mister taggen (teksten inni beholdes), og alle attributter
// droppes — så en fremtidig rad med <script>/<a onclick=…> ikke kan smugle inn noe.
import { createElement } from 'react'

// Taggene vi beholder. Alt annet unwrappes (behold tekst, dropp tag).
const HVITELISTE = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h3'])

// Statiske Tailwind-klasser per beholdt blokktag (så lister faktisk viser punkter — Tailwind
// preflight nullstiller list-style, derfor list-disc/list-decimal eksplisitt).
const KLASSE = {
  ul: 'list-disc pl-5 space-y-1',
  ol: 'list-decimal pl-5 space-y-1',
  h3: 'font-bold text-gray-900 mt-3',
}

// Har strengen HTML-tagger? (querySelector('*') på det tolkede treet er fasit, ikke et regex-gjett.)
function parseKropp(tekst) {
  if (tekst == null || !String(tekst).trim()) return null
  const doc = new DOMParser().parseFromString(String(tekst), 'text/html')
  return doc.body || null
}

// Ren tekst → avsnitt. Tom linje = nytt avsnitt; enkelt linjeskift beholdes inne i avsnittet.
function delAvsnitt(raatekst) {
  return String(raatekst)
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((s) => s.replace(/^\n+|\n+$/g, ''))
    .filter((s) => s.trim().length)
}

// ── Eksport A: React-elementer (skjerm) ─────────────────────────────────────
export function beskrivelseTilReact(tekst) {
  const body = parseKropp(tekst)
  if (!body) return null

  // Ingen elementer i det hele tatt → ren tekst.
  if (!body.querySelector('*')) {
    const avsnitt = delAvsnitt(body.textContent || '')
    if (!avsnitt.length) return null
    // whitespace-pre-line gjør at et enkelt linjeskift vises som linjeskift.
    return avsnitt.map((s, idx) => createElement('p', { key: `p${idx}`, className: 'whitespace-pre-line' }, s))
  }

  let teller = 0
  const nyKey = () => `b${teller++}`
  const barn = konverterBarn(body, nyKey)
  return barn.length ? barn : null
}

function konverterBarn(node, nyKey) {
  const ut = []
  node.childNodes.forEach((c) => {
    const r = konverterNode(c, nyKey)
    if (Array.isArray(r)) ut.push(...r)
    else if (r !== null && r !== undefined && r !== '') ut.push(r)
  })
  return ut
}

function konverterNode(node, nyKey) {
  // Tekstnode: behold, men dropp rene mellomrom-noder (kildeformatering mellom tagger).
  if (node.nodeType === 3) {
    const s = node.textContent
    return s && s.trim() ? s : null
  }
  if (node.nodeType !== 1) return null // kommentarer o.l.
  const tag = node.tagName.toLowerCase()
  if (tag === 'br') return createElement('br', { key: nyKey() })
  const innhold = konverterBarn(node, nyKey)
  if (HVITELISTE.has(tag)) {
    const props = { key: nyKey() }
    if (KLASSE[tag]) props.className = KLASSE[tag]
    return createElement(tag, props, innhold.length ? innhold : undefined)
  }
  // Ikke i hvitelisten → dropp taggen, behold barna (unwrap). Attributter forsvinner med taggen.
  return innhold
}

// ── Eksport B: enkle blokker (PDF) ──────────────────────────────────────────
export function beskrivelseTilBlokker(tekst) {
  const body = parseKropp(tekst)
  if (!body) return null

  const blokker = []
  if (!body.querySelector('*')) {
    delAvsnitt(body.textContent || '').forEach((s) => blokker.push({ type: 'avsnitt', tekst: s }))
    return blokker.length ? blokker : null
  }
  samleBlokker(body, blokker)
  return blokker.length ? blokker : null
}

// Inline-innhold flatet til tekst; <br> blir linjeskift.
function inlineTekst(node) {
  let ut = ''
  node.childNodes.forEach((c) => {
    if (c.nodeType === 3) ut += c.textContent
    else if (c.nodeType === 1) {
      if (c.tagName.toLowerCase() === 'br') ut += '\n'
      else ut += inlineTekst(c)
    }
  })
  return ut.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()
}

function samleBlokker(node, blokker) {
  node.childNodes.forEach((c) => {
    if (c.nodeType === 3) {
      const s = c.textContent
      if (s && s.trim()) blokker.push({ type: 'avsnitt', tekst: s.trim() })
      return
    }
    if (c.nodeType !== 1) return
    const tag = c.tagName.toLowerCase()
    if (tag === 'p') {
      const tx = inlineTekst(c)
      if (tx) blokker.push({ type: 'avsnitt', tekst: tx })
    } else if (tag === 'h3') {
      const tx = inlineTekst(c)
      if (tx) blokker.push({ type: 'overskrift', tekst: tx })
    } else if (tag === 'ul' || tag === 'ol') {
      Array.from(c.children)
        .filter((ch) => ch.tagName.toLowerCase() === 'li')
        .forEach((li) => {
          const tx = inlineTekst(li)
          if (tx) blokker.push({ type: 'punkt', tekst: tx })
        })
    } else {
      // ukjent/wrapper → gå inn i barna (unwrap)
      samleBlokker(c, blokker)
    }
  })
}
