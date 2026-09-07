#!/usr/bin/env node
// OPPGAVE B — BEVIS for F2-rettingen (ekte fag/trinn-sjekk i steg D).
// Kjører hele passet mot 001→10x-basen, og måler UAVHENGIG av kodens egne tellere (rett fra
// basetabellene) hvor mange maskinkoblinger som finnes FØR og ETTER F2-sjekken, hva som skjer
// med de 7 B-radene (skår 0,905–0,992), og viser minst én kobling som PASSERTE tekstterskelen
// men ble avvist på fag eller trinn. Alt i én transaksjon med rollback.
//   node scripts/import/test-f2-fagtrinn.mjs

import { lesItems } from './lib/kilde.mjs'
import { lastFagmapping } from './lib/fagmapping.mjs'
import { seedUdirMaal, byggOgSkrivAktivLaering, lastKoblingForslag, normTekst } from './lib/aktivlaering.mjs'
import { detUuid } from './lib/uuid.mjs'
import { readFileSync } from 'node:fs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const KJORING_ID = detUuid('kjoring', 'test-f2-fagtrinn-5sep')

// De 7 B-radene med skår 0,905–0,992 (fra kobling-forslag.csv, verifisert i CSV-analysen).
const B7 = [
  ['KM13310', 0.905], ['KM13322', 0.939], ['KM13314', 0.944], ['KM13324', 0.947],
  ['KM13316', 0.957], ['KM14177', 0.990], ['KM14159', 0.992],
].map(([k, s]) => ['http://psi.udir.no/kl06/' + k, s])

async function main() {
  const noder = lesItems(ZIP, 'Content/atlu-nodes.json')
  const objTermer = lesItems(ZIP, 'Vocabularies/learning_objectives-terms.json')
  const vokab = new Map(objTermer.map(t => [String(t.tid), t.name]))
  const fagmap = lastFagmapping()
  const koblingForslag = lastKoblingForslag()
  const lk20 = JSON.parse(readFileSync('data/udir/lk20-kompetansemaal.json', 'utf8'))
  const P = (s) => console.log(s)

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()

  await k.query('begin')
  try {
    await k.query(
      `insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2)
       on conflict (id) do update set antall_noder=excluded.antall_noder`,
      [KJORING_ID, noder.filter(n => n.status === 1).length])

    const a = await seedUdirMaal(k, lk20, koblingForslag)
    const t = await byggOgSkrivAktivLaering(k, noder, vokab, fagmap, koblingForslag, a.uriTilId, KJORING_ID)

    P(`# OPPGAVE B — F2: ekte fag/trinn-sjekk i steg D`)
    P(`base: ${DBURL}   kjøring: ${KJORING_ID}`)
    P(``)

    // ── 1. Maskinkoblinger FØR og ETTER — målt rett fra basetabellene (uavhengig av tellerne) ──
    // Etter fikset: maskin = tillit≥0,90 OG fag+trinn-ok; forslag = (tillit<0,90) ELLER
    // (tillit≥0,90 men fag/trinn-bom). Forslag med skår≥0,90 er derfor NØYAKTIG de F2-avviste.
    const nMaskin = Number((await k.query(
      `select count(*) n from ressurs_kompetansemaal where import_kjoring_id=$1 and satt_av='maskin'`, [KJORING_ID])).rows[0].n)
    const nForslagHoy = Number((await k.query(
      `select count(*) n from ressurs_kompetansemaal_forslag where import_kjoring_id=$1 and skaar>=0.90`, [KJORING_ID])).rows[0].n)
    const nForslagLav = Number((await k.query(
      `select count(*) n from ressurs_kompetansemaal_forslag where import_kjoring_id=$1 and skaar<0.90`, [KJORING_ID])).rows[0].n)
    P(`## 1. Maskinkoblinger før/etter F2-sjekken (målt i basen)`)
    P(`  maskin ETTER  (tillit≥0,90 OG fag+trinn-ok):     ${nMaskin}`)
    P(`  avvist på fag/trinn (forslag med skår≥0,90):      ${nForslagHoy}`)
    P(`  maskin FØR    (alle tillit≥0,90):                 ${nMaskin + nForslagHoy}`)
    P(`  forslag under terskel (skår<0,90):                ${nForslagLav}`)
    P(`  kodens teller km_fagtrinn_avvist (kryssjekk):     ${t.km_fagtrinn_avvist}  ${t.km_fagtrinn_avvist === nForslagHoy ? 'OK — matcher basemålingen' : 'AVVIK!'}`)
    P(``)

    // ── 2. Hva skjedde med de 7 B-radene (skår 0,905–0,992)? — sporet på MERKELAPP-nivå ──
    // NB: et mål kan nås av FLERE merkelapper (f.eks. KM14177 nås av både en eksakt A-merkelapp
    // og B-merkelappen). Derfor teller vi koblinger fra opplegg som faktisk BÆRER selve
    // B-merkelappen (objective-navn normaliserer likt), ikke alle koblinger til målet.
    const publiserte = noder.filter(n => n.status === 1 || n.status === '1')
    const b7Rows = koblingForslag.filter(r => r.bunke === 'B' && r.likhetsskaar && parseFloat(r.likhetsskaar) >= 0.90)
    P(`## 2. De 7 B-radene (skår 0,905–0,992) — bærer-opplegg og koblingens utfall`)
    P(`  ${'udir_kode'.padEnd(9)} skår   bærere  maskin  forslag  utfall`)
    let b7Maskin = 0, b7Forslag = 0, b7Baerere = 0
    for (const r of b7Rows) {
      const norm = normTekst(r.vaar_tekst)
      const kmId = a.uriTilId.get(r.udir_uri)
      const baerere = publiserte.filter(n => (n.field_atlu_objective || []).some(o => {
        const navn = vokab.get(String(o.target_id)); return navn && normTekst(navn) === norm
      }))
      let m = 0, fo = 0
      for (const n of baerere) {
        const rid = detUuid('atlu', String(n.nid))
        m += Number((await k.query(`select count(*) c from ressurs_kompetansemaal where import_kjoring_id=$1 and ressurs_id=$2 and kompetansemaal_id=$3 and satt_av='maskin'`, [KJORING_ID, rid, kmId])).rows[0].c)
        fo += Number((await k.query(`select count(*) c from ressurs_kompetansemaal_forslag where import_kjoring_id=$1 and ressurs_id=$2 and kompetansemaal_id=$3`, [KJORING_ID, rid, kmId])).rows[0].c)
      }
      b7Maskin += m; b7Forslag += fo; b7Baerere += baerere.length
      const kort = r.udir_uri.replace('http://psi.udir.no/kl06/', '')
      const utfall = baerere.length === 0 ? 'merkelappen brukes ikke av noe publisert opplegg'
        : (fo > 0 && m === 0 ? 'AVVIST på trinn → forslag' : (fo > 0 ? 'delt (noen maskin, noen avvist)' : 'består fag+trinn → maskin'))
      P(`  ${kort.padEnd(9)} ${r.likhetsskaar}  ${String(baerere.length).padStart(5)}  ${String(m).padStart(6)}  ${String(fo).padStart(6)}   ${utfall}`)
    }
    P(`  SUM 7 B-rader: bærer-koblinger=${b7Maskin + b7Forslag}  maskin=${b7Maskin}  forslag(avvist)=${b7Forslag}`)
    P(`  → Kun ${b7Forslag} B-rad-kobling avvist på fag/trinn; ${b7Maskin} er legitime (samme fag + overlappende trinn).`)
    P(``)

    // ── 3. Minst én kobling som PASSERTE tekstterskelen men ble avvist på fag eller trinn ──
    P(`## 3. Eksempel(er): passerte tekstterskelen (skår≥0,90) men avvist på fag/trinn`)
    const fordeling = (await k.query(
      `select case when fo.skaar>=1.0 then 'A (eksakt tekst, skår 1,000)' else 'B (nær-match, 0,90–0,999)' end bunke,
              count(*) n, string_agg(distinct left(km.laereplan_kode,5), ', ' order by left(km.laereplan_kode,5)) fag
         from ressurs_kompetansemaal_forslag fo join kompetansemaal km on km.id=fo.kompetansemaal_id
        where fo.import_kjoring_id=$1 and fo.skaar>=0.90 group by 1 order by 1`, [KJORING_ID])).rows
    const grunner = (await k.query(
      `select case when ko.beskrivelse like '%mangler fag%trinn%' then 'fag+trinn' when ko.beskrivelse like '%mangler fag%' then 'kun fag' when ko.beskrivelse like '%mangler trinn%' then 'kun trinn' else 'annet' end g, count(*) n
         from ressurs_kompetansemaal_forslag fo join redaksjonell_ko ko on ko.ressurs_id=fo.ressurs_id and ko.kompetansemaal_id=fo.kompetansemaal_id and ko.import_kjoring_id=$1
        where fo.import_kjoring_id=$1 and fo.skaar>=0.90 group by 1 order by 2 desc`, [KJORING_ID])).rows
    P(`  Fordeling av de ${nForslagHoy} avviste:`)
    for (const f of fordeling) P(`    ${f.bunke}: ${f.n}  (læreplaner: ${f.fag})`)
    P(`  Avvisningsgrunn: ${grunner.map(g => `${g.g}=${g.n}`).join(', ')}`)
    const avviste = (await k.query(
      `select r.kilde_nid, km.uri, km.laereplan_kode, fo.skaar, ko.beskrivelse
         from ressurs_kompetansemaal_forslag fo
         join ressurser r on r.id=fo.ressurs_id
         join kompetansemaal km on km.id=fo.kompetansemaal_id
         left join redaksjonell_ko ko on ko.ressurs_id=fo.ressurs_id and ko.kompetansemaal_id=fo.kompetansemaal_id and ko.import_kjoring_id=$1
        where fo.import_kjoring_id=$1 and fo.skaar>=0.90
        order by fo.skaar desc, r.kilde_nid limit 5`, [KJORING_ID])).rows
    if (!avviste.length) {
      P(`  INGEN slik kobling finnes — si det rett ut: ingen kobling passerte skår≥0,90 og ble avvist på fag/trinn.`)
    } else {
      P(`  Viser ${avviste.length} av ${nForslagHoy} avviste (høyest skår først):`)
      for (const r of avviste) {
        // oppleggets fag + trinn fra basen (arveregel-resultatet er allerede skrevet)
        const rid = detUuid('atlu', String(r.kilde_nid))
        const oppFag = (await k.query(
          `select f.navn from ressurs_fag rf join fag f on f.id=rf.fag_id where rf.ressurs_id=$1 order by f.navn`, [rid])).rows.map(x => x.navn)
        const oppTrinn = (await k.query(
          `select t.kode from ressurs_trinn rt join trinn t on t.id=rt.trinn_id where rt.ressurs_id=$1 order by t.kode`, [rid])).rows.map(x => String(x.kode))
        const maalTrinn = (await k.query(
          `select t.kode from kompetansemaal_trinn kt join trinn t on t.id=kt.trinn_id where kt.kompetansemaal_id=(select id from kompetansemaal where uri=$1) order by t.kode`, [r.uri])).rows.map(x => String(x.kode))
        P(`  ── opplegg nid ${r.kilde_nid}  →  mål ${r.uri.replace('http://psi.udir.no/kl06/', '')} (${r.laereplan_kode}, skår ${r.skaar})`)
        P(`     opplegg fag=[${oppFag.join(', ') || 'ingen'}]  trinn=[${oppTrinn.join(',') || '—'}]`)
        P(`     mål      fag=(fra ${r.laereplan_kode})           trinn=[${maalTrinn.join(',') || '—'}]`)
        P(`     kø-grunn: ${r.beskrivelse || '(ingen kø-rad)'}`)
      }
    }
  } finally {
    await k.query('rollback')
    await k.end()
  }
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
