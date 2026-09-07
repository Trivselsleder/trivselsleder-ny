// FAGMAPPING for aktiv læring-passet. Leser de fem BESLUTTEDE, Fable-godkjente CSV-filene
// i data/fagmapping/ og bygger arveregelen (claude_FAGMAPPING-DATA-4sep.md):
//
//   opplegg → underterm-tid → (fil b) gruppe-tid → (fil a) fag
//
// Grupper peker på seg selv i fil b (gruppe_tid = eget tid), så gruppe-oppslaget aldri
// faller gjennom. De 17 fagløse oppleggene (fil e) får ikke fag.
//
// KRAV 2 (Fable-kontroll): tom fag-celle betyr «ingen fag». Passet STOPPER HARDT hvis
// settet av tomme gruppe-tids er noe ANNET enn de fem kjente {961, 545, 292, 543, 1133}
// — ellers kan en glemt rad se ut som en beslutning.

import { readFileSync } from 'node:fs'
import { parseCsvObjekter } from './csv.mjs'

// De fem ikke-fag-gruppene, låst i claude_FAGMAPPING-DATA-4sep.md.
export const KJENTE_IKKEFAG_GRUPPER = new Set(['961', '545', '292', '543', '1133'])

export class FagmappingAvvik extends Error {
  constructor(melding) { super(melding); this.name = 'FagmappingAvvik' }
}

export function lastFagmapping(dir = 'data/fagmapping') {
  const les = (f) => parseCsvObjekter(readFileSync(`${dir}/${f}`, 'utf8'))

  const grupper = les('topic-gruppe-til-fag.csv')          // gruppe_tid, gruppenavn, fag
  const undertermer = les('topic-underterm-til-gruppe.csv') // term_tid, term_navn, gruppe_tid
  const fagloeseRader = les('fagloese-opplegg.csv')         // nid, navn, gruppe

  // Fil a: gruppe → fag (eller null når tom).
  const gruppeTilFag = new Map()
  const tommeGrupper = new Set()
  for (const g of grupper) {
    const tid = String(g.gruppe_tid).trim()
    const fag = (g.fag || '').trim()
    gruppeTilFag.set(tid, fag || null)
    if (!fag) tommeGrupper.add(tid)
  }

  // KRAV 2: settet av tomme grupper MÅ være nøyaktig de fem kjente — verken mer eller mindre.
  const uventetTomme = [...tommeGrupper].filter(t => !KJENTE_IKKEFAG_GRUPPER.has(t)).sort()
  const skulleHattFag = [...KJENTE_IKKEFAG_GRUPPER].filter(t => !tommeGrupper.has(t)).sort()
  if (uventetTomme.length || skulleHattFag.length) {
    throw new FagmappingAvvik(
      `HARD STOPP (fagmapping): tomme gruppe-tids avviker fra de fem kjente {961,545,292,543,1133}. ` +
      `Uventet tomme (fag glemt?): [${uventetTomme.join(', ') || '—'}]. ` +
      `Kjent ikke-fag men har fag nå: [${skulleHattFag.join(', ') || '—'}]. ` +
      `En glemt rad kan ellers se ut som en beslutning — importen stoppes.`)
  }

  // Fil b: underterm/gruppe → gruppe.
  const undertermTilGruppe = new Map()
  for (const u of undertermer) undertermTilGruppe.set(String(u.term_tid).trim(), String(u.gruppe_tid).trim())

  // Fil e: de 17 fagløse oppleggene (nid).
  const fagloese = new Set(fagloeseRader.map(r => String(r.nid).trim()))

  return { gruppeTilFag, undertermTilGruppe, fagloese, tommeGrupper }
}

// Fil d: læreplankode → fag (NAT01→Naturfag, …). Brukes av F2-sjekken i steg D for å finne
// målets fag ut fra dets læreplan (kompetansemaal.laereplan_kode, der prefikset før «-» er
// læreplankoden). Tom/ukjent kode → null (mål utenfor de 8 skolefagene).
export function lastLaereplankodeFag(dir = 'data/fagmapping') {
  const rader = parseCsvObjekter(readFileSync(`${dir}/laereplankode-til-fag.csv`, 'utf8'))
  const m = new Map()
  for (const r of rader) m.set(String(r.laereplankode).trim(), (r.fag || '').trim() || null)
  return m
}

// Arveregelen for ÉN term-tid på et opplegg. Returnerer fag-navn (string) eller null.
// ukjentTerm=true betyr at term-tid ikke finnes i fil b (skal ikke skje — flagges av kalleren).
export function fagForTerm(termTid, m) {
  const g = m.undertermTilGruppe.get(String(termTid))
  if (g == null) return { fag: null, ukjentTerm: true }
  return { fag: m.gruppeTilFag.get(g) ?? null, ukjentTerm: false }
}

// Distinkte fag for et opplegg ut fra ALLE dets atlu_topic-term-tids (settet, ikke summen).
// Et opplegg med tre matte-undertermer får «Matematikk» ÉN gang.
export function fagForOpplegg(termTids, m) {
  const fag = new Set()
  const ukjenteTermer = []
  for (const tid of termTids) {
    const r = fagForTerm(tid, m)
    if (r.ukjentTerm) ukjenteTermer.push(String(tid))
    else if (r.fag) fag.add(r.fag)
  }
  return { fag: [...fag], ukjenteTermer }
}
