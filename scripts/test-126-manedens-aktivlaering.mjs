#!/usr/bin/env node
// BEVIS for migrasjon 126: «Månedens aktiv læring» + fjernet reserve fra «Månedens lek».
// Lokal Postgres, fersk klon av trivsel_prodmal_118 + migr 120 + 121 + 125 + 126. Ingen prod.
//   node scripts/test-126-manedens-aktivlaering.mjs
// Fixtur ligner PROD: ekte skoler, ekte ressurser (lek vs aktiv_laering), alle TRE signalene
// (periodeplan, tl_hjul, bruk_hendelse) stemplet i FORRIGE kalendermåned med ekte skole_id.
// Beviser: de to funksjonene skiller lek fra aktiv læring, terskel 5 utløser begge veier,
// testskoler ekskluderes, periodeplan+tl_hjul teller for aktiv læring, og 'ingen' fryses ALDRI.
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROT = path.resolve(__dirname, '..')
const HOST = process.env.PGHOST || 'localhost', USER = process.env.PGUSER || 'postgres'
const TMPL = process.env.TMPL_DB || 'trivsel_prodmal_118'
const M = (n, f) => path.join(ROT, 'supabase/migrations', f)
const M120 = M(120, '120_manedens_lek.sql')
const M121 = M(121, '121_bruk_hendelse_skole_vern.sql')
const M125 = M(125, '125_bruk_hendelse_dokument_aktivlaering.sql')
const M126 = M(126, '126_manedens_aktivlaering.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
// Timestamp midt i FORRIGE kalendermåned (Oslo-veggklokke → timestamptz), så alle tre signalene
// treffer funksjonens vindu [forrige_start, denne_start).
const FORRIGE = `((date_trunc('month', now() at time zone 'Europe/Oslo')::date - interval '1 month' + interval '10 days') at time zone 'Europe/Oslo')`

let ok = 0, feil = 0
const P = (s) => console.log(s)
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
async function q(c, sql, p) { return (await c.query(sql, p)).rows }
function adminSql(sql, db = 'postgres') { execFileSync('psql', ['-X', '-q', '-d', url(db), '-c', sql], { stdio: 'pipe' }) }
function lagFerskDb(navn) {
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`); adminSql(`create database ${navn} template ${TMPL}`)
}

async function main() {
  const DB = 'trivsel_126_test'
  P('# Bevis: migrasjon 126 (Månedens aktiv læring + reserve fjernet)\n')
  lagFerskDb(DB)
  const c = new Client({ connectionString: url(DB) }); await c.connect()

  // 120 krever eksklusjonsskolene i skoler-tabellen (B-1-sperra).
  await c.query(`insert into skoler(navn) values ('Demoskolen'),('Bjørnehaugen skole')`)
  await c.query(readFileSync(M120, 'utf8'))
  await c.query(readFileSync(M121, 'utf8'))
  await c.query(readFileSync(M125, 'utf8'))
  await c.query(readFileSync(M126, 'utf8'))
  P('Migrasjoner 120+121+125+126 kjørt på klonen.\n')

  // Bruker for periodeplan/tl_hjul (bruker_id er NOT NULL + FK). Funksjonen leser den ikke —
  // den trenger bare å eksistere. Samme id i auth.users + profiles dekker FK uansett mål.
  const BRUKER = '33333333-3333-3333-3333-333333333333'
  await c.query(`insert into auth.users(id, email) values($1,'plan@test')`, [BRUKER])
  await c.query(`insert into profiles(id, rolle, aktiv) values($1,'skoleansatt',true)`, [BRUKER])

  // ---- fixtur-hjelpere ----
  const skoleId = {}
  async function mkSkole(navn) {
    const id = (await q(c, `insert into skoler(navn) values($1) returning id`, [navn]))[0].id
    skoleId[navn] = id; return id
  }
  let nid = 1000
  async function mkRessurs(type, tittel) {
    const id = (await q(c, `insert into ressurser(status, ressurstype, kilde_nid) values('publisert',$1,$2) returning id`, [type, nid++]))[0].id
    await c.query(`insert into ressurs_innhold(ressurs_id, sprak, tittel) values($1,'nb',$2)`, [id, tittel])
    return id
  }
  async function bruk(skole, ressurs, hendelse) {
    await c.query(`insert into bruk_hendelse(skole_id, ressurs_id, hendelse, tidspunkt) values($1,$2,$3,${FORRIGE})`, [skole, ressurs, hendelse])
  }
  async function iPeriodeplan(skole, ressurs) {
    const pid = (await q(c, `insert into periodeplan(navn, skole_id, bruker_id, opprettet_at) values('plan', $1, $2, ${FORRIGE}) returning id`, [skole, BRUKER]))[0].id
    await c.query(`insert into periodeplan_rad(plan_id, ressurs_id) values($1,$2)`, [pid, ressurs])
  }
  async function iTlHjul(skole, ressurs) {
    const hid = (await q(c, `insert into tl_hjul(navn, skole_id, bruker_id, opprettet_at) values('hjul', $1, $2, ${FORRIGE}) returning id`, [skole, BRUKER]))[0].id
    await c.query(`insert into tl_hjul_lek(hjul_id, ressurs_id) values($1,$2)`, [hid, ressurs])
  }
  async function resetSignaler() {
    await c.query(`truncate public.bruk_hendelse, public.periodeplan_rad, public.periodeplan, public.tl_hjul_lek, public.tl_hjul, public.manedens_lek, public.manedens_aktivlaering restart identity cascade`)
  }
  const resetFrys = () => c.query(`truncate public.manedens_lek, public.manedens_aktivlaering`)
  const hentLek = async () => (await q(c, `select * from public.hent_manedens_lek()`))[0]
  const hentAL = async () => (await q(c, `select * from public.hent_manedens_aktivlaering()`))[0]
  const frysLek = async () => (await q(c, `select ressurs_id, kilde, antall_skoler from public.manedens_lek`))
  const frysAL = async () => (await q(c, `select ressurs_id, kilde, antall_skoler from public.manedens_aktivlaering`))

  // Skoler: 12 ekte + de to test-/demoskolene (allerede opprettet av 120-seed).
  for (let i = 1; i <= 12; i++) await mkSkole(`Ekte skole ${i}`)
  const DEMO = (await q(c, `select id from skoler where navn='Demoskolen'`))[0].id
  const BJORN = (await q(c, `select id from skoler where navn='Bjørnehaugen skole'`))[0].id
  const S = (i) => skoleId[`Ekte skole ${i}`]

  // ============================================================================
  P('## Scenario 1 — funksjonene SKILLER lek fra aktiv læring')
  await resetSignaler()
  const LEK_A = await mkRessurs('lek', 'Lek A')            // brukt av 10 skoler
  const AL_X  = await mkRessurs('aktiv_laering', 'Aktiv X') // brukt av 5 skoler
  for (let i = 1; i <= 10; i++) await bruk(S(i), LEK_A, 'visning')
  for (let i = 1; i <= 5;  i++) await bruk(S(i), AL_X, 'aktiv_laering_apnet')

  const r1lek = await hentLek()
  krev('hent_manedens_lek → LEK A (10 skoler), automatisk, antall=10',
    r1lek.ressurs_id === LEK_A && r1lek.kilde === 'automatisk' && (await frysLek())[0]?.antall_skoler === 10,
    JSON.stringify(r1lek))
  krev('hent_manedens_lek valgte IKKE aktiv læring-opplegget AL X', r1lek.ressurs_id !== AL_X)

  await resetFrys() // regn aktiv læring på nytt (samme signaler)
  const r1al = await hentAL()
  krev('hent_manedens_aktivlaering → AL X (5 skoler), automatisk, antall=5',
    r1al.ressurs_id === AL_X && r1al.kilde === 'automatisk' && (await frysAL())[0]?.antall_skoler === 5,
    JSON.stringify(r1al))
  krev('hent_manedens_aktivlaering valgte IKKE LEK A (10 skoler) selv om 10 > 5 — ressurstype-filteret skiller',
    r1al.ressurs_id !== LEK_A && r1al.ressurs_id === AL_X)

  // Frys-bevis: LEK A er nå frosset. Endre signaler → funksjonen returnerer fortsatt frosset valg.
  await resetFrys(); await hentLek() // fryser LEK A på nytt
  const LEK_D = await mkRessurs('lek', 'Lek D'); for (let i = 1; i <= 12; i++) await bruk(S(i), LEK_D, 'visning')
  const r1frys = await hentLek()
  krev('frysing: nytt kall returnerer FROSSET LEK A, ikke nykommer LEK D (12 skoler)', r1frys.ressurs_id === LEK_A)

  // ============================================================================
  P('\n## Scenario 2 — terskel 5 utløser i BEGGE retninger; «ingen» fryses ALDRI')
  await resetSignaler()
  const LEK_B = await mkRessurs('lek', 'Lek B')
  const AL_Y  = await mkRessurs('aktiv_laering', 'Aktiv Y')
  for (let i = 1; i <= 4; i++) { await bruk(S(i), LEK_B, 'visning'); await bruk(S(i), AL_Y, 'aktiv_laering_apnet') }

  const r2lek = await hentLek(), r2al = await hentAL()
  krev('4 skoler < terskel: hent_manedens_lek → ingen (ressurs_id null)', r2lek.kilde === 'ingen' && r2lek.ressurs_id === null, JSON.stringify(r2lek))
  krev('4 skoler < terskel: hent_manedens_aktivlaering → ingen', r2al.kilde === 'ingen' && r2al.ressurs_id === null, JSON.stringify(r2al))
  krev('«ingen» FRYSES IKKE: 0 rader i manedens_lek OG manedens_aktivlaering',
    (await frysLek()).length === 0 && (await frysAL()).length === 0)

  // Løft til nøyaktig 5 → begge skal utløse.
  await bruk(S(5), LEK_B, 'visning'); await bruk(S(5), AL_Y, 'aktiv_laering_apnet')
  await resetFrys()
  const r2lek5 = await hentLek(), r2al5 = await hentAL()
  krev('5 skoler = terskel: hent_manedens_lek → LEK B automatisk, antall=5',
    r2lek5.ressurs_id === LEK_B && r2lek5.kilde === 'automatisk' && (await frysLek())[0]?.antall_skoler === 5, JSON.stringify(r2lek5))
  krev('5 skoler = terskel: hent_manedens_aktivlaering → AL Y automatisk, antall=5',
    r2al5.ressurs_id === AL_Y && r2al5.kilde === 'automatisk' && (await frysAL())[0]?.antall_skoler === 5, JSON.stringify(r2al5))

  // ============================================================================
  P('\n## Scenario 3 — testskoler ekskluderes (4 ekte + 2 test ≠ 6)')
  await resetSignaler()
  const AL_Z  = await mkRessurs('aktiv_laering', 'Aktiv Z')
  const LEK_C = await mkRessurs('lek', 'Lek C')
  for (let i = 1; i <= 4; i++) { await bruk(S(i), AL_Z, 'aktiv_laering_apnet'); await bruk(S(i), LEK_C, 'visning') }
  await bruk(DEMO, AL_Z, 'aktiv_laering_apnet'); await bruk(BJORN, AL_Z, 'aktiv_laering_apnet')
  await bruk(DEMO, LEK_C, 'visning');            await bruk(BJORN, LEK_C, 'visning')
  const r3al = await hentAL(), r3lek = await hentLek()
  krev('AL Z: 4 ekte + Demo + Bjørnehaugen → ingen (testskoler teller ikke → 4 < 5)', r3al.kilde === 'ingen', JSON.stringify(r3al))
  krev('LEK C: 4 ekte + Demo + Bjørnehaugen → ingen (samme eksklusjon)', r3lek.kilde === 'ingen', JSON.stringify(r3lek))

  // ============================================================================
  P('\n## Scenario 4 — periodeplan + tl_hjul teller for aktiv læring (uten bruk_hendelse)')
  await resetSignaler()
  const AL_P = await mkRessurs('aktiv_laering', 'Aktiv P')
  await iPeriodeplan(S(1), AL_P); await iPeriodeplan(S(2), AL_P); await iPeriodeplan(S(3), AL_P) // 3 skoler via plan
  await iTlHjul(S(4), AL_P); await iTlHjul(S(5), AL_P)                                            // 2 skoler via hjul
  const r4al = await hentAL()
  krev('aktiv læring via periodeplan(3) + tl_hjul(2) = 5 distinkte skoler → AL P automatisk, antall=5',
    r4al.ressurs_id === AL_P && r4al.kilde === 'automatisk' && (await frysAL())[0]?.antall_skoler === 5, JSON.stringify(r4al))

  await c.end()
  adminSql(`drop database if exists ${DB}`)
  P('')
  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
