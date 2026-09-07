#!/usr/bin/env node
// BEVIS for «for stor fil»-sikkerhetsnettet i lib/storage.mjs. Kjører mot LOKAL base med en STUBBET
// Storage-klient (ingen nettverk, ingen ekte opplasting — Kjartan kjører den ekte batchen selv når
// grensen er hevet). Viser at en fil Storage avviser på størrelse blir KØET og at løkken FORTSETTER,
// nøyaktig som fil_mangler — og at en køet fil kan tas på nytt hvis grensen heves.
//
//   node scripts/import/test-opplaster-forstor.mjs
//
// HARDSTOP: lokal base, ingen Supabase/prod, ingen git, ingen ekte opplasting.
import { writeFileSync } from 'node:fs'
import { FilOpplaster } from './lib/storage.mjs'
import { detUuid } from './lib/uuid.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`

// To reelle små filer i zip-en (så zip-strømmingen returnerer ekte bytes). «Størrelsesavvisningen»
// styres av stubben, ikke av faktisk filstørrelse — vi simulerer Storage-grensen.
const A = { sti: 'public/post/img_5209.jpg' }   // denne lar vi Storage «avvise på størrelse»
const B = { sti: 'public/kids_playing.jpg' }    // denne går gjennom → beviser at løkken fortsetter

const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

// Stubb Storage-klienten: list → tom (så opplasting forsøkes), getPublicUrl → dummy, upload → 413 for
// nøkler som inneholder `avvis.sti`, ellers suksess. Ingen nettverk.
function stubStorage(opp, avvis) {
  opp.klient.storage.from = (bucket) => ({
    list: async () => ({ data: [], error: null }),
    getPublicUrl: (key) => ({ data: { publicUrl: `https://${opp.ref}.supabase.co/storage/v1/object/public/${bucket}/${key}` } }),
    upload: async (key) => (avvis.sti && key.includes(avvis.sti))
      ? { error: { message: 'The object exceeded the maximum allowed size', statusCode: 413 } }
      : { data: { path: key }, error: null },
  })
}

async function main() {
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  P('# «For stor fil»-bevis (lokal base, stubbet Storage)')
  P('')

  const TID = detUuid('forstor-bevis', '6sep')
  const RID = detUuid('forstor-bevis-ressurs', TID)
  const idA = detUuid('forstor-bevis-rad', `${TID}-${A.sti}`)
  const idB = detUuid('forstor-bevis-rad', `${TID}-${B.sti}`)

  // FilOpplaster med dummy ref/nøkkel (ingen ekte tilkobling før et kall — og alle kall er stubbet).
  const opp = new FilOpplaster({ ref: 'testreftestreftestre', storageKey: 'dummy', bucket: 'importfiler', zipSti: ZIP })
  const avvis = { sti: A.sti }        // start: A avvises på størrelse
  stubStorage(opp, avvis)

  try {
    // Fixture
    await k.query(`insert into import_kjoring (id,kilde,status,antall_noder,notat) values ($1,'240826-eksport','paagaar',0,'forstor-bevis') on conflict (id) do nothing`, [TID])
    await k.query(`insert into ressurser (id, import_kjoring_id, ressurstype, status) values ($1,$2,'lek','publisert') on conflict (id) do nothing`, [RID, TID])
    for (const [id, f] of [[idA, A], [idB, B]]) {
      await k.query(`insert into medier (id, ressurs_id, type, storage_sti, import_kjoring_id) values ($1,$2,'bilde',$3,$4) on conflict (id) do update set storage_sti=excluded.storage_sti`, [id, RID, f.sti, TID])
    }

    // ── BEVIS 1: for stor fil køes og løkken fortsetter til neste ──
    P('## BEVIS 1 — en fil Storage avviser på størrelse køes, og løkken går videre')
    const res = []
    for (const [id, f] of [[idA, A], [idB, B]]) {
      const r = await opp.lastOppRad(k, 'medier', { id, storage_sti: f.sti }, TID)   // KASTER IKKE
      res.push({ f, ...r })
      P(`  ${f.sti} → status «${r.status}»`)
    }
    krev('begge rader ble behandlet (løkken stoppet ikke på den for store)', res.length === 2)
    krev('den for store fikk status «for_stor» (ikke unntak)', res[0].status === 'for_stor')
    krev('neste fil ble lastet opp som normalt (status «lastet»)', res[1].status === 'lastet')
    P('')

    // ── BEVIS 2: kø-raden som faktisk ble skrevet ──
    P('## BEVIS 2 — kø-raden for den for store fila')
    const ko = (await k.query(`select id,type,status,beskrivelse,medie_id,import_kjoring_id from redaksjonell_ko where medie_id=$1`, [idA])).rows
    krev('kø-rad skrevet (type fil_mangler, beskrivelse sier «for stor»)', ko.length === 1 && ko[0].type === 'fil_mangler' && /for stor/i.test(ko[0].beskrivelse))
    if (ko.length) { const r = ko[0]; P(`       type=${r.type} status=${r.status} medie_id=${r.medie_id}`); P(`       beskrivelse="${r.beskrivelse}"`) }
    P('')

    // ── BEVIS 3: gjenopptaking — raden er urørt, og kan tas på nytt hvis grensen heves ──
    P('## BEVIS 3 — gjenopptaking: køet fil kan tas på nytt hvis grensen heves')
    const stiEtterKo = (await k.query(`select storage_sti from medier where id=$1`, [idA])).rows[0]?.storage_sti
    krev('den for store radens storage_sti er UENDRET (fortsatt «public/…», ikke http)', stiEtterKo === A.sti, stiEtterKo)
    // Simuler at Kjartan hever grensen: Storage godtar nå fila.
    avvis.sti = null
    const r2 = await opp.lastOppRad(k, 'medier', { id: idA, storage_sti: A.sti }, TID)
    krev('etter hevet grense: samme fil lastes opp (status «lastet»)', r2.status === 'lastet')
    const stiEtterOpp = (await k.query(`select storage_sti from medier where id=$1`, [idA])).rows[0]?.storage_sti
    krev('raden peker nå på Storage-URL', /^https:\/\/.*\/storage\/v1\/object\/public\//.test(stiEtterOpp || ''), (stiEtterOpp || '').slice(0, 60) + '…')
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    // Rydd fixture (lokal base)
    await k.query(`delete from redaksjonell_ko where import_kjoring_id=$1`, [TID]).catch(() => {})
    await k.query(`delete from medier where import_kjoring_id=$1`, [TID]).catch(() => {})
    await k.query(`delete from ressurser where id=$1`, [RID]).catch(() => {})
    await k.query(`delete from import_kjoring where id=$1`, [TID]).catch(() => {})
    await k.end()
  }
  writeFileSync(`${UT}/RESULTAT-opplaster-forstor-6sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-opplaster-forstor-6sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
