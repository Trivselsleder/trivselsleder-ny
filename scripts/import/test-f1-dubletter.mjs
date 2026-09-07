#!/usr/bin/env node
// OPPGAVE A — BEVIS for F1-rettingen (bokmål/nynorsk-dublettene blant de gamle merkelappene).
//
// Bygger en PROD-LIK base: 302 gamle merkelapper (uri IS NULL, tekst = kobling-forslag.csv sin
// vaar_tekst) — samme oppsett kontrolløren (Fable) brukte. Kjører deretter:
//   POSITIV: den EKTE, rettede seedUdirMaal (liste-kart) → forventet erstattet_av 200/200,
//            utgatt 65/65. Måles BÅDE fra funksjonens egen telling OG uavhengig i basen.
//   NEGATIV: en VERBATIM gjengivelse av pre-fiks-logikken (enkelt-id-kart, `where id=$2`,
//            kopiert ordrett fra aktivlaering.mjs linje 94–114 FØR rettingen) → 188/56.
// Uten den negative testen er rettingen ikke bevist (tallene skal FALLE tilbake uten fikset).
//
// Ingen node-kilde trengs. Alt i én transaksjon med rollback — ingenting skrives varig.
//   node scripts/import/test-f1-dubletter.mjs

import { readFileSync } from 'node:fs'
import { parseCsvObjekter } from './lib/csv.mjs'
import { seedUdirMaal, lastKoblingForslag, normTekst } from './lib/aktivlaering.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const SENTINEL = '__SEED_EKSKLUDERT__'   // nøytraliserer forhåndsliggende uri-null-rader (id=1 er FK-referert)

async function main() {
  const koblingForslag = lastKoblingForslag()
  const lk20 = JSON.parse(readFileSync('data/udir/lk20-kompetansemaal.json', 'utf8'))
  const P = (s) => console.log(s)

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()

  await k.query('begin')
  try {
    // ── Bygg prod-lik base: nøytraliser eksisterende uri-null-rad(er), sett inn 302 ──
    await k.query(`update kompetansemaal set tekst=$1 where uri is null`, [SENTINEL])
    for (const kf of koblingForslag) {
      await k.query(`insert into kompetansemaal (tekst) values ($1)`, [kf.vaar_tekst])
    }
    const antallGamle = Number((await k.query(
      `select count(*) n from kompetansemaal where uri is null and tekst<>$1`, [SENTINEL])).rows[0].n)
    P(`# OPPGAVE A — F1: dublettene blant de gamle merkelappene`)
    P(`base: ${DBURL}`)
    P(`302 gamle merkelapper satt inn (tekst = vaar_tekst); prod-lik. Talt: ${antallGamle}`)
    P(``)

    // Antall A/B- og D-rader vi FORVENTER flagget (uavhengig av koden — regnet fra bunkene i CSV-en).
    const abForventet = koblingForslag.filter(r => (r.bunke === 'A' || r.bunke === 'B') && r.udir_uri).length
    const dForventet = koblingForslag.filter(r => r.bunke === 'D').length
    P(`Forventet (fra CSV-bunkene): A/B med uri = ${abForventet}, D = ${dForventet}`)
    P(``)

    // ── POSITIV: den EKTE rettede funksjonen ──
    const a = await seedUdirMaal(k, lk20, koblingForslag)
    const posBaseE = Number((await k.query(
      `select count(*) n from kompetansemaal where uri is null and tekst<>$1 and erstattet_av is not null`, [SENTINEL])).rows[0].n)
    const posBaseU = Number((await k.query(
      `select count(*) n from kompetansemaal where uri is null and tekst<>$1 and utgatt`, [SENTINEL])).rows[0].n)
    P(`## POSITIV — ekte rettet seedUdirMaal (liste-kart, id = any($2))`)
    P(`  funksjonens telling:  erstattet_av=${a.telling.gamle_erstattet}   utgatt=${a.telling.gamle_utgatt}`)
    P(`  uavhengig i basen:    erstattet_av=${posBaseE}   utgatt=${posBaseU}`)
    P(`  forventet:            erstattet_av=${abForventet}   utgatt=${dForventet}`)
    const posOk = a.telling.gamle_erstattet === abForventet && posBaseE === abForventet &&
                  a.telling.gamle_utgatt === dForventet && posBaseU === dForventet
    P(`  RESULTAT: ${posOk ? 'BESTÅTT — alle dublett-rader flagget (200/200, 65/65).' : 'AVVIK — se over.'}`)
    P(``)

    // ── NEGATIV: nullstill flaggene, kjør pre-fiks-logikken VERBATIM ──
    await k.query(`update kompetansemaal set erstattet_av=null, utgatt=false where uri is null`)
    // ↓↓↓ ORDRETT kopi av aktivlaering.mjs FØR F1-rettingen (enkelt-id-kart, where id=$2) ↓↓↓
    const gamle = (await k.query('select id, tekst from kompetansemaal where uri is null')).rows
    const gamleByNorm = new Map()
    for (const g of gamle) gamleByNorm.set(normTekst(g.tekst), g.id)     // BUGG: siste vinner
    let gamle_erstattet = 0, gamle_utgatt = 0
    for (const kf of koblingForslag) {
      const gid = gamleByNorm.get(normTekst(kf.vaar_tekst))
      if (gid == null) continue
      if ((kf.bunke === 'A' || kf.bunke === 'B') && kf.udir_uri && a.uriTilId.has(kf.udir_uri)) {
        const r = await k.query(
          'update kompetansemaal set erstattet_av=$1 where id=$2 and erstattet_av is distinct from $1',
          [a.uriTilId.get(kf.udir_uri), gid])
        gamle_erstattet += r.rowCount
      } else if (kf.bunke === 'D') {
        const r = await k.query(
          "update kompetansemaal set utgatt=true, laereplanversjon='LK06' where id=$1 and (utgatt is distinct from true)",
          [gid])
        gamle_utgatt += r.rowCount
      }
    }
    // ↑↑↑ slutt verbatim pre-fiks ↑↑↑
    const negBaseE = Number((await k.query(
      `select count(*) n from kompetansemaal where uri is null and tekst<>$1 and erstattet_av is not null`, [SENTINEL])).rows[0].n)
    const negBaseU = Number((await k.query(
      `select count(*) n from kompetansemaal where uri is null and tekst<>$1 and utgatt`, [SENTINEL])).rows[0].n)
    P(`## NEGATIV — pre-fiks-logikk (enkelt-id-kart, where id=$2), fjernet retting`)
    P(`  loop-telling:         erstattet_av=${gamle_erstattet}   utgatt=${gamle_utgatt}`)
    P(`  uavhengig i basen:    erstattet_av=${negBaseE}   utgatt=${negBaseU}`)
    const negOk = negBaseE === 188 && negBaseU === 56
    P(`  RESULTAT: ${negOk ? 'BESTÅTT — tallene faller tilbake til 188/56 uten fikset.' : `tall: ${negBaseE}/${negBaseU} (forventet 188/56)`}`)
    P(``)
    P(`## Differansen rettingen redder`)
    P(`  erstattet_av: ${negBaseE} → ${posBaseE}  (+${posBaseE - negBaseE} dublett-rader)`)
    P(`  utgatt:       ${negBaseU} → ${posBaseU}  (+${posBaseU - negBaseU} dublett-rader)`)
    P(`  til sammen ${(posBaseE - negBaseE) + (posBaseU - negBaseU)} gamle rader som ellers sto som «gjeldende».`)
  } finally {
    await k.query('rollback')
    await k.end()
  }
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
