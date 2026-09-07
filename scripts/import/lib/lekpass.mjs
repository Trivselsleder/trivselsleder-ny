// LEK-PASSET (skrivelagets steg 4, 5 og 6) — KUN game-leker.
// Spesifikasjon: claude_SKRIVELAG-SPESIFIKASJON-3sep.md steg 4/5/6 + 2B.
// Bygger på OPPSLAGSLAGET (lib/oppslag.mjs): koblingene skrives med *_id, ALDRI *_navn.
// Det lukker kjernefeilen G1.
//
// Bygger IKKE: dokumenter (steg 9), samlinger (steg 11), atlu, kompetansemål (atlu-siden).
//
// Bruk (inne i skrivelagets ene transaksjon, ETTER at oppslagslaget er bygget):
//   const { plan, telling } = byggLekPass(publiserteGameNoder, kjoringId, oppslag, K, { pubDocNids })
//   await skrivLekPass(klient, plan)     // FK-ordnet upsert, kalleren styrer begin/commit
//
// LEK-VEIEN FOR DOKUMENTKOBLINGER (F3, 5. sep): field_related_documents brukes av BÅDE leker og
//   samlinger. Rutingen skjer på foreldretype: en LEK-node → ressurs_dokument (091B), en SAMLING-node
//   → samling_dokument (samlings-passet). Denne fila eier LEK-veien.
//   OBLIGATORISK (N1-retting, 5. sep): `ctx.pubDocNids` MÅ være et Set (publiserte document-nid-er,
//   string). Mangler den, KASTER passet før første rad — aldri stille 0. Tidligere var den valgfri
//   (`if (ctx.pubDocNids)`), og uten den forsvant de 75 lek→dokument-koblingene stille — nøyaktig
//   F3-feilen, gjenoppstått som en stille sti. En lek-ISOLERT test (uten dokumenter i basen) sender inn
//   et TOMT Set eksplisitt: da blir hver kobling en synlig `lenke_upublisert`-kø, ikke et stille tap.
//   FK-ORDEN: ressurs_dokument.dokument_id → dokumenter. Derfor MÅ dokument-passet (steg 9) skrives
//   FØR skrivLekPass — ellers feiler FK. Kalleren styrer rekkefølgen.

// N1: hard stopp hvis den obligatoriske pubDocNids-parameteren mangler (aldri stille 0).
// N3-igjen-klassen (5. sep): et Set med feil ELEMENTTYPE (tall) gir `.has(String(nid))` aldri treff →
// ressurs_dokument 75 → 0. Elementene MÅ være strenger.
function krevPubDocNids(ctx) {
  if (!(ctx && ctx.pubDocNids instanceof Set)) {
    throw new Error('HARD STOPP: lek-passet krever ctx.pubDocNids (publiserte dokument-nid) — ellers tapes lek→dokument-koblingene stille')
  }
  if (ctx.pubDocNids.size > 0 && typeof ctx.pubDocNids.values().next().value !== 'string') {
    throw new Error('HARD STOPP: lek-passet krever at ctx.pubDocNids inneholder STRENGER (nid som streng) — feil elementtype gir ressurs_dokument = 0 uten kø (samme feilklasse som N3).')
  }
}

import { detUuid, detMedieUuid } from './uuid.mjs'
import * as R from './regler.mjs'
import { krevKjoringId, krevOppslag, krevArray, krevObjekt, krevKlient, krevPlan } from './vakt.mjs'

// FK-trygg rekkefølge for lek-passets tabeller (import_kjoring skrives av steg 2 før dette).
// ressurs_dokument sist: FK både til ressurser (skrives først her) og dokumenter (skrevet av steg 9).
export const LEKPASS_REKKEFOLGE = [
  'ressurser', 'ressurs_innhold',
  'ressurs_kategori', 'ressurs_utstyr', 'ressurs_trinn', 'ressurs_egnet',
  'redaksjonell_ko', 'ressurs_dokument',
]
// Konfliktnøkler (idempotent upsert → determinisme ved re-import).
const KONFLIKT = {
  ressurser: ['id'], ressurs_innhold: ['ressurs_id', 'sprak'],
  ressurs_kategori: ['ressurs_id', 'kategori_id'], ressurs_utstyr: ['ressurs_id', 'utstyr_id'],
  ressurs_trinn: ['ressurs_id', 'trinn_id'], ressurs_egnet: ['ressurs_id', 'egnet_id'],
  redaksjonell_ko: ['id'], ressurs_dokument: ['ressurs_id', 'dokument_id'],
}

function nyPlan() { const p = {}; for (const t of LEKPASS_REKKEFOLGE) p[t] = []; return p }

// Deterministisk kø-rad (093-kolonner: beskrivelse/forslag, IKKE forklaring — G3).
// id inkluderer type + subjekt + medie_id (A5) så to avvik på samme lek ikke overskriver hverandre.
function køRad(kjoringId, { type, beskrivelse, forslag = null, ressurs_id = null, medie_id = null }) {
  const nøkkel = `${kjoringId}-${type}-${ressurs_id || ''}-${medie_id || ''}-${(beskrivelse || '').slice(0, 40)}`
  return {
    id: detUuid('ko', nøkkel), type,
    ressurs_id, medie_id, import_kjoring_id: kjoringId,
    beskrivelse: beskrivelse || null, forslag, status: 'ny',
  }
}

// ── Bygg planbidrag for ÉN game-lek (steg 4/5/6) ─────────────────────────────
export function byggLek(node, kjoringId, oppslag, K, ctx = {}) {
  krevKjoringId(kjoringId, 'lek-passet (byggLek)')  // N4-klasse: eksportert sti forbi byggLekPass-vakten
  krevPubDocNids(ctx)                               // N1: mangler/feil pubDocNids → kast før noe bygges
  const p = nyPlan()
  const nid = node.nid
  const rid = detUuid('game', nid)
  const nh = R.normHtml(node.field_description?.[0]?.safe_value || node.field_description?.[0]?.value || '')

  // ── STEG 4: ressurser ──
  const ant = R.regelAntall(R.etikettVerdi(nh, 'Antall'))
  const sted = R.regelSted(nh)
  p.ressurser.push({
    id: rid, kilde_nid: String(nid), import_kjoring_id: kjoringId, ressurstype: 'lek',
    sted: sted.sted, antall_min: ant.min, antall_maks: ant.max, status: 'publisert',
    // opprettet_av: settes av steg 1 (import-bruker) — ikke bygget her; kolonnen er nullbar.
    // kan_ledes_av_elever: aldri fylt (ingen kilde) → DB-default false.
  })
  // Steg 5-avvik: utolkbart antall → antall_uavklart (råtekst bevares i ressurs_innhold).
  if (ant.avvik) p.redaksjonell_ko.push(køRad(kjoringId, {
    type: 'antall_uavklart', ressurs_id: rid, beskrivelse: ant.avvik.forklaring,
  }))

  // ── STEG 5: ressurs_innhold ──
  const beskrivelse = R.rensBeskrivelse(node.field_description?.[0]?.safe_value || '')
  const språk = (node.field_lang || []).map(l => l.value)
  const primærSpråk = språk[0] || 'nb'
  p.ressurs_innhold.push({
    ressurs_id: rid, sprak: primærSpråk, tittel: node.title || null,
    beskrivelse: beskrivelse || null, antall_raatekst: ant.raatekst, ferskhet: 'gjeldende',
    // 034-rettelse (A1): ikke nødvendig her — migr 102 sletter 034-radene FØR import,
    // så det finnes ingen gammel `kronologi` å nullstille på disse id-ene.
  })
  if (!beskrivelse) p.redaksjonell_ko.push(køRad(kjoringId, {
    type: 'tom_tekst', ressurs_id: rid, beskrivelse: 'Brødtekst tom etter rensing — ingen beskrivelse.',
  }))
  if (språk.includes('nn') && primærSpråk !== 'nn') {
    p.ressurs_innhold.push({ ressurs_id: rid, sprak: 'nn', tittel: null, beskrivelse: null, antall_raatekst: null, ferskhet: 'mangler' })
    p.redaksjonell_ko.push(køRad(kjoringId, { type: 'annet', ressurs_id: rid, beskrivelse: 'Nynorsk-merket, men ingen nn-tekst i eksporten — tom nn-rad opprettet.' }))
  }

  // ── STEG 6: koblinger med *_id fra oppslagslaget (lukker G1) ──
  // kategori (opprett-eller-gjenbruk-lista → skal alltid treffe; navn beskyttet i oppslaget).
  for (const c of (node.field_game_category || [])) {
    const navn = R.normaliserKategori(c.name || K.catName[String(c.tid)] || '')
    if (!navn) continue
    p.ressurs_kategori.push({ ressurs_id: rid, kategori_id: oppslag.kategoriId(navn) })
  }
  // field_icon / field_image ligner kategori men er det ikke → kø, ikke falsk kobling.
  if ((node.field_icon || []).length) p.redaksjonell_ko.push(køRad(kjoringId, { type: 'kategori_uavklart', ressurs_id: rid, beskrivelse: `field_icon satt (${node.field_icon[0]?.filename || '?'}) — ingen kategoriregel; ikke koblet.` }))
  if ((node.field_image || []).length) p.redaksjonell_ko.push(køRad(kjoringId, { type: 'kategori_uavklart', ressurs_id: rid, beskrivelse: `field_image satt (${node.field_image[0]?.filename || '?'}) — strukturert bildefelt uten kategoriregel; ikke koblet.` }))

  // utstyr (opprett-eller-gjenbruk-lista; term 428 alt droppet i regelUtstyr).
  const utstyr = R.regelUtstyr(node.field_game_equipment, K.eqName)
  for (const navn of utstyr.utstyrsnavn) p.ressurs_utstyr.push({ ressurs_id: rid, utstyr_id: oppslag.utstyrId(navn) })

  // trinn (hus-liste → HARD STOPP ved bom på en KJENT kode; manglende skoletype = data-hull → kø).
  const trinn = R.regelTrinn(node.field_school_type)
  for (const kode of trinn.trinnKoder) p.ressurs_trinn.push({ ressurs_id: rid, trinn_id: oppslag.trinnId(kode) })
  // egnet (S→SFO/AKS, hus-liste, hard).
  for (const navn of trinn.egnetNavn) p.ressurs_egnet.push({ ressurs_id: rid, egnet_id: oppslag.egnetId(navn) })
  // Ingen trinn OG ingen egnet utledet = ingen tolkbar skoletype → kø (IKKE hard stopp).
  if (trinn.trinnKoder.length === 0 && trinn.egnetNavn.length === 0) {
    p.redaksjonell_ko.push(køRad(kjoringId, {
      type: 'skoletype_mangler', ressurs_id: rid,
      beskrivelse: trinn.ukjenteKoder.length ? `Ingen tolkbar skoletype (ukjente koder: ${trinn.ukjenteKoder.join(',')}).` : 'Noden har ingen skoletype — ingen trinn utledet.',
    }))
  } else if (trinn.ukjenteKoder.length) {
    p.redaksjonell_ko.push(køRad(kjoringId, { type: 'annet', ressurs_id: rid, beskrivelse: `Delvis ukjent skoletype-kode(r): ${trinn.ukjenteKoder.join(',')} (trinn utledet fra de kjente).` }))
  }

  // ── LEK-VEIEN (F3): field_related_documents på en LEK → ressurs_dokument (rutet på foreldretype).
  // ctx.pubDocNids er GARANTERT et Set (krevPubDocNids øverst). rekkefolge = array-indeks (som
  // samlings-veien). Bom (dokument ikke publisert/funnet) → kø, aldri stille tap. Dedup: samme dokument
  // lenket flere ganger på samme lek kollapser via PK (ressurs_id, dokument_id) i skriv-steget.
  {
    let dRekk = 0
    const settDok = new Set()
    for (const d of (node.field_related_documents || [])) {
      const docNid = String(d.target_id)
      if (!ctx.pubDocNids.has(docNid)) {
        p.redaksjonell_ko.push(køRad(kjoringId, { type: 'lenke_upublisert', ressurs_id: rid, beskrivelse: `Relatert dokument-nid ${docNid} ikke publisert/funnet.` }))
        continue
      }
      const did = detUuid('document', docNid)
      if (settDok.has(did)) continue                                 // dedup: samme dokument flere ganger
      settDok.add(did)
      p.ressurs_dokument.push({ ressurs_id: rid, dokument_id: did, rekkefolge: dRekk++ })
    }
  }

  return p
}

// ── Kjør hele lek-passet over alle publiserte game-noder ─────────────────────
export function byggLekPass(noder, kjoringId, oppslag, K, ctx = {}) {
  // DESIGNEDE VAKTER (OPPGAVE C): navngitt hard stopp for hver forutsetning, aldri TypeError.
  krevArray(noder, 'noder (game-noder)', 'lek-passet')
  krevKjoringId(kjoringId, 'lek-passet')
  krevOppslag(oppslag, 'oppslag', 'lek-passet', 'kategoriId')
  krevObjekt(K, 'K (vokab-navn)', 'lek-passet', 'catName', 'eqName')
  krevPubDocNids(ctx)                              // N1: kast før løkka, selv med 0 noder
  const plan = nyPlan()
  for (const node of noder) {
    const p = byggLek(node, kjoringId, oppslag, K, ctx)
    for (const t of LEKPASS_REKKEFOLGE) plan[t].push(...p[t])
  }
  const telling = {}
  for (const t of LEKPASS_REKKEFOLGE) telling[t] = plan[t].length
  const køTyper = {}
  for (const r of plan.redaksjonell_ko) køTyper[r.type] = (køTyper[r.type] || 0) + 1
  return { plan, telling, køTyper }
}

// ── Skriv planen i FK-rekkefølge (kalleren styrer begin/commit) ──────────────
export async function skrivLekPass(klient, plan) {
  krevKlient(klient, 'lek-passet (skriv)')
  krevPlan(plan, 'lek-passet (skriv)')
  for (const tabell of LEKPASS_REKKEFOLGE) {
    const rader = plan[tabell]
    if (!rader || !rader.length) continue
    const kols = Object.keys(rader[0])
    const konflikt = KONFLIKT[tabell] || ['id']
    const oppdater = kols.filter(k => !konflikt.includes(k))
    const setDel = oppdater.length ? ` do update set ${oppdater.map(k => `${k}=excluded.${k}`).join(', ')}` : ' do nothing'
    for (const rad of rader) {
      const verdier = kols.map(k => rad[k])
      const ph = kols.map((_, i) => `$${i + 1}`).join(', ')
      await klient.query(
        `insert into ${tabell} (${kols.join(', ')}) values (${ph}) on conflict (${konflikt.join(', ')})${setDel}`,
        verdier)
    }
  }
}
