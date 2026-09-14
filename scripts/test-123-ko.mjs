#!/usr/bin/env node
// BEVIS for migrasjon 123 (lukk avgjorte redaksjonskø-saker). Lokal Postgres 17, klon av
// trivsel_prodmal_118. Ingen prod. Rettet 13. sep: de 7 avviste (4 komp + S66/S67/S70) får
// status='avvist' («Avvist»-fanen); de 75 øvrige beholder 'lost'. S69 kobles kun til 191.
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
const M123 = path.join(ROT, 'supabase/migrations/123_lukk_avgjorte_ko_saker.sql')
const FV = path.join(ROT, '_kontroll-import/123-forhandsvisning.sql')
const ETT = path.join(ROT, '_kontroll-import/123-etter.sql')
const url = (db) => `postgresql://${USER}@${HOST}:5432/${db}`
const KJARTAN = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
const BEKREFT60 = [
  'd6ac4231-d4aa-eba2-05a6-d18edb6a1d19',
  'da30fd08-a97c-e999-8b50-386d1d2fd4e4',
  'bb4d6f0a-9e97-1347-8294-c059c1fefba2',
  '201a83c6-8950-d6e0-0438-ed418d1e2f8c',
  'b584c90d-11c9-859c-4d28-1f549270eb95',
  '41fb254b-012d-558f-3490-6fa6d40599be',
  '3bd61198-47eb-2b57-9dfe-9e9bd406e93c',
  '79772a94-b2e0-7a6c-b187-f21b1d185cd2',
  'f0444d13-c28a-cecb-dc1e-1371e9a11c7f',
  'ae93904f-9fc7-6852-b172-9ff3a772db3e',
  '20d965dc-fb9e-3591-6fe3-099d5dc1afdf',
  'e236724f-8064-1e3e-7ff2-ad0d8c555961',
  '2d5eee43-522b-1636-15d6-c6a1f191029f',
  '81f82d7e-ec7c-c98a-6012-063017f4b3a4',
  'fb820c03-c7b0-f034-4872-c182a368c98c',
  'cd624d64-3bcf-1965-c905-dfe8a74b0bce',
  '07e63b1c-98c0-7cd7-ffd4-4f32ca49b2e9',
  'e9a50722-97b1-8ddf-81f6-40f2d3c3b9c2',
  'ebe2dd7f-b881-3ec5-7eac-16a97ea49b5c',
  'c7938cc1-323e-7922-5698-57fe14fe0de6',
  '255f1118-8977-1330-85ea-bb5c175bb766',
  '26bb597f-099f-c783-d601-79fff35d8045',
  '79ab74b8-5a21-0b0e-9430-996e74085acb',
  '170a23b8-dd6d-38f8-bcf8-c683064757f2',
  'f2f79f6d-8d18-3df7-257b-a5b3156c1e6b',
  '04cd1b9c-4580-3e08-bb5a-9f16110f0030',
  'c557fcaa-b023-f3f5-0cef-d5417c2e6441',
  '2907eb07-6349-0cdf-93d4-70daddd9175d',
  'bb08acf9-99b9-0685-d61a-dc16d17dcb3f',
  '01985eed-9e59-7120-da5f-eb27f397cba1',
  '9ba98386-de10-d639-9061-2527e22025fc',
  'ef9373b7-17f1-7e97-1e97-b24bfeda14d3',
  '5dd5b0cd-5d3d-ce95-753c-1c01c16835ae',
  '818e46cc-727b-3a5a-dc85-3c2d0f819f93',
  '556a8981-e14d-d582-b0be-79633f602a83',
  'e6227e07-899b-d42e-5922-084306b4ec07',
  '18ee679f-f13c-cfbe-49f2-6dc35849802f',
  '0813ccc3-cc85-b256-75e7-ab47dd0d2e17',
  'e38ad6fb-359f-076b-ab5c-8fe048ca9642',
  '8c6b3d67-93c5-df03-0e6a-25a1bc0f8d4d',
  'ffe5d93d-df65-d534-5de7-455434ae72f7',
  '0b6ddc93-3024-b066-35c0-34cc4d467c9c',
  'df53f9ce-8cf0-421e-e50e-7a2066a2ebf0',
  '47590652-f006-6073-3bdf-cd6f199ab222',
  '5e21ac74-b7a1-52a9-cef7-21b421827f88',
  '65b86320-d088-f362-bdeb-c5ae0c76e832',
  '2e319427-67aa-842c-f588-4c54a39524a6',
  '076b19f0-56ad-53c8-1b1c-5668dcd4621e',
  'c1b01dd8-b249-10de-ebb8-e74c10639c7e',
  '869e928b-0a94-de8b-5695-b964929bf7b8',
  'abec2746-9223-0939-80c1-618ab45d91d9',
  '20bd4379-8bdc-2f5f-86d2-39a1c6aaf337',
  '1a7d84c2-69c4-b53c-b892-9e9df15041df',
  '4c1f096b-7cc0-9565-6ad6-7ad14f780faf',
  'aaf14dfd-ef14-f881-d4d4-52540195543c',
  '8eeb8161-dd6d-abb6-2b34-4b4f4b98fe9c',
  '347a7a53-d6d0-0b97-5778-db3b7d7af0c2',
  'e5d60082-fd97-cb48-78f3-543f4a70d876',
  'ab3f8c74-38db-0ff6-3a15-78a5ec34dbc6',
  '2873832e-aaf6-86d5-43a0-db40754159f8'
]
const AVVIS4 = [
  'a5aafc7e-6575-9590-78ab-cfeec07a3a64',
  'b74097e5-a85d-3111-a262-79e5bfe81948',
  'ed8d0152-db7f-b989-214a-f0dc704f01c7',
  'a812aacd-18a6-6a55-1253-c45379b5930a'
]
const EN12 = [
  '06603b99-8a81-dedf-c92c-9d5293970c5f',
  '11911755-731b-913e-70f4-ab91736b01aa',
  '11df313d-ff36-426a-b7f8-fea7352ff0a2',
  '2a6a7246-0cce-1415-e837-e91f91fa291a',
  '4c7c9e6d-d7ea-e7e9-a3fe-4312dee1e74b',
  '4fe29c7b-073b-02ac-1b3a-770c2c25f21f',
  'c3160f17-a641-14ed-deb6-15c655f23975',
  'd59672a5-7be6-98d1-0925-63399b2bbe8f',
  'd7ee2ed9-56cd-a13a-d332-2d8950ecb9b6',
  'ec386c27-7140-6ef8-6e63-2da712227665',
  'f8ae1c09-3034-dd69-65b7-6c6b45480f6c',
  'fb1b39f3-7308-980d-1c0d-7f5a96ac0f76'
]
const S = {"S65": "e2b32dfa-acb6-8032-ce7b-68b69243fa00", "S66": "c815c4b8-f68c-d63c-664a-144665ef46dd", "S67": "c66d9be7-3f19-6e1c-d87e-55fb5bbdca61", "S68": "56e7579e-14af-66e0-3bbd-9534412ce6db", "S69": "feb2a6f4-0ded-ac3e-e5a5-498e622dd62c", "S70": "a047475a-f828-e6fd-5cbe-688b0683481f"}
const AVVISTE7 = AVVIS4.concat([S.S66, S.S67, S.S70])   // skal bli status='avvist'
let ok=0, feil=0
const P=(s)=>console.log(s)
const krev=(n,b,d='')=>{P(`  ${b?'OK  ':'FEIL'} ${n}${d?'  — '+d:''}`); b?ok++:feil++}
async function q(c,sql,p){return (await c.query(sql,p)).rows}
function adminSql(sql,db='postgres'){execFileSync('psql',['-X','-q','-d',url(db),'-c',sql],{stdio:'pipe'})}
function lagFerskDb(navn){
  adminSql(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`)
  adminSql(`drop database if exists ${navn}`); adminSql(`create database ${navn} template ${TMPL}`)
}
async function nyRessurs(c){return (await q(c,`insert into ressurser(status,ressurstype) values('publisert','lek') returning id`))[0].id}
async function nyMaal(c,id){await c.query(`insert into kompetansemaal(id,tekst,utgatt) overriding system value values($1,$2,false) on conflict (id) do nothing`,[id,'mål '+id])}
async function seed(c,{omit=null}={}){
  await c.query(`insert into auth.users(id,email) values($1,'k@test') on conflict do nothing`,[KJARTAN])
  await c.query(`insert into profiles(id,rolle,aktiv) values($1,'superadmin',true) on conflict (id) do update set rolle='superadmin'`,[KJARTAN])
  for (const m of [1255,1254,191,252]) await nyMaal(c,m)
  const alle = BEKREFT60.concat(AVVIS4)
  for (let i=0;i<alle.length;i++){
    const koid=alle[i]; if (koid===omit) continue
    const r=await nyRessurs(c); const m=900001+i
    await nyMaal(c,m)
    await c.query(`insert into ressurs_kompetansemaal_forslag(ressurs_id,kompetansemaal_id,status) values($1,$2,'ny')`,[r,m])
    await c.query(`insert into redaksjonell_ko(id,type,ressurs_id,kompetansemaal_id,status) values($1,'usikker_maalkobling',$2,$3,'ny')`,[koid,r,m])
  }
  for (const koid of EN12){ if (koid===omit) continue
    const dok=(await q(c,`insert into dokumenter(tittel,status) values('en-dok','publisert') returning id`))[0].id
    await c.query(`insert into redaksjonell_ko(id,type,dokument_id,status) values($1,'annet',$2,'ny')`,[koid,dok])
  }
  for (const k of Object.keys(S)){ if (S[k]===omit) continue
    const r=await nyRessurs(c)
    await c.query(`insert into redaksjonell_ko(id,type,ressurs_id,kompetansemaal_id,status) values($1,'manglende_maal',$2,null,'ny')`,[S[k],r])
  }
}
async function sperreTest(navn,omit,ventet){
  const DB='trivsel_123_sperre'; lagFerskDb(DB)
  const s=new Client({connectionString:url(DB)}); await s.connect()
  await seed(s,{omit})
  let m=null
  try { await s.query(readFileSync(M123,'utf8')) } catch(e){ m=e.message; try{await s.query('rollback')}catch{} }
  krev(navn, !!m&&ventet.test(m), m||'(ingen feil!)')
  krev('  → ingenting skrevet (0 lost/avvist)', (await q(s,`select count(*)::int n from redaksjonell_ko where status in ('lost','avvist')`))[0].n===0)
  await s.end(); adminSql(`drop database if exists ${DB}`)
}
async function main(){
  const DB='trivsel_123_test', RB='trivsel_123_rb'
  P('# Bevis: migrasjon 123 (rettet 13. sep: avvist-status + S69-begrunnelse)\n')
  lagFerskDb(DB)
  const c=new Client({connectionString:url(DB)}); await c.connect()
  await seed(c)
  const fvFor=(await q(c,readFileSync(FV,'utf8')))[0].forhandsvisning_123
  krev('forhåndsvisning FØR: 60/4/12/3/3 og klar=JA', /BEKREFT→lost \(ny\): 3/.test(fvFor)&&/AVVIS→avvist \(ny\): 3/.test(fvFor)&&/klar.*JA/.test(fvFor), fvFor)
  krev('etter-fil FØR: alt_behandlet=NEI', /alt_behandlet: NEI/.test((await q(c,readFileSync(ETT,'utf8')))[0].etter_123))
  const res=await c.query(readFileSync(M123,'utf8'))
  const kv=(Array.isArray(res)?res:[res]).map(r=>r.rows&&r.rows[0]).filter(r=>r&&'kvittering'in r).pop()
  P('  KVITTERING: '+(kv?kv.kvittering:'(ingen)'))
  const K=kv?.kvittering||''
  krev('kvittering g1=60', /gruppe1 komp BEKREFT \(forslag godkjent\): 60/.test(K))
  krev('kvittering g2=4',  /gruppe2 komp AVVIS \(forslag avvist\): 4/.test(K))
  krev('kvittering g3=12', /gruppe3 «en»-dok LUKKET: 12/.test(K))
  krev('kvittering g4 (lost)=3', /gruppe4 S65-S70 BEKREFT \(lost\): 3/.test(K))
  krev('kvittering g5 (avvist)=3', /gruppe5 S65-S70 AVVIS \(avvist\): 3/.test(K))
  krev('kvittering kø LØST=75', /kø LØST \(status=lost, skal være 75\): 75/.test(K))
  krev('kvittering kø AVVIST=7', /kø AVVIST \(status=avvist, skal være 7\): 7/.test(K))
  krev('kvittering 63 koblinger', /nye menneske-koblinger totalt: 63/.test(K))
  const et=(await q(c,readFileSync(ETT,'utf8')))[0].etter_123
  krev('etter-fil ETTER: g1=60,g2=4/4,g3=12,g4=3,g5=3,kobl=3,252=0,LØST=75,AVVIST=7,JA',
    /GODKJENT \(av de 60\): 60/.test(et)&&/forslag avvist \/ kø avvist\): 4 \/ 4/.test(et)&&/LØST \(lost\): 12/.test(et)&&/BEKREFT LØST \(lost\): 3/.test(et)&&/AVVIS \(avvist\): 3/.test(et)&&/koblinger.*: 3/.test(et)&&/252 \(skal være 0\): 0/.test(et)&&/LØST \(status=lost, av de 82, skal være 75\): 75/.test(et)&&/AVVIST \(status=avvist, av de 82, skal være 7\): 7/.test(et)&&/alt_behandlet: JA/.test(et), et)
  // DIREKTE: de 7 avviste = 'avvist', de 75 øvrige = 'lost'
  krev('de 7 avviste har status=avvist', (await q(c,`select count(*)::int n from redaksjonell_ko where id=any($1) and status='avvist'`,[AVVISTE7]))[0].n===7)
  krev('ingen av de 7 er lost', (await q(c,`select count(*)::int n from redaksjonell_ko where id=any($1) and status='lost'`,[AVVISTE7]))[0].n===0)
  const ovrige75 = BEKREFT60.concat(EN12,[S.S65,S.S68,S.S69])
  krev('de 75 øvrige har status=lost', (await q(c,`select count(*)::int n from redaksjonell_ko where id=any($1) and status='lost'`,[ovrige75]))[0].n===75)
  krev('ingen av de 75 er avvist', (await q(c,`select count(*)::int n from redaksjonell_ko where id=any($1) and status='avvist'`,[ovrige75]))[0].n===0)
  krev('S69 koblet KUN til 191 (ikke 252)',
    (await q(c,`select count(*)::int n from ressurs_kompetansemaal where ressurs_id=(select ressurs_id from redaksjonell_ko where id=$1) and kompetansemaal_id=252`,[S.S69]))[0].n===0
    && (await q(c,`select count(*)::int n from ressurs_kompetansemaal where ressurs_id=(select ressurs_id from redaksjonell_ko where id=$1) and kompetansemaal_id=191`,[S.S69]))[0].n===1)
  await c.end(); adminSql(`drop database if exists ${DB}`); P('')
  P('## Hard sperre utløser (uendret 60/4/12/3/3)')
  await sperreTest('drop 1 BEKREFT → gruppe 1 fant 59', BEKREFT60[0], /STOPP 123 \(gruppe 1\).*fant 59/s)
  await sperreTest('drop S66 (AVVIS) → gruppe 5 fant 2', S.S66, /STOPP 123 \(gruppe 5.*fant 2/s)
  P('')
  P('## Rollback-variant → basen uendret')
  lagFerskDb(RB)
  const rb=new Client({connectionString:url(RB)}); await rb.connect()
  await seed(rb)
  const rbTekst=readFileSync(M123,'utf8').replace(/commit;(\s*)$/, 'rollback;$1')
  krev('rollback-variant bytter ut siste commit', rbTekst.includes('rollback;')&&!/commit;\s*$/.test(rbTekst))
  await rb.query(rbTekst)
  krev('alle 82 kø-rader fortsatt ny etter rollback', (await q(rb,`select count(*)::int n from redaksjonell_ko where status='ny'`))[0].n===82)
  await rb.end(); adminSql(`drop database if exists ${RB}`); P('')
  P(feil===0?`RESULTAT: ${ok} OK, 0 FEIL.`:`RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if(feil!==0) process.exit(1)
}
main().catch(e=>{console.error(e);process.exit(1)})
