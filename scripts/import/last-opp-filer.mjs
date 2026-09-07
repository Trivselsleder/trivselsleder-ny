#!/usr/bin/env node
// ETAPPE 6 — last opp bilder og dokumenter for én importkjøring til Supabase Storage.
// Video tas IKKE her (egen Bunny-jobb). Går GJENNOM sperren i db.mjs (Skriver.koble) — ingen egen
// tilkobling. Storage-målet bindes til databasens egen kopi-markør (hentKopiRef), så det kan aldri
// divergere fra det DB-sperren godkjente.
//
//   node scripts/import/last-opp-filer.mjs                                  (tørrmodus — teller, rører intet)
//   node scripts/import/last-opp-filer.mjs --skriv --kjoring-id <uuid>      (EKTE — mot øvingskopien i .env.import)
//   node scripts/import/last-opp-filer.mjs --skriv --kjoring-id <uuid> --antall 5   (kun de N første — fem-filers-test)
//
// GJENOPPTAKING: kjøres den på nytt, hoppes filer som alt ligger i Storage over (ikke lastet opp igjen).
// MANGLENDE FIL: en fil som ikke finnes i zip-en gir en kø-rad (fil_mangler) og fortsetter — krasjer ikke.
import { Skriver, lesEnv } from './lib/db.mjs'
import { FilOpplaster, hentKopiRef } from './lib/storage.mjs'

const arg = process.argv.slice(2)
const flagg = (n) => arg.includes(n)
const verdi = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d }

async function main() {
  const DRY = !flagg('--skriv')
  const kjoringId = verdi('--kjoring-id', null)
  const antall = verdi('--antall', null) ? parseInt(verdi('--antall'), 10) : null
  const ENV_STI = verdi('--env', `${process.env.HOME}/trivselsleder-ny/.env.import`)

  if (DRY) {
    console.log('Tørrmodus: laster ikke opp uten --skriv. Ekte kjøring går GJENNOM Skriver.koble (sperren) mot øvingskopien i .env.import.')
    console.log('  node scripts/import/last-opp-filer.mjs --skriv --kjoring-id <uuid> [--antall N]')
    return
  }
  if (!kjoringId) { console.error('Mangler --kjoring-id <uuid> — hvilken importkjørings filer skal lastes opp?'); process.exit(1) }

  const env = lesEnv(ENV_STI)
  const zipSti = env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
  const bucket = env.IMPORT_STORAGE_BUCKET || 'importfiler'

  const s = new Skriver({ dryRun: false, envSti: ENV_STI })
  await s.koble()   // ← SPERREN (forgiftet + allowlist + kopi-identitet). Kaster mot prod/ukjent base.
  try {
    const ref = await hentKopiRef(s.klient)   // Storage-mål = DB-ens egen validerte identitet
    const opp = new FilOpplaster({ ref, storageKey: env.IMPORT_STORAGE_KEY, bucket, zipSti })
    const b = await opp.sikreBotte()
    console.log(`Storage-mål: ${opp.baseUrl} · bøtte «${bucket}»${b.opprettet ? ' (opprettet nå)' : ''} · kjøring ${kjoringId}`)

    // Bilder + PDF-medier (IKKE video → Bunny) og alle dokumenter, som ennå ikke peker på en URL.
    const lim = antall ? `limit ${antall}` : ''
    const medier = (await s.klient.query(
      `select id, storage_sti from medier where import_kjoring_id=$1 and type <> 'video'
         and storage_sti is not null and storage_sti not like 'http%' order by id ${lim}`, [kjoringId])).rows
    const dokumenter = (await s.klient.query(
      `select id, storage_sti from dokumenter where import_kjoring_id=$1
         and storage_sti is not null and storage_sti not like 'http%' order by id ${lim}`, [kjoringId])).rows

    const tall = { lastet: 0, hoppet: 0, allerede: 0, mangler: 0, for_stor: 0, tom_sti: 0, bytes: 0 }
    const t0 = Date.now()
    for (const [tabell, rader] of [['medier', medier], ['dokumenter', dokumenter]]) {
      for (const rad of rader) {
        const r = await opp.lastOppRad(s.klient, tabell, rad, kjoringId)
        tall[r.status] = (tall[r.status] || 0) + 1
        if (r.storrelse && r.status === 'lastet') tall.bytes += r.storrelse
        if (r.status === 'mangler') console.warn(`  FIL MANGLER (håndtert, kø): ${r.medlem}`)
        if (r.status === 'for_stor') console.warn(`  FIL FOR STOR (håndtert, kø): ${rad.storage_sti} (${(r.storrelse / 1e6).toFixed(1)} MB)`)
      }
    }
    const sek = (Date.now() - t0) / 1000
    console.log(`\nFerdig på ${sek.toFixed(1)}s: lastet ${tall.lastet}, hoppet ${tall.hoppet}, alt-URL ${tall.allerede}, mangler ${tall.mangler}, for stor ${tall.for_stor}, tom sti ${tall.tom_sti}. ${(tall.bytes / 1e6).toFixed(2)} MB.`)
  } finally { await s.ferdig() }
}

main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
