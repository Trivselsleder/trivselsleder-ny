// KILDE-LESER med utpakkingsvakt.
// Leser KUN de navngitte JSON-medlemmene fra eksport-zip-en via `unzip -p` (strømmer ETT
// medlem til minne — arkivet pakkes ALDRI ut). Vakten: bare stier på hvitelista under
// Content/ og Vocabularies/ er tillatt; alt annet (særlig Files/) avvises. Dette er samme
// prinsipp som stoppet runaway-utpakkingen tidligere: aldri en bulk-operasjon mot 37 GB.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const TILLATT = /^(Content|Vocabularies)\/[a-z0-9_-]+\.json$/i

export function lesMedlem(zipSti, medlem) {
  if (!TILLATT.test(medlem)) {
    throw new Error(`VAKT: nekter å hente «${medlem}» — kun Content/*.json og Vocabularies/*.json er tillatt.`)
  }
  if (!existsSync(zipSti)) {
    throw new Error(`Fant ikke eksport-zip: ${zipSti}. Sett IMPORT_ZIP i .env.import eller --zip.`)
  }
  // -p: skriv ETT medlem til stdout. maxBuffer romslig (største JSON er ~33 MB play_schedule,
  // men den leser vi aldri). Feiler tydelig hvis medlemmet ikke finnes.
  let buf
  try {
    buf = execFileSync('unzip', ['-p', zipSti, medlem], { maxBuffer: 256 * 1024 * 1024 })
  } catch (e) {
    throw new Error(`Kunne ikke hente «${medlem}» fra zip: ${e.message}`)
  }
  if (!buf || buf.length === 0) throw new Error(`Tomt/ukjent medlem: «${medlem}».`)
  return JSON.parse(buf.toString('utf8'))
}

// Hent .items fra et node-/vokabular-medlem.
export function lesItems(zipSti, medlem) {
  const d = lesMedlem(zipSti, medlem)
  return Array.isArray(d) ? d : (d.items || [])
}

// Sti-indeks (kun sentralkatalogen leses — INGEN utpakking). Brukes til å bekrefte at en
// original mediefil finnes før den refereres. Returnerer et Set av alle stier i arkivet.
export function lesFilindeks(zipSti) {
  const ut = execFileSync('unzip', ['-Z1', zipSti], { maxBuffer: 64 * 1024 * 1024 })
  return new Set(ut.toString('utf8').split('\n'))
}
