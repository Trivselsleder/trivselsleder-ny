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
//  KJØRES FRA ~/trivselsleder-ny/ (relative import-stier og standard .env.import-sti forutsetter det).
//  EKSPORT-ZIP-EN MÅ LIGGE PÅ STANDARDSTIEN — BEGGE steg trenger den: byggKontekst i --db leser
//  nodefilene rett ut av zip-en (spesifikasjonen tar feil når den sier at DB-importen ikke trenger
//  zip-en), og --filer strømmer bilder/dokumenter ut av den. Sti: IMPORT_ZIP i .env.import, ellers
//  ~/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip. MERK: --db leser stien fra prosess-miljøet
//  (process.env.IMPORT_ZIP), IKKE fra .env.import; --filer leser IMPORT_ZIP fra .env.import. Legg zip-en på
//  standardstien, så er begge like.
//
//  Prod står nå på migrasjon 001–108 og er tom for innhold (0 ressurser / 0 dokumenter / 0 samlinger).
// ═══════════════════════════════════════════════════════════════════════════════════════════════

import { createInterface } from 'node:readline'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { kjorImport, rullTilbake } from './import-kjorer.mjs'
import { FilOpplaster } from './lib/storage.mjs'
// lesEnv + hentProsjektRef + IMPORT_KOPI_TABELL er RENE eksporter — dette ENDRER ikke db.mjs, det
// gjenbruker sperrens egne byggeklosser (B2: bind bekreftelsen til at strengen FAKTISK peker på prod).
import { lesEnv, hentProsjektRef, IMPORT_KOPI_TABELL } from './lib/db.mjs'

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
    rl.on('close', () => resolve(''))   // M2: Ctrl-C/EOF → tom streng, ikke stille exit 0 (kalleren avbryter)
    rl.question(promptTekst, (svar) => { resolve(String(svar).trim()); rl.close() })   // resolve FØR close: close-lytteren fyrer synkront
  })
}
// Skjult innlesing (tilkoblingsstreng, service_role-nøkkel) — tastes inn, vises ikke, skrives aldri
// til disk. Prompten skrives før muting, selve tastingen mutes.
function sporHemmelig(promptTekst) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    let muted = false
    rl._writeToOutput = (str) => { if (!muted) rl.output.write(str) }
    rl.on('close', () => resolve(''))   // M2: Ctrl-C/EOF → tom streng, ikke stille exit 0 (kalleren avbryter)
    rl.question(promptTekst, (svar) => { resolve(String(svar).trim()); rl.close(); process.stdout.write('\n') })   // resolve FØR close
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
// B2: bekreftelsen «JA, PROD» er ikke nok — den binder ikke strengen til basen. Mest sannsynlige feil
// er øvingskopiens streng, som ligger i .env.import på samme maskin. Derfor to vern som binder oss til prod:
//   (a) FØR connect: hentProsjektRef (db.mjs' egen, rene parser) MÅ gi PROD_REF, ellers avbryt uten å koble til.
//   (b) ETTER connect, før noe annet: basen skal IKKE ha markørtabellen import_kopi_identitet — den finnes
//       kun i øvingskopien og ALDRI i prod (husregel). Er den der, er dette ikke prod (eller prod er forgiftet).
async function koblProd() {
  const streng = await sporHemmelig('  Lim inn PROD-tilkoblingsstreng (vises ikke): ')
  if (!streng) { console.error('\n  ✗ Tom tilkoblingsstreng. Avbryter.\n'); return null }
  // (a) Strengen MÅ strukturelt peke på prod-referansen — ellers kobler vi aldri til.
  const ref = hentProsjektRef(streng)
  if (ref !== PROD_REF) {
    console.error(`\n  ✗ Tilkoblingsstrengen peker på ${ref ? `«${ref}»` : '(ingen gjenkjennelig Supabase-referanse)'}, ikke prod (${PROD_REF}).`)
    console.error('    Dette er trolig øvingskopiens streng fra .env.import. Avbryter UTEN å koble til.\n')
    return null
  }
  let pg
  try { pg = await import('pg') } catch { console.error('\n  ✗ Pakken «pg» er ikke installert. Kjør: npm i pg\n'); return null }
  const klient = new pg.default.Client({ connectionString: streng })
  await klient.connect()
  // (b) Markør-fravær-sjekk FØR noe annet skjer på tilkoblingen.
  const markor = (await klient.query(`select to_regclass('public.${IMPORT_KOPI_TABELL}') as t`)).rows[0].t
  if (markor !== null) {
    console.error(`\n  ✗ Basen HAR markørtabellen public.${IMPORT_KOPI_TABELL} — den finnes kun i øvingskopien, aldri i prod.`)
    console.error('    Dette er altså ikke prod (eller prod er forgiftet). Lukker forbindelsen og avbryter.\n')
    await klient.end().catch(() => {})
    return null
  }
  console.log('  ✓ Tilkoblet og bekreftet prod (ref stemmer, markør fraværende).\n')
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
    // M5: importen ER committet nå. Tellingen er bare en bekvemmelighet — feiler den, må den gjøres
    // manuelt, men det endrer ikke at kjøringen står i basen. Egen try/catch så en tellefeil ikke
    // ser ut som en importfeil.
    try {
      const t = await tellKjoring(klient, r.kjoringId)
      console.log('\n  Tellinger denne kjøringen  (mål = fasit fra spesifikasjonen §4):')
      for (const tab of ['ressurser', 'dokumenter', 'medier', 'samlinger']) {
        const ok = t[tab] === FASIT[tab] ? '✓' : '✗ AVVIK'
        console.log(`    ${tab.padEnd(12)} ${String(t[tab]).padStart(5)}   (fasit ${FASIT[tab]})  ${ok}`)
      }
    } catch (e) {
      console.error(`\n  ⚠️  IMPORTEN ER COMMITTET (kjøring ${r.kjoringId}), men den automatiske tellingen feilet: ${e.message}`)
      console.error('      Tell manuelt i SQL-editoren (count(*) på ressurser/dokumenter/medier/samlinger where import_kjoring_id = kjøringen)')
      console.error('      og sammenlign mot fasit 1126/536/363/20 FØR du går videre til --filer.')
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
  // M3: valider uuid-formen FØR første spørsmål — ingen grunn til å be om bekreftelser/tilkobling
  // hvis id-en åpenbart er feil.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kjoringId)) {
    console.error(`\n  ✗ --kjoring-id «${kjoringId}» er ikke en gyldig uuid. Avbryter.\n`)
    process.exit(1)
  }
  console.log('\n### ENGANGS-PROD-import — STEG --filer (opplasting av bilder + dokumenter til Storage) ###')
  console.log(`  Kjøring-id: ${kjoringId}`)
  console.log('  ⚠️  Bekreft FØRST at DB-tallene fra --db stemte mot fasit. Filopplasting kan IKKE rulles tilbake atomisk.\n')
  if (!(await bekreftProd())) process.exit(1)
  const klient = await koblProd()
  if (!klient) process.exit(1)
  try {
    // M3: kjøringen MÅ finnes i import_kjoring med status 'ferdig' — ellers laster vi opp filer for en
    // kjøring som ikke ble fullført (eller ikke finnes i denne basen).
    const kj = (await klient.query(`select status from import_kjoring where id = $1`, [kjoringId])).rows[0]
    if (!kj) { console.error(`\n  ✗ Fant ingen import_kjoring med id ${kjoringId} i denne basen. Avbryter.\n`); await klient.end().catch(() => {}); process.exit(1) }
    if (kj.status !== 'ferdig') { console.error(`\n  ✗ Kjøring ${kjoringId} har status «${kj.status}», ikke «ferdig». Avbryter — fullfør/verifiser --db først.\n`); await klient.end().catch(() => {}); process.exit(1) }
    console.log(`  ✓ Kjøring ${kjoringId} finnes med status «ferdig».\n`)

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

    // B1: FilOpplaster-KONSTRUKTØREN har et eget prod-vern (storage.mjs linje 71) som kaster på prod-ref
    // — i tillegg til det i hentKopiRef. Å legge et «tillat prod»-argument i storage.mjs ville vært et nytt
    // omgåelsesflagg (nøyaktig det som ble fjernet 5. sep), så vi RØRER IKKE storage.mjs. I stedet bygger vi
    // instansen UTENOM konstruktøren og setter manuelt de NØYAKTIG FEM feltene konstruktøren ellers setter
    // (verifisert mot storage.mjs: ref, bucket, zipSti, baseUrl, klient — ingenting mer). Metodene på
    // prototypen (sikreBotte/lastOppRad/…) virker uendret. bucket-fallbacket er med fordi konstruktøren
    // har det (storage.mjs linje 74) — uten det blir bøttenavnet undefined hvis .env.import ikke setter det.
    const opp = Object.create(FilOpplaster.prototype)
    opp.ref = PROD_REF
    opp.bucket = bucket || 'importfiler'
    opp.zipSti = zipSti
    opp.baseUrl = `https://${PROD_REF}.supabase.co`
    opp.klient = createClient(opp.baseUrl, storageKey, { auth: { persistSession: false } })
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
  // M1: bekreftelsene skal besvares av et menneske ved tastaturet — aldri fra en pipe/skript.
  // Er stdin ikke en terminal, avbryt før noe skjer. (Bruksanvisningen uten argument går uansett først.)
  if (!process.stdin.isTTY && (har('--db') || har('--filer'))) {
    console.error('\n  ✗ stdin er ikke en terminal (interaktive bekreftelser er umulige). Kjør fra et ekte terminalvindu. Avbryter.\n')
    process.exit(1)
  }
  if (har('--db') && har('--filer')) {
    console.error('\n  ✗ --db og --filer kan ALDRI kjøres i samme kommando. Kjør dem hver for seg.\n')
    process.exit(1)
  }
  if (har('--db')) return stegDb()
  if (har('--filer')) return stegFiler()
  skrivBruk()   // uten argument: ingenting skjer
}

main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
