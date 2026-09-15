#!/usr/bin/env node
// BEVIS for migrasjon 128: TL-dans som ressurstype='tl_dans'.
// Lokal Postgres, fersk klon av trivsel_prodmal_118 + 119 + seed (tl-dans-samling + 16 leker). Ingen prod.
//   node scripts/test-128-tl-dans.mjs
// Fixtur ligner PROD: 16 leker med kilde_nid 1406–1420,9698 (som prod), en samling nokkel='tl-dans'.
// Beviser: sperrene utløser i flere retninger, og at de 16 forsvinner fra lekesøket etter endringen.
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const { Client } = pg
const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOST = process.env.PGHOST || 'localhost', USER = process.env.PGUSER || 'postgres'
const TMPL = process.env.TMPL_DB || 'trivsel_prodmal_118'
const M119 = path.join(ROT, 'supabase/migrations/119_samling_ressurs_plassering.sql')
const M128 = path.join(ROT, 'supabase/migrations/128_tl_dans_ressurstype.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
let ok = 0, feil = 0
const P = (s) => console.log(s)
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
async function q(c, sql, p) { return (await c.query(sql, p)).rows }
function adminSql(sql, db = 'postgres') { execFileSync('psql', ['-X', '-q', '-d', url(db), '-c', sql], { stdio: 'pipe' }) }
function lagFerskDb(navn) {
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`); adminSql(`create database ${navn} template ${TMPL}`)
}
const NIDS = [1406, 1407, 1408, 1409, 1410, 1411, 1412, 1413, 1414, 1415, 1416, 1417, 1418, 1419, 1420, 9698]

async function nyBase(navn, { antallLeker = 16, medSamling = true, med119 = true } = {}) {
  lagFerskDb(navn)
  const c = new Client({ connectionString: url(navn) }); await c.connect()
  if (med119) await c.query(readFileSync(M119, 'utf8'))
  if (medSamling) await c.query(`insert into samlinger(nokkel) values('tl-dans')`)
  for (const nid of NIDS.slice(0, antallLeker)) {
    const v = (await q(c, `insert into ressurser(ressurstype,status,kilde_nid) values('lek','publisert',$1) returning id`, [String(nid)]))[0].id
    await c.query(`insert into ressurs_innhold(ressurs_id,sprak,tittel) values($1,'nb',$2)`, [v, 'TL-dans ' + nid])
  }
  return c
}
async function kjor128Feil(c) {
  try { await c.query(readFileSync(M128, 'utf8')); return null }
  catch (e) { try { await c.query('rollback') } catch { /* noop */ } return e.message }
}

async function main() {
  P('# Bevis: migrasjon 128 (TL-dans som ressurstype)\n')

  // ---- HOVEDLØP: seed 16 leker, mål søk FØR, kjør 128, mål søk ETTER ----
  P('## De 16 forsvinner fra lekesøket')
  const DB = 'trivsel_128_test'
  const c = await nyBase(DB)
  const iSok = async () => (await q(c, `select count(*)::int n from sok_leker(p_limit:=1000) s join ressurser r on r.id=s.id where r.kilde_nid = any($1::text[])`, [NIDS.map(String)]))[0].n
  const forSok = await iSok()
  krev('FØR: de 16 dansene ligger i lekesøket', forSok === 16, `treff=${forSok}`)
  await c.query(readFileSync(M128, 'utf8')) // kjør hele migrasjonen
  P('  (128 kjørt)')
  const etterSok = await iSok()
  krev('ETTER: de 16 er BORTE fra lekesøket (tl_dans skjult)', etterSok === 0, `treff=${etterSok}`)
  const m = (await q(c, `select (select count(*)::int from ressurser where ressurstype='tl_dans') a, (select count(*)::int from dans_metadata) b, (select count(*)::int from samling_ressurs_plassering where samling_id=(select id from samlinger where nokkel='tl-dans')) k`))[0]
  krev('tall: 34 / 34 / 34', m.a === 34 && m.b === 34 && m.k === 34, JSON.stringify(m))
  krev('de 16 eksisterende beholdt kilde_nid + id (kun type endret)',
    (await q(c, `select count(*)::int n from ressurser where kilde_nid = any($1::text[]) and ressurstype='tl_dans'`, [NIDS.map(String)]))[0].n === 16)
  krev('sang/artist backfilt: dans 1 = «Break your heart»/«Taio Cruz», dans 16 = null',
    (await q(c, `select (select sang from dans_metadata dm join ressurser r on r.id=dm.ressurs_id where r.kilde_nid='1406') s1,
       (select count(*)::int from dans_metadata where sang is null) nullsang`))[0].s1 === 'Break your heart' &&
    (await q(c, `select count(*)::int n from dans_metadata where sang is null`))[0].n === 7, '7 danser (16-22) uten sang')
  krev('vanlige leker upåvirket i søket (>0 lek-treff står igjen)', (await q(c, `select count(*)::int n from sok_leker(p_limit:=1000)`))[0].n > 0)
  await c.end(); adminSql(`drop database if exists ${DB}`)

  // ---- SPERRER (fire retninger) ----
  P('\n## Sperrene utløser')
  // 1) mangler tl-dans-samling
  let s = await nyBase('trivsel_128_s1', { medSamling: false })
  let msg = await kjor128Feil(s)
  krev('sperre: ingen samling nokkel=tl-dans → STOPP', !!msg && /STOPP 128.*tl-dans/.test(msg), msg)
  await s.end(); adminSql(`drop database if exists trivsel_128_s1`)

  // 2) feil antall eksisterende (15 i stedet for 16)
  s = await nyBase('trivsel_128_s2', { antallLeker: 15 })
  msg = await kjor128Feil(s)
  krev('sperre: kun 15 eksisterende på kilde_nid → STOPP (forventet 16, fant 15)', !!msg && /STOPP 128.*fant 15/.test(msg), msg)
  await s.end(); adminSql(`drop database if exists trivsel_128_s2`)

  // 3) allerede kjørt (dans_metadata finnes)
  s = await nyBase('trivsel_128_s3')
  await s.query(readFileSync(M128, 'utf8')) // første kjøring lykkes
  msg = await kjor128Feil(s)
  krev('sperre: andre kjøring → STOPP (allerede kjørt)', !!msg && /STOPP 128 \(allerede kjørt\)/.test(msg), msg)
  await s.end(); adminSql(`drop database if exists trivsel_128_s3`)

  // 4) mangler samling_ressurs_plassering (119 ikke kjørt)
  s = await nyBase('trivsel_128_s4', { med119: false })
  msg = await kjor128Feil(s)
  krev('sperre: srp mangler (119 ikke kjørt) → STOPP', !!msg && /STOPP 128.*samling_ressurs_plassering/.test(msg), msg)
  await s.end(); adminSql(`drop database if exists trivsel_128_s4`)

  P('')
  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
