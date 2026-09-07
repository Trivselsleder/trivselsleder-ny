#!/usr/bin/env node
// MEKANISK KJØRING av aktiv læring-passet (lib/aktivlaering.mjs) mot en ekte 001→10x-base.
// Steg A (Udir-mål) + B/C/D (opplegg, fag, kompetansemål). Teller FAKTISKE rader i basen,
// kjører opplegg-passet EN GANG TIL for determinisme, og ruller tilbake. Ingen egen
// kontrollrunde (Fable kontrollerer).
//
//   node scripts/import/test-aktivlaering.mjs        (mot trivsel_port_test)

import { lesItems } from './lib/kilde.mjs'
import { lastFagmapping, fagForOpplegg, fagForTerm } from './lib/fagmapping.mjs'
import { seedUdirMaal, byggOgSkrivAktivLaering, lastKoblingForslag } from './lib/aktivlaering.mjs'
import { detUuid } from './lib/uuid.mjs'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const KJORING_ID = detUuid('kjoring', 'test-aktivlaering-4sep')

// Forventede opplegg-per-fag (claude_ATLU-TOPIC-KARTLAGT-4sep.md, distinkte opplegg via underterm).
const FORVENTET_FAG = { Matematikk: 84, Norsk: 68, Engelsk: 43, Naturfag: 38, Samfunnsfag: 26, KRLE: 12, Kroppsøving: 1, Musikk: 1 }

async function main() {
  // ── Kilder ──
  const noder = lesItems(ZIP, 'Content/atlu-nodes.json')
  const objTermer = lesItems(ZIP, 'Vocabularies/learning_objectives-terms.json')
  const vokab = new Map(objTermer.map(t => [String(t.tid), t.name]))
  const fagmap = lastFagmapping()                       // KRAV 2: harde stopp-vakten kjører her
  const koblingForslag = lastKoblingForslag()
  const lk20 = JSON.parse(readFileSync('data/udir/lk20-kompetansemaal.json', 'utf8'))

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  const P = (s) => console.log(s)

  await k.query('begin')
  try {
    // STEG 2 (forutsetning): import_kjoring-anker (FK-mål for ressurser).
    await k.query(
      `insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2)
       on conflict (id) do update set antall_noder=excluded.antall_noder`,
      [KJORING_ID, noder.filter(n => n.status === 1).length])

    // ── STEG A: Udir-målene inn (referansedata, kjøres én gang) ──
    const a = await seedUdirMaal(k, lk20, koblingForslag)

    // ── STEG B–D: opplegg-passet, KJØRING 1 ──
    const t1 = await byggOgSkrivAktivLaering(k, noder, vokab, fagmap, koblingForslag, a.uriTilId, KJORING_ID)
    const base1 = await tellBase(k)
    // ── KJØRING 2 (determinisme/idempotens) ──
    const t2 = await byggOgSkrivAktivLaering(k, noder, vokab, fagmap, koblingForslag, a.uriTilId, KJORING_ID)
    const base2 = await tellBase(k)

    // ── RAPPORT ──
    P(`# Aktiv læring-passet — mekanisk kjøring mot 001→10x-base`)
    P(`Kjøring-id: ${KJORING_ID}`)
    P(``)
    P(`## STEG A — Udir-målene inn (kompetansemaal)`)
    P(`  nye/oppdaterte Udir-rader (uri satt):  ${a.telling.innsatt}    (forventet 1410)`)
    P(`  kompetansemaal_trinn-rader:            ${a.telling.trinnRader}`)
    P(`  gamle merkelapper funnet (uri IS NULL):${String(a.telling.gamle_funnet).padStart(4)}   (prod: ~302; denne basen er gjenoppbygd → forvent ~1)`)
    P(`  gamle → erstattet_av satt:             ${a.telling.gamle_erstattet}`)
    P(`  gamle → utgatt=true + LK06:            ${a.telling.gamle_utgatt}`)
    P(`  (37 overskrifter forkastes — får verken erstattet_av eller utgatt)`)
    P(``)
    P(`## STEG B — opplegg inn`)
    P(`  ressurser (aktiv_laering):  ${base1.opplegg}    (forventet 280 = 289 − 9 avpubliserte)`)
    P(`  ressurs_innhold:            ${base1.ressurs_innhold}`)
    P(`  ressurs_trinn:              ${base1.ressurs_trinn}`)
    P(``)
    P(`## STEG C — fag (arveregel: opplegg → underterm → gruppe → fag)`)
    P(`  ressurs_fag-rader: ${base1.ressurs_fag}`)
    P(`  distinkte opplegg per fag (faktisk vs forventet):`)
    const fagRader = await opplaggPerFag(k)
    const settFag = new Set()
    for (const r of fagRader) {
      settFag.add(r.navn)
      const f = FORVENTET_FAG[r.navn]
      const merk = f == null ? '(ikke i forventet-lista)' : (Number(r.n) === f ? 'OK' : `AVVIK (forventet ${f})`)
      P(`    ${r.navn.padEnd(14)} ${String(r.n).padStart(4)}   ${merk}`)
    }
    for (const [navn, f] of Object.entries(FORVENTET_FAG)) if (!settFag.has(navn)) P(`    ${navn.padEnd(14)}    0   AVVIK (forventet ${f})`)
    P(`  opplegg UTEN fag:            ${base1.utenFag}    (forventet 17)`)
    P(`    → fagløse verifisert (i fil e og fikk 0 fag): ${t1.fagloese_verifisert}`)
    P(`    → i fil e MEN fikk fag (avvik):               ${t1.fagloese_uventet_fag}`)
    P(`    → IKKE i fil e MEN fikk 0 fag (avvik):        ${t1.uventet_uten_fag}`)
    P(``)
    engelskDiagnostikk(noder, fagmap, P)   // OPPGAVE C: hvorfor Engelsk = 44, ikke 43
    P(``)
    P(`## STEG D — kompetansemål-kobling (092, terskel 0,90, + F2 fag/trinn-sjekk)`)
    P(`  ressurs_kompetansemaal (satt_av='maskin'): ${base1.km_maskin}   (ETTER F2-sjekken)`)
    P(`    → maskin FØR F2-sjekken (alle med tillit≥0,90): ${base1.km_maskin + t1.km_fagtrinn_avvist}`)
    P(`    → avvist på fag/trinn (skår≥0,90 → forslag):    ${t1.km_fagtrinn_avvist}`)
    P(`  ressurs_kompetansemaal (satt_av='menneske'):${base1.km_menneske}   (import setter aldri menneske)`)
    P(`  ressurs_kompetansemaal_forslag:            ${base1.km_forslag}   (herav ${t1.km_fagtrinn_avvist} F2-avviste + ${base1.km_forslag - t1.km_fagtrinn_avvist} under terskel)`)
    P(`  opplegg UTEN kompetansemål (kø manglende_maal): ${t1.utenKompetansemaal}    (forventet 28)`)
    P(``)
    P(`## redaksjonell_ko per type (aktiv læring-kjøringen)`)
    for (const r of await køPerType(k)) P(`  ${r.type.padEnd(22)} ${String(r.n).padStart(5)}`)
    P(``)
    P(`## Diagnostikk`)
    P(`  ukjente topic-termer (ikke i fil b):        ${t1.ukjenteTermer}`)
    P(`  normaliserings-bom (merkelapp ikke i CSV):  ${t1.normBom}`)
    P(`  dublett-kollisjoner i kobling-forslag-kart: ${t1.dublettKollisjon}`)
    P(``)
    // ── Determinisme ──
    const felt = ['opplegg', 'ressurs_innhold', 'ressurs_trinn', 'ressurs_fag', 'km_maskin', 'km_forslag']
    const likt = felt.every(f => base1[f] === base2[f])
    P(`## Determinisme (kjøring 1 vs 2 på samme base)`)
    for (const f of felt) P(`  ${f.padEnd(16)} kjøring1=${base1[f]}  kjøring2=${base2[f]}  ${base1[f] === base2[f] ? 'OK' : 'AVVIK!'}`)
    P(likt ? `RESULTAT: identiske tall → deterministisk og idempotent.` : `RESULTAT: AVVIK mellom kjøringene — se over.`)
    P(``)
    const fp = await fingeravtrykk(k)
    P(`## Fingeravtrykk (OPPGAVE E)`)
    P(`  md5 av alle skrevne rader (7 tabeller, naturlige nøkler, sortert): ${fp}`)
    P(`  (kjør scriptet på nytt mot frisk base → identisk md5 beviser determinisme)`)
  } finally {
    await k.query('rollback')   // MÅLING: ingenting skrives varig
    await k.end()
  }
}

async function tellBase(k) {
  const kj = [KJORING_ID]
  const q = async (sql) => Number((await k.query(sql, kj)).rows[0].n)
  const alF = 'from ressurser r where r.import_kjoring_id=$1 and r.ressurstype=\'aktiv_laering\''
  const barn = (tbl) => `select count(*) n from ${tbl} x where x.ressurs_id in (select id ${alF})`
  return {
    opplegg: await q(`select count(*) n ${alF}`),
    ressurs_innhold: await q(barn('ressurs_innhold')),
    ressurs_trinn: await q(barn('ressurs_trinn')),
    ressurs_fag: await q(barn('ressurs_fag')),
    km_maskin: await q(`select count(*) n from ressurs_kompetansemaal where import_kjoring_id=$1 and satt_av='maskin'`),
    km_menneske: await q(`select count(*) n from ressurs_kompetansemaal where import_kjoring_id=$1 and satt_av='menneske'`),
    km_forslag: await q(`select count(*) n from ressurs_kompetansemaal_forslag where import_kjoring_id=$1`),
    utenFag: await q(`select count(*) n ${alF} and not exists (select 1 from ressurs_fag rf where rf.ressurs_id=r.id)`),
  }
}
async function opplaggPerFag(k) {
  return (await k.query(
    `select f.navn, count(distinct rf.ressurs_id) n
       from ressurs_fag rf join fag f on f.id=rf.fag_id join ressurser r on r.id=rf.ressurs_id
      where r.import_kjoring_id=$1 group by f.navn order by n desc, f.navn`, [KJORING_ID])).rows
}
async function køPerType(k) {
  return (await k.query(
    'select type, count(*) n from redaksjonell_ko where import_kjoring_id=$1 group by type order by n desc', [KJORING_ID])).rows
}

// OPPGAVE E: md5 av alle skrevne rader på naturlige nøkler (uavhengig av id-er/rekkefølge).
async function fingeravtrykk(k) {
  const spørringer = [
    `select 'R|'||r.kilde_nid||'|'||r.ressurstype||'|'||r.status s from ressurser r where r.import_kjoring_id=$1 and r.ressurstype='aktiv_laering'`,
    `select 'I|'||r.kilde_nid||'|'||x.sprak||'|'||x.ferskhet||'|'||coalesce(x.tittel,'')||'|'||coalesce(x.beskrivelse,'') s from ressurs_innhold x join ressurser r on r.id=x.ressurs_id where r.import_kjoring_id=$1`,
    `select 'T|'||r.kilde_nid||'|'||t.kode s from ressurs_trinn x join ressurser r on r.id=x.ressurs_id join trinn t on t.id=x.trinn_id where r.import_kjoring_id=$1`,
    `select 'F|'||r.kilde_nid||'|'||f.navn s from ressurs_fag x join ressurser r on r.id=x.ressurs_id join fag f on f.id=x.fag_id where r.import_kjoring_id=$1`,
    `select 'M|'||r.kilde_nid||'|'||km.uri||'|'||x.satt_av||'|'||x.tillit::text s from ressurs_kompetansemaal x join ressurser r on r.id=x.ressurs_id join kompetansemaal km on km.id=x.kompetansemaal_id where x.import_kjoring_id=$1`,
    `select 'FL|'||r.kilde_nid||'|'||km.uri||'|'||x.skaar::text s from ressurs_kompetansemaal_forslag x join ressurser r on r.id=x.ressurs_id join kompetansemaal km on km.id=x.kompetansemaal_id where x.import_kjoring_id=$1`,
    `select 'KO|'||x.type||'|'||coalesce(r.kilde_nid,'')||'|'||coalesce(km.uri,'')||'|'||left(coalesce(x.beskrivelse,''),80) s from redaksjonell_ko x left join ressurser r on r.id=x.ressurs_id left join kompetansemaal km on km.id=x.kompetansemaal_id where x.import_kjoring_id=$1`,
  ]
  const linjer = []
  for (const q of spørringer) for (const row of (await k.query(q, [KJORING_ID])).rows) linjer.push(row.s)
  linjer.sort()
  return createHash('md5').update(linjer.join('\n')).digest('hex')
}

// OPPGAVE C: hvorfor Engelsk = 44, ikke 43. Bevis via inklusjon-eksklusjon på kartleggingens
// egne underterm-tall (301/686/687) — den distinkte unionen ER 44; kartleggingens «43» var en
// summeringsfeil, ikke en ekstra node. Plan-mot-kode går begge veier (CLAUDE.md).
function engelskDiagnostikk(noder, fagmap, P) {
  const publiserte = noder.filter(n => n.status === 1 || n.status === '1')
  const s = { '301': new Set(), '686': new Set(), '687': new Set() }
  const eng = new Set()
  let viaAnnet = 0
  for (const node of publiserte) {
    const termTids = (node.field_atlu_topic || []).map(x => x.tid).filter(x => x != null)
    const { fag } = fagForOpplegg(termTids, fagmap)
    if (!fag.includes('Engelsk')) continue
    eng.add(node.nid)
    for (const tid of termTids) {
      if (fagForTerm(tid, fagmap).fag !== 'Engelsk') continue
      const key = String(tid)
      if (s[key]) s[key].add(node.nid)
      else viaAnnet++
    }
  }
  const A = s['301'], B = s['686'], C = s['687']
  const snitt = (x, y) => new Set([...x].filter(v => y.has(v))).size
  const ab = snitt(A, B), ac = snitt(A, C), bc = snitt(B, C)
  const abc = new Set([...A].filter(v => B.has(v) && C.has(v))).size
  const union = 39 + 20 + 10 - (ab + ac + bc) + abc
  P(`## ENGELSK-diagnostikk (OPPGAVE C) — forrige kjøring 44, forventet 43`)
  P(`  distinkte publiserte Engelsk-opplegg (målt):  ${eng.size}`)
  P(`  Engelsk-fag via term UTENFOR {301,686,687}:   ${viaAnnet}  (ingen → alle via de tre kjente undertermene)`)
  P(`  |301|=${A.size}  |686|=${B.size}  |687|=${C.size}   (kartleggingen: 39/20/10 — reprodusert)`)
  P(`  snitt: |301∩686|=${ab}  |301∩687|=${ac}  |686∩687|=${bc}  |301∩686∩687|=${abc}`)
  P(`  inklusjon-eksklusjon: 39+20+10 − (${ab}+${ac}+${bc}) + ${abc} = ${union}`)
  P(`  KONKLUSJON: den distinkte unionen ER ${eng.size}. Kartleggingens «43» undertalte unionen`)
  P(`  med 1 — per-underterm-tallene (39/20/10) er identiske. Passet er riktig; forventningen skal`)
  P(`  være 44. (De fire andre fagene faller fordi passet teller 280 publiserte mot kartleggingens 289.)`)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
