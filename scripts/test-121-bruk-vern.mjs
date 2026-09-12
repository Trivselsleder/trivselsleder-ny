#!/usr/bin/env node
// BEVIS for migrasjon 121 (skole-vern på bruk_hendelse insert-policy p_ins). Mot LOKAL
// Postgres 17, prod-tro klone av template trivsel_prodmal_118 (som har migr 030-policyen).
// Ingen prod/øvingskopi.
//
//   node scripts/test-121-bruk-vern.mjs
//
// Beviser Fable C-2-fiksen: en skolebruker kan KUN skrive bruk_hendelse for en skole
// vedkommende er aktivt tilknyttet. Rader uten skole (interne/'sok') tillates fortsatt.
// «Nekten biter» bevises ved at NØYAKTIG samme cross-school-insert går gjennom UTEN 121.

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
const TESTDB = 'trivsel_121_test'
const RBDB = 'trivsel_121_rb'
const M121 = path.join(ROT, 'supabase/migrations/121_bruk_hendelse_skole_vern.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
for (const db of [TESTDB, RBDB, TMPL]) if (/supabase|zpirjbrcbeubwpmtncxx/i.test(db)) { console.error('SPERRE', db); process.exit(1) }

const MIN = '11111111-1111-1111-1111-111111111111'   // skolebruker med tilknytning til skole A
const INT = '22222222-2222-2222-2222-222222222222'   // «intern» bruker uten skoletilknytning

let ok = 0, feil = 0
const P = (s) => console.log(s)
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
async function q(c, sql, params) { return (await c.query(sql, params)).rows }
async function feilmelding(c, fn) { await c.query('savepoint s'); try { await fn(); return null } catch (e) { await c.query('rollback to savepoint s'); return e.message } }
function adminSql(sql, db = 'postgres') { execFileSync('psql', ['-X', '-q', '-d', url(db), '-c', sql], { stdio: 'pipe' }) }
function lagFerskDb(navn) {
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`); adminSql(`create database ${navn} template ${TMPL}`)
}

// Grunndata: to skoler (A = MIN sin, B = annen), to brukere, én lek, og MIN tilknyttet A (aktiv).
async function base(c) {
  const A = (await q(c, `insert into skoler(navn) values ('Skole A') returning id`))[0].id
  const B = (await q(c, `insert into skoler(navn) values ('Skole B') returning id`))[0].id
  await c.query(`insert into auth.users(id,email) values ($1,'min@test'),($2,'int@test')`, [MIN, INT])
  await c.query(`insert into profiles(id,rolle,aktiv) values ($1,'skoleansatt',true),($2,'ansatt',true)`, [MIN, INT])
  await c.query(`insert into bruker_skole(bruker_id,skole_id,rolle,aktiv) values ($1,$2,'skoleansatt',true)`, [MIN, A])
  const lek = (await q(c, `insert into ressurser(status,ressurstype) values ('publisert','lek') returning id`))[0].id
  return { A, B, lek }
}
// Insert som en gitt authenticated-bruker. Returnerer feilmelding (string) eller null ved OK.
async function insertSom(c, uid, { skole_id, bruker_id, lek }) {
  await c.query(`select set_config('request.jwt.claim.sub',$1,true)`, [uid])
  await c.query('set local role authenticated')
  const m = await feilmelding(c, () =>
    c.query(`insert into public.bruk_hendelse(bruker_id,skole_id,ressurs_id,hendelse) values ($1,$2,$3,'visning')`,
      [bruker_id, skole_id, lek]))
  await c.query('reset role')
  return m
}
async function insertAnon(c, { skole_id, bruker_id, lek }) {
  await c.query('set local role anon')
  const m = await feilmelding(c, () =>
    c.query(`insert into public.bruk_hendelse(bruker_id,skole_id,ressurs_id,hendelse) values ($1,$2,$3,'visning')`,
      [bruker_id, skole_id, lek]))
  await c.query('reset role')
  return m
}
const nektet = (m) => !!m && /row-level security|violates|policy|permission denied|denied|tilgang/i.test(m)

async function main() {
  P('# Bevis: migrasjon 121 (skole-vern på bruk_hendelse.p_ins) — lokal prod-tro klone')
  P(`  template: ${TMPL} (030-policy)  ·  test-db: ${TESTDB}\n`)
  lagFerskDb(TESTDB)
  const c = new Client({ connectionString: url(TESTDB) })
  await c.connect()

  // ── Utgangspunkt: policyen finnes (fra 030) og har ENNÅ ikke skole-vern ──────
  krev('p_ins finnes før 121 (fra migr 030)',
    (await q(c, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins'`))[0].n === 1)
  krev('p_ins har IKKE skole-vern før 121',
    (await q(c, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and with_check like '%bruker_skole%'`))[0].n === 0)
  P('')

  // ── (0) NEKTEN BITER: samme cross-school-insert går gjennom UTEN 121 ─────────
  P('## (0) uten 121: cross-school-insert (annen skoles id) GODTAS — bevis at nekten senere biter')
  await c.query('begin')
  {
    const { B, lek } = await base(c)
    const m = await insertSom(c, MIN, { skole_id: B, bruker_id: MIN, lek })
    krev('uten 121: insert for ANNEN skole godtas', m === null, m || '(godtatt)')
  }
  await c.query('rollback'); P('')

  // ── Kjør 121 ─────────────────────────────────────────────────────────────────
  // Multi-statement via simple query protocol → node-pg returnerer et array av resultater.
  const res121 = await c.query(readFileSync(M121, 'utf8'))
  const arr121 = Array.isArray(res121) ? res121 : [res121]
  const kvittRad = [...arr121].reverse().map(r => r.rows && r.rows[0]).find(r => r && 'kvittering' in r)
  const kvittering = kvittRad ? kvittRad.kvittering : null
  P('## Migrasjon 121 anvendt uten feil. Kvittering:')
  P(`   ${kvittering || '(ingen kvitteringsrad fanget)'}`)
  krev('kvittering: skole-vern aktivt', !!kvittering && /skole-vern aktivt: true/.test(kvittering))
  krev('p_ins har skole-vern etter 121',
    (await q(c, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and with_check like '%bruker_skole%'`))[0].n === 1)
  krev('p_ins er fortsatt INSERT-policy til authenticated',
    (await q(c, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and cmd='INSERT' and 'authenticated' = any(roles)`))[0].n === 1)
  P('')

  // ── Med 121 i kraft: allow/deny-matrise ─────────────────────────────────────
  P('## Med 121: skole-vernet slår inn')
  await c.query('begin')
  {
    const { A, B, lek } = await base(c)
    const mA = await insertSom(c, MIN, { skole_id: A, bruker_id: MIN, lek })
    krev('(1) EGEN skole (A) → OK', mA === null, mA || '(OK)')
    const mB = await insertSom(c, MIN, { skole_id: B, bruker_id: MIN, lek })
    krev('(2) ANNEN skole (B) → nektet', nektet(mB), mB || '(ingen feil!)')
    const mNull = await insertSom(c, MIN, { skole_id: null, bruker_id: MIN, lek })
    krev('(3) skole_id null → OK', mNull === null, mNull || '(OK)')
    const mInt = await insertSom(c, INT, { skole_id: null, bruker_id: INT, lek })
    krev('(4) intern uten tilknytning, skole_id null → OK', mInt === null, mInt || '(OK)')
    const mAnon = await insertAnon(c, { skole_id: null, bruker_id: null, lek })
    krev('(5) anon → nektet', nektet(mAnon), mAnon || '(ingen feil!)')
    // Ekstra: intern kan IKKE plutselig skrive for en skole uten tilknytning.
    const mIntSkole = await insertSom(c, INT, { skole_id: A, bruker_id: INT, lek })
    krev('(6) intern med skole uten tilknytning → nektet', nektet(mIntSkole), mIntSkole || '(ingen feil!)')
    // bruker_id = null-varianten (Fable pkt 5): «or bruker_id is null»-grenen skal fortsatt
    // være underlagt skole-vernet — anonym skrivende bruker kan bare skrive for egen skole.
    const mNullBrukerEgen = await insertSom(c, MIN, { skole_id: A, bruker_id: null, lek })
    krev('(7) bruker_id null + EGEN skole (A) → OK', mNullBrukerEgen === null, mNullBrukerEgen || '(OK)')
    const mNullBrukerAnnen = await insertSom(c, MIN, { skole_id: B, bruker_id: null, lek })
    krev('(8) bruker_id null + ANNEN skole (B) → nektet', nektet(mNullBrukerAnnen), mNullBrukerAnnen || '(ingen feil!)')
    const mNullBrukerNullSkole = await insertSom(c, MIN, { skole_id: null, bruker_id: null, lek })
    krev('(9) bruker_id null + skole_id null → OK', mNullBrukerNullSkole === null, mNullBrukerNullSkole || '(OK)')
  }
  await c.query('rollback'); P('')

  // ── Re-kjøring stopper rent ──────────────────────────────────────────────────
  P('## (g1) ny kjøring av 121 stopper rent')
  {
    let m = null
    try { await c.query(readFileSync(M121, 'utf8')) } catch (e) { m = e.message; try { await c.query('rollback') } catch {} }
    krev('andre kjøring raiser «allerede kjørt»', !!m && /allerede kjørt/i.test(m), m || '(ingen feil!)')
    krev('policy uendret etter avvist re-kjøring',
      (await q(c, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and with_check like '%bruker_skole%'`))[0].n === 1)
  }
  await c.end(); P('')

  // ── Rollback-variant → policyen tilbake til 030-formen ──────────────────────
  P('## (g2) rollback-variant → p_ins uendret (uten skole-vern)')
  lagFerskDb(RBDB)
  const rb = new Client({ connectionString: url(RBDB) })
  await rb.connect()
  const migr121 = readFileSync(M121, 'utf8')
  const rbTekst = migr121.replace(/commit;(\s*)$/, 'rollback;$1')
  krev('rollback-variant bytter ut siste commit', rbTekst.includes('rollback;') && !/commit;\s*$/.test(rbTekst))
  await rb.query(rbTekst)
  krev('p_ins finnes fortsatt (fra 030)',
    (await q(rb, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins'`))[0].n === 1)
  krev('p_ins har IKKE skole-vern etter rollback',
    (await q(rb, `select count(*)::int n from pg_policies where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and with_check like '%bruker_skole%'`))[0].n === 0)
  await rb.end()
  try { adminSql(`drop database if exists ${RBDB}`) } catch {}
  try { adminSql(`drop database if exists ${TESTDB}`) } catch {}
  P('')

  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL — se over.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
