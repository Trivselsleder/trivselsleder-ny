#!/usr/bin/env node
// BEVIS for migrasjon 124 (innledninger + plasseringer + skjul 19697 + kø-saker).
// Lokal Postgres 17, klon av trivsel_prodmal_118 + migr 119. Ingen prod.
//   node scripts/test-124-samlingstekster.mjs
// Fixturen ligner PROD: 368 samling_ressurs-par (distinkte par fra seksjoner.csv = prods
// invariant) + 16 TL-dans-par uten kilde_nid, 20 imp. samlinger med tom nb-innledning.
// Migrasjonen fyller fra sin egen innebygde v3-data — fixturen er uavhengig av den.
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
const M119 = path.join(ROT, 'supabase/migrations/119_samling_ressurs_plassering.sql')
const M124 = path.join(ROT, 'supabase/migrations/124_samling_innledninger_og_plasseringer.sql')
const FV = path.join(ROT, '_kontroll-import/124-forhandsvisning.sql')
const ETT = path.join(ROT, '_kontroll-import/124-etter.sql')
const V = path.join(ROT, '_kontroll-import/samlingstekster/v3')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
// Enkel CSV: kun kolonne 0 (kilde_nid) og 1 (lek_nid) brukes — begge numeriske, så komma i
// senere kolonner (lek_tittel) forstyrrer ikke.
const seksLinjer = readFileSync(path.join(V,'seksjoner.csv'),'utf8').trim().split('\n').slice(1)
const seks = seksLinjer.map(l=>{ const f=l.split(','); return { kilde_nid:f[0], lek_nid:f[1] } })
const inn = JSON.parse(readFileSync(path.join(V,'innledninger.json')))
const SAML_NIDS = [...new Set(inn.map(r=>r.kilde_nid).concat(seks.map(r=>r.kilde_nid)))]  // 20
const PAR = [...new Set(seks.map(r=>r.kilde_nid+'|'+r.lek_nid))].map(s=>s.split('|'))     // 368 distinkte
const LEK_NIDS = [...new Set(seks.map(r=>r.lek_nid))]
let ok=0, feil=0
const P=(s)=>console.log(s)
const krev=(n,b,d='')=>{P(`  ${b?'OK  ':'FEIL'} ${n}${d?'  — '+d:''}`); b?ok++:feil++}
async function q(c,sql,p){return (await c.query(sql,p)).rows}
function adminSql(sql,db='postgres'){execFileSync('psql',['-X','-q','-d',url(db),'-c',sql],{stdio:'pipe'})}
function lagFerskDb(navn){
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`); adminSql(`create database ${navn} template ${TMPL}`)
}
async function seed(c){
  await c.query(readFileSync(M119,'utf8'))
  const samId={}, lekId={}
  for (const nid of SAML_NIDS){
    const id=(await q(c,`insert into samlinger(kilde_nid,synlig) values($1,true) returning id`,[nid]))[0].id
    samId[nid]=id
    await c.query(`insert into samling_innhold(samling_id,sprak,tittel) values($1,'nb',$2)`,[id,'Samling '+nid])
  }
  for (const nid of LEK_NIDS){
    lekId[nid]=(await q(c,`insert into ressurser(status,ressurstype,kilde_nid) values('publisert','lek',$1) returning id`,[nid]))[0].id
  }
  for (const [s,l] of PAR) await c.query(`insert into samling_ressurs(samling_id,ressurs_id) values($1,$2)`,[samId[s],lekId[l]])
  // TL-dans: samling uten kilde_nid + 16 par (skal IKKE telle i 368-sperren)
  const tld=(await q(c,`insert into samlinger(synlig) values(true) returning id`))[0].id
  for (let i=0;i<16;i++){
    const r=(await q(c,`insert into ressurser(status,ressurstype) values('publisert','lek') returning id`))[0].id
    await c.query(`insert into samling_ressurs(samling_id,ressurs_id) values($1,$2)`,[tld,r])
  }
  return {samId,lekId}
}
async function kjor124(c,tekst){ const res=await c.query(tekst); return (Array.isArray(res)?res:[res]).map(r=>r.rows&&r.rows[0]).filter(r=>r&&'kvittering'in r).pop() }
async function main(){
  const DB='trivsel_124_test'
  P('# Bevis: migrasjon 124 (samlingstekster)\n')
  P(`  fixtur: ${SAML_NIDS.length} samlinger · ${PAR.length} distinkte par (mål 368) · ${LEK_NIDS.length} leker\n`)
  lagFerskDb(DB)
  const c=new Client({connectionString:url(DB)}); await c.connect()
  await seed(c)
  krev('fixtur: 368 par med kilde_nid', (await q(c,`select count(*)::int n from samling_ressurs sr join samlinger s on s.id=sr.samling_id where s.kilde_nid is not null`))[0].n===368)
  const fvFor=(await q(c,readFileSync(FV,'utf8')))[0].forhandsvisning_124
  krev('forhåndsvisning FØR: 0 plasseringer, 368 par, 0 fylt, 19697 synlig, klar=JA',
    /plasseringer nå.*: 0/.test(fvFor)&&/368/.test(fvFor)&&/fylt.*: 0/.test(fvFor)&&/19697 synlig: true/.test(fvFor)&&/klar.*: JA/.test(fvFor), fvFor)
  const etFor=(await q(c,readFileSync(ETT,'utf8')))[0].etter_124
  krev('etter-fil FØR: ferdig=NEI', /ferdig: NEI/.test(etFor), etFor)
  const kv=await kjor124(c,readFileSync(M124,'utf8'))
  P('  KVITTERING: '+(kv?kv.kvittering:'(ingen)'))
  const K=kv?.kvittering||''
  krev('kvittering: 18 innledninger fylt', /innledninger fylt \(nb, forventet 18\): 18/.test(K))
  krev('kvittering: 316 plasseringer', /plasseringer satt inn \(forventet 316\): 316/.test(K))
  krev('kvittering: 19390 beskrivelse NULL=true', /19390 beskrivelse NULL: true/.test(K))
  krev('kvittering: 19697 synlig=false=true', /19697 synlig=false: true/.test(K))
  krev('kvittering: 16 kø-saker', /kø-saker gamle henvisninger \(forventet 16\): 16/.test(K))
  const et=(await q(c,readFileSync(ETT,'utf8')))[0].etter_124
  krev('etter-fil ETTER: 316/18/NULL/false/16/0 og ferdig=JA',
    /plasseringer.*: 316/.test(et)&&/innledninger fylt.*: 18/.test(et)&&/19390.*NULL.*true/.test(et)&&/19697.*false.*true/.test(et)&&/kø-saker.*: 16/.test(et)&&/tom seksjon.*: 0/.test(et)&&/ferdig: JA/.test(et), et)
  // DIREKTE
  krev('19390 har plasseringer men NULL innledning',
    (await q(c,`select count(*)::int n from samling_ressurs_plassering srp join samlinger s on s.id=srp.samling_id where s.kilde_nid='19390'`))[0].n>0
    && (await q(c,`select si.beskrivelse from samling_innhold si join samlinger s on s.id=si.samling_id where s.kilde_nid='19390' and si.sprak='nb'`))[0].beskrivelse===null)
  krev('ingen plassering med tom seksjon', (await q(c,`select count(*)::int n from samling_ressurs_plassering where btrim(seksjon)=''`))[0].n===0)
  {
    // Beviser at par uten kilde_nid (TL-dans o.l.) holdes UTENFOR 368-tellingen: det finnes
    // ≥16 slike par (mine 16 + evt. pre-eksisterende i malen), mens kilde_nid-tellingen er 368.
    const tld=(await q(c,`select count(*)::int n from samling_ressurs sr join samlinger s on s.id=sr.samling_id where s.kilde_nid is null`))[0].n
    const m368=(await q(c,`select count(*)::int n from samling_ressurs sr join samlinger s on s.id=sr.samling_id where s.kilde_nid is not null`))[0].n
    krev('par uten kilde_nid (≥16) holdes utenfor 368-tellingen', tld>=16 && m368===368, `null-par=${tld}, kilde_nid-par=${m368}`)
  }
  await c.end(); adminSql(`drop database if exists ${DB}`); P('')
  // ---------- SPERRE-TESTER (fire retninger) ----------
  P('## Sperrene utløser')
  // 1) 368-par: slett ett par (fra 16190, ikke brukt av plassering) → 367
  await sperre('368-par: 367 → STOPP', async(c,ids)=>{
    await c.query(`delete from samling_ressurs where samling_id=$1 and ressurs_id=(select ressurs_id from samling_ressurs where samling_id=$1 limit 1)`,[ids.samId['16190']])
  }, /STOPP 124 \(368-par\).*fant 367/s)
  // 2) membership: hold 368, men fjern et plassering-nødvendig par og legg til et dummy
  await sperre('membership: nødvendig par mangler → STOPP', async(c,ids)=>{
    // 15468/13632 er første plassering-par; fjern det, legg til dummy på 16190 (holder 368)
    await c.query(`delete from samling_ressurs where samling_id=$1 and ressurs_id=$2`,[ids.samId['15468'],ids.lekId['13632']])
    const r=(await q(c,`insert into ressurser(status,ressurstype) values('publisert','lek') returning id`))[0].id
    await c.query(`insert into samling_ressurs(samling_id,ressurs_id) values($1,$2)`,[ids.samId['16190'],r])
  }, /STOPP 124 \(membership\)/s)
  // 3) idempotens: forhåndsinnsett en plassering-rad
  await sperre('idempotens: plassering ikke tom → STOPP', async(c,ids)=>{
    const r=(await q(c,`select ressurs_id from samling_ressurs where samling_id=$1 limit 1`,[ids.samId['15468']]))[0].ressurs_id
    await c.query(`insert into samling_ressurs_plassering(samling_id,ressurs_id,seksjon) values($1,$2,'x')`,[ids.samId['15468'],r])
  }, /STOPP 124 \(idempotens\)/s)
  // 4) tom seksjon: sabotér migrasjonens data (blank ut en seksjon)
  {
    const DB2='trivsel_124_sperre'; lagFerskDb(DB2)
    const s=new Client({connectionString:url(DB2)}); await s.connect(); await seed(s)
    const sabotert=readFileSync(M124,'utf8').replace(/'morgenen\/inne'/g, "''")
    let m=null; try{ await s.query(sabotert) }catch(e){ m=e.message; try{await s.query('rollback')}catch{} }
    krev('tom seksjon (sabotert data) → STOPP', !!m&&/STOPP 124 \(tom seksjon\)/.test(m), m||'(ingen feil!)')
    krev('  → ingen plassering skrevet', (await q(s,`select count(*)::int n from samling_ressurs_plassering`))[0].n===0)
    await s.end(); adminSql(`drop database if exists ${DB2}`)
  }
  P('')
  // ---------- Rollback-variant ----------
  P('## Rollback-variant → basen uendret')
  {
    const DB3='trivsel_124_rb'; lagFerskDb(DB3)
    const rb=new Client({connectionString:url(DB3)}); await rb.connect(); await seed(rb)
    const rbTekst=readFileSync(M124,'utf8').replace(/commit;(\s*)$/, 'rollback;$1')
    krev('rollback-variant bytter ut siste commit', rbTekst.includes('rollback;')&&!/commit;\s*$/.test(rbTekst))
    await rb.query(rbTekst)
    krev('0 plasseringer etter rollback', (await q(rb,`select count(*)::int n from samling_ressurs_plassering`))[0].n===0)
    krev('19697 fortsatt synlig etter rollback', (await q(rb,`select synlig from samlinger where kilde_nid='19697'`))[0].synlig===true)
    await rb.end(); adminSql(`drop database if exists ${DB3}`)
  }
  P('')
  P(feil===0?`RESULTAT: ${ok} OK, 0 FEIL.`:`RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if(feil!==0) process.exit(1)
}
async function sperre(navn,sabotasje,ventet){
  const DB='trivsel_124_sperre'; lagFerskDb(DB)
  const c=new Client({connectionString:url(DB)}); await c.connect()
  const ids=await seed(c)
  await sabotasje(c,ids)
  const foer=(await q(c,`select count(*)::int n from samling_ressurs_plassering`))[0].n  // baseline etter evt. sabotasje
  let m=null; try{ await c.query(readFileSync(M124,'utf8')) }catch(e){ m=e.message; try{await c.query('rollback')}catch{} }
  krev(navn, !!m&&ventet.test(m), m||'(ingen feil!)')
  krev('  → migrasjonen skrev 0 plasseringer (uendret)', (await q(c,`select count(*)::int n from samling_ressurs_plassering`))[0].n===foer)
  await c.end(); adminSql(`drop database if exists ${DB}`)
}
main().catch(e=>{console.error(e);process.exit(1)})
