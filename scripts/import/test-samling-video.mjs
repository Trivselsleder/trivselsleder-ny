#!/usr/bin/env node
// BEVIS for at video-fase2.mjs nå også laster opp de 3 videoene i samling_medie. Kjører det EKTE scriptet
// mot ØVINGSKOPIEN (avgrenset til prøvekjøringen), leser tilbake fra basen, og bekrefter mot Bunny.
// Dette er EKTE innhold — videoene skal BLI STÅENDE (ryddes ikke, ulikt test-video-bunny.mjs).
//
//   node scripts/import/test-samling-video.mjs
//
// Idempotent: er de 3 alt lastet opp (bunny_video_id satt), hopper det ekte scriptet over dem.
// HARDSTOP: kun øvingskopien (sperren), aldri prod. Ingen git.
import { writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { Skriver, lesEnv } from './lib/db.mjs'
import { bunnyHentVideo } from './video-fase2.mjs'

const ENV_STI = process.env.IMPORT_ENV || `${process.env.HOME}/trivselsleder-ny/.env.import`
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const KJ = '84777758-f6b4-45a0-abc6-e9473ae24458'          // prøvekjøringen (6. sep)
const TILSTAND = '/tmp/video-fase2-samling-tilstand.json'  // egen tilstandsfil (ikke i repoet)
const STATUSTEKST = { 0: 'kø', 1: 'lastet', 2: 'prosesserer', 3: 'transkoder', 4: 'ferdig/spillbar', 5: 'feil', 6: 'opplasting-feil' }

const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

async function main() {
  const env = lesEnv(ENV_STI)
  const s = new Skriver({ dryRun: false, envSti: ENV_STI })
  await s.koble()
  P('# samling_medie-video-bevis (ekte mot øvingskopien + Bunny ' + env.BUNNY_LIBRARY_ID + ')')
  P('')
  try {
    const les = async () => (await s.klient.query(
      `select id, samling_id, storage_sti, bunny_video_id from samling_medie where type='video' order by id`)).rows

    // ── FØR ──
    P('## FØR opplasting')
    const før = await les()
    const førMed = før.filter(r => r.bunny_video_id).length
    P(`  samling_medie video-rader: ${før.length} · med bunny_video_id: ${førMed}`)
    for (const r of før) P(`   - ${r.id} bunny_video_id=${r.bunny_video_id ?? 'NULL'} storage_sti=${r.storage_sti}`)
    P('')

    // ── KJØR det ekte scriptet, avgrenset til prøvekjøringen ──
    P('## Kjører video-fase2.mjs --skriv --kjoring-id ' + KJ)
    const t0 = Date.now()
    const r = spawnSync('node', ['scripts/import/video-fase2.mjs', '--skriv', '--kjoring-id', KJ, '--tilstand', TILSTAND], { encoding: 'utf8' })
    const sek = (Date.now() - t0) / 1000
    for (const linje of ((r.stdout || '') + (r.stderr || '')).split('\n').filter(Boolean)) P('  | ' + linje)
    krev('scriptet kjørte uten krasj (exit 0)', r.status === 0, `exit=${r.status}`)
    P('')

    // ── ETTER: les tilbake fra basen ──
    P('## ETTER opplasting — lest tilbake fra basen')
    const etter = await les()
    const etterMed = etter.filter(r => r.bunny_video_id).length
    krev(`antall samling_medie-rader med bunny_video_id: ${etterMed} (var ${førMed})`, etterMed === etter.length)
    for (const r of etter) P(`   - ${r.id} bunny_video_id=${r.bunny_video_id ?? 'NULL'}`)
    P('')

    // ── Bekreft mot Bunny at hver video finnes (guid + status) ──
    P('## Bekreftelse mot Bunny (guid + status)')
    for (const r of etter) {
      if (!r.bunny_video_id) { krev(`rad ${r.id} har guid`, false, 'bunny_video_id NULL'); continue }
      const info = await bunnyHentVideo(env, r.bunny_video_id)
      krev(`guid ${r.bunny_video_id} finnes hos Bunny`, !!info && info.guid === r.bunny_video_id, info ? `status=${info.status} (${STATUSTEKST[info.status] ?? '?'}) "${info.title}"` : 'ikke funnet')
    }
    P('')

    // ── KALIBRERING: en måling som VILLE gitt et annet svar hvis noe var galt ──
    P('## Kalibrering (viser at kontrollen ikke er blind)')
    const fake = await bunnyHentVideo(env, '00000000-0000-0000-0000-000000000000')
    krev('oppslag av en guid som IKKE finnes gir null (ikke falsk positiv)', fake === null)
    const ekte = etter[0]?.bunny_video_id ? await bunnyHentVideo(env, etter[0].bunny_video_id) : null
    krev('oppslag av en EKTE guid gir et objekt (samme metode, motsatt utfall)', !!ekte)
    krev('før/etter skiller seg (0 → 3) — målingen ville vist 0 hvis ingenting ble koblet', førMed === 0 && etterMed === etter.length && etter.length === 3)
    P('')

    P(`## Tid: ${sek.toFixed(1)}s for ${etter.length} samling-videoer.`)
    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL. De 3 samling-videoene er lastet opp og koblet; blir stående (ekte innhold).` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    await s.ferdig()
  }
  writeFileSync(`${UT}/RESULTAT-samling-video-7sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-samling-video-7sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
