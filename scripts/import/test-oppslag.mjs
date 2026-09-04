#!/usr/bin/env node
// MEKANISK TEST av oppslagslaget (lib/oppslag.mjs) mot en ekte 001→102-base.
// Kjører IKKE noen skriving av leker — bygger bare oppslagskartene og løser opp HVER
// kobling de game-nodene trenger, og teller. ROLLBACK til slutt (måling, ikke import).
//
//   PORT_ADMIN_URL=... node scripts/import/test-oppslag.mjs   (mot trivsel_port_test)
//
// Krever: en lokal base bygget 001→102, og pg installert.

import { lesItems } from './lib/kilde.mjs'
import { Oppslag, HardStopp, TvetydigNavn, TidNavnKonflikt } from './lib/oppslag.mjs'
import * as R from './lib/regler.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'

function medlemNavn(c, catName) { return R.normaliserKategori(c.name || catName[String(c.tid)] || '') }

async function main() {
  // ── Last kilder (kun JSON-medlemmer, ingen utpakking) ──
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const catName = Object.fromEntries(catTerms.map(t => [String(t.tid), t.name]))
  const eqName = Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name]))
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t]))
  const eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))

  const publiserte = games.filter(n => n.status === 1 || n.status === '1')

  // ── Samle settet av Drupal-termer kjøringen TRENGER (referert av nodene) ──
  const katTidsRef = new Set(), utsTidsRef = new Set()
  for (const n of publiserte) {
    for (const c of (n.field_game_category || [])) if (c.tid != null) katTidsRef.add(String(c.tid))
    for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsTidsRef.add(String(e.target_id))
  }
  // Ta med forelder-tid-er for kategorier (så forelder finnes før barn).
  for (const tid of [...katTidsRef]) {
    const t = catByTid.get(tid)
    for (const p of (t?.parents || [])) if (catByTid.has(String(p))) katTidsRef.add(String(p))
  }
  const kategoriTermer = [...katTidsRef].map(tid => catByTid.get(tid)).filter(Boolean)
  const utstyrTermer = [...utsTidsRef].map(tid => eqByTid.get(tid)).filter(Boolean)

  const harHierarki = kategoriTermer.some(t => (t.parents || []).length > 0)

  // ── Koble til basen, bygg oppslagslaget i én transaksjon ──
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()

  const rapport = []
  const P = (s) => { rapport.push(s); console.log(s) }

  await k.query('begin')
  try {
    const o = new Oppslag(k)
    await o.lesFaste()

    const før = {
      kategorier: o.kategoriNavn.size, utstyr: o.utstyrNavn.size,
      trinn: o.trinn.size, egnet: o.egnet.size, sesong: o.sesong.size,
      fag: o.fag.size, kompUri: o.kompUri.size, dokType: o.dokTypeNavn.size,
    }

    // O3: en tid stemplet på en rad med annet navn skal HARD-STOPPE her. Fang og rapporter.
    const stopp = new Set()
    let oppsettStoppet = false
    try {
      await o.opprettEllerGjenbruk(kategoriTermer, utstyrTermer)
    } catch (e) {
      if (e instanceof TidNavnKonflikt || e instanceof TvetydigNavn || e instanceof HardStopp) {
        stopp.add(e.message); oppsettStoppet = true
      } else throw e
    }

    // ── Løs opp HVER kobling nodene trenger, tell id-treff og bom ──
    // O1: et tvetydig navn NEKTER med hard stopp (TvetydigNavn) — samles i «stopp», ikke bom.
    const løst = { kategori: 0, utstyr: 0, trinn: 0, egnet: 0 }
    const bom = { kategori: [], utstyr: [], trinn: [], egnet: [] }
    if (!oppsettStoppet) for (const n of publiserte) {
      for (const c of (n.field_game_category || [])) {
        const navn = medlemNavn(c, catName); if (!navn) continue
        try { o.kategoriId(navn); løst.kategori++ }
        catch (e) { if (e instanceof TvetydigNavn) stopp.add(e.message); else bom.kategori.push(navn) }
      }
      const u = R.regelUtstyr(n.field_game_equipment, eqName)
      for (const navn of u.utstyrsnavn) {
        try { o.utstyrId(navn); løst.utstyr++ }
        catch (e) { if (e instanceof TvetydigNavn) stopp.add(e.message); else bom.utstyr.push(navn) }
      }
      const t = R.regelTrinn(n.field_school_type)
      for (const kode of t.trinnKoder) {
        try { o.trinnId(kode); løst.trinn++ } catch (e) { if (e instanceof HardStopp) bom.trinn.push(kode); else throw e }
      }
      for (const navn of t.egnetNavn) {
        try { o.egnetId(navn); løst.egnet++ }
        catch (e) { if (e instanceof TvetydigNavn) stopp.add(e.message); else if (e instanceof HardStopp) bom.egnet.push(navn); else throw e }
      }
    }

    // ── Rapport ──
    P(`# Oppslagslag — mekanisk test mot 001→102-base`)
    P(`Kilde: ${ZIP}`)
    P(`Publiserte game-noder: ${publiserte.length}`)
    P(``)
    P(`## Referte Drupal-termer kjøringen trenger`)
    P(`  kategori-termer referert: ${kategoriTermer.length}  (av ${catTerms.length} i vokabularet)`)
    P(`  utstyr-termer referert:   ${utstyrTermer.length}  (av ${eqTerms.length}; «Uten utstyr» 428 droppes)`)
    P(`  kategori-hierarki (forelder/barn) i det refererte settet: ${harHierarki ? 'JA' : 'NEI (flatt)'}  [5.2 M]`)
    P(``)
    P(`## Kart bygget (antall oppslag per liste)`)
    P(`  kategorier:   ${før.kategorier} sådd → ${o.kategoriNavn.size} etter opprett-eller-gjenbruk`)
    P(`  utstyr:       ${før.utstyr} sådd → ${o.utstyrNavn.size} etter opprett-eller-gjenbruk`)
    P(`  trinn (NO):   ${o.trinn.size}`)
    P(`  egnet_kat.:   ${o.egnet.size}`)
    P(`  sesong:       ${o.sesong.size}   (ubrukt fase 1, bygget for komplethet)`)
    P(`  fag:          ${o.fag.size}      (ubrukt fase 1)`)
    P(`  kompetansemaal (uri): ${o.kompUri.size}   (atlu, ubrukt av game)`)
    P(`  dokument_type: ${o.dokTypeNavn.size}`)
    P(``)
    P(`## Opprett-eller-gjenbruk (de to listene importen fyller)`)
    P(`  kategorier: gjenbruk_tid=${o.telling.kategorier.gjenbruk_tid}  gjenbruk_navn+stemplet=${o.telling.kategorier.gjenbruk_navn_stemplet}  NY=${o.telling.kategorier.ny_opprettet}`)
    P(`  utstyr:     gjenbruk_tid=${o.telling.utstyr.gjenbruk_tid}  gjenbruk_navn+stemplet=${o.telling.utstyr.gjenbruk_navn_stemplet}  NY=${o.telling.utstyr.ny_opprettet}`)
    P(``)
    P(`## Hoppede termer [O2] (tomt navn / «Uten utstyr» 428 — forklarer 214 mot 213)`)
    P(`  kategori, tomt navn:         ${o.hoppet.kategori_tomt_navn}`)
    P(`  utstyr, tomt navn:           ${o.hoppet.utstyr_tomt_navn}`)
    P(`  utstyr, «Uten utstyr» (428): ${o.hoppet.utstyr_uten_utstyr_428}`)
    P(`  SUM hoppet: ${o.hoppet.kategori_tomt_navn + o.hoppet.utstyr_tomt_navn + o.hoppet.utstyr_uten_utstyr_428}  (ingen term er tapt — tallet er nå synlig)`)
    P(``)
    P(`## Oppslag av HVER kobling nodene trenger (navn/tid → id)`)
    P(`  kategori-koblinger løst til id: ${løst.kategori}   bom: ${bom.kategori.length}`)
    P(`  utstyr-koblinger  løst til id: ${løst.utstyr}   bom: ${bom.utstyr.length}`)
    P(`  trinn-koblinger   løst til id: ${løst.trinn}   bom (hard stopp): ${bom.trinn.length}`)
    P(`  egnet-koblinger   løst til id: ${løst.egnet}   bom (hard stopp): ${bom.egnet.length}`)
    const visBom = (navn, arr) => { if (arr.length) P(`    BOM ${navn}: ${[...new Set(arr)].slice(0, 20).join(', ')}${arr.length > 20 ? ' …' : ''}`) }
    visBom('kategori', bom.kategori); visBom('utstyr', bom.utstyr); visBom('trinn', bom.trinn); visBom('egnet', bom.egnet)

    const alleBom = bom.kategori.length + bom.utstyr.length + bom.trinn.length + bom.egnet.length
    const alleOppslag = løst.kategori + løst.utstyr + løst.trinn + løst.egnet
    P(``)
    P(`## Hard-stopp [O1 tvetydig navn / O3 tid-mot-navn]`)
    if (stopp.size === 0) {
      P(`  ingen — 0 tvetydige navn, 0 tid/navn-konflikter`)
    } else {
      P(`  ${stopp.size} hard-stopp:`)
      for (const m of stopp) P(`    ${m}`)
    }
    P(``)
    P(`SUM oppslag løst til id: ${alleOppslag}`)
    P(oppsettStoppet
      ? `RESULTAT: HARD STOPP i opprett-eller-gjenbruk — oppslag ikke kjørt. Se stopp over.`
      : (stopp.size > 0
        ? `RESULTAT: ${alleOppslag} oppslag, ${alleBom} bom, ${stopp.size} hard-stopp — se stopp over.`
        : (alleBom === 0
          ? `RESULTAT: ${alleOppslag} oppslag, 0 bom, 0 stopp. Oppslagslaget produserer *_id, ikke *_navn.`
          : `RESULTAT: ${alleOppslag} oppslag, ${alleBom} bom — se lister over.`)))
  } finally {
    await k.query('rollback')   // MÅLING: ingenting skrives varig
    await k.end()
  }
  return rapport
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
