// MEDIE-PASSET (skrivelagets steg 8) — KUN game-leker.
// Spesifikasjon: claude_SKRIVELAG-SPESIFIKASJON-3sep.md steg 8 + 2B.
// Bygger `medier`-rader (095-felt: er_original, opphav_medie_id, alt_tekst_kilde).
// bunny_video_id = NULL (video er fase 2). Skriver IDer, ikke navn.
//
// FORUTSETNING: lek-passet (steg 4/5/6) er skrevet FØRST — medier.ressurs_id har FK → ressurser.
//   Og migr 102 (som rydder 034-ikonmediene) er kjørt, så de ikke ligger dobbelt (A1).
//
// Kø-typer (2B): manglende_alttekst (+medie_id, A5), kun_skjermkvalitet (per lek, avledet),
//   ekstern_video (YouTube/Vimeo-lenke), fil_mangler (referert fil ikke i eksporten).
//   `filtype_uavklart` triggres IKKE av dagens `regelMedier` (den klassifiserer bilde/video) —
//   se rapportens grense-avsnitt.

import { detUuid, detMedieUuid } from './uuid.mjs'
import { køRad } from './ko.mjs'
import * as R from './regler.mjs'
import { krevKjoringId, krevFunksjon, krevArray, krevKlient, krevPlan } from './vakt.mjs'

export const MEDIEPASS_REKKEFOLGE = ['medier', 'redaksjonell_ko']
const KONFLIKT = { medier: ['id'], redaksjonell_ko: ['id'] }

// Bygg medie-rader + kø for ÉN game-lek.
export function byggMedierForLek(node, kjoringId, finnesISti) {
  const medier = [], ko = []
  const nid = node.nid
  const rid = detUuid('game', nid)
  const rå = R.regelMedier(node.field_description?.[0]?.safe_value || '', finnesISti)
  let rekk = 0, harBilde = false, harOriginalBilde = false

  for (const m of rå) {
    // Ekstern video (YouTube/Vimeo) → ingen medie-rad, egen kø-type.
    if (m.youtube_id) {
      ko.push(køRad(kjoringId, { type: 'ekstern_video', ressurs_id: rid, beskrivelse: `Ekstern video (${m.youtube_id}) — lenke, ikke opplastet fil.` }))
      continue
    }
    const medieId = detMedieUuid('game', nid, m.fid, m.type)

    // Ingen filsti (fil mangler helt) → ingen medie-rad, fil_mangler.
    if (!m.storage_sti) {
      ko.push(køRad(kjoringId, { type: 'fil_mangler', ressurs_id: rid, beskrivelse: m.avvik?.forklaring || `file-${m.fid}: ingen filsti.` }))
      continue
    }
    // Filsti satt men regelMedier fant ikke fila / brukte derivat → fil_mangler / kun_skjermkvalitet.
    if (m.avvik) {
      if (m.avvik.type === 'kun_skjermkvalitet') { /* avledes per lek nedenfor */ }
      else ko.push(køRad(kjoringId, { type: 'fil_mangler', ressurs_id: rid, medie_id: medieId, beskrivelse: m.avvik.forklaring }))
    }

    // Alt-tekst kun for bilde (video/pdf trenger ikke).
    let altTekst = null, altKilde = null
    if (m.type === 'bilde') {
      harBilde = true
      if (m.er_original) harOriginalBilde = true
      const alt = R.regelAltTekst(null, node.title)
      altTekst = alt.alt_tekst; altKilde = alt.alt_tekst_kilde
      if (alt.avvik) ko.push(køRad(kjoringId, { type: 'manglende_alttekst', ressurs_id: rid, medie_id: medieId, beskrivelse: alt.avvik.forklaring }))
    }

    medier.push({
      id: medieId, ressurs_id: rid, type: m.type,
      bunny_video_id: null,                       // fase 2 fyller video
      storage_sti: m.storage_sti, original_filnavn: m.original_filnavn ?? null,
      alt_tekst: altTekst, rekkefolge: rekk++, kilde_nid: String(nid),
      er_original: m.er_original ?? true,
      opphav_medie_id: null,                      // regelMedier gir én rad per fil → ingen original↔derivat-lenke her
      alt_tekst_kilde: altKilde, import_kjoring_id: kjoringId,
    })
  }

  // kun_skjermkvalitet: avledet per lek — leken har bilder, men ingen med er_original=true.
  if (harBilde && !harOriginalBilde) {
    ko.push(køRad(kjoringId, { type: 'kun_skjermkvalitet', ressurs_id: rid, beskrivelse: 'Leken har bilder, men ingen original (kun skjermkvalitet).' }))
  }
  return { medier, redaksjonell_ko: ko }
}

export function byggMediePass(noder, kjoringId, finnesISti) {
  // DESIGNEDE VAKTER (OPPGAVE C): navngitt hard stopp, aldri TypeError.
  krevArray(noder, 'noder (game-noder)', 'medie-passet')
  krevKjoringId(kjoringId, 'medie-passet')
  krevFunksjon(finnesISti, 'finnesISti (fil-indeks-oppslag)', 'medie-passet')
  const plan = { medier: [], redaksjonell_ko: [] }
  for (const node of noder) {
    const p = byggMedierForLek(node, kjoringId, finnesISti)
    plan.medier.push(...p.medier)
    plan.redaksjonell_ko.push(...p.redaksjonell_ko)
  }
  const køTyper = {}
  for (const r of plan.redaksjonell_ko) køTyper[r.type] = (køTyper[r.type] || 0) + 1
  const medieTyper = {}
  for (const m of plan.medier) medieTyper[m.type] = (medieTyper[m.type] || 0) + 1
  return { plan, telling: { medier: plan.medier.length, redaksjonell_ko: plan.redaksjonell_ko.length }, køTyper, medieTyper }
}

export async function skrivMediePass(klient, plan) {
  krevKlient(klient, 'medie-passet (skriv)')
  krevPlan(plan, 'medie-passet (skriv)')
  for (const tabell of MEDIEPASS_REKKEFOLGE) {
    const rader = plan[tabell]; if (!rader || !rader.length) continue
    const kols = Object.keys(rader[0])
    const konflikt = KONFLIKT[tabell] || ['id']
    const oppdater = kols.filter(k => !konflikt.includes(k))
    const setDel = oppdater.length ? ` do update set ${oppdater.map(k => `${k}=excluded.${k}`).join(', ')}` : ' do nothing'
    for (const rad of rader) {
      const verdier = kols.map(k => rad[k])
      const ph = kols.map((_, i) => `$${i + 1}`).join(', ')
      await klient.query(`insert into ${tabell} (${kols.join(', ')}) values (${ph}) on conflict (${konflikt.join(', ')})${setDel}`, verdier)
    }
  }
}
