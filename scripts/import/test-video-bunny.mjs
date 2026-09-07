#!/usr/bin/env node
// BEVIS for video-fase2.mjs (Bunny-opplasting) — TRE VIDEOER FØRST + én manglende. Kjører det EKTE
// scriptet som subprosess (--kjoring-id avgrenser til denne testens rader — trygt selv om øvingskopien
// har andre videoer), verifiserer mot Bunny-biblioteket 727245 og databasen, og rydder etter seg.
//
//   node scripts/import/test-video-bunny.mjs
//
// KREVER BUNNY_API_KEY + BUNNY_LIBRARY_ID + IMPORT_ZIP i .env.import (fail-closed → exit 2).
// HARDSTOP: kun øvingskopien (sperren), aldri prod. Ingen git.
import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { Skriver, lesEnv } from './lib/db.mjs'
import { bunnyHentVideo, bunnySlettVideo } from './video-fase2.mjs'
import { detUuid } from './lib/uuid.mjs'

const ENV_STI = process.env.IMPORT_ENV || `${process.env.HOME}/trivselsleder-ny/.env.import`
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const TILSTAND = '/tmp/video-bunny-test-tilstand.json'

// Tre reelle mp4-er i eksport-zip-en (bekreftet med unzip -Zl) + én som IKKE finnes.
const VIDEOER = [
  { sti: 'public/wysiwyg-media/move_it_stein_saks_papir_-_hvem_vinner__0.mp4', storrelse: 706459 },
  { sti: 'public/wysiwyg-media/move_it_stein_saks_papir_-_hvem_vinner__1.mp4', storrelse: 706459 },
  { sti: 'public/wysiwyg-media/move_it_stein_saks_papir_-_hvem_vinner_.mp4', storrelse: 706459 },
]
const MANGLER = { sti: 'public/wysiwyg-media/finnes-ikke-video-xyz-123.mp4' }
const STATUSTEKST = { 0: 'kø', 1: 'lastet', 2: 'prosesserer', 3: 'transkoder', 4: 'ferdig', 5: 'feil', 6: 'opplasting-feil' }

const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

function kjorScript(kjoringId) {
  const t0 = Date.now()
  const r = spawnSync('node', ['scripts/import/video-fase2.mjs', '--skriv', '--kjoring-id', kjoringId, '--tilstand', TILSTAND], { encoding: 'utf8' })
  return { sek: (Date.now() - t0) / 1000, kode: r.status, ut: (r.stdout || '') + (r.stderr || '') }
}

async function main() {
  const env = lesEnv(ENV_STI)
  if (!env.BUNNY_API_KEY || !env.BUNNY_LIBRARY_ID || !env.IMPORT_ZIP) {
    console.error('VENTER: .env.import mangler BUNNY_API_KEY / BUNNY_LIBRARY_ID / IMPORT_ZIP.')
    process.exit(2)
  }
  const kjoringId = detUuid('video-bevis', '3videoer-6sep')
  const rid = detUuid('video-bevis-ressurs', kjoringId)

  P('# Video-Bunny-bevis (tre videoer, ekte mot bibliotek ' + env.BUNNY_LIBRARY_ID + ')')
  P('')

  // Rydd evt. rester fra en tidligere kjøring (deterministiske id-er) før vi begynner.
  try { writeFileSync(TILSTAND, JSON.stringify({ ferdig: {} })) } catch { /* ok */ }

  const s = new Skriver({ dryRun: false, envSti: ENV_STI })
  await s.koble()   // ← SPERREN
  try {
    // ── Fixture: anker + ressurs + tre video-rader (ekte) + én manglende ──
    await s.klient.query(`insert into import_kjoring (id,kilde,status,antall_noder,notat) values ($1,'240826-eksport','paagaar',0,'video-bevis') on conflict (id) do nothing`, [kjoringId])
    await s.klient.query(`insert into ressurser (id, import_kjoring_id, ressurstype, status) values ($1,$2,'lek','publisert') on conflict (id) do nothing`, [rid, kjoringId])
    const rader = []
    for (const v of VIDEOER) {
      const id = detUuid('video-bevis-rad', `${kjoringId}-${v.sti}`)
      await s.klient.query(`insert into medier (id, ressurs_id, type, storage_sti, original_filnavn, bunny_video_id, import_kjoring_id)
        values ($1,$2,'video',$3,$4,null,$5) on conflict (id) do update set storage_sti=excluded.storage_sti, bunny_video_id=null`,
        [id, rid, v.sti, v.sti.split('/').pop(), kjoringId])
      rader.push({ ...v, id })
    }
    const manglId = detUuid('video-bevis-rad', `${kjoringId}-${MANGLER.sti}`)
    await s.klient.query(`insert into medier (id, ressurs_id, type, storage_sti, original_filnavn, bunny_video_id, import_kjoring_id)
      values ($1,$2,'video',$3,$4,null,$5) on conflict (id) do update set storage_sti=excluded.storage_sti, bunny_video_id=null`,
      [manglId, rid, MANGLER.sti, MANGLER.sti.split('/').pop(), kjoringId])

    // ── KJØRING 1 (ekte script) — laster opp de tre + køer den manglende ──
    P('## Kjøring 1 (ekte video-fase2.mjs, avgrenset til testkjøringen)')
    const k1 = kjorScript(kjoringId)
    for (const linje of k1.ut.split('\n').filter(Boolean)) P('  | ' + linje)
    krev('scriptet kjørte uten krasj (exit 0)', k1.kode === 0, `exit=${k1.kode}`)
    P('')

    // Hent guid-ene fra basen (koblingen scriptet skrev).
    const guid = {}
    for (const r of rader) {
      guid[r.id] = (await s.klient.query(`select bunny_video_id from medier where id=$1`, [r.id])).rows[0]?.bunny_video_id
    }

    // ── BEVIS 1: tre videoer finnes faktisk hos Bunny ──
    P('## BEVIS 1 — tre videoer lastet opp til bibliotek ' + env.BUNNY_LIBRARY_ID + ' (finnes hos Bunny)')
    const bunnyInfo = {}
    for (const r of rader) {
      const info = guid[r.id] ? await bunnyHentVideo(env, guid[r.id]) : null
      bunnyInfo[r.id] = info
      krev(`${r.sti.split('/').pop()} finnes hos Bunny (guid ${guid[r.id] || '—'})`, !!info && info.guid === guid[r.id],
        info ? `tittel="${info.title}"` : 'ikke funnet hos Bunny')
    }
    P('')

    // ── BEVIS 2: medier-raden har riktig bunny_video_id ──
    P('## BEVIS 2 — medier-raden har riktig bunny_video_id')
    for (const r of rader) {
      const g = guid[r.id]
      krev(`${r.sti.split('/').pop()} → bunny_video_id satt og matcher Bunny`, !!g && bunnyInfo[r.id]?.guid === g, g || '(null)')
    }
    P('')

    // ── BEVIS 4: manglende videofil → kø, ikke krasj (vis kø-raden) ──
    P('## BEVIS 4 — manglende videofil håndteres (kø, ikke krasj)')
    const kørader = (await s.klient.query(`select id,type,status,beskrivelse,medie_id,import_kjoring_id from redaksjonell_ko where medie_id=$1 and type='fil_mangler'`, [manglId])).rows
    krev('kø-rad «fil_mangler» skrevet for den manglende videoen', kørader.length === 1)
    if (kørader.length) { const k = kørader[0]; P(`       kø-rad: type=${k.type} status=${k.status} medie_id=${k.medie_id}`); P(`               beskrivelse="${k.beskrivelse}"`) }
    const stiMangl = (await s.klient.query(`select bunny_video_id from medier where id=$1`, [manglId])).rows[0]?.bunny_video_id
    krev('den manglende radens bunny_video_id er fortsatt null (ikke falsk id)', stiMangl === null)
    P('')

    // ── BEVIS 3: kjør på nytt → de tre hoppes over (ikke lastet opp igjen) ──
    P('## BEVIS 3 — ny kjøring hopper over de tre (ingen re-opplasting)')
    const k2 = kjorScript(kjoringId)
    for (const linje of k2.ut.split('\n').filter(Boolean)) P('  | ' + linje)
    krev('scriptet kjørte uten krasj (exit 0)', k2.kode === 0, `exit=${k2.kode}`)
    krev('kun den manglende gjensto (de tre var alt koblet)', /Gjenstår: 1\b/.test(k2.ut))
    krev('ingen ny opplasting (0 lastet opp denne runden)', /0 lastet opp/.test(k2.ut))
    let uendret = true
    for (const r of rader) {
      const g2 = (await s.klient.query(`select bunny_video_id from medier where id=$1`, [r.id])).rows[0]?.bunny_video_id
      if (g2 !== guid[r.id]) uendret = false
    }
    krev('de tre guid-ene er uendret (samme videoer, ikke nye)', uendret)
    P('')

    // ── BEVIS 5: tid + anslag for 269 / 16,1 GB ──
    P('## BEVIS 5 — tid og anslag')
    const mb3 = VIDEOER.reduce((a, v) => a + v.storrelse, 0) / 1e6
    const mbps = mb3 / k1.sek
    P(`  Tre videoer: ${mb3.toFixed(2)} MB på ${k1.sek.toFixed(1)}s = ${mbps.toFixed(2)} MB/s (${(k1.sek / 3).toFixed(2)} s/video).`)
    P(`  269 videoer / 16,1 GB (ren opplasting, sekvensielt):`)
    P(`    · etter målt gjennomstrømning: ${(16100 / mbps / 60).toFixed(1)} min (${mbps.toFixed(2)} MB/s)`)
    P(`    · etter tid/video:              ${(k1.sek / 3 * 269 / 60).toFixed(1)} min (${(k1.sek / 3).toFixed(2)} s/video)`)
    P(`    NB: testfilene er små (~0,7 MB); 269-snittet er ~60 MB, så per-video-overhead amortiseres på`)
    P(`    større filer. Bunnys ETTERBEHANDLING (transkoding) kommer i tillegg og er asynkron — se BEVIS 6.`)
    P('')

    // ── BEVIS 6: er Bunny ferdig med etterbehandling, eller prosesserer fortsatt? ──
    P('## BEVIS 6 — Bunny-etterbehandling: ferdig eller pågår?')
    for (const r of rader) {
      const info = await bunnyHentVideo(env, guid[r.id])
      const st = info?.status
      P(`  ${r.sti.split('/').pop()}: status=${st} (${STATUSTEKST[st] ?? 'ukjent'})`)
    }
    P('  (status 4 = ferdig/spillbar; 2–3 = prosesserer/transkoder ⇒ jobben kan settes i gang og sjekkes senere.)')
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    // ── Rydd: slett de tre videoene hos Bunny + rader + anker + tilstandsfil ──
    try {
      for (const v of VIDEOER) {
        const id = detUuid('video-bevis-rad', `${kjoringId}-${v.sti}`)
        const g = (await s.klient.query(`select bunny_video_id from medier where id=$1`, [id])).rows[0]?.bunny_video_id
        if (g) await bunnySlettVideo(env, g)
      }
      await s.slettKjøring(kjoringId)
      await s.klient.query(`delete from ressurser where id=$1`, [rid]).catch(() => {})
      await s.klient.query(`delete from import_kjoring where id=$1`, [kjoringId]).catch(() => {})
      writeFileSync(TILSTAND, JSON.stringify({ ferdig: {} }))
      P('\nOpprydding: tre testvideoer slettet hos Bunny, testrader fjernet, biblioteket tilbake til utgangspunktet.')
    } catch (e) { P(`Opprydding-advarsel: ${e.message}`) }
    await s.ferdig()
  }
  writeFileSync(`${UT}/RESULTAT-video-bunny-6sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-video-bunny-6sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
