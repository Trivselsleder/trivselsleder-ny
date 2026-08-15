// Tolker innlimt tekst eller en CSV-fil med trivselsledere til {navn, gruppe}-rader.
// Robust for norsk hverdag: Excel-eksport (;), vanlig CSV (,), eller kopiert
// kolonner fra regneark (TAB). Én kolonne = bare navn. To+ kolonner = navn + klasse.

const HEADER_ORD = new Set(['navn', 'name', 'elev', 'trivselsleder', 'tl'])
const GRUPPE_ORD = new Set(['gruppe', 'klasse', 'trinn', 'class', 'group'])
const KANDIDATER = ['\t', ';', ','] // prioritet ved uavgjort: TAB > ; > ,

export const MAKS_RADER = 2000 // fornuftig tak; hindrer at feil dokument gir tusenvis av «navn»

// Velg skilletegn ut fra HELE teksten, ikke bare første linje: tell hvor mange
// linjer hvert tegn finnes i, og velg det med flest treff (så en 1-kolonners
// header ikke slår av splitting for resten av fila).
function finnSkille(linjer) {
  let best = null
  let bestAntall = 0
  for (const c of KANDIDATER) {
    const antall = linjer.reduce((n, l) => n + (l.includes(c) ? 1 : 0), 0)
    if (antall > bestAntall) { bestAntall = antall; best = c }
  }
  return best
}

// CSV-splitting som respekterer anførselstegn: «"Hansen, Ola";6B» → ['Hansen, Ola','6B'].
// Doble anførselstegn ("") inne i et felt blir ett ".
function delFelt(linje, skille) {
  if (!skille) return [linje.trim()]
  const ut = []
  let felt = ''
  let iSitat = false
  for (let i = 0; i < linje.length; i++) {
    const c = linje[i]
    if (iSitat) {
      if (c === '"') {
        if (linje[i + 1] === '"') { felt += '"'; i++ } else iSitat = false
      } else felt += c
    } else if (c === '"') {
      iSitat = true
    } else if (c === skille) {
      ut.push(felt); felt = ''
    } else felt += c
  }
  ut.push(felt)
  return ut.map((f) => f.trim())
}

function erHeader(felt) {
  const a = (felt[0] || '').trim().toLowerCase()
  const b = (felt[1] || '').trim().toLowerCase()
  return HEADER_ORD.has(a) || GRUPPE_ORD.has(a) || GRUPPE_ORD.has(b)
}

// Returnerer { rader:[{navn,gruppe}], antall, avkortet }. gruppe = '' når ikke oppgitt.
// avkortet = true hvis fila hadde flere enn MAKS_RADER gyldige navn.
export function parseTlTekst(tekst) {
  const linjer = String(tekst || '')
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (linjer.length === 0) return { rader: [], antall: 0, avkortet: false }

  const skille = finnSkille(linjer)
  const rader = []
  linjer.forEach((linje, i) => {
    const felt = delFelt(linje, skille)
    if (i === 0 && erHeader(felt)) return // hopp over overskriftsrad
    const navn = felt[0] || ''
    const gruppe = felt[1] || ''
    if (!navn) return
    rader.push({ navn, gruppe })
  })

  const avkortet = rader.length > MAKS_RADER
  return { rader: avkortet ? rader.slice(0, MAKS_RADER) : rader, antall: Math.min(rader.length, MAKS_RADER), avkortet }
}
