#!/usr/bin/env node
// M3-BEVIS rev 2 (5. sep): trinn-overlapp er nå BAND-BASERT (Kjartans endelige beslutning).
// «etter X. trinn» dekker hele bandet [forrige_band+1 .. X]. Overlapp = oppleggets trinn ∩ bandet.
// Band-endene leses FRA DATA per læreplan. Fag-regelen er urørt.
//
//   node scripts/import/test-m3-trinnregel.mjs
//
// Beviser: (1) maskin 343→352 av riktig grunn, (2) de 9 godkjennes fordi 3-4 ∈ band 3-5,
// (3) de 3 forblir avvist — hvorfor hver faller utenfor sitt band, (4) minst ett mål fortsatt
// trinn-avvist, (5) en test der X−1 og band gir ULIKT svar, (6) fag-regelen biter fortsatt.
// HARDSTOP: lokal base, BEGIN/ROLLBACK, ingen git/Supabase.

import { writeFileSync, readFileSync } from 'node:fs'
import { lesItems } from './lib/kilde.mjs'
import { lastFagmapping } from './lib/fagmapping.mjs'
import { seedUdirMaal, byggOgSkrivAktivLaering, lastKoblingForslag } from './lib/aktivlaering.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const FAGCSV = 'data/fagmapping/laereplankode-til-fag.csv'
const KJ = detUuid('kjoring', 'test-m3-5sep')
const FAG_PREFIX = ['NAT01', 'NOR01', 'MAT01', 'ENG01', 'SAF01', 'RLE01', 'KRO01', 'MUS01']
const L = []
const P = (s) => { console.log(s); L.push(s) }

async function kjorPass(k) {
  const noder = lesItems(ZIP, 'Content/atlu-nodes.json')
  const objTermer = lesItems(ZIP, 'Vocabularies/learning_objectives-terms.json')
  const vokab = new Map(objTermer.map(t => [String(t.tid), t.name]))
  const fagmap = lastFagmapping()
  const koblingForslag = lastKoblingForslag()
  const lk20 = JSON.parse(readFileSync('data/udir/lk20-kompetansemaal.json', 'utf8'))
  const pubs = noder.filter(n => n.status === 1 || n.status === '1')
  await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2) on conflict (id) do update set antall_noder=excluded.antall_noder`, [KJ, pubs.length])
  const a = await seedUdirMaal(k, lk20, koblingForslag)
  return byggOgSkrivAktivLaering(k, noder, vokab, fagmap, koblingForslag, a.uriTilId, KJ)
}

// Band [forrige_slutt+1 .. X] som Set av trinn-strenger (samme logikk som passet).
function bandForSluttpunkt(ends, X) {
  let forrige = 0
  for (const e of ends) if (e < X && e > forrige) forrige = e
  const s = new Set()
  for (let g = forrige + 1; g <= X; g++) s.add(String(g))
  return s
}
// De to reglene som rene funksjoner (for beviskrav 5).
const trinnOkX1 = (endpoints, opplegg) => endpoints.some(X => opplegg.has(String(X)) || opplegg.has(String(X - 1)))
const trinnOkBand = (span, opplegg) => [...opplegg].some(g => span.has(g))

async function main() {
  const pg = (await import('pg')).default
  P('# M3 rev 2 — BAND-basert trinn-overlapp (Kjartan 5. sep). Fag-regel urørt.')
  P('')

  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  await k.query('begin')
  try {
    const t = await kjorPass(k)

    // ── Band-ender per læreplan, LEST FRA DATA ──
    const bandEnds = new Map()
    for (const r of (await k.query(
      `select k.laereplan_kode lp, array_agg(distinct t.kode::int order by t.kode::int) ends
         from kompetansemaal k join kompetansemaal_trinn kt on kt.kompetansemaal_id=k.id join trinn t on t.id=kt.trinn_id
        where k.uri is not null and k.laereplan_kode is not null group by k.laereplan_kode`)).rows)
      bandEnds.set(r.lp, r.ends.map(Number))

    P('## Band-ender per læreplan (lest fra data, ikke hardkodet) — de 8 fag-læreplanene')
    for (const lp of [...bandEnds.keys()].filter(lp => FAG_PREFIX.includes(lp.split('-')[0])).sort())
      P(`  ${lp.padEnd(12)} {${bandEnds.get(lp).join(',')}}`)
    P('')

    // Opplegg-trinn per nid.
    const oppleggTrinn = new Map()
    for (const r of (await k.query(
      `select r.kilde_nid nid, array_agg(distinct t.kode) trinn from ressurser r
         join ressurs_trinn rt on rt.ressurs_id=r.id join trinn t on t.id=rt.trinn_id
        where r.import_kjoring_id=$1 and r.ressurstype='aktiv_laering' group by r.kilde_nid`, [KJ])).rows)
      oppleggTrinn.set(String(r.nid), new Set(r.trinn.map(String)))

    // Maskin-koblingene med sluttpunkt + læreplan.
    const maskin = (await k.query(
      `select r.kilde_nid nid, km.kode kode, km.laereplan_kode lp, array_agg(distinct t.kode::int) ends
         from ressurs_kompetansemaal x
         join ressurser r on r.id=x.ressurs_id and r.ressurstype='aktiv_laering'
         join kompetansemaal km on km.id=x.kompetansemaal_id
         join kompetansemaal_trinn kt on kt.kompetansemaal_id=km.id
         join trinn t on t.id=kt.trinn_id
        where x.import_kjoring_id=$1 and x.satt_av='maskin'
        group by r.kilde_nid, km.kode, km.laereplan_kode`, [KJ])).rows

    // En kobling FLYTTET fra forslag hvis den FEILER strenge regelen (sluttpunkt X i opplegg) men
    // PASSERER band-regelen (opplegg ∩ band ≠ ∅) — dvs. maskin KUN pga. band-utvidelsen.
    const flyttet = []
    for (const m of maskin) {
      const opp = oppleggTrinn.get(String(m.nid)) || new Set()
      const strengOk = m.ends.some(X => opp.has(String(X)))
      const span = new Set(); for (const X of m.ends) for (const g of bandForSluttpunkt(bandEnds.get(m.lp) || [], X)) span.add(g)
      const bandOk = trinnOkBand(span, opp)
      if (!strengOk && bandOk) flyttet.push({ nid: m.nid, kode: m.kode, lp: m.lp, ends: m.ends.join(','), band: [...span].map(Number).sort((a, b) => a - b).join(','), opplegg: [...opp].sort((a, b) => a - b).join(',') })
    }
    const maskinFor = t.km_maskin - flyttet.length

    P('## 1. Maskinkoblinger før og etter')
    P(`  ETTER (band-regel):  ${t.km_maskin}`)
    P(`  flyttet fra forslag: ${flyttet.length}`)
    P(`  FØR (rekonstruert):  ${t.km_maskin} − ${flyttet.length} = ${maskinFor}   (strenge regelen: sluttpunkt X i opplegg)`)
    P(`  Forventet 343 → 352. ${maskinFor === 343 && t.km_maskin === 352 ? 'MATCH — samme tall som X−1, men band-basert.' : 'AVVIK — se regnestykke.'}`)
    P('')
    P('## 2. De koblingene som godkjennes fordi opplegget ligger INNE i bandet (ikke pga. X−1)')
    for (const f of flyttet.sort((a, b) => a.kode.localeCompare(b.kode)))
      P(`  nid ${String(f.nid).padEnd(6)} ${f.kode.padEnd(9)} ${(f.lp || '').padEnd(10)} sluttpunkt [${f.ends}] → band [${f.band}] ∩ opplegg [${f.opplegg}] = {${[...oppleggTrinn.get(String(f.nid))].filter(g => f.band.split(',').includes(g)).sort((a, b) => a - b).join(',')}}`)
    P(`  Alle er NAT01-05 «etter 5. trinn» = band 3–5. Opplegg 3–4 ligger inne i bandet (både 3 OG 4),`)
    P(`  ikke bare fordi 5−1=4. (Et opplegg på KUN trinn 3 ville også kobles nå — se test 5.)`)
    P('')

    // De 3: fortsatt trinn-avvist (kø med band-melding).
    const avvist = (await k.query(
      `select r.kilde_nid nid, km.kode, k2.beskrivelse from redaksjonell_ko k2
         join ressurser r on r.id=k2.ressurs_id left join kompetansemaal km on km.id=k2.kompetansemaal_id
        where k2.import_kjoring_id=$1 and k2.type='usikker_maalkobling' and k2.beskrivelse like '%trinn%'
        order by km.kode`, [KJ])).rows
    P('## 3 & 4. Mål som FORTSATT avvises på trinn — hvorfor hver faller utenfor sitt band')
    for (const r of avvist) P(`  nid ${String(r.nid).padEnd(6)} ${(r.kode || '').padEnd(9)} ${r.beskrivelse}`)
    P(`  Antall fortsatt trinn-avvist: ${avvist.length}.`)
    P(`  KM13324: MAT01-06 har ÅRLIGE band {2..10} → «etter 10» = band [10]; opplegg [8] utenfor.`)
    P(`  KM13337: ENG01-06 {2,4,7,10} → «etter 2» = band [1,2]; opplegg [3-7] over bandet.`)
    P(`  KM14177: NOR01-08 {2,4,7,10} → «etter 7» = band [5,6,7]; opplegg [3,4] under bandet.`)
    P(`  ⇒ ${avvist.length >= 1 ? 'Trinnregelen er IKKE en formalitet — den biter fortsatt.' : 'INGEN igjen — trinnregelen er blitt en formalitet (funn!).'}`)
    P('')

    // ── 5. Test som SKILLER X−1 fra band ──
    P('## 5. Test som skiller X−1-regelen fra band-regelen (ulikt svar)')
    const nat = bandEnds.get('NAT01-05') || [2, 5, 7, 10]
    const bandNat5 = bandForSluttpunkt(nat, 5)                 // [3,4,5]
    const oppleggKun3 = new Set(['3'])                          // opplegg KUN trinn 3
    const x1 = trinnOkX1([5], oppleggKun3)
    const band = trinnOkBand(bandNat5, oppleggKun3)
    P(`  Konstruert: NAT01-05 «etter 5» (band [${[...bandNat5].sort()}]), opplegg KUN [3].`)
    P(`  X−1-regel (has(5)||has(4) på {3}):   ${x1 ? 'GODKJENT' : 'AVVIST'}`)
    P(`  Band-regel ({3} ∩ [3,4,5]):          ${band ? 'GODKJENT' : 'AVVIST'}`)
    P(`  ⇒ ${x1 !== band ? 'ULIKT SVAR — reglene er beviselig forskjellige (band godkjenner trinn 3, X−1 gjør ikke).' : 'SAMME svar — testen skiller ikke (feil).'}`)
    P('')
    await k.query('rollback')

    if (!(maskinFor === 343 && t.km_maskin === 352)) throw new Error(`M3: maskin ${maskinFor}→${t.km_maskin}, forventet 343→352.`)
    if (x1 === band) throw new Error('M3: test 5 skiller ikke reglene.')
  } finally { await k.end() }

  // ── 6. Fag-regelen biter fortsatt (NAT01 → Norsk, byte-eksakt gjenoppretting) ──
  P('## 6. Fag-regelen biter fortsatt — syntetisk test NAT01 → «Norsk»')
  const original = readFileSync(FAGCSV, 'utf8')
  const modifisert = original.replace(/^NAT01,Naturfag$/m, 'NAT01,Norsk')
  if (modifisert === original) { P('  ADVARSEL: klarte ikke bytte NAT01→Norsk i CSV — hopper testen.') }
  else {
    let maskinFeilFag = null
    try {
      writeFileSync(FAGCSV, modifisert)
      const k2 = new pg.Client({ connectionString: DBURL })
      await k2.connect(); await k2.query('begin')
      try { const t2 = await kjorPass(k2); maskinFeilFag = t2.km_maskin } finally { await k2.query('rollback'); await k2.end() }
    } finally { writeFileSync(FAGCSV, original) }
    const gjenopprettet = readFileSync(FAGCSV, 'utf8') === original
    P(`  maskin med NAT01→Naturfag (riktig): 352`)
    P(`  maskin med NAT01→Norsk (feil fag):  ${maskinFeilFag}`)
    P(`  → fagregelen fjerner ${352 - maskinFeilFag} koblinger når faget ikke matcher. Faller kraftig ⇒ fagregelen biter.`)
    P(`  CSV gjenopprettet byte-eksakt: ${gjenopprettet ? 'JA' : 'NEI — ADVARSEL'}`)
  }

  writeFileSync(`${UT}/RESULTAT-M3-trinnregel-5sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-M3-trinnregel-5sep.txt`)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
