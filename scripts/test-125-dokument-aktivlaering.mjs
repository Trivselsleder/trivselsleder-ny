#!/usr/bin/env node
// BEVIS for migrasjon 125 (bruk_hendelse: dokument_apnet + aktiv_laering_apnet + dokument_id).
// Lokal Postgres 17, klon av trivsel_prodmal_118 + migr 121 (skole-vern) + 125. Ingen prod.
//   node scripts/test-125-dokument-aktivlaering.mjs
// Fixtur ligner PROD: ekte dokument i dokumenter, aktiv_laering-ressurs, skoleansatt m/bruker_skole,
// intern (ansatt). Beviser sperrer (5 retninger), at dokumenthendelse skrives med peker+skole,
// og at intern skriver null skole.
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { velgStemplingsSkole } from '../src/lib/stempling.js'
const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROT = path.resolve(__dirname, '..')
const HOST = process.env.PGHOST || 'localhost', USER = process.env.PGUSER || 'postgres'
const TMPL = process.env.TMPL_DB || 'trivsel_prodmal_118'
const M121 = path.join(ROT, 'supabase/migrations/121_bruk_hendelse_skole_vern.sql')
const M125 = path.join(ROT, 'supabase/migrations/125_bruk_hendelse_dokument_aktivlaering.sql')
const FV = path.join(ROT, '_kontroll-import/125-forhandsvisning.sql')
const ETT = path.join(ROT, '_kontroll-import/125-etter.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
const SKOLE = '11111111-1111-1111-1111-111111111111'
const INTERN = '22222222-2222-2222-2222-222222222222'
let ok=0, feil=0
const P=(s)=>console.log(s)
const krev=(n,b,d='')=>{P(`  ${b?'OK  ':'FEIL'} ${n}${d?'  — '+d:''}`); b?ok++:feil++}
async function q(c,sql,p){return (await c.query(sql,p)).rows}
async function feilmld(c,fn){await c.query('savepoint s');try{await fn();return null}catch(e){await c.query('rollback to savepoint s');return e.message}}
function adminSql(sql,db='postgres'){execFileSync('psql',['-X','-q','-d',url(db),'-c',sql],{stdio:'pipe'})}
function lagFerskDb(navn){
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`); adminSql(`create database ${navn} template ${TMPL}`)
}
function kvitteringAv(res){ return (Array.isArray(res)?res:[res]).map(r=>r.rows&&r.rows[0]).filter(r=>r&&'kvittering'in r).pop() }
async function seedGrunndata(c){
  const A=(await q(c,`insert into skoler(navn) values('Skole A') returning id`))[0].id
  await c.query(`insert into auth.users(id,email) values($1,'s@t'),($2,'i@t')`,[SKOLE,INTERN])
  await c.query(`insert into profiles(id,rolle,aktiv) values($1,'skoleansatt',true),($2,'ansatt',true)`,[SKOLE,INTERN])
  await c.query(`insert into bruker_skole(bruker_id,skole_id,rolle,aktiv) values($1,$2,'skoleansatt',true)`,[SKOLE,A])
  const dok=(await q(c,`insert into dokumenter(tittel,status) values('Testdokument','publisert') returning id`))[0].id
  const al=(await q(c,`insert into ressurser(status,ressurstype) values('publisert','aktiv_laering') returning id`))[0].id
  return {A,dok,al}
}
async function main(){
  const DB='trivsel_125_test'
  P('# Bevis: migrasjon 125 (dokument + aktiv læring i bruksloggen)\n')
  lagFerskDb(DB)
  const c=new Client({connectionString:url(DB)}); await c.connect()
  await c.query(readFileSync(M121,'utf8'))  // skole-vern (kjørt i prod)
  // forhåndsvisning FØR 125
  const fvFor=(await q(c,readFileSync(FV,'utf8')))[0].forhandsvisning_125
  krev('forhåndsvisning FØR: dokument_id NEI, CHECK-typer NEI, anon TRUNCATE JA, klar=JA',
    /dokument_id-kolonne.*: false/.test(fvFor)&&/dokument_apnet \(NEI før\): false/.test(fvFor)&&/anon TRUNCATE.*: true/.test(fvFor)&&/klar for 125.*: JA/.test(fvFor), fvFor)
  const etFor=(await q(c,readFileSync(ETT,'utf8')))[0].etter_125
  krev('etter-fil FØR: ferdig=NEI', /ferdig: NEI/.test(etFor))
  // KJØR 125
  const kv=kvitteringAv(await c.query(readFileSync(M125,'utf8')))
  P('  KVITTERING: '+(kv?kv.kvittering:'(ingen)'))
  krev('kvittering: dokument_id-kolonne true', /dokument_id-kolonne: true/.test(kv?.kvittering||''))
  krev('kvittering: nye CHECK-verdier true', /nye CHECK-verdier: true/.test(kv?.kvittering||''))
  krev('kvittering: peker-CHECK true', /peker-CHECK: true/.test(kv?.kvittering||''))
  krev('kvittering: p_ins skole-vern true', /p_ins skole-vern \(121\): true/.test(kv?.kvittering||''))
  krev('kvittering: anon select+truncate false', /anon select: false/.test(kv?.kvittering||'')&&/anon truncate: false/.test(kv?.kvittering||''))
  const et=(await q(c,readFileSync(ETT,'utf8')))[0].etter_125
  krev('etter-fil ETTER: ferdig=JA', /ferdig: JA/.test(et)&&/FK dokument_id→dokumenter: true/.test(et), et)
  // ---- LOGGING: dokumenthendelse med peker+skole, intern null ----
  const {A,dok,al}=await seedGrunndata(c)
  const stemplet=velgStemplingsSkole('skoleansatt',A)  // = A
  const internSk=velgStemplingsSkole('ansatt',A)       // = null
  async function insertSom(uid,rad){
    await c.query('begin'); await c.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid]); await c.query('set local role authenticated')
    const m=await feilmld(c,()=>c.query(`insert into bruk_hendelse(bruker_id,skole_id,ressurs_id,dokument_id,hendelse) values($1,$2,$3,$4,$5)`,
      [uid,rad.skole,rad.ressurs||null,rad.dokument||null,rad.hendelse]))
    let landet=null
    if(!m) landet=(await q(c,`select skole_id, dokument_id, ressurs_id from bruk_hendelse where hendelse=$1 and bruker_id=$2 order by id desc limit 1`,[rad.hendelse,uid]))[0]
    await c.query('reset role'); await c.query('rollback'); return {m,landet}
  }
  {
    const r=await insertSom(SKOLE,{skole:stemplet,dokument:dok,hendelse:'dokument_apnet'})
    krev('skoleansatt dokument_apnet: skrevet, MED riktig dokument-peker OG skole A',
      r.m===null && r.landet && r.landet.dokument_id===dok && r.landet.skole_id===A && r.landet.ressurs_id===null,
      r.m||JSON.stringify(r.landet))
  }
  {
    const r=await insertSom(INTERN,{skole:internSk,dokument:dok,hendelse:'dokument_apnet'})
    krev('intern dokument_apnet: skrevet MED null skole', r.m===null && r.landet && r.landet.skole_id===null && internSk===null, r.m||JSON.stringify(r.landet))
  }
  {
    const r=await insertSom(SKOLE,{skole:stemplet,ressurs:al,hendelse:'aktiv_laering_apnet'})
    krev('aktiv_laering_apnet: skrevet med ressurs-peker + skole, dokument null',
      r.m===null && r.landet && r.landet.ressurs_id===al && r.landet.skole_id===A && r.landet.dokument_id===null, r.m||JSON.stringify(r.landet))
  }
  await c.end(); adminSql(`drop database if exists ${DB}`); P('')
  // ---- SPERRER (fem retninger) ----
  P('## Sperrene utløser')
  // 1) idempotens
  {
    const DB2='trivsel_125_sperre'; lagFerskDb(DB2)
    const s=new Client({connectionString:url(DB2)}); await s.connect()
    await s.query(readFileSync(M121,'utf8')); await s.query(readFileSync(M125,'utf8'))
    let m=null; try{ await s.query(readFileSync(M125,'utf8')) }catch(e){ m=e.message; try{await s.query('rollback')}catch{} }
    krev('idempotens: 2. kjøring av 125 → «allerede kjørt»', !!m&&/STOPP 125 \(allerede kjørt\)/.test(m), m||'(ingen feil!)')
    // CHECK-sperrer (data-integritet), som postgres (CHECK gjelder uansett rolle). Savepoint i
    // feilmld krever aktiv transaksjon → pakk i begin/rollback.
    const {dok}=await seedGrunndata(s)
    await s.query('begin')
    const inv=await feilmld(s,()=>s.query(`insert into bruk_hendelse(bruker_id,hendelse) values(null,'ugyldig_type')`))
    krev('CHECK: ugyldig hendelsestype nektes', !!inv&&/bruk_hendelse_hendelse_check|violates check/i.test(inv), inv||'(ingen feil!)')
    const utenPeker=await feilmld(s,()=>s.query(`insert into bruk_hendelse(bruker_id,hendelse) values(null,'dokument_apnet')`))
    krev('CHECK: dokument_apnet UTEN dokument_id nektes (peker påkrevd)', !!utenPeker&&/dokument_peker|violates check/i.test(utenPeker), utenPeker||'(ingen feil!)')
    const feilPeker=await feilmld(s,()=>s.query(`insert into bruk_hendelse(bruker_id,hendelse,dokument_id) values(null,'visning',$1)`,[dok]))
    krev('CHECK: dokument_id på ikke-dokument-hendelse nektes', !!feilPeker&&/dokument_peker|violates check/i.test(feilPeker), feilPeker||'(ingen feil!)')
    await s.query('rollback')
    krev('anon har ikke TRUNCATE/SELECT/INSERT etter 125',
      (await q(s,`select not (has_table_privilege('anon','public.bruk_hendelse','TRUNCATE') or has_table_privilege('anon','public.bruk_hendelse','SELECT') or has_table_privilege('anon','public.bruk_hendelse','INSERT')) x`))[0].x===true)
    await s.end(); adminSql(`drop database if exists ${DB2}`)
  }
  P('')
  // ---- Rollback-variant ----
  P('## Rollback-variant → basen uendret')
  {
    const DB3='trivsel_125_rb'; lagFerskDb(DB3)
    const rb=new Client({connectionString:url(DB3)}); await rb.connect()
    await rb.query(readFileSync(M121,'utf8'))
    const rbTekst=readFileSync(M125,'utf8').replace(/commit;(\s*)$/, 'rollback;$1')
    krev('rollback-variant bytter ut siste commit', rbTekst.includes('rollback;')&&!/commit;\s*$/.test(rbTekst))
    await rb.query(rbTekst)
    krev('dokument_id-kolonne finnes IKKE etter rollback',
      (await q(rb,`select count(*)::int n from information_schema.columns where table_name='bruk_hendelse' and column_name='dokument_id'`))[0].n===0)
    await rb.end(); adminSql(`drop database if exists ${DB3}`)
  }
  P('')
  P(feil===0?`RESULTAT: ${ok} OK, 0 FEIL.`:`RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if(feil!==0) process.exit(1)
}
main().catch(e=>{console.error(e);process.exit(1)})
