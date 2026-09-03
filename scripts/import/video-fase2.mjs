#!/usr/bin/env node
// VIDEO — FASE 2: last opp mp4 til Bunny.net og fyll medier.bunny_video_id.
// Fase 1 (import.mjs) skrev medie-radene med storage_sti men UTEN bunny_video_id.
// Fase 2 kan ikke gjøres før videoen ER hos Bunny — derfor eget steg, og GJENOPPTAKBART:
// 269 videoer / 16 GB. En avbrutt kjøring skal fortsette der den slapp.
//
// TØRRMODUS er standard: uten --skriv lastes INGENTING opp og basen røres ikke.
// Kjør:  node scripts/import/video-fase2.mjs            (tørrmodus — vis hva som gjenstår)
//        node scripts/import/video-fase2.mjs --skriv    (ekte opplasting — krever .env.import)
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { lesEnv, Skriver } from './lib/db.mjs'

const arg = process.argv.slice(2)
const DRY = !arg.includes('--skriv')
const verdi = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d }
const ENV_STI = verdi('--env', 'scripts/import/.env.import')
const TILSTAND = verdi('--tilstand', 'scripts/import/.video-fase2-tilstand.json')  // gjenopptaking

function lastTilstand() { try { return JSON.parse(readFileSync(TILSTAND, 'utf8')) } catch { return { ferdig: {} } } }
function lagreTilstand(t) { writeFileSync(TILSTAND, JSON.stringify(t, null, 1)) }

async function hentGjenstaaende(skriver) {
  // Ekte modus: hent videoer uten bunny_video_id fra basen.
  const res = await skriver.klient.query(
    `select id, storage_sti, original_filnavn from medier where type='video' and bunny_video_id is null and storage_sti is not null order by id`)
  return res.rows
}

async function lastOppTilBunny(env, zipSti, storageSti) {
  // Strøm mp4 fra zip (ETT medlem, ingen full utpakking) og POST til Bunny.
  // Skjelett: den faktiske HTTP-flyten (create video → PUT bytes) legges her.
  const medlem = 'Files/' + storageSti.replace(/^public\//, 'public/')  // storage_sti er 'public/wysiwyg-media/..'
  const bytes = execFileSync('unzip', ['-p', zipSti, medlem], { maxBuffer: 1024 * 1024 * 1024 })
  if (!bytes || !bytes.length) throw new Error(`Fant ikke videofil i zip: ${medlem}`)
  // 1) opprett video-objekt hos Bunny (POST library/{id}/videos) → videoId
  // 2) last opp bytes (PUT library/{id}/videos/{videoId}) med AccessKey: env.BUNNY_API_KEY
  // Returner videoId. (Ekte kall implementeres når biblioteks-id/nøkkel er i .env.import.)
  throw new Error('Bunny-opplasting ikke konfigurert: sett BUNNY_LIBRARY_ID + BUNNY_API_KEY i .env.import. (Skjelett — HTTP-kallene fylles inn her.)')
}

async function main() {
  console.log(`# Video fase 2 — ${DRY ? 'TØRRMODUS (laster ingenting opp)' : 'OPPLASTING'}`)
  if (DRY) {
    console.log('[tørrmodus] Ville hentet alle medier (type=video, bunny_video_id is null) og lastet dem til Bunny.')
    console.log('Gjenopptaking: fremdrift lagres i ' + TILSTAND + ' — allerede opplastede hoppes over.')
    console.log('Kjør med --skriv (og BUNNY_* i .env.import) for ekte opplasting.')
    return
  }
  const env = lesEnv(ENV_STI)
  if (!env.BUNNY_LIBRARY_ID || !env.BUNNY_API_KEY) throw new Error('BUNNY_LIBRARY_ID/BUNNY_API_KEY mangler i .env.import (fail-closed).')
  if (!env.IMPORT_ZIP || !existsSync(env.IMPORT_ZIP)) throw new Error('IMPORT_ZIP mangler/finnes ikke i .env.import.')

  const skriver = new Skriver({ dryRun: false, envSti: ENV_STI })
  await skriver.koble()
  const tilstand = lastTilstand()
  const rader = await hentGjenstaaende(skriver)
  console.log(`Gjenstår: ${rader.length} videoer.`)
  let ok = 0, feil = 0
  for (const r of rader) {
    if (tilstand.ferdig[r.id]) { continue }                 // gjenopptaking: allerede gjort
    try {
      const videoId = await lastOppTilBunny(env, env.IMPORT_ZIP, r.storage_sti)
      await skriver.klient.query('update medier set bunny_video_id=$1 where id=$2', [videoId, r.id])
      tilstand.ferdig[r.id] = videoId; lagreTilstand(tilstand); ok++
    } catch (e) {
      console.error(`  feil på ${r.original_filnavn}: ${e.message}`); feil++
      lagreTilstand(tilstand)                                // fremdrift bevart selv ved feil
      if (feil >= 3) { console.error('Tre feil på rad — stopper for gjennomgang. Kjør igjen for å fortsette.'); break }
    }
  }
  await skriver.ferdig()
  console.log(`Ferdig denne runden: ${ok} lastet opp, ${feil} feil. Kjør igjen for å fortsette der den slapp.`)
}

main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
