#!/usr/bin/env node
// TILBAKERULLING-BEVIS (Del 2, claude_TILBAKERULLING-SPEC-5sep.md): slettKjøring dekker nå alle fire
// eiere (inkl. samlinger) + gruppe-B-sikkerhetsnett. Tre beviskrav:
//   1. Kjør alle fem pass (kjøring A), slettKjøring(A) → alle 21 kjøring-scopede tabeller = 0
//      (portens 23-liste; kompetansemaal/-trinn er delt referansedata, IKKE i denne jobben — migr 104).
//   2. samling_innhold slettes nå (overlevde før).
//   3. ISOLASJON (viktigst): en ANNEN kjøring B står urørt etter slettKjøring(A).
//
//   node scripts/import/test-tilbakerulling.mjs
//
// MERK: slettKjøring styrer sin egen begin/commit, så denne testen kjører i AUTOCOMMIT og COMMITTER
// (basen blir «skitten»). Bygg fersk base med porten etter denne testen, før regresjon.
// HARDSTOP: lokal base, ingenting mot Supabase, ingen git.

import { writeFileSync } from 'node:fs'
import { Skriver } from './lib/db.mjs'
import { byggKontekst, kjorAlleFem, maal, FASIT, KJ } from './test-alle-fem-pass.mjs'
import { detUuid } from './lib/uuid.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const KJ_B = detUuid('kjoring', 'test-tilbakerulling-B')
const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

// De 21 tabellene slettKjøring skal tømme (portens 23 minus de to referansedata-tabellene).
const EIER_SCOPED = Object.keys(FASIT).filter(t => t !== 'kompetansemaal' && t !== 'kompetansemaal_trinn')

// Sett inn markør-rader for en ANNEN kjøring (B) i de tabellene slettKjøring sletter EKSPLISITT
// (4 eiere + 4 gruppe-B) + én cascade-barn (samling_innhold). Distinkte id-er (B-navnerom).
async function settInnKjoringB(k) {
  const rid = detUuid('B', 'ressurs'), did = detUuid('B', 'dok'), sid = detUuid('B', 'samling')
  await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'B-test','paagaar',1) on conflict (id) do nothing`, [KJ_B])
  await k.query(`insert into ressurser (id, kilde_nid, import_kjoring_id, ressurstype, status) values ($1,'B1',$2,'lek','publisert')`, [rid, KJ_B])
  await k.query(`insert into dokumenter (id, tittel, status, kilde_nid, import_kjoring_id) values ($1,'B-dok','publisert','B2',$2)`, [did, KJ_B])
  await k.query(`insert into medier (id, ressurs_id, type, storage_sti, rekkefolge, kilde_nid, import_kjoring_id, er_original) values ($1,$2,'bilde','public/b.png',0,'B1',$3,true)`, [detUuid('B', 'medie'), rid, KJ_B])
  await k.query(`insert into samlinger (id, type, kilde_nid, import_kjoring_id) values ($1,'redaksjonell','B3',$2)`, [sid, KJ_B])
  await k.query(`insert into samling_innhold (samling_id, sprak, tittel) values ($1,'nb','B-samling')`, [sid])   // cascade-barn av samling B
  await k.query(`insert into samling_medie (id, samling_id, type, storage_sti, kilde_nid, import_kjoring_id, rekkefolge) values ($1,$2,'video','/b.mp4','B3',$3,0)`, [detUuid('B', 'smedie'), sid, KJ_B])
  await k.query(`insert into redaksjonell_ko (id, type, import_kjoring_id, status) values ($1,'annet',$2,'ny')`, [detUuid('B', 'ko'), KJ_B])   // subjektløs kø
  const kmId = (await k.query('select id from kompetansemaal where uri is not null limit 1')).rows[0].id
  await k.query(`insert into ressurs_kompetansemaal (ressurs_id, kompetansemaal_id, satt_av, tillit, import_kjoring_id) values ($1,$2,'maskin',1,$3)`, [rid, kmId, KJ_B])
  await k.query(`insert into ressurs_kompetansemaal_forslag (ressurs_id, kompetansemaal_id, skaar, import_kjoring_id, status) values ($1,$2,1,$3,'ny')`, [rid, kmId, KJ_B])
}

// Tell alle B-rader i de eksplisitt-slettede tabellene (skal overleve slettKjøring(A)).
async function tellB(k) {
  const q = async (sql) => +(await k.query(sql, [KJ_B])).rows[0].n
  const sidB = '(select id from samlinger where import_kjoring_id=$1)'
  return {
    ressurser: await q('select count(*) n from ressurser where import_kjoring_id=$1'),
    dokumenter: await q('select count(*) n from dokumenter where import_kjoring_id=$1'),
    medier: await q('select count(*) n from medier where import_kjoring_id=$1'),
    samlinger: await q('select count(*) n from samlinger where import_kjoring_id=$1'),
    samling_innhold: await q(`select count(*) n from samling_innhold where samling_id in ${sidB}`),
    samling_medie: await q('select count(*) n from samling_medie where import_kjoring_id=$1'),
    redaksjonell_ko: await q('select count(*) n from redaksjonell_ko where import_kjoring_id=$1'),
    ressurs_kompetansemaal: await q('select count(*) n from ressurs_kompetansemaal where import_kjoring_id=$1'),
    ressurs_kompetansemaal_forslag: await q('select count(*) n from ressurs_kompetansemaal_forslag where import_kjoring_id=$1'),
  }
}

async function main() {
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()   // AUTOCOMMIT — slettKjøring styrer sin egen transaksjon
  P('# Tilbakerulling-bevis — slettKjøring dekker nå samlinger (fjerde eier) + gruppe-B')
  P('')
  try {
    // ── Kjøring A: alle fem pass (committes i autocommit) ──
    const ctx = await byggKontekst(k)
    await kjorAlleFem(k, ctx)
    const aFor = await maal(k)

    // ── Kjøring B: markør-rader i alle eksplisitt-slettede tabeller ──
    await settInnKjoringB(k)
    const bFor = await tellB(k)

    P('## 1. Før slettKjøring(A): A skrevet, B satt inn')
    P(`   samling_innhold (A): ${aFor.samling_innhold}   ·   B-rader totalt: ${Object.values(bFor).reduce((a, b) => a + b, 0)} i 9 tabeller`)
    P('')

    // ── Rull tilbake KUN kjøring A ──
    const s = new Skriver({ dryRun: false, envSti: null }); s.klient = k
    await s.slettKjøring(KJ)

    const aEtter = await maal(k)
    const bEtter = await tellB(k)

    // ── Beviskrav 1: alle 21 kjøring-scopede tabeller = 0 for A ──
    P('## Beviskrav 1 — alle 21 kjøring-scopede tabeller tomme for A etter slettKjøring')
    const ikkeTomme = EIER_SCOPED.filter(t => aEtter[t] !== 0)
    for (const t of EIER_SCOPED) if (aEtter[t] !== 0) P(`   IKKE TOM: ${t} = ${aEtter[t]} (var ${aFor[t]})`)
    krev(`alle 21 tabeller = 0 (var f.eks. ressurser ${aFor.ressurser}, samling_ressurs ${aFor.samling_ressurs})`, ikkeTomme.length === 0)
    P(`   (kompetansemaal ${aEtter.kompetansemaal} / kompetansemaal_trinn ${aEtter.kompetansemaal_trinn} — delt referansedata, IKKE rørt av slettKjøring; migr 104)`)
    krev('kompetansemaal/-trinn uendret (ikke slettet)', aEtter.kompetansemaal === aFor.kompetansemaal && aEtter.kompetansemaal_trinn === aFor.kompetansemaal_trinn)
    P('')

    // ── Beviskrav 2: samling_innhold slettes nå ──
    P('## Beviskrav 2 — samling_innhold slettes nå (overlevde før)')
    krev(`samling_innhold ${aFor.samling_innhold} → ${aEtter.samling_innhold}`, aFor.samling_innhold > 0 && aEtter.samling_innhold === 0)
    P('')

    // ── Beviskrav 3: kjøring B urørt (viktigst) ──
    P('## Beviskrav 3 — kjøring B står URØRT etter slettKjøring(A)')
    let bOk = true
    for (const t of Object.keys(bFor)) {
      const uendret = bEtter[t] === bFor[t] && bFor[t] > 0
      if (!uendret) bOk = false
      P(`   ${t.padEnd(32)} B: ${bFor[t]} → ${bEtter[t]}  ${uendret ? 'OK' : 'ENDRET!'}`)
    }
    krev('alle B-rader overlevde (ingen kryss-kjørings-sletting)', bOk)
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL. A fullstendig rullet tilbake (inkl. samlinger/samling_innhold); B urørt.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    await k.end()
  }
  writeFileSync(`${UT}/RESULTAT-tilbakerulling-5sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-tilbakerulling-5sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
