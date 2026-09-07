// SAMLINGS-PASSET (skrivelagets steg 11) — de 21 lenkesamlingene.
// Spesifikasjon: claude_SKRIVELAG-SPESIFIKASJON-3sep.md steg 11 + claude_SAMLING-DOKUMENT-EKSPORT-4sep.md.
// Bruker lib/oppslag.mjs (egnet-oppslag) og lib/ko.mjs. Skriver IDer, aldri navn.
//
// KILDER (to ULIKE mekanismer — ikke samme kode for begge):
//   - samling→lek: parses fra <a href> i BRØDTEKSTEN (field_description), matchet mot game-url_alias.
//   - samling→dokument: fra det STRUKTURERTE feltet field_related_documents (samme felt som 091B).
//     RUTING: field_related_documents på en LEK → ressurs_dokument; på en SAMLING → samling_dokument.
//
// FORUTSETNING: lek-passet (medlemslekene) og dokument-passet (mål-dokumentene) er skrevet FØRST
//   (FK: samling_ressurs.ressurs_id → ressurser, samling_dokument.dokument_id → dokumenter).
//
// FLAGG D: avpubliserte lenkesamlinger (17734) og testnoden (20062) utelates.
//
// OBLIGATORISK (vei A): hver medlemslek merkes med samlingens egnet_kategori (ressurs_egnet) —
//   ellers står boksene på Min side tomme (sok_leker/089 ser aldri samlinger).

import { detUuid, detMedieUuid } from './uuid.mjs'
import { køRad } from './ko.mjs'
import * as R from './regler.mjs'
import { krevKjoringId, krevOppslag, krevArray, krevSet, krevMap, krevKlient, krevPlan, krevDisjunkte } from './vakt.mjs'

// Delt kontekst-vakt for samlings-passet (typer + ikke-tom + elementtype + RELASJON). Kalles av både
// byggSamlingPass (før løkka) og eksportert byggSamling (offentlig sti). Relasjonsvakten er den femte
// omgåelsen: lekNids/samlingNids/avpubGameNids skal være PARVIS DISJUNKTE — en node er lek ELLER samling.
function krevSamlingKtx(kjoringId, oppslag, ctx) {
  krevKjoringId(kjoringId, 'samlings-passet')
  krevOppslag(oppslag, 'oppslag', 'samlings-passet', 'egnetId')
  const c = ctx || {}
  krevMap(c.aliasTilNid, 'ctx.aliasTilNid', 'samlings-passet', { ikkeTom: true })
  krevSet(c.lekNids, 'ctx.lekNids', 'samlings-passet', { ikkeTom: true, strengElementer: true })
  krevSet(c.avpubGameNids, 'ctx.avpubGameNids', 'samlings-passet', { strengElementer: true })
  krevSet(c.pubDocNids, 'ctx.pubDocNids', 'samlings-passet', { strengElementer: true })
  krevSet(c.samlingNids, 'ctx.samlingNids', 'samlings-passet', { strengElementer: true })
  krevDisjunkte(c.lekNids, 'ctx.lekNids', c.samlingNids, 'ctx.samlingNids', 'samlings-passet')
  krevDisjunkte(c.lekNids, 'ctx.lekNids', c.avpubGameNids, 'ctx.avpubGameNids', 'samlings-passet')
}

export const TESTNODE_NID = 20062   // «Test» (publisert) — ekskluderes fra leke-strømmen.

export const SAMLINGPASS_REKKEFOLGE = [
  'samlinger', 'samling_innhold', 'samling_ressurs', 'samling_medie', 'samling_dokument',
  'ressurs_egnet', 'redaksjonell_ko',
]
const KONFLIKT = {
  samlinger: ['id'], samling_innhold: ['samling_id', 'sprak'],
  samling_ressurs: ['samling_id', 'ressurs_id'], samling_medie: ['id'],
  samling_dokument: ['samling_id', 'dokument_id'], ressurs_egnet: ['ressurs_id', 'egnet_id'],
  redaksjonell_ko: ['id'],
}

// C1: en game-node er en lenkesamling hvis beskrivelsen har ≥3 absolutte trivselsleder.no-lenker.
const ABS_RE = /href=["'][^"']*trivselsleder\.no[^"']*["']/gi
export function erLenkesamling(node) {
  const b = node.field_description?.[0]?.safe_value || node.field_description?.[0]?.value || ''
  return (b.match(ABS_RE) || []).length >= 3
}
export function finnLenkesamlingNids(games) {
  return new Set(games.filter(erLenkesamling).map(n => String(n.nid)))
}

// Siste sti-ledd av en href = url_alias (f.eks. .../mastermind-1 → «mastermind-1»).
function aliasFraHref(href) {
  const rein = String(href).replace(/[?#].*$/, '').replace(/\/+$/, '')
  return rein.split('/').filter(Boolean).pop() || null
}
const alleHrefs = (node) => [...String(node.field_description?.[0]?.safe_value || '')
  .matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1])

// Bygg planbidrag for ÉN publisert lenkesamling.
export function byggSamling(node, kjoringId, oppslag, ctx) {
  krevSamlingKtx(kjoringId, oppslag, ctx)   // offentlig sti forbi byggSamlingPass — samme vakt + N4 (kjoringId)
  const { aliasTilNid, lekNids, avpubGameNids, pubDocNids, samlingNids } = ctx
  const p = {}; for (const t of SAMLINGPASS_REKKEFOLGE) p[t] = []
  const nid = String(node.nid)
  const sid = detUuid('samling', nid)

  // (1) samlinger
  p.samlinger.push({
    id: sid, type: 'redaksjonell', synlig: true, rekkefolge: 0,
    kilde_nid: nid, kilde_tid: null, import_kjoring_id: kjoringId,
    // opprettet_av: steg 1 (import-bruker) — nullbar, ikke bygget.
  })
  // (2) samling_innhold
  p.samling_innhold.push({ samling_id: sid, sprak: 'nb', tittel: node.title || null, beskrivelse: null })

  // (3) samling_ressurs — parse brødtekst-lenker → lek-id. Egnet-merking av hver medlemslek (vei A).
  const egnetIds = samlingEgnetIds(node, oppslag, p, kjoringId, sid)
  const settLek = new Set()
  let rekk = 0
  for (const href of alleHrefs(node)) {
    // samle-video (mp4/mov/webm eller /file/) → samling_medie, ikke lek.
    if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(href) || /\/file\//i.test(href)) {
      const mId = detMedieUuid('samling', nid, aliasFraHref(href) || String(rekk), 'video')
      p.samling_medie.push({ id: mId, samling_id: sid, type: 'video', bunny_video_id: null,
        storage_sti: href.replace(/^https?:\/\/[^/]+/, ''), original_filnavn: aliasFraHref(href),
        alt_tekst: null, alt_tekst_kilde: null, kilde_nid: nid, import_kjoring_id: kjoringId, rekkefolge: p.samling_medie.length })
      p.redaksjonell_ko.push(køRad(kjoringId, { type: 'samling_video_ulastet', samling_id: sid, beskrivelse: `Samle-video ${aliasFraHref(href)} mangler bunny_video_id (fase 2).` }))
      continue
    }
    const alias = aliasFraHref(href)
    if (!alias || !/trivselsleder\.no/i.test(href)) continue        // ikke en intern lenke
    const målNid = aliasTilNid.get(alias)
    if (målNid == null) { p.redaksjonell_ko.push(køRad(kjoringId, { type: 'lenke_ulost', samling_id: sid, beskrivelse: `Lenke «${alias}» lot seg ikke løse til et mål.` })); continue }
    if (samlingNids.has(String(målNid)) || String(målNid) === String(TESTNODE_NID)) continue   // lenke til en annen samling/testnode → ikke en medlemslek
    if (avpubGameNids.has(String(målNid))) { p.redaksjonell_ko.push(køRad(kjoringId, { type: 'lenke_upublisert', samling_id: sid, beskrivelse: `Lenke «${alias}» peker på avpublisert innhold.` })); continue }
    if (!lekNids.has(String(målNid))) {
      // N3-rot (5. sep): alias-kartet løste til en PUBLISERT game-nid som verken er samling, testnode
      // eller avpublisert — altså skal den være en lek. Er den ikke i lekNids, er det et avvik i
      // kallerens kontekst, IKKE «ikke en lek». Køes (synlig), aldri stille `continue`.
      p.redaksjonell_ko.push(køRad(kjoringId, { type: 'lenke_ulost', samling_id: sid, beskrivelse: `Lenke «${alias}» løste til publisert node ${målNid}, men den er ikke i lekNids (kaller-kontekst-avvik).` }))
      continue
    }
    const rid = detUuid('game', målNid)
    if (settLek.has(rid)) continue                                   // dedup: samme lek lenket flere ganger
    settLek.add(rid)
    p.samling_ressurs.push({ samling_id: sid, ressurs_id: rid, rekkefolge: rekk++, seksjon: null })
    // vei A: merk medlemsleken med samlingens egnet(er).
    for (const egnetId of egnetIds) p.ressurs_egnet.push({ ressurs_id: rid, egnet_id: egnetId })
  }

  // (4) samling_dokument — fra field_related_documents (rutet: KUN samlinger havner her).
  let dRekk = 0
  for (const d of (node.field_related_documents || [])) {
    const docNid = String(d.target_id)
    if (!pubDocNids.has(docNid)) { p.redaksjonell_ko.push(køRad(kjoringId, { type: 'lenke_upublisert', samling_id: sid, beskrivelse: `Dokument-nid ${docNid} ikke publisert/funnet.` })); continue }
    p.samling_dokument.push({ samling_id: sid, dokument_id: detUuid('document', docNid), rekkefolge: dRekk++ })
  }

  return p
}

// Samlingens egnet_kategori(er) fra field_game_category (leaf-navn → egnet). Boks-merking = SOFT (kø ved bom).
function samlingEgnetIds(node, oppslag, p, kjoringId, sid) {
  const ids = []
  for (const c of (node.field_game_category || [])) {
    const navn = R.normaliserKategori(c.name || '')
    if (!navn) continue
    const id = oppslag.egnetId(navn, { hard: false })   // boks-merking: bom → kø, aldri opprett/hard stopp
    if (id != null) ids.push(id)
    // (bom fanges i oppslag.bom.egnet_ko; en samling-kategori som ikke er en egnet, f.eks. «* Tipslister», hoppes stille)
  }
  return [...new Set(ids)]
}

export function byggSamlingPass(samlinger, kjoringId, oppslag, ctx) {
  // DESIGNEDE VAKTER (N3 + N3-igjen + relasjon + OPPGAVE C): typer, ikke-tom, elementtype OG relasjon
  // (lekNids/samlingNids/avpubGameNids disjunkte). Byggeren krever gyldig kontekst FØR løkka.
  krevArray(samlinger, 'samlinger', 'samlings-passet')
  krevSamlingKtx(kjoringId, oppslag, ctx)
  const plan = {}; for (const t of SAMLINGPASS_REKKEFOLGE) plan[t] = []
  for (const node of samlinger) {
    const p = byggSamling(node, kjoringId, oppslag, ctx)
    for (const t of SAMLINGPASS_REKKEFOLGE) plan[t].push(...p[t])
  }
  const telling = {}; for (const t of SAMLINGPASS_REKKEFOLGE) telling[t] = plan[t].length
  const køTyper = {}; for (const r of plan.redaksjonell_ko) køTyper[r.type] = (køTyper[r.type] || 0) + 1
  return { plan, telling, køTyper }
}

export async function skrivSamlingPass(klient, plan) {
  krevKlient(klient, 'samlings-passet (skriv)')
  krevPlan(plan, 'samlings-passet (skriv)')
  for (const tabell of SAMLINGPASS_REKKEFOLGE) {
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
