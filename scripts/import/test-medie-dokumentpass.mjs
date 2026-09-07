#!/usr/bin/env node
// MEKANISK TEST av medie-passet (steg 8) og dokument-passet (steg 9) mot en ekte 001→103-base.
// Kjører oppslag, så dokument-passet (steg 9, FØRST — ressurs_dokument har FK til dokumenter),
// deretter lek-passet (steg 4/5/6, skriver ressurser + ressurs_dokument), så medie-passet (steg 8).
// Teller FAKTISKE rader, kjører EN GANG TIL for determinisme, og ruller tilbake.
//
//   node scripts/import/test-medie-dokumentpass.mjs
//
// F1 (rettet 5. sep): medie-passet kjøres på den FILTRERTE leke-strømmen (846 = 867 publiserte game
//   MINUS 20 lenkesamlinger MINUS testnoden) — samme strøm som lek- og samlings-passet. Kjørt på alle
//   867 ga 366; de 3 ekstra var samle-videoene på lenkesamlingene 16190/18822/20030, som hører hjemme
//   i samling_medie, ikke medier. Riktig tall er 363.
// F2 (rettet 5. sep): dokument-passet skriver nå dokument_dokumenttype og dokument_sprak (migr 103).
// F3 (rettet 5. sep): lek-passet skriver ressurs_dokument (lek-veien for field_related_documents).

import { lesItems, lesFilindeks } from './lib/kilde.mjs'
import { Oppslag } from './lib/oppslag.mjs'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggMediePass, skrivMediePass } from './lib/mediepass.mjs'
import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { finnLenkesamlingNids, TESTNODE_NID } from './lib/samlingpass.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const KJORING_ID = detUuid('kjoring', 'test-medie-dok-4sep')
const pub = (n) => n.status === 1 || n.status === '1'

async function tell(k) {
  const q = async (sql, p = []) => +(await k.query(sql, p)).rows[0].n
  const dokFilter = 'where dokument_id in (select id from dokumenter where import_kjoring_id=$1)'
  return {
    medier: await q('select count(*) n from medier where import_kjoring_id=$1', [KJORING_ID]),
    dokumenter: await q('select count(*) n from dokumenter where import_kjoring_id=$1', [KJORING_ID]),
    dokument_dokumenttype: await q(`select count(*) n from dokument_dokumenttype ${dokFilter}`, [KJORING_ID]),
    dokument_sprak: await q(`select count(*) n from dokument_sprak ${dokFilter}`, [KJORING_ID]),
    dokument_fag: await q(`select count(*) n from dokument_fag ${dokFilter}`, [KJORING_ID]),
    ressurs_dokument: await q('select count(*) n from ressurs_dokument where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJORING_ID]),
  }
}

async function main() {
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const docs = lesItems(ZIP, 'Content/document-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const K = { catName: Object.fromEntries(catTerms.map(t => [String(t.tid), t.name])), eqName: Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name])) }
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t])), eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))
  const indeks = lesFilindeks(ZIP)
  const finnes = (sti) => indeks.has(sti)

  const pubGames = games.filter(pub)
  // F1: filtrer leke-strømmen (846) — samme filter som lek- og samlings-passet.
  const samlingNids = finnLenkesamlingNids(games)
  const lekNoder = pubGames.filter(n => !samlingNids.has(String(n.nid)) && String(n.nid) !== String(TESTNODE_NID))
  const pubDocs = docs.filter(pub)   // FLAGG D: avpublisert ut
  const pubDocNids = new Set(pubDocs.map(d => String(d.nid)))

  // Referte termer for opprett-eller-gjenbruk (fra leke-strømmen, samme som samlings-passet).
  const katT = new Set(), utsT = new Set()
  for (const n of lekNoder) { for (const c of (n.field_game_category || [])) if (c.tid != null) katT.add(String(c.tid)); for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsT.add(String(e.target_id)) }
  for (const tid of [...katT]) for (const p of (catByTid.get(tid)?.parents || [])) if (catByTid.has(String(p))) katT.add(String(p))
  const kategoriTermer = [...katT].map(t => catByTid.get(t)).filter(Boolean)
  const utstyrTermer = [...utsT].map(t => eqByTid.get(t)).filter(Boolean)

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  const P = (s) => console.log(s)

  await k.query('begin')
  try {
    const o = new Oppslag(k)
    await o.lesFaste()
    await o.opprettEllerGjenbruk(kategoriTermer, utstyrTermer)
    await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2) on conflict (id) do update set antall_noder=excluded.antall_noder`, [KJORING_ID, lekNoder.length])

    // ── STEG 9 FØRST: dokument-passet (dokumenter må finnes før ressurs_dokument-FK) ──
    const d1 = byggDokumentPass(pubDocs, KJORING_ID, o)
    await skrivDokumentPass(k, d1.plan)
    // ── Forutsetning: lek-passet (ressurser + ressurs_dokument). medier.ressurs_id → ressurser. ──
    const l1 = byggLekPass(lekNoder, KJORING_ID, o, K, { pubDocNids })
    await skrivLekPass(k, l1.plan)
    // ── STEG 8: medie-passet (på 846-strømmen) ──
    const m1 = byggMediePass(lekNoder, KJORING_ID, finnes)
    await skrivMediePass(k, m1.plan)
    const t1 = await tell(k)

    // ── Determinisme: kjør alle tre pass EN GANG TIL på samme base ──
    await skrivDokumentPass(k, byggDokumentPass(pubDocs, KJORING_ID, o).plan)
    await skrivLekPass(k, byggLekPass(lekNoder, KJORING_ID, o, K, { pubDocNids }).plan)
    await skrivMediePass(k, byggMediePass(lekNoder, KJORING_ID, finnes).plan)
    const t2 = await tell(k)

    // ── Rapport ──
    P(`# Medie-pass (steg 8) + dokument-pass (steg 9) + lek-veien (ressurs_dokument) — mot 001→103-base`)
    P(`Leke-strømmen (846): ${lekNoder.length} leker (${pubGames.length} publiserte − ${samlingNids.size} samlinger − testnode ${TESTNODE_NID})`)
    P(`Publiserte document-noder: ${pubDocs.length} (avpublisert utelatt, FLAGG D)`)
    P(``)
    P(`## STEG 8 — medier (FAKTISK skrevet, F1: 846-strøm)`)
    P(`  medier-rader: ${t1.medier}   (bilde=${m1.medieTyper.bilde || 0}, video=${m1.medieTyper.video || 0}; bunny_video_id=NULL)`)
    P(`  kø per type:`)
    for (const [t, n] of Object.entries(m1.køTyper).sort((a, b) => b[1] - a[1])) P(`    ${t.padEnd(20)} ${n}`)
    P(``)
    P(`## STEG 9 — dokumenter (FAKTISK skrevet, F2)`)
    P(`  dokumenter-rader: ${t1.dokumenter}`)
    P(`  dokument_dokumenttype-rader: ${t1.dokument_dokumenttype}  (resolvert løst=${d1.res.dokumenttype_lost}, bom=${d1.res.dokumenttype_bom})`)
    P(`  dokument_sprak-rader: ${t1.dokument_sprak}  (nb/nn=${d1.res.sprak_nb_nn}; utenfor 103-CHECK køet=${d1.res.sprak_ukjent}: ${JSON.stringify(d1.sprakUkjent)})`)
    P(`  dokument_fag-rader: ${t1.dokument_fag}  (løst=${d1.res.fag_lost}, bom=${d1.res.fag_bom}; fag ikke sådd: ${d1.fagMangler.join(', ') || 'ingen'})`)
    P(`  dokumenter med flere filer: ${d1.res.flere_filer}`)
    P(`  kø per type:`)
    for (const [t, n] of Object.entries(d1.køTyper).sort((a, b) => b[1] - a[1])) P(`    ${t.padEnd(20)} ${n}`)
    P(``)
    P(`## LEK-VEIEN (F3) — ressurs_dokument (FAKTISK skrevet)`)
    P(`  ressurs_dokument-rader: ${t1.ressurs_dokument}`)
    P(``)
    P(`## dokument_type-kart — nås alle 51?`)
    P(`  dokument_type oppslag på tid: ${o.dokTypeTid.size} av 51   ·   på navn (lower): ${o.dokTypeNavn.size} (6 delt navn)`)
    P(`  → dokumenttype-bom over: ${d1.res.dokumenttype_bom} (0 = alle referte typer nås via tid)`)
    P(``)
    P(`## Determinisme (kjøring 1 vs 2 på samme base)`)
    const felt = ['medier', 'dokumenter', 'dokument_dokumenttype', 'dokument_sprak', 'dokument_fag', 'ressurs_dokument']
    const likt = felt.every(t => t1[t] === t2[t])
    for (const t of felt) P(`  ${t.padEnd(22)} kjøring1=${t1[t]}  kjøring2=${t2[t]}  ${t1[t] === t2[t] ? 'OK' : 'AVVIK!'}`)
    P(``)
    P(likt ? `RESULTAT: identiske tall i begge kjøringer → deterministisk og idempotent. IDer skrevet, ikke navn.` : `RESULTAT: AVVIK — se over.`)
  } finally {
    await k.query('rollback')
    await k.end()
  }
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
