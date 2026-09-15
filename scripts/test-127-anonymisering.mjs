#!/usr/bin/env node
// BEVIS for migrasjon 127: 12-mnd anonymisering av epost_logg + endringslogg.
// Lokal Postgres, fersk klon av trivsel_prodmal_118 + 127. Ingen prod.
//   node scripts/test-127-anonymisering.mjs
// Fixtur ligner PROD: endringslogg-rader lages av den EKTE triggeren (fase3_logg_endring) ved å
// sette inn/endre ressurser med opprettet_av/endret_av (FK til profiles) — så full_rad/endringer
// FAKTISK bærer person-uuid, som i prod. Beviser: rader ELDRE enn 12 mnd anonymiseres, YNGRE
// står urørt (begge retninger, begge tabeller), jsonb-person-uuid strippes, og sperrene utløser.
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const { Client } = pg
const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HOST = process.env.PGHOST || 'localhost', USER = process.env.PGUSER || 'postgres'
const TMPL = process.env.TMPL_DB || 'trivsel_prodmal_118'
const M127 = path.join(ROT, 'supabase/migrations/127_anonymiser_epostlogg_endringslogg.sql')
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
const P1 = '11111111-aaaa-aaaa-aaaa-111111111111'
const P2 = '22222222-bbbb-bbbb-bbbb-222222222222'
const GML = `now() - interval '13 months'`
const NY = `now() - interval '1 month'`

async function main() {
  const DB = 'trivsel_127_test'
  P('# Bevis: migrasjon 127 (12-mnd anonymisering av epost_logg + endringslogg)\n')
  lagFerskDb(DB)
  const c = new Client({ connectionString: url(DB) }); await c.connect()
  await c.query(readFileSync(M127, 'utf8'))

  // profiler (FK-mål for opprettet_av/endret_av)
  await c.query(`insert into auth.users(id,email) values($1,'p1@t'),($2,'p2@t')`, [P1, P2])
  await c.query(`insert into profiles(id,rolle,aktiv) values($1,'ansatt',true),($2,'ansatt',true)`, [P1, P2])

  // ---- epost_logg-fixtur: kurs-kjede for gyldig kurs_skole_mottaker_id ----
  const kurs = (await q(c, `insert into kurs(navn) values('K') returning id`))[0].id
  const skole = (await q(c, `insert into skoler(navn) values('S') returning id`))[0].id
  const ks = (await q(c, `insert into kurs_skole(kurs_id,skole_id) values($1,$2) returning id`, [kurs, skole]))[0].id
  const mott = (await q(c, `insert into kurs_skole_mottaker(kurs_skole_id,rolle,epost) values($1,'htla','rektor@skole.no') returning id`, [ks]))[0].id
  // GAMMEL (13 mnd) og YNGRE (1 mnd) e-postlogg-rad, begge med person + peker
  await c.query(`insert into epost_logg(opprettet_at,type,mottaker_epost,mottaker_navn,kurs_skole_id,kurs_skole_mottaker_id,status,resend_id)
    values (${GML},'kursinvitasjon','rektor@skole.no','Ola Rektor',$1,$2,'sendt','re_gml')`, [ks, mott])
  await c.query(`insert into epost_logg(opprettet_at,type,mottaker_epost,mottaker_navn,kurs_skole_id,status,resend_id)
    values (${NY},'kursinvitasjon','ny@skole.no','Kari Ny',$1,'sendt','re_ny')`, [ks])

  // ---- endringslogg-fixtur via EKTE trigger ----
  // (a) INSERT ressurs → endringslogg med full_rad som bærer opprettet_av + endret_av (P1)
  await c.query(`insert into ressurser(status,ressurstype,opprettet_av,endret_av) values('publisert','lek',$1,$1)`, [P1])
  const rGmlFull = (await q(c, `select id from endringslogg where tabell='ressurser' order by id desc limit 1`))[0].id
  await c.query(`update endringslogg set endret_av=$1, endret_at=${GML} where id=$2`, [P1, rGmlFull]) // GAMMEL + sett topp-endret_av
  // (b) UPDATE ressurs som endrer endret_av → endringslogg med 'endret_av' i ENDRINGER-jsonb
  const r2 = (await q(c, `insert into ressurser(status,ressurstype,opprettet_av,endret_av) values('publisert','lek',$1,$1) returning id`, [P1]))[0].id
  await c.query(`delete from endringslogg where tabell='ressurser' and rad_id=$1`, [r2]) // fjern insert-loggen for r2 (rydder)
  await c.query(`update ressurser set endret_av=$1 where id=$2`, [P2, r2])
  const rGmlEndr = (await q(c, `select id from endringslogg where tabell='ressurser' and rad_id=$1 order by id desc limit 1`, [r2]))[0].id
  await c.query(`update endringslogg set endret_av=$1, endret_at=${GML} where id=$2`, [P1, rGmlEndr]) // GAMMEL
  // (c) YNGRE endringslogg-rad (full_rad med person, 1 mnd)
  await c.query(`insert into ressurser(status,ressurstype,opprettet_av,endret_av) values('publisert','lek',$1,$1)`, [P2])
  const rNy = (await q(c, `select id from endringslogg where tabell='ressurser' order by id desc limit 1`))[0].id
  await c.query(`update endringslogg set endret_av=$1, endret_at=${NY} where id=$2`, [P2, rNy])

  // ---- KJØR ----
  const el = (await q(c, `select frakoblet_person from anonymiser_epost_logg()`))[0].frakoblet_person
  const en = (await q(c, `select frakoblet_person from anonymiser_endringslogg()`))[0].frakoblet_person
  P(`Kjørt: anonymiser_epost_logg → ${el} rad(er), anonymiser_endringslogg → ${en} rad(er)\n`)

  // ---- BEVIS: epost_logg ----
  P('## epost_logg')
  const eGml = (await q(c, `select * from epost_logg where resend_id='re_gml'`))[0]
  krev('GAMMEL (13 mnd): mottaker_epost/navn OG kurs_skole_mottaker_id nullet',
    eGml.mottaker_epost === null && eGml.mottaker_navn === null && eGml.kurs_skole_mottaker_id === null,
    JSON.stringify({ epost: eGml.mottaker_epost, navn: eGml.mottaker_navn, mott: eGml.kurs_skole_mottaker_id }))
  krev('GAMMEL: statistikk BEVART (type/status/resend_id/kurs_skole_id)',
    eGml.type === 'kursinvitasjon' && eGml.status === 'sendt' && eGml.resend_id === 're_gml' && eGml.kurs_skole_id === ks)
  const eNy = (await q(c, `select * from epost_logg where resend_id='re_ny'`))[0]
  krev('YNGRE (1 mnd): mottaker_epost/navn URØRT',
    eNy.mottaker_epost === 'ny@skole.no' && eNy.mottaker_navn === 'Kari Ny', JSON.stringify({ epost: eNy.mottaker_epost, navn: eNy.mottaker_navn }))
  krev('epost_logg returtall = 1 (kun den gamle)', Number(el) === 1, `el=${el}`)

  // ---- BEVIS: endringslogg ----
  P('\n## endringslogg')
  const gFull = (await q(c, `select endret_av, (full_rad ? 'endret_av') hf_endret, (full_rad ? 'opprettet_av') hf_oppr, (full_rad ? 'status') hf_status from endringslogg where id=$1`, [rGmlFull]))[0]
  krev('GAMMEL (full_rad): topp-endret_av nullet, OG endret_av+opprettet_av strippet fra jsonb',
    gFull.endret_av === null && gFull.hf_endret === false && gFull.hf_oppr === false, JSON.stringify(gFull))
  krev('GAMMEL (full_rad): ikke-person-innhold BEVART i jsonb (status står igjen)', gFull.hf_status === true)
  const gEndr = (await q(c, `select endret_av, (endringer ? 'endret_av') he from endringslogg where id=$1`, [rGmlEndr]))[0]
  krev('GAMMEL (endringer): person-uuid-nøkkel «endret_av» strippet fra endringer-jsonb',
    gEndr.endret_av === null && gEndr.he === false, JSON.stringify(gEndr))
  const gNy = (await q(c, `select endret_av, (full_rad ? 'opprettet_av') ho from endringslogg where id=$1`, [rNy]))[0]
  krev('YNGRE (1 mnd): topp-endret_av OG jsonb-person-uuid URØRT',
    gNy.endret_av === P2 && gNy.ho === true, JSON.stringify(gNy))
  krev('endringslogg returtall = 2 (de to gamle)', Number(en) === 2, `en=${en}`)

  // ---- BEVIS: idempotens (andre kjøring rører 0) ----
  P('\n## Idempotens')
  const el2 = (await q(c, `select frakoblet_person from anonymiser_epost_logg()`))[0].frakoblet_person
  const en2 = (await q(c, `select frakoblet_person from anonymiser_endringslogg()`))[0].frakoblet_person
  krev('andre kjøring rører 0 rader (begge)', Number(el2) === 0 && Number(en2) === 0, `el2=${el2} en2=${en2}`)

  // ---- BEVIS: sperre — anon har ikke execute ----
  P('\n## Sperrer')
  const anonEl = (await q(c, `select has_function_privilege('anon','public.anonymiser_epost_logg()','execute') x`))[0].x
  const anonEn = (await q(c, `select has_function_privilege('anon','public.anonymiser_endringslogg()','execute') x`))[0].x
  krev('anon har IKKE execute på noen av funksjonene', anonEl === false && anonEn === false, `epost=${anonEl} endring=${anonEn}`)

  await c.end(); adminSql(`drop database if exists ${DB}`)

  // ---- BEVIS: forutsetning-sperre utløser (endringslogg mangler) ----
  const DB2 = 'trivsel_127_sperre'; lagFerskDb(DB2)
  const s = new Client({ connectionString: url(DB2) }); await s.connect()
  await s.query('drop table if exists public.endringslogg cascade')
  let m = null
  try { await s.query(readFileSync(M127, 'utf8')) } catch (e) { m = e.message; try { await s.query('rollback') } catch { /* noop */ } }
  krev('forutsetning-sperre: 127 uten endringslogg → STOPP', !!m && /STOPP 127.*endringslogg/.test(m), m || '(ingen feil!)')
  await s.end(); adminSql(`drop database if exists ${DB2}`)

  P('')
  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
