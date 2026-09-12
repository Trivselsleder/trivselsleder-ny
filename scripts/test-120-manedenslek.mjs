#!/usr/bin/env node
// BEVIS for migrasjon 120 (manedens_lek + hent_manedens_lek()). Mot LOKAL Postgres 17,
// prod-tro klone av template trivsel_prodmal_118 + migr 119 + 120. Ingen prod/øvingskopi.
//
//   node scripts/test-120-manedenslek.mjs
//
// Scenariene (a)–(g) fra oppdraget. Hvert funksjonelt scenario seeder egne data i en
// transaksjon som RULLES TILBAKE (basen uendret mellom scenariene). Tidsstempler legges
// midt i FORRIGE kalendermåned (Europe/Oslo) — samme tz-logikk som funksjonen.

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
const TESTDB = 'trivsel_120_test'
const RBDB = 'trivsel_120_rb'
const SPERREDB = 'trivsel_120_sperre'
// B-1: test-/demoskolenavn som MÅ finnes i skoler før 120 kjøres (eksklusjons-sperren).
const EKSKL = ['Demoskolen', 'Bjørnehaugen skole']
const M119 = path.join(ROT, 'supabase/migrations/119_samling_ressurs_plassering.sql')
const M120 = path.join(ROT, 'supabase/migrations/120_manedens_lek.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
for (const db of [TESTDB, RBDB, TMPL]) if (/supabase|zpirjbrcbeubwpmtncxx/i.test(db)) { console.error('SPERRE', db); process.exit(1) }

// Midt i forrige kalendermåned, som timestamptz i Europe/Oslo (samme tz som funksjonen bruker).
const FORRIGE = `((date_trunc('month',(now() at time zone 'Europe/Oslo')) - interval '15 days') at time zone 'Europe/Oslo')`
const MND_NAVN = `(array['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'])[extract(month from (now() at time zone 'Europe/Oslo'))::int]`

const BRUKER = '11111111-1111-1111-1111-111111111111' // eier av planer/hjul (profiles)
const SKOLEBRUKER = '22222222-2222-2222-2222-222222222222' // authenticated-kall (RLS/execute)

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

// Grunndata (bruker + skolebruker). Kjøres i hver scenario-transaksjon.
async function base(c) {
  await c.query(`insert into auth.users(id,email) values ($1,'b@test'),($2,'s@test')`, [BRUKER, SKOLEBRUKER])
  await c.query(`insert into profiles(id,rolle,aktiv) values ($1,'skoleansatt',true),($2,'skoleansatt',true)`, [BRUKER, SKOLEBRUKER])
}
// En lek (kontrollerte felt).
async function lagLek(c, { status = 'publisert', type = 'lek', kilde_nid = null, tittel = null } = {}) {
  const id = (await q(c, `insert into ressurser(status,ressurstype,kilde_nid) values ($1,$2,$3) returning id`, [status, type, kilde_nid]))[0].id
  if (tittel) await c.query(`insert into ressurs_innhold(ressurs_id,sprak,tittel) values ($1,'nb',$2)`, [id, tittel])
  return id
}
// Skole som la `lekId` i en periodeplan opprettet forrige måned. `navn` styrer skolenavnet
// (brukes til Demoskolen-eksklusjonstesten).
async function skolePlan(c, lekId, navn = 'S') {
  const skole = (await q(c, `insert into skoler(navn) values ($1) returning id`, [navn]))[0].id
  const plan = (await q(c, `insert into periodeplan(navn,bruker_id,skole_id,opprettet_at) values ('P',$1,$2,${FORRIGE}) returning id`, [BRUKER, skole]))[0].id
  await c.query(`insert into periodeplan_rad(plan_id,ressurs_id) values ($1,$2)`, [plan, lekId])
  return skole
}
// Skole som la `lekId` i et TL-hjul opprettet forrige måned.
async function skoleHjul(c, lekId, navn = 'S') {
  const skole = (await q(c, `insert into skoler(navn) values ($1) returning id`, [navn]))[0].id
  const hjul = (await q(c, `insert into tl_hjul(navn,bruker_id,skole_id,opprettet_at) values ('H',$1,$2,${FORRIGE}) returning id`, [BRUKER, skole]))[0].id
  await c.query(`insert into tl_hjul_lek(hjul_id,ressurs_id) values ($1,$2)`, [hjul, lekId])
  return skole
}
// bruk_hendelse med ekte skole_id (nå fylles denne fra frontend, migr 120-kommentar).
async function skoleBruk(c, lekId, hendelse = 'visning', navn = 'S') {
  const skole = (await q(c, `insert into skoler(navn) values ($1) returning id`, [navn]))[0].id
  await c.query(`insert into bruk_hendelse(skole_id,ressurs_id,hendelse,tidspunkt) values ($1,$2,$3,${FORRIGE})`, [skole, lekId, hendelse])
  return skole
}
// Reserve-samling: nokkel='manedens-lek', synlig, med lek R i seksjon = inneværende månedsnavn.
async function reserveSamling(c, lekR) {
  const s = (await q(c, `insert into samlinger(synlig,nokkel) values (true,'manedens-lek') returning id`))[0].id
  await c.query(`insert into samling_ressurs(samling_id,ressurs_id,rekkefolge) values ($1,$2,0)`, [s, lekR])
  await c.query(`insert into samling_ressurs_plassering(samling_id,ressurs_id,seksjon,rekkefolge) values ($1,$2,${MND_NAVN},0)`, [s, lekR])
  return s
}
async function kall(c) { return (await q(c, `select ressurs_id, kilde from public.hent_manedens_lek()`))[0] }
// B-1: seed begge eksklusjonsskolene (committet, utenfor scenario-transaksjonene) slik at
// 120s eksklusjons-sperre passerer. Uten usage-data påvirker de ingen tellinger.
async function seedEksklusjon(client) { for (const n of EKSKL) await client.query(`insert into skoler(navn) values ($1)`, [n]) }

async function main() {
  P('# Bevis: migrasjon 120 (manedens_lek + hent_manedens_lek) — lokal prod-tro klone')
  P(`  template: ${TMPL} (+119 +120)  ·  test-db: ${TESTDB}\n`)
  // ── (B-1) EKSKLUSJONS-SPERRE: 120 stopper hardt hvis et test-/demoskolenavn mangler ──
  // Tredje gang på to dager samme feilklasse (nulltreff som ser ut som suksess) — vernet er
  // flyttet INN i migrasjonen, så vi beviser at det faktisk utløser, i begge retninger.
  P('## (B-1) eksklusjons-sperre utløser ved manglende skolenavn')
  lagFerskDb(SPERREDB)
  const sp = new Client({ connectionString: url(SPERREDB) })
  await sp.connect()
  await sp.query(readFileSync(M119, 'utf8'))
  {
    // (i) tom base (ingen eksklusjonsskoler) → raise som navngir BEGGE
    let m = null
    try { await sp.query(readFileSync(M120, 'utf8')) } catch (e) { m = e.message; try { await sp.query('rollback') } catch {} }
    krev('tom base → STOPP 120 (B-1) og navngir begge navnene',
      !!m && /STOPP 120 \(B-1\)/.test(m) && /Demoskolen/.test(m) && /Bjørnehaugen skole/.test(m), m || '(ingen feil!)')
    krev('tabellen ble IKKE opprettet ved stopp',
      (await q(sp, `select to_regclass('public.manedens_lek') is null x`))[0].x === true)
    // (ii) kun Demoskolen finnes → raise som navngir KUN Bjørnehaugen skole
    await sp.query(`insert into skoler(navn) values ('Demoskolen')`)
    m = null
    try { await sp.query(readFileSync(M120, 'utf8')) } catch (e) { m = e.message; try { await sp.query('rollback') } catch {} }
    krev('kun Demoskolen finnes → stopper og navngir Bjørnehaugen skole (ikke Demoskolen)',
      !!m && /STOPP 120 \(B-1\)/.test(m) && /Bjørnehaugen skole/.test(m) && !/Demoskolen/.test(m), m || '(ingen feil!)')
    // (iii) begge finnes → 120 går gjennom
    await sp.query(`insert into skoler(navn) values ('Bjørnehaugen skole')`)
    await sp.query(readFileSync(M120, 'utf8'))
    krev('begge navn finnes → 120 fullfører, tabellen finnes',
      (await q(sp, `select to_regclass('public.manedens_lek') is not null x`))[0].x === true)
  }
  await sp.end()
  try { adminSql(`drop database if exists ${SPERREDB}`) } catch {}
  P('')

  lagFerskDb(TESTDB)
  const c = new Client({ connectionString: url(TESTDB) })
  await c.connect()
  await c.query(readFileSync(M119, 'utf8'))
  await seedEksklusjon(c)   // B-1: begge eksklusjonsskolene må finnes før 120 kjøres
  await c.query(readFileSync(M120, 'utf8'))
  P('## Migrasjon 119 + 120 anvendt uten feil (begin…commit).\n')

  // struktur: ingen skole-ID-kolonne og ingen FK til skoler på manedens_lek (personvern
  // strukturelt — kun antall_skoler er lov, og bare for automatisk).
  krev('manedens_lek har INGEN skole_id-kolonne',
    (await q(c, `select count(*)::int n from information_schema.columns where table_name='manedens_lek' and column_name = 'skole_id'`))[0].n === 0)
  krev('manedens_lek har INGEN FK til skoler',
    (await q(c, `select count(*)::int n from pg_constraint co join pg_class f on f.oid=co.confrelid where co.conrelid='public.manedens_lek'::regclass and co.contype='f' and f.relname='skoler'`))[0].n === 0)
  krev('kolonnene er nøyaktig maaned, ressurs_id, kilde, antall_skoler, laget_at',
    (await q(c, `select string_agg(column_name,',' order by ordinal_position) c from information_schema.columns where table_name='manedens_lek'`))[0].c === 'maaned,ressurs_id,kilde,antall_skoler,laget_at')
  P('')

  // ── (a) ≥5 skoler → automatisk, riktig lek + antall (union av signaler) ──────
  P('## (a) ≥5 skoler → automatisk (union periodeplan + tl-hjul + bruk_hendelse)')
  await c.query('begin'); await base(c)
  {
    const T = await lagLek(c, { kilde_nid: 'nid_100', tittel: 'Målleken' })
    const D = await lagLek(c, { kilde_nid: 'nid_200', tittel: 'Lokkelek' })
    // T: 2 skoler via periodeplan, 2 via tl-hjul, 1 via bruk_hendelse = 5 distinkte
    await skolePlan(c, T); await skolePlan(c, T); await skoleHjul(c, T); await skoleHjul(c, T); await skoleBruk(c, T, 'video_spilt')
    // D: bare 3 skoler
    await skolePlan(c, D); await skoleHjul(c, D); await skoleBruk(c, D, 'pdf_nedlastet')
    const r = await kall(c)
    krev('kilde = automatisk', r.kilde === 'automatisk', r.kilde)
    krev('valgte T (flest distinkte skoler)', r.ressurs_id === T, `fikk ${r.ressurs_id}`)
    krev('antall_skoler = 5 lagret', (await q(c, `select antall_skoler from manedens_lek`))[0].antall_skoler === 5)
  }
  await c.query('rollback'); P('')

  // ── (b) 4 skoler → reserve fra 'manedens-lek'-samling, riktig måned ──────────
  P('## (b) 4 skoler (< 5) → reserve, riktig måned')
  await c.query('begin'); await base(c)
  {
    const T = await lagLek(c, { kilde_nid: 'nid_100', tittel: 'Målleken' })
    const R = await lagLek(c, { kilde_nid: 'nid_300', tittel: 'Reservelek' })
    await skolePlan(c, T); await skolePlan(c, T); await skolePlan(c, T); await skolePlan(c, T) // 4 skoler
    await reserveSamling(c, R)
    const r = await kall(c)
    krev('kilde = reserve', r.kilde === 'reserve', r.kilde)
    krev('valgte reserveleken R', r.ressurs_id === R, `fikk ${r.ressurs_id}`)
    krev('antall_skoler ikke lagret for reserve (null)', (await q(c, `select antall_skoler from manedens_lek`))[0].antall_skoler === null)
  }
  await c.query('rollback'); P('')

  // reserve med FEIL måned velges ikke → faller til ingen
  P('## (b2) reserve-samling finnes, men seksjon = FEIL måned → ingen')
  await c.query('begin'); await base(c)
  {
    const R = await lagLek(c, { tittel: 'Reservelek' })
    const s = (await q(c, `insert into samlinger(synlig,nokkel) values (true,'manedens-lek') returning id`))[0].id
    await c.query(`insert into samling_ressurs(samling_id,ressurs_id,rekkefolge) values ($1,$2,0)`, [s, R])
    // seksjon = en ANNEN måned (neste måned) → skal ikke matche
    await c.query(`insert into samling_ressurs_plassering(samling_id,ressurs_id,seksjon,rekkefolge)
                   values ($1,$2,(array['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'])[((extract(month from (now() at time zone 'Europe/Oslo'))::int % 12)+1)],0)`, [s, R])
    const r = await kall(c)
    krev('feil måned → kilde=ingen, ressurs=null', r.kilde === 'ingen' && r.ressurs_id === null, `${r.kilde}/${r.ressurs_id}`)
  }
  await c.query('rollback'); P('')

  // ── (c) ingen bruk, ingen reserve → ingen, INGEN rad skrevet (rettet 12. sep, Fable C-1) ─
  // 'ingen' skal ALDRI fryses: legges reserve/data inn senere samme måned, må valget regnes
  // på nytt. Beviser: (1) 'ingen' skriver ingen rad, (2) reserve lagt inn etterpå velges og
  // fryser, (3) reserve står frosset ved neste kall.
  P('## (c) ingen bruk + ingen reserve → ingen (INGEN rad); reserve lagt inn etterpå → reserve, fryses')
  await c.query('begin'); await base(c)
  {
    const r = await kall(c)
    krev('kilde = ingen', r.kilde === 'ingen', r.kilde)
    krev('ressurs_id = null', r.ressurs_id === null, `${r.ressurs_id}`)
    krev('INGEN rad skrevet (ingen fryses ikke)', (await q(c, `select count(*)::int n from manedens_lek`))[0].n === 0,
      `rader=${(await q(c, `select count(*)::int n from manedens_lek`))[0].n}`)
    // Legg inn reserve ETTERPÅ — siden 'ingen' ikke ble frosset skal neste kall gi 'reserve'.
    const R = await lagLek(c, { tittel: 'Sen reserve' })
    await reserveSamling(c, R)
    const r2 = await kall(c)
    krev('etter reserve lagt inn → kilde=reserve', r2.kilde === 'reserve', r2.kilde)
    krev('reserve valgte R', r2.ressurs_id === R, `fikk ${r2.ressurs_id}`)
    krev('nå frosset: én rad skrevet', (await q(c, `select count(*)::int n from manedens_lek`))[0].n === 1)
    const r3 = await kall(c)
    krev('reserve står frosset ved nytt kall', r3.kilde === 'reserve' && r3.ressurs_id === R, `${r3.kilde}/${r3.ressurs_id}`)
  }
  await c.query('rollback'); P('')

  // ── (d) automatisk fryses: andre kall samme måned gir samme svar selv om data endres ──
  // (Endret 12. sep: 'ingen' fryses IKKE lenger — se (c). Frysingen bevises nå på et reelt
  // valg, 'automatisk', som fortsatt skal låses.)
  P('## (d) frosset: automatisk låses — andre kall gir samme svar selv om data endres')
  await c.query('begin'); await base(c)
  {
    const T = await lagLek(c, { tittel: 'Fryselek' })
    for (let i = 0; i < 5; i++) await skoleBruk(c, T, 'visning') // 5 skoler → automatisk
    const r1 = await kall(c)
    krev('første kall = automatisk', r1.kilde === 'automatisk', r1.kilde)
    krev('valgte T', r1.ressurs_id === T, `fikk ${r1.ressurs_id}`)
    // Legg inn masse MER bruk på en ANNEN lek ETTERPÅ — valget skal stå frosset.
    const D = await lagLek(c, { tittel: 'Etterpålek' })
    for (let i = 0; i < 9; i++) await skoleBruk(c, D, 'visning')
    const r2 = await kall(c)
    krev('andre kall = samme (frosset automatisk, ikke D)', r2.kilde === 'automatisk' && r2.ressurs_id === T, `${r2.kilde}/${r2.ressurs_id}`)
    krev('kun én rad i manedens_lek', (await q(c, `select count(*)::int n from manedens_lek`))[0].n === 1)
  }
  await c.query('rollback'); P('')

  // ── (e) aktiv læring + upubliserte velges ALDRI ──────────────────────────────
  P('## (e) aktiv læring og upubliserte leker velges aldri')
  await c.query('begin'); await base(c)
  {
    const AL = await lagLek(c, { type: 'aktiv_laering', tittel: 'Aktiv' })
    const UK = await lagLek(c, { status: 'utkast', tittel: 'Utkast' })
    for (let i = 0; i < 6; i++) { await skolePlan(c, AL); await skolePlan(c, UK) } // begge 6 skoler
    const r = await kall(c)
    krev('verken aktiv læring eller utkast valgt (→ ingen)', r.kilde === 'ingen' && r.ressurs_id === null, `${r.kilde}/${r.ressurs_id}`)
  }
  await c.query('rollback'); P('')

  // ── (h) 5 skoler KUN via 'visning' (bruk_hendelse) → automatisk ──────────────
  // Ny etter skrivesides-fiksen 12. sep: nå stemples 'visning' med skole_id i frontend,
  // så ren visnings-bruk alene skal kunne utløse et automatisk valg.
  P("## (h) 5 skoler kun 'visning' → automatisk")
  await c.query('begin'); await base(c)
  {
    const T = await lagLek(c, { kilde_nid: 'nid_500', tittel: 'Visningslek' })
    for (let i = 0; i < 5; i++) await skoleBruk(c, T, 'visning')
    const r = await kall(c)
    krev('kilde = automatisk', r.kilde === 'automatisk', r.kilde)
    krev('valgte visningsleken T', r.ressurs_id === T, `fikk ${r.ressurs_id}`)
    krev('antall_skoler = 5 lagret', (await q(c, `select antall_skoler from manedens_lek`))[0].antall_skoler === 5)
  }
  await c.query('rollback'); P('')

  // ── (i) Demoskolen OG Bjørnehaugen skole teller ALDRI (interne test/simulering) ──
  P('## (i) Demoskolen + Bjørnehaugen skole utelates fra alle tre signalene')
  await c.query('begin'); await base(c)
  {
    const T = await lagLek(c, { kilde_nid: 'nid_600', tittel: 'Demolek' })
    // 6 ekte distinkte skoler fordelt på alle tre signalene ...
    await skolePlan(c, T); await skolePlan(c, T); await skolePlan(c, T) // 3 via periodeplan
    await skoleHjul(c, T); await skoleHjul(c, T)                        // 2 via TL-hjul
    await skoleBruk(c, T, 'visning')                                    // 1 via bruk_hendelse
    // ... og begge testskolene inn via signalene — skal ALDRI telle.
    await skolePlan(c, T, 'Demoskolen')
    await skoleHjul(c, T, 'Demoskolen')
    await skoleBruk(c, T, 'visning', 'Demoskolen')
    await skolePlan(c, T, 'Bjørnehaugen skole')
    await skoleBruk(c, T, 'visning', 'Bjørnehaugen skole')
    const r = await kall(c)
    krev('automatisk', r.kilde === 'automatisk', r.kilde)
    krev('Demoskolen + Bjørnehaugen utelatt (antall = 6, ikke 8)',
      (await q(c, `select antall_skoler from manedens_lek`))[0].antall_skoler === 6,
      `fikk ${(await q(c, `select antall_skoler from manedens_lek`))[0].antall_skoler}`)
  }
  await c.query('rollback'); P('')

  // (i2) 4 ekte + Demoskolen + Bjørnehaugen → under terskel (testskoler kan ikke tippe 4→5)
  P('## (i2) 4 ekte skoler + Demoskolen + Bjørnehaugen skole → IKKE automatisk')
  await c.query('begin'); await base(c)
  {
    const T = await lagLek(c, { tittel: 'Undertelling' })
    for (let i = 0; i < 4; i++) await skoleBruk(c, T, 'visning')
    await skoleBruk(c, T, 'visning', 'Demoskolen')         // demo via bruk_hendelse
    await skoleBruk(c, T, 'visning', 'Bjørnehaugen skole') // testkonto via bruk_hendelse
    const r = await kall(c)
    krev('kilde = ingen (4 ekte < 5, begge testskoler teller ikke)', r.kilde === 'ingen' && r.ressurs_id === null, `${r.kilde}/${r.ressurs_id}`)
  }
  await c.query('rollback'); P('')

  // ── (f) skolebruker kan kalle, anon kan ikke ─────────────────────────────────
  P('## (f) authenticated kan kalle, anon kan ikke')
  krev('anon har IKKE execute',
    (await q(c, `select has_function_privilege('anon','public.hent_manedens_lek()','execute') x`))[0].x === false)
  krev('authenticated HAR execute',
    (await q(c, `select has_function_privilege('authenticated','public.hent_manedens_lek()','execute') x`))[0].x === true)
  await c.query('begin'); await base(c)
  await c.query(`select set_config('request.jwt.claim.sub',$1,true)`, [SKOLEBRUKER])
  await c.query('set local role authenticated')
  {
    const r = await kall(c)
    krev('authenticated fikk svar (ingen)', r.kilde === 'ingen')
  }
  await c.query('reset role')
  {
    await c.query('set local role anon')
    const m = await feilmelding(c, () => c.query(`select public.hent_manedens_lek()`))
    await c.query('reset role')
    krev('anon-kall → permission denied', !!m && /permission denied|denied|tilgang/i.test(m), m || '(ingen feil!)')
  }
  await c.query('rollback'); P('')

  // ── (g) re-kjøring stopper rent ──────────────────────────────────────────────
  P('## (g1) ny kjøring av 120 stopper rent')
  {
    let m = null
    try { await c.query(readFileSync(M120, 'utf8')) } catch (e) { m = e.message; try { await c.query('rollback') } catch {} }
    krev('andre kjøring raiser «allerede kjørt»', !!m && /allerede kjørt/i.test(m), m || '(ingen feil!)')
  }
  await c.end(); P('')

  // ── (g2) rollback-variant → identisk base ────────────────────────────────────
  P('## (g2) rollback-variant → basen identisk (tabell + funksjon fraværende)')
  lagFerskDb(RBDB)
  const rb = new Client({ connectionString: url(RBDB) })
  await rb.connect()
  await rb.query(readFileSync(M119, 'utf8'))
  await seedEksklusjon(rb)   // B-1: eksklusjonsskolene må finnes også for rollback-varianten
  const migr120 = readFileSync(M120, 'utf8')
  const rbTekst = migr120.replace(/commit;(\s*)$/, 'rollback;$1')
  krev('rollback-variant bytter ut siste commit', rbTekst.includes('rollback;') && !/commit;\s*$/.test(rbTekst))
  await rb.query(rbTekst)
  krev('tabellen finnes IKKE etter rollback', (await q(rb, `select to_regclass('public.manedens_lek') is null x`))[0].x === true)
  krev('funksjonen finnes IKKE etter rollback', (await q(rb, `select to_regprocedure('public.hent_manedens_lek()') is null x`))[0].x === true)
  await rb.end()
  try { adminSql(`drop database if exists ${RBDB}`) } catch {}
  P('')

  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL — se over.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
