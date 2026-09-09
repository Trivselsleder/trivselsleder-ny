#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//  ⚠️  ENGANGSFIL — KJØRER IMPORTEN ÉN GANG MOT PRODUKSJON (zpirjbrcbeubwpmtncxx)  ⚠️
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
//  HVA DETTE ER:
//    En MIDLERTIDIG engangs-inngang som OMGÅR den permanente prod-sperren i lib/db.mjs — ikke ved
//    å endre sperren, men ved å bygge tilkoblingen selv i DENNE fila. Den kaller den bestått-
//    kontrollerte kjorImport() / FilOpplaster med en klient/ref den setter opp selv.
//    Begrunnelse: claude_IMPORT-PROD-SPESIFIKASJON-8sep.md punkt 1 (anbefalt løsning).
//
//  UFRAVIKELIGE REGLER:
//    • lib/db.mjs RØRES ALDRI. Den permanente sperren skal være intakt for ALL annen bruk.
//    • Ingen prod-referanse skrives til disk, ingen markør opprettes i prod, .env.import røres ikke.
//    • DENNE FILA SLETTES rett etter bruk (revert committes). Se spesifikasjonen §1 og §4 steg 6.
//
//  TO ATSKILTE STEG (aldri i samme kjøring — DB skal bekreftes mot fasit FØR filer lastes opp,
//  fordi DB kan rulles tilbake atomisk, men filopplasting kan ikke):
//    node scripts/import/ENGANGS-PROD-import.mjs --db
//    node scripts/import/ENGANGS-PROD-import.mjs --filer --kjoring-id <uuid-fra-db-steget>
//
//  Prod står nå på migrasjon 001–108 og er tom for innhold (0 ressurser / 0 dokumenter / 0 samlinger).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createInterface } from 'node:readline'
import { randomUUID } from 'node:crypto'
import { kjorImport, rullTilbake } from './import-kjorer.mjs'
import { FilOpplaster } from './lib/storage.mjs'
import { lesEnv } from './lib/db.mjs'

// Prod-referansen settes EKSPLISITT her (spesifikasjon §1). IKKE via hentKopiRef — den krever
// markørtabellen import_kopi_identitet, som ALDRI skal finnes i prod (husregel).
const PROD_REF = 'zpirjbrcbeubwpmtncxx'

// Fasit fra spesifikasjonen §4 steg 3 — det DB-importen SKAL gi. Sammenlign for hånd før filopplasting.
const FASIT = { ressurser: 1126, dokumenter: 536, medier: 363, samlinger: 20 }

const arg = process.argv.slice(2)
const har = (n) => arg.includes(n)
const verdi = (n) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : undefined }

// ── Interaktiv innlesing ────────────────────────────────────────────────────────────────────────
// Synlig spørsmål (bekreftelser, kjøring-id).
function spor(promptTekst) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(promptTekst, (svar) => { rl.close(); resolve(String(svar).trim()) })
  })
}
// Skjult innlesing (tilkoblingsstreng, service_role-nøkkel) — tastes inn, vises ikke, skrives aldri
// til disk. Prompten skrives før muting, selve tastingen mutes.
function sporHemmelig(promptTekst) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    let muted = false
    rl._writeToOutput = (str) => { if (!muted) rl.output.write(str) }
    rl.question(promptTekst, (svar) => { rl.close(); process.stdout.write('\n'); resolve(String(svar).trim()) })
    muted = true   // etter at question() har skrevet prompten
  })
}

// ── To bevisste bekreftelser (spesifikasjon §1). Skjer FØR noen tilkobling. ───────────────────────
// Feil svar på én av dem → returnerer false, kalleren avslutter UTEN å koble til.
async function bekreftProd() {
  console.log('\n════════════════════════════════════════════════════════════════════════════')
  console.log('  ⚠️  DETTE KOBLER TIL PRODUKSJONSBASEN OG SKRIVER EKTE DATA.')
  console.log('      To bekreftelser kreves. Feil svar → avbryter uten å koble til.')
  console.log('════════════════════════════════════════════════════════════════════════════\n')
  const r1 = await spor(`  1) Skriv prod-referansen for hånd (${PROD_REF}): `)
  if (r1 !== PROD_REF) { console.error('\n  ✗ Feil referanse. Avbryter UTEN å koble til.\n'); return false }
  const r2 = await spor('  2) Skriv nøyaktig   JA, PROD   for å bekrefte: ')
  if (r2 !== 'JA, PROD') { console.error('\n  ✗ Ikke bekreftet (må være «JA, PROD»). Avbryter UTEN å koble til.\n'); return false }
  console.log('\n  ✓ Bekreftet. Ber om tilkobling.\n')
  return true
}

// Bygg en TILKOBLET pg-klient DIREKTE mot prod (omgår sperren i db.mjs — den røres ikke).
// Tilkoblingsstrengen tastes interaktivt og forlater aldri prosessen.
async function koblProd() {
  const streng = await sporHemmelig('  Lim inn PROD-tilkoblingsstreng (vises ikke): ')
  if (!streng) { console.error('\n  ✗ Tom tilkoblingsstreng. Avbryter.\n'); return null }
  let pg
  try { pg = await import('pg') } catch { console.error('\n  ✗ Pakken «pg» er ikke installert. Kjør: npm i pg\n'); return null }
  const klient = new pg.default.Client({ connectionString: streng })
  await klient.connect()
  console.log('  ✓ Tilkoblet.\n')
  return klient
}

// Tell innhold merket med denne kjøringen (for sammenligning mot fasit).
async function tellKjoring(klient, kjoringId) {
  const t = {}
  for (const tab of ['ressurser', 'dokumenter', 'medier', 'samlinger']) {
    t[tab] = +(await klient.query(`select count(*) n from ${tab} where import_kjoring_id = $1`, [kjoringId])).rows[0].n
  }
  return t
}

// ── STEG 1: DB-IMPORT ─────────────────────────────────────────────────────────────────────────
async function stegDb() {
  console.log('\n### ENGANGS-PROD-import — STEG --db (databaseimport, én atomisk transaksjon) ###')
  if (!(await bekreftProd())) process.exit(1)
  const klient = await koblProd()
  if (!klient) process.exit(1)
  try {
    const kjoringId = randomUUID()
    console.log(`  Kjøring-id: ${kjoringId}`)
    console.log('  Starter DB-import (kjorImport) — dette er ÉN transaksjon; én feil ⇒ full tilbakerulling …\n')
    const r = await kjorImport(klient, { kjoringId, merke: 'ENGANGS-PROD-import' })
    if (!r.ok) {
      console.error('\n  ✗ IMPORT STOPPET:', r.feil)
      // Transaksjonen er allerede rullet tilbake inne i kjorImport; kall rullTilbake for parity/sikkerhet.
      await rullTilbake(klient, r.kjoringId).catch(() => {})
      console.error('  Ingenting ble committet. Undersøk feilen før nytt forsøk.\n')
      process.exit(1)
    }
    console.log('  ✓ DB-import OK.')
    console.log(`    kjøring: ${r.kjoringId} · vei-A: ${r.veiA} · manglende (QA): ${r.stoppregel.manglende} · feilkoblinger: ${r.stoppregel.feilkoblinger}`)
    const t = await tellKjoring(klient, r.kjoringId)
    console.log('\n  Tellinger denne kjøringen  (mål = fasit fra spesifikasjonen §4):')
    for (const tab of ['ressurser', 'dokumenter', 'medier', 'samlinger']) {
      const ok = t[tab] === FASIT[tab] ? '✓' : '✗ AVVIK'
      console.log(`    ${tab.padEnd(12)} ${String(t[tab]).padStart(5)}   (fasit ${FASIT[tab]})  ${ok}`)
    }
    console.log('\n  ⚠️  IKKE last opp filer før disse tallene er bekreftet mot fasit.')
    console.log('      Ved avvik: rull tilbake med slettKjøring og undersøk — ikke gå videre til --filer.')
    console.log(`\n  Når tallene stemmer, kjør filopplasting:\n    node scripts/import/ENGANGS-PROD-import.mjs --filer --kjoring-id ${r.kjoringId}\n`)
  } finally {
    await klient.end().catch(() => {})
  }
}

// ── STEG 2: FILOPPLASTING ─────────────────────────────────────────────────────────────────────
async function stegFiler() {
  const kjoringId = verdi('--kjoring-id')
  if (!kjoringId) {
    console.error('\n  ✗ Mangler --kjoring-id <uuid> (kjøring-id-en fra --db-steget). Avbryter.\n')
    process.exit(1)
  }
  console.log('\n### ENGANGS-PROD-import — STEG --filer (opplasting av bilder + dokumenter til Storage) ###')
  console.log(`  Kjøring-id: ${kjoringId}`)
  console.log('  ⚠️  Bekreft FØRST at DB-tallene fra --db stemte mot fasit. Filopplasting kan IKKE rulles tilbake atomisk.\n')
  if (!(await bekreftProd())) process.exit(1)
  const klient = await koblProd()
  if (!klient) process.exit(1)
  try {
    // service_role-nøkkelen MÅ være PRODs egen (FilOpplaster kobler mot https://<ref>.supabase.co = prod).
    // .env.import sin IMPORT_STORAGE_KEY er ØVINGSKOPIENS nøkkel og skal ikke brukes/røres — derfor tastes
    // prod-nøkkelen inn interaktivt (aldri til disk), som tilkoblingsstrengen.
    const storageKey = await sporHemmelig('  Lim inn PROD service_role-nøkkel (vises ikke): ')
    if (!storageKey) { console.error('\n  ✗ Tom nøkkel. Avbryter.\n'); process.exit(1) }

    // Zip-sti og bøttenavn leses fra .env.import (base-uavhengige verdier; lesEnv trigger ikke sperren
    // og endrer ikke fila). Storage-nøkkelen tas IKKE herfra.
    const ENV_STI = verdi('--env') || `${process.env.HOME}/trivselsleder-ny/.env.import`
    const env = lesEnv(ENV_STI)
    const zipSti = env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
    const bucket = env.IMPORT_STORAGE_BUCKET || 'importfiler'

    // ref settes EKSPLISITT til prod-strengen — IKKE via hentKopiRef (den krever markøren).
    const opp = new FilOpplaster({ ref: PROD_REF, storageKey, bucket, zipSti })
    const b = await opp.sikreBotte()
    console.log(`\n  Storage-mål: ${opp.baseUrl} · bøtte «${bucket}»${b.opprettet ? ' (opprettet nå)' : ''} · kjøring ${kjoringId}`)
    console.log('  ⚠️  Prod-bøtta får Supabases standard fil-grense. Hev den manuelt til 500 MB i dashboardet,')
    console.log('      ellers havner den ene store fila i kø «fil_mangler/for stor» (håndtert — tas ved gjenopptaking).\n')

    // Samme utvalg som last-opp-filer.mjs: medier (ikke video → Bunny) + dokumenter som ennå ikke peker på URL.
    const medier = (await klient.query(
      `select id, storage_sti from medier where import_kjoring_id=$1 and type <> 'video'
         and storage_sti is not null and storage_sti not like 'http%' order by id`, [kjoringId])).rows
    const dokumenter = (await klient.query(
      `select id, storage_sti from dokumenter where import_kjoring_id=$1
         and storage_sti is not null and storage_sti not like 'http%' order by id`, [kjoringId])).rows
    console.log(`  Å laste opp: ${medier.length} medier + ${dokumenter.length} dokumenter.\n`)

    const tall = { lastet: 0, hoppet: 0, allerede: 0, mangler: 0, for_stor: 0, tom_sti: 0, bytes: 0 }
    const t0 = Date.now()
    for (const [tabell, rader] of [['medier', medier], ['dokumenter', dokumenter]]) {
      let i = 0
      for (const rad of rader) {
        const r = await opp.lastOppRad(klient, tabell, rad, kjoringId)
        tall[r.status] = (tall[r.status] || 0) + 1
        if (r.storrelse && r.status === 'lastet') tall.bytes += r.storrelse
        if (r.status === 'mangler') console.warn(`  FIL MANGLER (håndtert, kø): ${r.medlem}`)
        if (r.status === 'for_stor') console.warn(`  FIL FOR STOR (håndtert, kø): ${rad.storage_sti} (${(r.storrelse / 1e6).toFixed(1)} MB)`)
        if ((++i) % 50 === 0) console.log(`    … ${tabell}: ${i}/${rader.length}`)
      }
    }
    const sek = (Date.now() - t0) / 1000
    console.log(`\n  ✓ Ferdig på ${sek.toFixed(1)}s: lastet ${tall.lastet}, hoppet ${tall.hoppet}, alt-URL ${tall.allerede}, mangler ${tall.mangler}, for stor ${tall.for_stor}, tom sti ${tall.tom_sti}. ${(tall.bytes / 1e6).toFixed(2)} MB.`)
    console.log('\n  Neste: video-kobling (video-fase2 → Bunny 727245), ETTER-måling/stikkprøve, så LUKK sperren:')
    console.log('  slett DENNE fila, commit reverten, og verifiser at import_kopi_identitet er FRAVÆRENDE i prod.\n')
  } finally {
    await klient.end().catch(() => {})
  }
}

// ── Bruksanvisning ────────────────────────────────────────────────────────────────────────────
function skrivBruk() {
  console.log(`
ENGANGS-PROD-import — kjører importen ÉN gang mot produksjon (${PROD_REF}).
Denne fila SLETTES etter bruk. lib/db.mjs røres aldri.

To atskilte steg (kjør dem hver for seg, i rekkefølge):

  1) Databaseimport (atomisk, kan rulles tilbake):
     node scripts/import/ENGANGS-PROD-import.mjs --db

  2) Filopplasting (etter at DB-tallene er bekreftet mot fasit — kan IKKE rulles tilbake atomisk):
     node scripts/import/ENGANGS-PROD-import.mjs --filer --kjoring-id <uuid-fra-db-steget>

Uten argument gjøres INGENTING (denne teksten). Begge steg krever to bevisste bekreftelser og
interaktiv innskriving av tilkoblingsstreng (aldri lest fra disk).
`)
}

// ── Inngang ─────────────────────────────────────────────────────────────────────────────────────
async function main() {
  if (har('--db') && har('--filer')) {
    console.error('\n  ✗ --db og --filer kan ALDRI kjøres i samme kommando. Kjør dem hver for seg.\n')
    process.exit(1)
  }
  if (har('--db')) return stegDb()
  if (har('--filer')) return stegFiler()
  skrivBruk()   // uten argument: ingenting skjer
}

main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
