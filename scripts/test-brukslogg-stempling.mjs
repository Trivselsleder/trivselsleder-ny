#!/usr/bin/env node
// BEVIS for komplett brukslogg (stempling + video_spilt/pdf_nedlastet). Ingen prod.
//   node scripts/test-brukslogg-stempling.mjs
// Tre nivåer: (1) ren stempling-avgjørelse, (2) at skrivingen FAKTISK sendes (28.-aug-lærdom),
// (3) DB-skriving under den ferske policy 121: skole stemples og landes; intern → null.
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
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
const SKOLEBRUKER = '11111111-1111-1111-1111-111111111111'
const INTERN      = '22222222-2222-2222-2222-222222222222'
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

async function main(){
  P('# Bevis: komplett brukslogg\n')

  // ---------- (1) REN STEMPLING-AVGJØRELSE (velgStemplingsSkole) ----------
  P('## (1) Stempling: rollen avgjør (profiles.rolle), skolen fra bruker_skole')
  krev("skoleansatt + skole A → stempler A", velgStemplingsSkole('skoleansatt','A')==='A')
  krev("skoleadmin + skole A → stempler A", velgStemplingsSkole('skoleadmin','A')==='A')
  krev("ansatt (intern) → null (uansett skole)", velgStemplingsSkole('ansatt','A')===null)
  krev("superadmin (intern) → null", velgStemplingsSkole('superadmin','A')===null)
  krev("skoleansatt uten skole → null", velgStemplingsSkole('skoleansatt',null)===null)
  P('')

  // ---------- (2) AT SKRIVINGEN FAKTISK SENDES (28.-aug-lærdom) ----------
  P('## (2) Skrivingen sendes: await inne i loggBrukHendelse trigger .then()')
  {
    // Mock som supabase-query-builder: sendes KUN når .then()/await kalles.
    const lagBygger=(flagg)=>({ then(res){ flagg.sendt=true; res({error:null}); return Promise.resolve({error:null}) } })
    // VÅR form (som loggBrukHendelse): async fn som awaiter insert internt.
    const vaar={sendt:false}
    async function loggSomOss(){ const b=lagBygger(vaar); const {error}=await b; return error }
    loggSomOss()                       // kalt UTEN await (som callsite-ene)
    await Promise.resolve()            // flush microtasks
    await new Promise(r=>setTimeout(r,0))
    krev('vår form: insert ble sendt selv uten await på kallstedet', vaar.sendt===true)
    // KALIBRERING: 28.-aug-feilen — rå builder uten await/.then() sendes ALDRI.
    const feil28={sendt:false}
    function loggFeil(){ lagBygger(feil28) /* ingen await/.then() */ }
    loggFeil(); await new Promise(r=>setTimeout(r,0))
    krev('kalibrering: rå insert UTEN await/.then() ble ALDRI sendt', feil28.sendt===false)
  }
  P('')

  // ---------- (3) DB-SKRIVING under policy 121 ----------
  P('## (3) DB: video_spilt/pdf_nedlastet skrives med skole (skolebruker) og null (intern)')
  const DB='trivsel_brukslogg_test'; lagFerskDb(DB)
  const c=new Client({connectionString:url(DB)}); await c.connect()
  await c.query(readFileSync(M121,'utf8'))   // fersk skole-vern-policy (kjørt i prod i dag)
  // Seed: skolebruker på skole A (aktiv), intern (ansatt), en lek, en annen skole B.
  const A=(await q(c,`insert into skoler(navn) values('Skole A') returning id`))[0].id
  const B=(await q(c,`insert into skoler(navn) values('Skole B') returning id`))[0].id
  await c.query(`insert into auth.users(id,email) values($1,'s@t'),($2,'i@t')`,[SKOLEBRUKER,INTERN])
  await c.query(`insert into profiles(id,rolle,aktiv) values($1,'skoleansatt',true),($2,'ansatt',true)`,[SKOLEBRUKER,INTERN])
  await c.query(`insert into bruker_skole(bruker_id,skole_id,rolle,aktiv) values($1,$2,'skoleansatt',true)`,[SKOLEBRUKER,A])
  const lek=(await q(c,`insert into ressurser(status,ressurstype) values('publisert','lek') returning id`))[0].id
  // Skolebrukerens stemplede skole (som frontend ville regnet ut):
  const stempletSkole=velgStemplingsSkole('skoleansatt',A)   // = A
  const internSkole=velgStemplingsSkole('ansatt',A)          // = null
  async function insertSom(uid,hendelse,skole_id){
    await c.query('begin')
    await c.query(`select set_config('request.jwt.claim.sub',$1,true)`,[uid])
    await c.query('set local role authenticated')
    const m=await feilmld(c,()=>c.query(`insert into bruk_hendelse(bruker_id,skole_id,ressurs_id,hendelse) values($1,$2,$3,$4)`,[uid,skole_id,lek,hendelse]))
    let landet=0
    if(!m) landet=(await q(c,`select count(*)::int n from bruk_hendelse where hendelse=$1 and bruker_id=$2 and skole_id is not distinct from $3`,[hendelse,uid,skole_id]))[0].n
    await c.query('reset role'); await c.query('rollback')
    return {m,landet}
  }
  for(const h of ['video_spilt','pdf_nedlastet']){
    const r=await insertSom(SKOLEBRUKER,h,stempletSkole)
    krev(`skolebruker ${h} MED skole A → skrevet og landet`, r.m===null && r.landet===1, r.m||`landet=${r.landet}, skole=${stempletSkole===A?'A':stempletSkole}`)
  }
  {
    const r=await insertSom(INTERN,'video_spilt',internSkole)
    krev('intern video_spilt → skole_id=null, skrevet og landet', r.m===null && r.landet===1 && internSkole===null, r.m||`landet=${r.landet}, skole=${internSkole}`)
  }
  {
    // Beviser at stemplingen betyr noe: en annen skoles id nektes av policy 121.
    const r=await insertSom(SKOLEBRUKER,'video_spilt',B)
    krev('skolebruker med ANNEN skole (B) → nektet av policy 121', /row-level security|policy|violates/i.test(r.m||''), r.m||'(ingen feil!)')
  }
  await c.end(); adminSql(`drop database if exists ${DB}`)
  P('')
  P(feil===0?`RESULTAT: ${ok} OK, 0 FEIL.`:`RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if(feil!==0) process.exit(1)
}
main().catch(e=>{console.error(e);process.exit(1)})
