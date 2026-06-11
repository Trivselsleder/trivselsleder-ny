import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Parse RFC 4180 CSV med multiline quoted fields
function parseCSV(text) {
  const rows = []
  let i = 0
  const n = text.length

  while (i < n) {
    const row = []
    while (i < n) {
      if (text[i] === '"') {
        i++ // hopp over åpningsfnutter
        let field = ''
        while (i < n) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') { field += '"'; i += 2 } // escaped quote
            else { i++; break }
          } else {
            field += text[i++]
          }
        }
        row.push(field)
      } else {
        let field = ''
        while (i < n && text[i] !== ',' && text[i] !== '\n') field += text[i++]
        row.push(field.trim())
      }
      if (i < n && text[i] === ',') i++
      else break
    }
    // hopp over linjeskift mellom rader
    if (i < n && text[i] === '\r') i++
    if (i < n && text[i] === '\n') i++
    if (row.length > 1) rows.push(row)
  }
  return rows
}

function renseBeskrivelse(tekst) {
  return tekst
    .split('\n')
    .filter(linje => {
      const trimmed = linje.trim()
      if (!trimmed) return false
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) return false
      return true
    })
    .map(l => l.trim())
    .join('\n')
    .trim()
}

function normaliser(s) {
  return s.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
}

// Les filer
const csvTekst = readFileSync(resolve(root, 'src/data/advantages_admin-2.csv'), 'utf-8')
const partnere = JSON.parse(readFileSync(resolve(root, 'src/data/kulturkort-partnere.json'), 'utf-8'))

// Parse CSV
const rader = parseCSV(csvTekst)
const header = rader[0]
const tittelIdx     = header.findIndex(h => h.toLowerCase().includes('tittel'))
const kommuneIdx    = header.findIndex(h => h.toLowerCase().includes('kommune'))
const beskrivelseIdx = header.findIndex(h => h.toLowerCase().includes('beskrivelse'))

// Bygg oppslagskart fra CSV: "tittel|kommune" -> beskrivelse
const csvMap = new Map()
for (const rad of rader.slice(1)) {
  if (rad.length <= beskrivelseIdx) continue
  const nøkkel = normaliser(rad[tittelIdx]) + '|' + normaliser(rad[kommuneIdx])
  const beskrivelse = renseBeskrivelse(rad[beskrivelseIdx])
  if (beskrivelse) csvMap.set(nøkkel, beskrivelse)
}

// Match og fyll inn
let antallMatchet = 0
let antallMedTekst = 0

for (const partner of partnere) {
  const nøkkel = normaliser(partner.navn) + '|' + normaliser(partner.kommune)
  if (csvMap.has(nøkkel)) {
    antallMatchet++
    partner.beskrivelse = csvMap.get(nøkkel)
    antallMedTekst++
  }
}

// Skriv oppdatert JSON
writeFileSync(
  resolve(root, 'src/data/kulturkort-partnere.json'),
  JSON.stringify(partnere, null, 2) + '\n',
  'utf-8'
)

console.log(`CSV-rader:        ${rader.length - 1}`)
console.log(`JSON-partnere:    ${partnere.length}`)
console.log(`Matchet:          ${antallMatchet}`)
console.log(`Ikke matchet:     ${partnere.length - antallMatchet}`)
