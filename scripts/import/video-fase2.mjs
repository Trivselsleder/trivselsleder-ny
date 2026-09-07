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
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { lesEnv, Skriver } from './lib/db.mjs'
import { detUuid } from './lib/uuid.mjs'

const BUNNY_BASE = 'https://video.bunnycdn.com'   // Bunny Stream API-rot (opprett video + last opp bytes)

// Standard .env.import forankres i FILENS plassering (ikke CWD) — samme mønster som migrasjonskjøreren
// og import.mjs. Denne fila ligger i scripts/import/, så repo-roten (der den ENESTE .env.import ligger)
// er to nivåer opp. --env overstyrer fortsatt (CWD-relativt).
const __dirname = dirname(fileURLToPath(import.meta.url))
const STANDARD_ENV = resolve(__dirname, '..', '..', '.env.import')

const arg = process.argv.slice(2)
const DRY = !arg.includes('--skriv')
const verdi = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d }
const ENV_STI = verdi('--env', STANDARD_ENV)

// Diagnose (bivirkningsfri): vis oppløst .env.import-sti og avslutt. Kobler ALDRI til noe.
if (arg.includes('--vis-env-sti')) {
  console.log(`standard .env.import (CWD-uavhengig): ${STANDARD_ENV}`)
  console.log(`effektiv ENV_STI:                    ${ENV_STI}`)
  process.exit(0)
}
const TILSTAND = verdi('--tilstand', 'scripts/import/.video-fase2-tilstand.json')  // gjenopptaking
const KJORING_ID = verdi('--kjoring-id', null)  // valgfri: begrens til ÉN importkjørings videoer (trygg avgrensning)

function lastTilstand() { try { return JSON.parse(readFileSync(TILSTAND, 'utf8')) } catch { return { ferdig: {} } } }
function lagreTilstand(t) { writeFileSync(TILSTAND, JSON.stringify(t, null, 1)) }

async function hentGjenstaaende(skriver, kjoringId) {
  // Ekte modus: hent videoer uten bunny_video_id fra basen. Valgfri kjøring-avgrensning (additivt —
  // uten --kjoring-id er atferden nøyaktig som før) så en test kan kjøre trygt mot KUN sine egne rader.
  const params = []
  let filter = `type='video' and bunny_video_id is null and storage_sti is not null`
  if (kjoringId) { params.push(kjoringId); filter += ` and import_kjoring_id = $1` }
  const res = await skriver.klient.query(
    `select id, storage_sti, original_filnavn, import_kjoring_id from medier where ${filter} order by id`, params)
  return res.rows
}

// ── Bunny Stream API — de to kallene: opprett video-objekt, last opp bytes ──────────────────────────
async function bunnyOpprettVideo(env, tittel) {
  const resp = await fetch(`${BUNNY_BASE}/library/${env.BUNNY_LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: { AccessKey: env.BUNNY_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ title: tittel }),
  })
  if (!resp.ok) throw new Error(`Bunny opprett-video: HTTP ${resp.status} ${(await resp.text()).slice(0, 300)}`)
  const d = await resp.json()
  if (!d.guid) throw new Error(`Bunny opprett-video ga ingen guid: ${JSON.stringify(d).slice(0, 300)}`)
  return d.guid
}
async function bunnyLastOppBytes(env, videoId, bytes) {
  const resp = await fetch(`${BUNNY_BASE}/library/${env.BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    method: 'PUT',
    headers: { AccessKey: env.BUNNY_API_KEY, accept: 'application/json' },
    body: bytes,
  })
  if (!resp.ok) throw new Error(`Bunny bytes-opplasting (${videoId}): HTTP ${resp.status} ${(await resp.text()).slice(0, 300)}`)
  const d = await resp.json().catch(() => ({}))
  if (d && d.success === false) throw new Error(`Bunny bytes-opplasting success=false (${videoId}): ${JSON.stringify(d).slice(0, 300)}`)
  return true
}

// Kø-rad for en videofil som mangler i zip-en (fil_mangler — samme type filopplasteren bruker; kolonnen
// heter «beskrivelse» i redaksjonell_ko, lest fra basen). Deterministisk id ⇒ re-kjøring lager ikke dublett.
async function koVideofilMangler(klient, rad, medlem) {
  const koId = detUuid('ko-videomangler', `${rad.import_kjoring_id}-${rad.id}`)
  await klient.query(
    `insert into redaksjonell_ko (id, type, status, beskrivelse, medie_id, import_kjoring_id)
     values ($1,'fil_mangler','ny',$2,$3,$4) on conflict (id) do nothing`,
    [koId, `Videofil mangler i eksport-zip: ${medlem} (medier-rad ${rad.id}).`, rad.id, rad.import_kjoring_id])
}

// ── samling_medie: videoer knyttet til en SAMLING (migr 095), ikke en ressurs ──────────────────────
// Samme opplastingsmønster som ressurs-videoene, men to forskjeller: (1) egen tabell/kolonne
// (samling_medie.bunny_video_id), (2) storage_sti er en Drupal media-ALIAS «/file/<slug>», ikke en
// «public/…»-sti — så den må løses mot den EKTE fila i zip-en (samlingpass lagret lenkens URL-sti).
async function hentGjenstaaendeSamling(skriver, kjoringId) {
  const params = []
  let filter = `type='video' and bunny_video_id is null and storage_sti is not null`
  if (kjoringId) { params.push(kjoringId); filter += ` and import_kjoring_id = $1` }
  const res = await skriver.klient.query(
    `select id, samling_id, storage_sti, original_filnavn, import_kjoring_id from samling_medie where ${filter} order by id`, params)
  return res.rows
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i
const normaliser = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')

// Indeks over videofiler i zip-en: normalisert basenavn → [relative stier under Files/]. Bygges én gang
// (lat), og KUN når en samling-video faktisk trenger alias-oppslag. Ressurs-videoene trenger den ikke.
function byggVideoIndeks(zipSti) {
  const ut = new Map()
  for (const sti of execFileSync('unzip', ['-Z1', zipSti], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8').split('\n')) {
    if (!sti.startsWith('Files/') || !VIDEO_EXT.test(sti) || sti.includes('__MACOSX')) continue
    const rel = sti.slice('Files/'.length)                 // f.eks. public/wysiwyg-media/x.mp4
    const nk = normaliser(rel.split('/').pop())
    if (!ut.has(nk)) ut.set(nk, [])
    ut.get(nk).push(rel)
  }
  return ut
}

// Løs en samling_medie-storage_sti til en «public/…»-sti (samme form lastOppTilBunny forventer).
//   «public/…» / «/public/…»  → brukes direkte (samme som ressurs-videoene)
//   «/file/<slug>» (Drupal-alias) → slå <slug> opp i videoindeksen på normalisert basenavn.
// Returnerer { sti } ved ENTYDIG treff, ellers { uløst: <grunn> } (→ kø, ALDRI gjetting ved flertydighet).
function løsVideoSti(storageSti, indeks) {
  const s = String(storageSti || '')
  const rensetPublic = s.replace(/^\//, '')
  if (/^public\//i.test(rensetPublic)) return { sti: rensetPublic }
  const m = s.match(/\/file\/(.+)$/i)
  if (m) {
    const treff = indeks.get(normaliser(m[1])) || []
    if (treff.length === 1) return { sti: treff[0] }
    return { uløst: treff.length === 0 ? `fant ingen videofil for alias «${s}»` : `flertydig alias «${s}» (${treff.length} treff)` }
  }
  return { uløst: `ukjent storage_sti-form «${s}»` }
}

// Kø-avvik for en samling-video som ikke kunne lastes opp (mangler/uløst). Subjekt = samling_id
// (redaksjonell_ko har ingen samling_medie_id-kolonne). Deterministisk id ⇒ idempotent ved re-kjøring.
async function koSamlingVideoAvvik(klient, rad, grunn) {
  const koId = detUuid('ko-samlingvideo', `${rad.import_kjoring_id}-${rad.id}`)
  await klient.query(
    `insert into redaksjonell_ko (id, type, status, beskrivelse, samling_id, import_kjoring_id)
     values ($1,'fil_mangler','ny',$2,$3,$4) on conflict (id) do nothing`,
    [koId, `Samling-video kunne ikke lastes opp: ${grunn} (samling_medie-rad ${rad.id}).`, rad.samling_id, rad.import_kjoring_id])
}

async function lastOppTilBunny(env, zipSti, storageSti, tittel) {
  // Strøm mp4 fra zip (ETT medlem, ingen full utpakking — samme teknikk som kilde.mjs/storage.mjs).
  const medlem = 'Files/' + storageSti  // storage_sti er 'public/wysiwyg-media/..' ⇒ 'Files/public/wysiwyg-media/..'
  let bytes
  try {
    bytes = execFileSync('unzip', ['-p', zipSti, medlem], { maxBuffer: 1024 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch { bytes = null }
  if (!bytes || !bytes.length) return { mangler: true, medlem }   // FIL MANGLER → kø i løkken, ikke kast (BEVIS 4)
  // To Bunny-kall: (1) opprett video-objekt → guid, (2) last opp bytes til samme guid.
  const videoId = await bunnyOpprettVideo(env, tittel)
  await bunnyLastOppBytes(env, videoId, bytes)
  return { videoId, storrelse: bytes.length }
}

// Slå opp én video hos Bunny (verifisering + prosesseringsstatus). status: 0=kø,1=lastet,2=prosesserer,
// 3=transkoder,4=ferdig,5=feil,6=opplasting-feil (Bunny Stream sine egne koder).
async function bunnyHentVideo(env, videoId) {
  const resp = await fetch(`${BUNNY_BASE}/library/${env.BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    headers: { AccessKey: env.BUNNY_API_KEY, accept: 'application/json' },
  })
  if (!resp.ok) return null
  return resp.json()
}
async function bunnySlettVideo(env, videoId) {
  const resp = await fetch(`${BUNNY_BASE}/library/${env.BUNNY_LIBRARY_ID}/videos/${videoId}`, {
    method: 'DELETE', headers: { AccessKey: env.BUNNY_API_KEY, accept: 'application/json' },
  })
  return resp.ok
}

// Eksportert for fem-filers-testen (verifisering + opprydding). Selve kjøringen skjer via main() nedenfor.
export { lastOppTilBunny, bunnyHentVideo, bunnySlettVideo }

async function main() {
  console.log(`# Video fase 2 — ${DRY ? 'TØRRMODUS (laster ingenting opp)' : 'OPPLASTING'}`)
  if (DRY) {
    console.log('[tørrmodus] Ville hentet alle videoer uten bunny_video_id fra BÅDE medier (ressurs-video) og samling_medie (samling-video) og lastet dem til Bunny.')
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
  // Basen er FASIT for hva som er lastet opp: begge kilder filtreres på bunny_video_id IS NULL.
  const ressursRader = await hentGjenstaaende(skriver, KJORING_ID)              // medier (ressurs-video)
  const samlingRader = await hentGjenstaaendeSamling(skriver, KJORING_ID)       // samling_medie (samling-video)
  console.log(`Gjenstår: ${ressursRader.length} ressurs-videoer + ${samlingRader.length} samling-videoer.${KJORING_ID ? ` (avgrenset til kjøring ${KJORING_ID})` : ''}`)
  let videoIndeks = null   // lat: bygges kun hvis en samling-video trenger alias-oppslag
  let ok = 0, feil = 0, mangler = 0

  // Én felles behandling for begge kilder. `kilde` styrer tabell (bunny_video_id-oppdatering) og kø-subjekt.
  const jobber = [...ressursRader.map(r => ['medier', r]), ...samlingRader.map(r => ['samling_medie', r])]
  for (const [kilde, r] of jobber) {
    if (tilstand.ferdig[r.id]) { continue }                 // gjenopptaking (sekundær; basen er primær)
    try {
      // Finn «public/…»-stien. Ressurs-videoene har den allerede; samling-videoene må løses fra Drupal-aliaset.
      let sti = r.storage_sti
      if (kilde === 'samling_medie') {
        const rensetPublic = String(sti).replace(/^\//, '')
        if (/^public\//i.test(rensetPublic)) { sti = rensetPublic }
        else {
          if (!videoIndeks) videoIndeks = byggVideoIndeks(env.IMPORT_ZIP)
          const l = løsVideoSti(sti, videoIndeks)
          if (l.uløst) { await koSamlingVideoAvvik(skriver.klient, r, l.uløst); console.warn(`  SAMLING-VIDEO KØET: ${l.uløst}`); mangler++; continue }
          sti = l.sti
        }
      }
      const res = await lastOppTilBunny(env, env.IMPORT_ZIP, sti, r.original_filnavn || sti.split('/').pop())
      if (res.mangler) {
        // FILEN MANGLER i zip → kø (fil_mangler), ikke feil, ikke krasj. Raden forblir uendret
        // (bunny_video_id null), så en senere kjøring re-oppdager den; kø-raden er idempotent.
        if (kilde === 'medier') await koVideofilMangler(skriver.klient, r, res.medlem)
        else await koSamlingVideoAvvik(skriver.klient, r, `fil mangler i zip: ${res.medlem}`)
        console.warn(`  VIDEOFIL MANGLER (håndtert, kø): ${res.medlem}`); mangler++
        continue
      }
      // ── SMALT KRASJVINDU (forsjekk pkt 3, bevisst IKKE bygget bort): dør prosessen HER — etter at Bunny
      //   har tatt imot filen (res.videoId finnes hos Bunny) men FØR update-en under — blir videoen
      //   FORELDRELØS hos Bunny (tar plass, ingen rad peker på den). Databasen er alltid korrekt: neste kjøring
      //   ser bunny_video_id=null og laster opp PÅ NYTT (ny guid) → en DUBLETT hos Bunny, ikke tapt data.
      //   Rydding hvis det skjer: list biblioteket og slett hver guid som IKKE finnes i medier/samling_medie
      //   sin bunny_video_id (se sluttrapport). Lav sannsynlighet, billig manuell opprydding.
      await skriver.klient.query(`update ${kilde} set bunny_video_id=$1 where id=$2`, [res.videoId, r.id])  // kilde ∈ {medier, samling_medie} — kontrollert
      tilstand.ferdig[r.id] = res.videoId; lagreTilstand(tilstand); ok++
      feil = 0                                              // ← nullstill: stoppregelen teller tre feil PÅ RAD
    } catch (e) {
      console.error(`  feil på ${r.original_filnavn || r.id}: ${e.message}`); feil++
      lagreTilstand(tilstand)                                // fremdrift bevart selv ved feil
      // STOPPREGEL: tre feil PÅ RAD (telleren nullstilles ved hver suksess over). Rettet slik at kode og
      // kommentar sier det samme (forsjekk-funn 1 — var «tre totalt» fordi telleren aldri ble nullstilt).
      if (feil >= 3) { console.error('Tre feil på rad — stopper for gjennomgang. Kjør igjen for å fortsette.'); break }
    }
  }
  await skriver.ferdig()
  console.log(`Ferdig denne runden: ${ok} lastet opp, ${mangler} manglet (kø), ${feil} feil. Kjør igjen for å fortsette der den slapp.`)
}

// Kjør main() KUN ved direkte kjøring (så testen kan importere hjelpefunksjonene uten å utløse opplasting).
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
