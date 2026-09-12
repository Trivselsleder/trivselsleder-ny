#!/usr/bin/env node
// BEVIS for migrasjon 118 + RPC bekreft_kompetansemaal_forslag. Mot LOKAL Postgres 17
// (prod-tro klone av template trivsel_116_tmpl — bygget fra alle migrasjoner). Ingen prod,
// ingen øvingskopi. Kjøres slik:
//
//   node scripts/test-118-bekreft.mjs
//
// Lager en fersk test-DB fra templaten, anvender 118, og kjører scenariene (a)–(g) fra
// oppdraget. Hvert funksjonelt scenario seeder egne data i en transaksjon som RULLES TILBAKE,
// så basen er uendret mellom scenariene. (g) kjører en rollback-variant av selve fila mot en
// egen klone og beviser at basen er byte-identisk (funksjonslisten) etterpå.

import pg from 'pg'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROT = path.resolve(__dirname, '..')
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const HOST = process.env.PGHOST || 'localhost'
const USER = process.env.PGUSER || 'kjartaneide'
const TMPL = process.env.TMPL_DB || 'trivsel_116_tmpl'
const TESTDB = 'trivsel_118_test'
const RBDB = 'trivsel_118_rb'
const MIGR_STI = path.join(ROT, 'supabase/migrations/118_bekreft_kompetansemaal_forslag.sql')
const MIGR_112 = path.join(ROT, 'supabase/migrations/112_fase3_km_gjeldende_search_path.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`

// Fikserte test-IDer.
const ANSATT = '11111111-1111-1111-1111-111111111111'
const SKOLE  = '22222222-2222-2222-2222-222222222222'
const SUPER  = '33333333-3333-3333-3333-333333333333'
const R_ID   = 'aaaaaaaa-0000-0000-0000-000000000001'
const KO_ID  = 'bbbbbbbb-0000-0000-0000-000000000001'
const M_GJELD = 900001
const M_UTGATT = 900002

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

async function seedBase(c) {
  await c.query(`insert into auth.users (id, email) values ($1,'ansatt@test'),($2,'skole@test'),($3,'super@test')`, [ANSATT, SKOLE, SUPER])
  await c.query(`insert into profiles (id, rolle, aktiv) values ($1,'ansatt',true),($2,'skoleadmin',true),($3,'superadmin',true)`, [ANSATT, SKOLE, SUPER])
  await c.query(`insert into ressurser (id) values ($1)`, [R_ID])
  await c.query(`insert into kompetansemaal (id, kode, tekst, utgatt) overriding system value values ($1,'MAT-LK20','Gjeldende LK20-maal',false),($2,'MAT-LK06','Utgaatt LK06-maal',true)`, [M_GJELD, M_UTGATT])
}
async function seedForslagKo(c, { maal = M_GJELD, type = 'usikker_maalkobling', status = 'ny' } = {}) {
  await c.query(`insert into ressurs_kompetansemaal_forslag (ressurs_id, kompetansemaal_id, status) values ($1,$2,'ny')`, [R_ID, maal])
  await c.query(`insert into redaksjonell_ko (id, type, ressurs_id, kompetansemaal_id, status) values ($1,$2,$3,$4,$5)`, [KO_ID, type, R_ID, maal, status])
}
async function settKaller(c, uid) { await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]) }
async function kall(c, koId = KO_ID) { await c.query(`select public.bekreft_kompetansemaal_forslag($1)`, [koId]) }

// Admin: dropp + lag fersk DB fra template via psql (createdb krever egen tilkobling).
function adminSql(sql, db = 'postgres') {
  execFileSync('psql', ['-X', '-q', '-d', url(db), '-c', sql], { stdio: 'pipe' })
}
function lagFerskDb(navn) {
  adminSql(`drop database if exists ${navn}`)
  adminSql(`create database ${navn} template ${TMPL}`)
}

async function main() {
  P('# Bevis: migrasjon 118 + bekreft_kompetansemaal_forslag (lokal prod-tro klone)')
  P(`  template: ${TMPL}  ·  test-db: ${TESTDB}`)
  P('')

  // ── Anvend migrasjon 118 på fersk klone ────────────────────────────────────
  lagFerskDb(TESTDB)
  const migrTekst = readFileSync(MIGR_STI, 'utf8')
  const c = new Client({ connectionString: url(TESTDB) })
  await c.connect()
  // Prod-tro tilstand: den lokale templaten er bygget t.o.m. et punkt FØR 112, så trigger-
  // funksjonen fase3_km_gjeldende mangler search_path her (prod fikk den 10. sep). 118
  // forutsetter 112, så vi anvender 112 først — ellers feiler triggeren med 42P01.
  await c.query(readFileSync(MIGR_112, 'utf8'))
  P('## Migrasjon 112 anvendt (prod-tro: fester search_path på triggeren).')
  await c.query(migrTekst)   // hele fila (begin … commit) i ett kall
  P('## Migrasjon 118 anvendt uten feil (begin…commit).')

  // 118-etter: funksjonen finnes, secdef, search_path tom, execute-bildet.
  const etter = (await q(c, readFileSync(path.join(UT, '118-etter.sql'), 'utf8')))[0]
  const cfg = Array.isArray(etter?.config) ? etter.config.join(',') : String(etter?.config)
  krev('118-etter: funksjonen finnes', !!etter && etter.proname === 'bekreft_kompetansemaal_forslag')
  krev('118-etter: security definer', etter?.security_definer === true)
  krev('118-etter: search_path tom ("")', cfg.includes('search_path='), cfg)
  krev('118-etter: anon execute = false', etter?.anon_execute === false)
  krev('118-etter: authenticated execute = true', etter?.authenticated_execute === true)
  krev('118-etter: service_role execute = true', etter?.service_role_execute === true)
  // Ekstra: search_path faktisk TOM (ikke bare tilstede).
  krev('118-etter: search_path settet er tomt', cfg.includes('search_path=""') || cfg === 'search_path=', cfg)
  P('')

  // ── (a) ansatt bekrefter → kobling (menneske), forslag godkjent, kø lost ────
  P('## (a) ansatt bekrefter et gjeldende mål')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c); await settKaller(c, ANSATT)
  await kall(c)
  {
    const rk = (await q(c, `select satt_av, bekreftet_av, bekreftet_at from ressurs_kompetansemaal where ressurs_id=$1 and kompetansemaal_id=$2`, [R_ID, M_GJELD]))[0]
    krev('kobling finnes', !!rk)
    krev('menneske-merket (satt_av=menneske)', rk?.satt_av === 'menneske')
    krev('bekreftet_av = kaller, bekreftet_at satt', rk?.bekreftet_av === ANSATT && !!rk?.bekreftet_at)
    const f = (await q(c, `select status, behandlet_av, behandlet_at from ressurs_kompetansemaal_forslag where ressurs_id=$1 and kompetansemaal_id=$2`, [R_ID, M_GJELD]))[0]
    krev('forslag ryddet (status=godkjent, behandlet_av=kaller)', f?.status === 'godkjent' && f?.behandlet_av === ANSATT && !!f?.behandlet_at)
    const ko = (await q(c, `select status, lost_av, lost_at from redaksjonell_ko where id=$1`, [KO_ID]))[0]
    krev('kø-rad lukket (status=lost, lost_av=kaller, lost_at satt)', ko?.status === 'lost' && ko?.lost_av === ANSATT && !!ko?.lost_at)
  }
  await c.query('rollback')
  P('')

  // superadmin skal også slippe gjennom (kontroll av vakt-listen).
  P('## (a2) superadmin bekrefter også')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c); await settKaller(c, SUPER)
  await kall(c)
  krev('superadmin: kobling finnes', (await q(c, `select 1 from ressurs_kompetansemaal where ressurs_id=$1 and kompetansemaal_id=$2`, [R_ID, M_GJELD])).length === 1)
  await c.query('rollback')
  P('')

  // ── (b) skoleadmin → nektet, ingenting endret ──────────────────────────────
  P('## (b) skoleadmin (profiles.rolle) nektes')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c); await settKaller(c, SKOLE)
  {
    const m = await feilmelding(c, () => kall(c))
    krev('kall nektet med «Ingen tilgang»', !!m && /Ingen tilgang/.test(m), m || '(ingen feil!)')
    krev('ingen kobling opprettet', (await q(c, `select 1 from ressurs_kompetansemaal where ressurs_id=$1`, [R_ID])).length === 0)
    krev('kø-rad fortsatt ny', (await q(c, `select status from redaksjonell_ko where id=$1`, [KO_ID]))[0]?.status === 'ny')
  }
  await c.query('rollback')
  P('')

  // ── (c) anon → ingen execute ───────────────────────────────────────────────
  P('## (c) anon har ikke execute')
  krev('has_function_privilege(anon, execute) = false',
    (await q(c, `select has_function_privilege('anon', to_regprocedure('public.bekreft_kompetansemaal_forslag(uuid)'), 'execute') as x`))[0].x === false)
  {
    await c.query('begin'); await seedBase(c); await seedForslagKo(c)
    await c.query(`set local role anon`)
    const m = await feilmelding(c, () => kall(c))
    await c.query(`reset role`)
    krev('SET ROLE anon + kall → permission denied', !!m && /permission denied|ikke tilgang|tilgang/i.test(m), m || '(ingen feil!)')
    await c.query('rollback')
  }
  P('')

  // ── (d) feil type / status lost → forståelig feil, ingenting endret ─────────
  P('## (d) feil type og status lost')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c, { type: 'annet' }); await settKaller(c, ANSATT)
  {
    const m = await feilmelding(c, () => kall(c))
    krev('feil type → forståelig feil (nevner type)', !!m && /usikker_maalkobling/.test(m), m || '(ingen feil!)')
    krev('ingen kobling opprettet (feil type)', (await q(c, `select 1 from ressurs_kompetansemaal where ressurs_id=$1`, [R_ID])).length === 0)
  }
  await c.query('rollback')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c, { status: 'lost' }); await settKaller(c, ANSATT)
  {
    const m = await feilmelding(c, () => kall(c))
    krev('status lost → «allerede behandlet»', !!m && /allerede behandlet/.test(m), m || '(ingen feil!)')
    krev('ingen kobling opprettet (status lost)', (await q(c, `select 1 from ressurs_kompetansemaal where ressurs_id=$1`, [R_ID])).length === 0)
  }
  await c.query('rollback')
  P('')

  // ── (e) forslag mot utgått mål → triggeren stopper, ingenting endret ────────
  P('## (e) utgått mål stoppes av triggeren')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c, { maal: M_UTGATT }); await settKaller(c, ANSATT)
  {
    const m = await feilmelding(c, () => kall(c))
    krev('trigger stopper (nevner utgaatt/erstattet)', !!m && /utgaatt|utgått|erstattet/i.test(m), m || '(ingen feil!)')
    krev('ingen kobling opprettet (utgått)', (await q(c, `select 1 from ressurs_kompetansemaal where ressurs_id=$1 and kompetansemaal_id=$2`, [R_ID, M_UTGATT])).length === 0)
    krev('forslag fortsatt ny', (await q(c, `select status from ressurs_kompetansemaal_forslag where ressurs_id=$1 and kompetansemaal_id=$2`, [R_ID, M_UTGATT]))[0]?.status === 'ny')
    krev('kø-rad fortsatt ny', (await q(c, `select status from redaksjonell_ko where id=$1`, [KO_ID]))[0]?.status === 'ny')
  }
  await c.query('rollback')
  P('')

  // ── (f) andre kall på samme kø-rad → feil, ingen dublett ────────────────────
  P('## (f) idempotens — andre kall gir feil, ingen dublett')
  await c.query('begin'); await seedBase(c); await seedForslagKo(c); await settKaller(c, ANSATT)
  await kall(c)                                   // første: lykkes
  {
    const m = await feilmelding(c, () => kall(c))  // andre: skal feile
    krev('andre kall feiler («allerede behandlet»)', !!m && /allerede behandlet/.test(m), m || '(ingen feil!)')
    const n = (await q(c, `select count(*)::int as n from ressurs_kompetansemaal where ressurs_id=$1 and kompetansemaal_id=$2`, [R_ID, M_GJELD]))[0].n
    krev('nøyaktig én kobling (ingen dublett)', n === 1, `n=${n}`)
  }
  await c.query('rollback')
  P('')
  await c.end()

  // ── (g) rollback-variant av fila → identisk base ───────────────────────────
  P('## (g) rollback-variant → basen identisk')
  lagFerskDb(RBDB)
  const rb = new Client({ connectionString: url(RBDB) })
  await rb.connect()
  await rb.query(readFileSync(MIGR_112, 'utf8'))   // samme prod-tro utgangspunkt
  const FUNKSJONSLISTE = `select md5(coalesce(string_agg(p.proname||'('||pg_get_function_identity_arguments(p.oid)||')', ',' order by p.proname, p.oid),'')) as m
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'`
  const foer = (await q(rb, FUNKSJONSLISTE))[0].m
  const rollbackTekst = migrTekst.replace(/\bcommit;/, 'rollback;')
  krev('rollback-variant bytter ut commit', rollbackTekst.includes('rollback;') && !/\bcommit;/.test(rollbackTekst))
  await rb.query(rollbackTekst)
  const etterM = (await q(rb, FUNKSJONSLISTE))[0].m
  krev('funksjonslisten er byte-identisk før/etter (md5)', foer === etterM, `${foer.slice(0,8)} vs ${etterM.slice(0,8)}`)
  krev('funksjonen finnes IKKE etter rollback',
    (await q(rb, `select to_regprocedure('public.bekreft_kompetansemaal_forslag(uuid)') is null as x`))[0].x === true)
  await rb.end()
  P('')

  // Ryddig: la test-DB-ene ligge for inspeksjon, men dropp rollback-klonen.
  try { adminSql(`drop database if exists ${RBDB}`) } catch { /* ok */ }

  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL — se over.`)
  try { writeFileSync(`${UT}/RESULTAT-118-11sep.txt`, L.join('\n') + '\n'); P(`\nResultatfil: ${UT}/RESULTAT-118-11sep.txt`) } catch { /* ok */ }
  if (feil !== 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
