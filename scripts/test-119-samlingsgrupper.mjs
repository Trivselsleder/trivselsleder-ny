#!/usr/bin/env node
// BEVIS for migrasjon 119 (samling_ressurs_plassering — grupper i samlinger).
// Mot LOKAL Postgres 17, prod-tro klone av template trivsel_prodmal_118. Ingen prod,
// ingen øvingskopi (sperre: databasenavn må ikke inneholde «supabase» / prosjekt-ID).
//
//   node scripts/test-119-samlingsgrupper.mjs
//
// Lager en fersk test-DB fra templaten, anvender 119, og kjører:
//   struktur (tabell, sammensatt PK, FK-cascade-def, RLS på, 2 policyer, grants),
//   FK-cascade (slett samling_ressurs-rad → plasseringene forsvinner),
//   RLS (skolebruker leser synlig samling, ikke usynlig; kan ikke skrive; anon ingenting),
//   idempotens (ny kjøring stopper rent, ingenting committes),
//   rollback-variant (identisk base: tabellen finnes ikke etterpå).

import pg from 'pg'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROT = path.resolve(__dirname, '..')
const HOST = process.env.PGHOST || 'localhost'
const USER = process.env.PGUSER || 'postgres'
const TMPL = process.env.TMPL_DB || 'trivsel_prodmal_118'
const TESTDB = 'trivsel_119_test'
const RBDB = 'trivsel_119_rb'
const MIGR_STI = path.join(ROT, 'supabase/migrations/119_samling_ressurs_plassering.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`

// Sperre: aldri prod/øvingskopi.
for (const db of [TESTDB, RBDB, TMPL]) {
  if (/supabase|zpirjbrcbeubwpmtncxx/i.test(db)) { console.error('SPERRE: forbudt databasenavn', db); process.exit(1) }
}

const SKOLE = '22222222-2222-2222-2222-222222222222' // skoleansatt (ikke intern)
const ANSATT = '11111111-1111-1111-1111-111111111111' // ansatt (intern)

const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

async function q(c, sql, params) { return (await c.query(sql, params)).rows }
async function feilmelding(c, fn) {
  await c.query('savepoint s')
  try { await fn(); return null }
  catch (e) { await c.query('rollback to savepoint s'); return e.message }
}
async function settKaller(c, uid) { await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]) }

function adminSql(sql, db = 'postgres') { execFileSync('psql', ['-X', '-q', '-d', url(db), '-c', sql], { stdio: 'pipe' }) }
function lagFerskDb(navn) {
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`)
  adminSql(`create database ${navn} template ${TMPL}`)
}

// To synlige/usynlige samlinger + koblede leker + plasseringer. Kjøres som postgres
// (superuser omgår RLS), så vi kan seede fritt før vi bytter til authenticated for RLS-testen.
async function seed(c) {
  await c.query(`insert into auth.users (id, email) values ($1,'skole@test'),($2,'ansatt@test')`, [SKOLE, ANSATT])
  await c.query(`insert into profiles (id, rolle, aktiv) values ($1,'skoleansatt',true),($2,'ansatt',true)`, [SKOLE, ANSATT])
  // to eksisterende leker fra templaten
  const leker = await q(c, `select id from ressurser order by id limit 2`)
  const [L1, L2] = leker.map((r) => r.id)
  const SV = (await q(c, `insert into samlinger (synlig) values (true) returning id`))[0].id  // synlig
  const SI = (await q(c, `insert into samlinger (synlig) values (false) returning id`))[0].id // usynlig
  for (const s of [SV, SI]) {
    await c.query(`insert into samling_ressurs (samling_id, ressurs_id, rekkefolge) values ($1,$2,0),($1,$3,1)`, [s, L1, L2])
    // L1 i TO seksjoner (beviser sammensatt PK med seksjon), L2 i én
    await c.query(`insert into samling_ressurs_plassering (samling_id, ressurs_id, seksjon, seksjon_rekkefolge, rekkefolge)
                   values ($1,$2,'Ute',0,0),($1,$2,'Inne',1,0),($1,$3,'Ute',0,1)`, [s, L1, L2])
  }
  return { SV, SI, L1, L2 }
}

async function main() {
  P('# Bevis: migrasjon 119 (samling_ressurs_plassering) — lokal prod-tro klone')
  P(`  template: ${TMPL}  ·  test-db: ${TESTDB}`)
  P('')

  lagFerskDb(TESTDB)
  const migrTekst = readFileSync(MIGR_STI, 'utf8')
  const c = new Client({ connectionString: url(TESTDB) })
  await c.connect()
  await c.query(migrTekst) // hele fila (begin…commit) i ett kall
  P('## Migrasjon 119 anvendt uten feil (begin…commit).')
  P('')

  // ── Struktur ────────────────────────────────────────────────────────────────
  P('## Struktur')
  krev('tabellen finnes', (await q(c, `select to_regclass('public.samling_ressurs_plassering') is not null as x`))[0].x === true)
  {
    const pk = (await q(c, `select pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.samling_ressurs_plassering'::regclass and contype='p'`))[0]?.d || ''
    krev('sammensatt PK (samling_id, ressurs_id, seksjon)', /\(samling_id, ressurs_id, seksjon\)/.test(pk), pk)
    const fk = (await q(c, `select pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.samling_ressurs_plassering'::regclass and contype='f'`))[0]?.d || ''
    krev('FK → samling_ressurs med ON DELETE CASCADE', /REFERENCES samling_ressurs\(samling_id, ressurs_id\).*ON DELETE CASCADE/.test(fk), fk)
    const chk = (await q(c, `select pg_get_constraintdef(oid) d from pg_constraint where conrelid='public.samling_ressurs_plassering'::regclass and contype='c'`)).map((r) => r.d).join(' | ')
    krev('CHECK: seksjon ikke tom etter trim', /btrim\(seksjon\) <> ''::text|btrim\(seksjon\) <>/.test(chk), chk)
  }
  krev('RLS aktivert', (await q(c, `select relrowsecurity from pg_class where oid='public.samling_ressurs_plassering'::regclass`))[0].relrowsecurity === true)
  krev('to policyer (p_les, p_skriv)', (await q(c, `select count(*)::int n from pg_policies where schemaname='public' and tablename='samling_ressurs_plassering' and policyname in ('p_les','p_skriv')`))[0].n === 2)
  krev('indeks idx_srp_samling finnes', (await q(c, `select count(*)::int n from pg_indexes where schemaname='public' and indexname='idx_srp_samling'`))[0].n === 1)
  // Grants
  krev('anon har INGEN tabellrettighet (heller ikke truncate)',
    (await q(c, `select bool_or(has_table_privilege('anon','public.samling_ressurs_plassering',p)) x from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p`))[0].x === false)
  krev('authenticated har alle fire DML',
    (await q(c, `select bool_and(has_table_privilege('authenticated','public.samling_ressurs_plassering',p)) x from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p`))[0].x === true)
  krev('service_role har alle fire DML',
    (await q(c, `select bool_and(has_table_privilege('service_role','public.samling_ressurs_plassering',p)) x from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p`))[0].x === true)
  P('')

  // ── FK-cascade + sammensatt PK ────────────────────────────────────────────────
  P('## FK-cascade: slett samling_ressurs-rad → plasseringene forsvinner')
  await c.query('begin')
  const { SV, L1 } = await seed(c)
  krev('L1 har to plasseringer i synlig samling (to seksjoner)',
    (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1 and ressurs_id=$2`, [SV, L1]))[0].n === 2)
  krev('totalt 3 plasseringer i synlig samling', (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1`, [SV]))[0].n === 3)
  await c.query(`delete from samling_ressurs where samling_id=$1 and ressurs_id=$2`, [SV, L1])
  krev('L1s plasseringer borte etter cascade (0)', (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1 and ressurs_id=$2`, [SV, L1]))[0].n === 0)
  krev('L2s plassering står igjen (1)', (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1`, [SV]))[0].n === 1)
  await c.query('rollback')
  P('')

  // ── RLS ────────────────────────────────────────────────────────────────────
  P('## RLS: skolebruker leser synlig, ikke usynlig; kan ikke skrive; anon ingenting')
  await c.query('begin')
  const s2 = await seed(c)
  await settKaller(c, SKOLE)
  await c.query('set local role authenticated')
  krev('skolebruker leser plasseringer i SYNLIG samling (3)',
    (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1`, [s2.SV]))[0].n === 3)
  krev('skolebruker leser IKKE plasseringer i USYNLIG samling (0)',
    (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1`, [s2.SI]))[0].n === 0)
  {
    const m = await feilmelding(c, () => c.query(
      `insert into samling_ressurs_plassering (samling_id, ressurs_id, seksjon) values ($1,$2,'Ny')`, [s2.SV, s2.L1]))
    krev('skolebruker kan IKKE skrive (RLS with check)', !!m && /row-level security|policy/i.test(m), m || '(ingen feil!)')
  }
  await c.query('reset role')
  await c.query('rollback')

  // intern (ansatt) ser BEGGE og kan skrive
  await c.query('begin')
  const s3 = await seed(c)
  await settKaller(c, ANSATT)
  await c.query('set local role authenticated')
  krev('intern leser plasseringer i USYNLIG samling også (3)',
    (await q(c, `select count(*)::int n from samling_ressurs_plassering where samling_id=$1`, [s3.SI]))[0].n === 3)
  {
    const m = await feilmelding(c, () => c.query(
      `insert into samling_ressurs_plassering (samling_id, ressurs_id, seksjon) values ($1,$2,'Vinter')`, [s3.SV, s3.L2]))
    krev('intern KAN skrive', m === null, m || '')
  }
  await c.query('reset role')
  await c.query('rollback')

  // anon: SET ROLE anon → ingen tilgang
  await c.query('begin')
  const s4 = await seed(c)
  await c.query('set local role anon')
  {
    const m = await feilmelding(c, () => c.query(`select 1 from samling_ressurs_plassering where samling_id=$1`, [s4.SV]))
    krev('anon SELECT → permission denied', !!m && /permission denied|denied|tilgang/i.test(m), m || '(ingen feil — anon kunne lese!)')
  }
  await c.query('reset role')
  await c.query('rollback')
  P('')

  // ── Idempotens: ny kjøring stopper rent ──────────────────────────────────────
  P('## Idempotens: ny kjøring stopper rent (raise, ingenting committes)')
  {
    // Migrasjonen har egen begin/commit; raise ruller tilbake dens egen transaksjon.
    let m = null
    try { await c.query(migrTekst) } catch (e) { m = e.message; try { await c.query('rollback') } catch { /* ok */ } }
    krev('andre kjøring raiser «allerede kjørt»', !!m && /allerede kjørt/i.test(m), m || '(ingen feil!)')
    krev('tabellen finnes fortsatt (uendret)', (await q(c, `select to_regclass('public.samling_ressurs_plassering') is not null as x`))[0].x === true)
  }
  await c.end()
  P('')

  // ── Rollback-variant → identisk base ─────────────────────────────────────────
  P('## Rollback-variant → basen identisk (tabellen finnes ikke etterpå)')
  lagFerskDb(RBDB)
  const rb = new Client({ connectionString: url(RBDB) })
  await rb.connect()
  // Bytt kun det SISTE commit; (fila har «commit;» i tilbakerullings-kommentaren også).
  const rollbackTekst = migrTekst.replace(/commit;(\s*)$/, 'rollback;$1')
  krev('rollback-variant bytter ut siste commit', rollbackTekst.includes('rollback;') && !/commit;\s*$/.test(rollbackTekst))
  await rb.query(rollbackTekst)
  krev('tabellen finnes IKKE etter rollback',
    (await q(rb, `select to_regclass('public.samling_ressurs_plassering') is null as x`))[0].x === true)
  await rb.end()
  try { adminSql(`drop database if exists ${RBDB}`) } catch { /* ok */ }
  P('')

  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL — se over.`)
  if (feil !== 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
