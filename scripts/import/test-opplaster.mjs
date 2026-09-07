#!/usr/bin/env node
// BEVIS for filopplasteren (lib/storage.mjs) — FEM FILER FØRST (tre bilder, to dokumenter) + én
// manglende fil. Kjører EKTE mot ØVINGSKOPIEN gjennom sperren i db.mjs, laster opp fra eksport-zip-en,
// oppdaterer radene, henter URL-ene tilbake, og rydder etter seg (Storage-prefiks + rader).
//
//   node scripts/import/test-opplaster.mjs
//
// KREVER at .env.import har IMPORT_STORAGE_KEY (øvingskopiens service_role-nøkkel) — uten den kan
// ingen byte lastes opp, og testen stopper med en tydelig beskjed (exit 2, ikke en dom).
// HARDSTOP: kun øvingskopien (aldri prod — sperren + hentKopiRef binder målet), ingen git.
import { writeFileSync } from 'node:fs'
import { Skriver, lesEnv } from './lib/db.mjs'
import { FilOpplaster, hentKopiRef } from './lib/storage.mjs'
import { detUuid } from './lib/uuid.mjs'

const ENV_STI = process.env.IMPORT_ENV || `${process.env.HOME}/trivselsleder-ny/.env.import`
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`

// Fem reelle filer i eksport-zip-en (bekreftet med unzip -Zl), + én som IKKE finnes.
const FILER = [
  { tabell: 'medier', type: 'bilde', sti: 'public/kids_playing.jpg', storrelse: 234962 },
  { tabell: 'medier', type: 'bilde', sti: 'public/post/img_5209.jpg', storrelse: 1635031 },
  { tabell: 'medier', type: 'bilde', sti: 'public/post/img_7748.jpg', storrelse: 445532 },
  { tabell: 'dokumenter', tittel: 'Brakahaug skole (test)', sti: 'public/brakahaug_skole.pdf', storrelse: 588425 },
  { tabell: 'dokumenter', tittel: 'Sogsti skole Frogn (test)', sti: 'public/sogsti_skole_frogn.pdf', storrelse: 507686 },
]
const MANGLER = { tabell: 'medier', type: 'bilde', sti: 'public/finnes-ikke-xyz-123.jpg' }

const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

async function main() {
  const env = lesEnv(ENV_STI)
  if (!env.IMPORT_STORAGE_KEY) {
    console.error('VENTER: .env.import mangler IMPORT_STORAGE_KEY (øvingskopiens service_role-nøkkel).')
    console.error('Uten den kan ingen fil lastes opp. Legg inn nøkkelen og kjør på nytt.')
    process.exit(2)
  }
  const zipSti = env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
  const bucket = env.IMPORT_STORAGE_BUCKET || 'importfiler'
  const kjoringId = detUuid('opplaster-bevis', '5filer-6sep')
  const rid = detUuid('opplaster-bevis-ressurs', kjoringId)

  P('# Filopplaster-bevis (fem filer, ekte mot øvingskopien)')
  P('')

  const s = new Skriver({ dryRun: false, envSti: ENV_STI })
  await s.koble()   // ← SPERREN
  const ref = await hentKopiRef(s.klient)
  const opp = new FilOpplaster({ ref, storageKey: env.IMPORT_STORAGE_KEY, bucket, zipSti })
  await opp.sikreBotte()
  P(`Storage-mål: ${opp.baseUrl} · bøtte «${bucket}» · kjøring ${kjoringId}`)
  P('')

  try {
    // ── Fixture: ett anker + én ressurs + seks rader (fem ekte + én manglende) ──
    await s.klient.query(`insert into import_kjoring (id,kilde,status,antall_noder,notat) values ($1,'240826-eksport','paagaar',0,'opplaster-bevis') on conflict (id) do nothing`, [kjoringId])
    await s.klient.query(`insert into ressurser (id, import_kjoring_id, ressurstype, status) values ($1,$2,'lek','publisert') on conflict (id) do nothing`, [rid, kjoringId])
    const rader = []
    for (const f of FILER) {
      const id = detUuid('opplaster-bevis-rad', `${kjoringId}-${f.sti}`)
      if (f.tabell === 'medier') {
        await s.klient.query(`insert into medier (id, ressurs_id, type, storage_sti, import_kjoring_id) values ($1,$2,$3,$4,$5) on conflict (id) do update set storage_sti=excluded.storage_sti`, [id, rid, f.type, f.sti, kjoringId])
      } else {
        await s.klient.query(`insert into dokumenter (id, tittel, storage_sti, status, import_kjoring_id) values ($1,$2,$3,'publisert',$4) on conflict (id) do update set storage_sti=excluded.storage_sti`, [id, f.tittel, f.sti, kjoringId])
      }
      rader.push({ ...f, id })
    }
    const manglId = detUuid('opplaster-bevis-rad', `${kjoringId}-${MANGLER.sti}`)
    await s.klient.query(`insert into medier (id, ressurs_id, type, storage_sti, import_kjoring_id) values ($1,$2,$3,$4,$5) on conflict (id) do update set storage_sti=excluded.storage_sti`, [manglId, rid, MANGLER.type, MANGLER.sti, kjoringId])

    // ── BEVIS 1: fem filer lastet opp — vis URL-ene ──
    P('## BEVIS 1 — fem filer lastet opp (tre bilder, to dokumenter), med URL')
    const t0 = Date.now()
    const resultater = []
    for (const r of rader) {
      const res = await opp.lastOppRad(s.klient, r.tabell, { id: r.id, storage_sti: r.sti }, kjoringId)
      resultater.push({ ...r, ...res })
      P(`  ${res.status === 'lastet' ? 'OK  ' : 'FEIL'} ${r.tabell.padEnd(10)} ${r.sti}`)
      P(`       → ${res.url || '(ingen url)'}`)
    }
    const sek5 = (Date.now() - t0) / 1000
    const antLastet = resultater.filter(r => r.status === 'lastet').length
    const bilder = resultater.filter(r => r.tabell === 'medier' && r.status === 'lastet').length
    const dok = resultater.filter(r => r.tabell === 'dokumenter' && r.status === 'lastet').length
    krev(`fem filer lastet opp (${bilder} bilder + ${dok} dokumenter)`, antLastet === 5 && bilder === 3 && dok === 2)
    P('')

    // ── BEVIS 2: hent hver URL og bekreft at fila kommer tilbake med riktig størrelse ──
    P('## BEVIS 2 — hver URL svarer, med riktig størrelse')
    for (const r of resultater) {
      let sz = -1, status = 0
      try {
        const resp = await fetch(r.url)
        status = resp.status
        const buf = Buffer.from(await resp.arrayBuffer())
        sz = buf.length
      } catch (e) { P(`       fetch-feil: ${e.message}`) }
      krev(`${r.sti} → HTTP ${status}, ${sz} bytes (forventet ${r.storrelse})`, status === 200 && sz === r.storrelse)
    }
    P('')

    // ── BEVIS 3: raden i basen peker nå på URL-en ──
    P('## BEVIS 3 — radene i basen peker nå på den nye URL-en')
    for (const r of resultater) {
      const v = (await s.klient.query(`select storage_sti from ${r.tabell} where id=$1`, [r.id])).rows[0]?.storage_sti
      krev(`${r.tabell}-rad ${r.sti.split('/').pop()} peker på Storage-URL`, /^https:\/\/.*\/storage\/v1\/object\/public\//.test(v || ''), (v || '').slice(0, 70) + '…')
    }
    P('')

    // ── BEVIS 5: manglende fil håndteres, krasjer ikke ──
    P('## BEVIS 5 — manglende fil i zip håndteres (ikke krasj)')
    const rM = await opp.lastOppRad(s.klient, MANGLER.tabell, { id: manglId, storage_sti: MANGLER.sti }, kjoringId)
    krev('manglende fil ga status «mangler» (ikke unntak)', rM.status === 'mangler', rM.medlem)
    const ko = (await s.klient.query(`select id, type, status, beskrivelse, medie_id, import_kjoring_id from redaksjonell_ko where medie_id=$1 and type='fil_mangler'`, [manglId])).rows
    krev('kø-rad «fil_mangler» opprettet for den manglende fila', ko.length === 1)
    if (ko.length) {
      const r = ko[0]
      P(`       kø-rad: type=${r.type} status=${r.status} medie_id=${r.medie_id} kjøring=${r.import_kjoring_id}`)
      P(`               beskrivelse="${r.beskrivelse}"`)
    }
    const stiUendret = (await s.klient.query(`select storage_sti from medier where id=$1`, [manglId])).rows[0]?.storage_sti
    krev('den manglende radens storage_sti er urørt (ikke satt til en falsk URL)', stiUendret === MANGLER.sti)
    P('')

    // ── BEVIS 4: kjør på nytt → alle fem hoppes over ──
    P('## BEVIS 4 — ny kjøring hopper over alle fem (ingen re-opplasting)')
    let hoppet = 0
    for (const r of rader) {
      const res = await opp.lastOppRad(s.klient, r.tabell, { id: r.id, storage_sti: r.sti }, kjoringId)
      // raden peker nå på URL → 'allerede'; om noen skulle vært null i basen ville objektsjekk gitt 'hoppet'.
      if (res.status === 'allerede' || res.status === 'hoppet') hoppet++
      else P(`       uventet status for ${r.sti}: ${res.status}`)
    }
    krev('alle fem hoppet over ved ny kjøring', hoppet === 5)
    // og den manglende igjen håndtert uten krasj
    const rM2 = await opp.lastOppRad(s.klient, MANGLER.tabell, { id: manglId, storage_sti: MANGLER.sti }, kjoringId)
    krev('manglende fil håndteres også ved ny kjøring', rM2.status === 'mangler')
    P('')

    // ── BEVIS 6: tid for fem filer + anslag for de 638 (bilder+dok, uten video) ──
    // 638 filer / 1,72 GB er MÅLT offline mot zip-ens sentralkatalog (261 av 363 medie-rader er video →
    // Bunny/egen jobb, ikke her). Konstantene under er de målte verdiene.
    const N638 = 638, BYTES638 = 1722556325
    P('## BEVIS 6 — tid og anslag')
    const mb5 = FILER.reduce((a, f) => a + f.storrelse, 0) / 1e6
    const mbps = mb5 / sek5
    P(`  Fem filer: ${mb5.toFixed(2)} MB på ${sek5.toFixed(1)}s = ${mbps.toFixed(2)} MB/s (${(sek5 / 5).toFixed(2)} s/fil).`)
    P(`  Etappe 6 = ${N638} filer / ${(BYTES638 / 1e9).toFixed(2)} GB (bilder+dokumenter, uten video):`)
    P(`    · etter målt gjennomstrømning: ${(BYTES638 / 1e6 / mbps / 60).toFixed(1)} min (${mbps.toFixed(2)} MB/s)`)
    P(`    · etter tid/fil:                ${(sek5 / 5 * N638 / 60).toFixed(1)} min (${(sek5 / 5).toFixed(2)} s/fil)`)
    P(`    Sannheten ligger mellom: testfilene (snitt ${(mb5 / 5).toFixed(2)} MB) er mindre enn 638-snittet (2,7 MB),`)
    P(`    så per-fil-overhead amortiseres på større filer; men én enkelt PDF på 321,9 MB drar opp bytes-anslaget.`)
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    // ── Rydd: Storage-prefiks (bytene) + rader (via slettKjøring) + ankeret ──
    try {
      const slettet = await opp.slettPrefiks(kjoringId)
      P(`\nOpprydding: slettet ${slettet} objekt under import/${kjoringId}/ i Storage.`)
      await s.slettKjøring(kjoringId)
      await s.klient.query(`delete from ressurser where id=$1`, [rid]).catch(() => {})
      await s.klient.query(`delete from import_kjoring where id=$1`, [kjoringId]).catch(() => {})
    } catch (e) { P(`Opprydding-advarsel: ${e.message}`) }
    await s.ferdig()
  }
  writeFileSync(`${UT}/RESULTAT-opplaster-6sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-opplaster-6sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
