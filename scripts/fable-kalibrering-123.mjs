#!/usr/bin/env node
// Fable-kalibrering av migrasjon 123 — UAVHENGIG av byggerens test. Gjenbruker kun seed()
// fra byggerens fixture-idé (samme id-er), men egne scenarier og egne kontrollspørringer.
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const { Client } = pg
const TMPL = 'trivsel_prodmal_118'
const url = (db) => `postgresql://postgres@localhost:5432/${db}`
const M123 = readFileSync('supabase/migrations/123_lukk_avgjorte_ko_saker.sql', 'utf8')
const ETT = readFileSync('_kontroll-import/123-etter.sql', 'utf8')
const KJARTAN = '9ee20e27-c5c2-4917-a6ba-4b3baedabf11'
const U = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const arr = (n) => M123.match(new RegExp(n + '\\s+uuid\\[\\]\\s*:=\\s*array\\[([\\s\\S]*?)\\];'))[1].match(U)
const BEK = arr('v_bekreft60'), AVV = arr('v_avvis4'), EN = arr('v_en12'), SB = arr('v_s_bekreft'), SA = arr('v_s_avvis')
const S65 = 'e2b32dfa-acb6-8032-ce7b-68b69243fa00', S68 = '56e7579e-14af-66e0-3bbd-9534412ce6db', S69 = 'feb2a6f4-0ded-ac3e-e5a5-498e622dd62c'
let ok = 0, feil = 0
const krev = (n, b, d = '') => { console.log(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
const q = async (c, s, p) => (await c.query(s, p)).rows
function adm(sql) { execFileSync('psql', ['-X', '-q', '-d', url('postgres'), '-c', sql], { stdio: 'pipe' }) }
function fersk(navn) { adm(`select pg_terminate_backend(pid) from pg_stat_activity where datname='${navn}' and pid<>pg_backend_pid()`); adm(`drop database if exists ${navn}`); adm(`create database ${navn} template ${TMPL}`) }
async function seed(c) {
  await c.query(`insert into auth.users(id,email) values($1,'k@test') on conflict do nothing`, [KJARTAN])
  await c.query(`insert into profiles(id,rolle,aktiv) values($1,'superadmin',true) on conflict (id) do update set rolle='superadmin'`, [KJARTAN])
  for (const m of [1255, 1254, 191, 252]) await c.query(`insert into kompetansemaal(id,tekst,utgatt) overriding system value values($1,$2,false) on conflict (id) do nothing`, [m, 'mål ' + m])
  const alle = BEK.concat(AVV)
  for (let i = 0; i < alle.length; i++) {
    const r = (await q(c, `insert into ressurser(status,ressurstype) values('publisert','lek') returning id`))[0].id, m = 900001 + i
    await c.query(`insert into kompetansemaal(id,tekst,utgatt) overriding system value values($1,$2,false)`, [m, 'mål ' + m])
    await c.query(`insert into ressurs_kompetansemaal_forslag(ressurs_id,kompetansemaal_id,status) values($1,$2,'ny')`, [r, m])
    await c.query(`insert into redaksjonell_ko(id,type,ressurs_id,kompetansemaal_id,status) values($1,'usikker_maalkobling',$2,$3,'ny')`, [alle[i], r, m])
  }
  for (const k of EN) { const d = (await q(c, `insert into dokumenter(tittel,status) values('en-dok','publisert') returning id`))[0].id; await c.query(`insert into redaksjonell_ko(id,type,dokument_id,status) values($1,'annet',$2,'ny')`, [k, d]) }
  for (const k of SB.concat(SA)) { const r = (await q(c, `insert into ressurser(status,ressurstype) values('publisert','lek') returning id`))[0].id; await c.query(`insert into redaksjonell_ko(id,type,ressurs_id,kompetansemaal_id,status) values($1,'manglende_maal',$2,null,'ny')`, [k, r]) }
}
async function tilstand(c) {
  const r = (await q(c, `select (select count(*) from redaksjonell_ko where status<>'ny') as lukket, (select count(*) from ressurs_kompetansemaal) as kobl, (select count(*) from ressurs_kompetansemaal_forslag where status<>'ny') as forslag`))[0]
  return `lukket=${r.lukket} koblinger=${r.kobl} forslag_behandlet=${r.forslag}`
}
async function scenario(navn, forbered, ventet, sqlTekst = M123) {
  const DB = 'fable_123_s'; fersk(DB); const c = new Client({ connectionString: url(DB) }); await c.connect(); await seed(c); await forbered(c)
  const t0 = await tilstand(c)
  let m = null
  try { await c.query(sqlTekst) } catch (e) { m = e.message; try { await c.query('rollback') } catch {} }
  const t = await tilstand(c)
  krev(navn, !!m && ventet.test(m), (m || '(INGEN FEIL — migrasjonen fullførte!)').slice(0, 110))
  krev('   → basen urørt (samme tilstand som før kjøring)', t === t0, `før: ${t0} · etter: ${t}`)
  await c.end(); adm(`drop database if exists ${DB}`)
}
// ---------------------------------------------------------------------------
console.log('# A) SPERREN — tre nye retninger (ikke drop, men status/type/allerede lukket)')
await scenario('gruppe 3: én «en»-rad står under_arbeid (ikke ny) → forventer STOPP gruppe 3, fant 11',
  (c) => c.query(`update redaksjonell_ko set status='under_arbeid' where id=$1`, [EN[5]]), /STOPP 123 \(gruppe 3\).*fant 11/s)
await scenario('gruppe 2: én AVVIS-rad har feil type (manglende_maal) → STOPP gruppe 2, fant 3',
  (c) => c.query(`update redaksjonell_ko set type='manglende_maal' where id=$1`, [AVV[2]]), /STOPP 123 \(gruppe 2\).*fant 3/s)
await scenario('gruppe 4: S69 allerede lukket i UI (lost) → STOPP gruppe 4, fant 2',
  (c) => c.query(`update redaksjonell_ko set status='lost', lost_at=now(), lost_av=$2 where id=$1`, [S69, KJARTAN]), /STOPP 123 \(gruppe 4.*fant 2/s)
await scenario('rollevakt: Kjartans profil er IKKE superadmin (rolle=skoleadmin) → RPC raiser «Ingen tilgang», alt rulles tilbake',
  (c) => c.query(`update profiles set rolle='skoleadmin' where id=$1`, [KJARTAN]), /Ingen tilgang/)
await scenario('ekte kjøring to ganger: andre kjøring stopper på gruppe 1 (fant 0)',
  async (c) => { await c.query(M123) }, /STOPP 123 \(gruppe 1\).*fant 0/s)
// ---------------------------------------------------------------------------
console.log('\n# B) SPERRENS BLINDSONE — bytt S14 (AVVIS) og S1 (BEKREFT) om i migrasjonen: sperren ser fortsatt 60/4')
{
  const byttet = M123.replace(BEK[0], '@@').replace(AVV[0], BEK[0]).replace('@@', AVV[0])
  const DB = 'fable_123_b'; fersk(DB); const c = new Client({ connectionString: url(DB) }); await c.connect(); await seed(c)
  let m = null; try { await c.query(byttet) } catch (e) { m = e.message }
  krev('byttet migrasjon FULLFØRER (sperren fanger IKKE bytte innen samme type)', m === null, m || '')
  const s14 = (await q(c, `select f.status from ressurs_kompetansemaal_forslag f join redaksjonell_ko k on k.ressurs_id=f.ressurs_id and k.kompetansemaal_id=f.kompetansemaal_id where k.id=$1`, [AVV[0]]))[0].status
  krev('→ S14 Brøkkampen ville blitt GODKJENT (feil) — dette fanges KUN av id-diffen mot grunnlaget (kontrollpunkt 1)', s14 === 'godkjent', 'forslag.status=' + s14)
  // min id-diff (samme metode som i rapporten) mot grunnlagets 4 avviste
  const avvGrunnlag = new Set(['a5aafc7e-6575-9590-78ab-cfeec07a3a64', 'b74097e5-a85d-3111-a262-79e5bfe81948', 'ed8d0152-db7f-b989-214a-f0dc704f01c7', 'a812aacd-18a6-6a55-1253-c45379b5930a'])
  const avvByttet = byttet.match(/v_avvis4\s+uuid\[\]\s*:=\s*array\[([\s\S]*?)\];/)[1].match(U)
  krev('id-diffen oppdager byttet', avvByttet.some((x) => !avvGrunnlag.has(x)), 'kun_migr=' + avvByttet.filter((x) => !avvGrunnlag.has(x)))
  await c.end(); adm(`drop database if exists ${DB}`)
}
// ---------------------------------------------------------------------------
console.log('\n# C) FEILKOBLING — S65 kobles til 1254 i stedet for 1255 (byggerfeil): fanger kontrollen det?')
{
  const feilk = M123.replace("values (v_res, 1255, 'menneske'", "values (v_res, 1254, 'menneske'")
  const DB = 'fable_123_c'; fersk(DB); const c = new Client({ connectionString: url(DB) }); await c.connect(); await seed(c)
  let m = null; try { await c.query(feilk) } catch (e) { m = e.message }
  krev('feilkoblet migrasjon fullfører uten feil (ingen sperre på målvalg)', m === null, m || '')
  const et = (await q(c, ETT))[0].etter_123
  krev('123-etter.sql avslører det: «nye menneske-koblinger (S65→1255…)» = 2, ikke 3', /koblinger \(S65→1255, S68→1254, S69→191\): 2/.test(et), et.match(/koblinger[^·]*/)[0])
  // min egen fasit-spørring: forventet (kø-id → mål) for de tre
  const fasit = [[S65, 1255], [S68, 1254], [S69, 191]]
  const avvik = []
  for (const [ko, maal] of fasit) {
    const r = await q(c, `select array_agg(rk.kompetansemaal_id order by 1) as maal from ressurs_kompetansemaal rk where rk.ressurs_id=(select ressurs_id from redaksjonell_ko where id=$1)`, [ko])
    const got = (r[0].maal || []).join(','); if (got !== String(maal)) avvik.push(`${ko.slice(0, 8)}: fikk [${got}], ventet [${maal}]`)
  }
  krev('min fasit-spørring peker på riktig sak', avvik.length === 1 && avvik[0].startsWith('e2b32dfa'), avvik.join('; '))
  await c.end(); adm(`drop database if exists ${DB}`)
}
// ---------------------------------------------------------------------------
console.log('\n# D) EKTE KJØRING — status-fordeling etterpå (kontrollpunkt 7) og behandler-spor')
{
  const DB = 'fable_123_d'; fersk(DB); const c = new Client({ connectionString: url(DB) }); await c.connect(); await seed(c)
  await c.query(M123)
  const st = await q(c, `select status, count(*)::int n from redaksjonell_ko group by 1 order by 1`)
  console.log('  kø-status etter 123:', st.map((r) => `${r.status}=${r.n}`).join(' · '))
  krev('ALLE 82 står som lost — ingen står som avvist (frontend har egen «Avvist»-fane/knapp)', st.length === 1 && st[0].status === 'lost' && st[0].n === 82)
  const beh = (await q(c, `select (select count(*) from redaksjonell_ko where lost_av=$1) as lost_av, (select count(*) from ressurs_kompetansemaal where bekreftet_av=$1) as bekreftet_av, (select count(*) from ressurs_kompetansemaal_forslag where behandlet_av=$1) as behandlet_av`, [KJARTAN]))[0]
  krev('behandler = Kjartan overalt (82 lost_av, 63 bekreftet_av, 64 behandlet_av)', beh.lost_av == 82 && beh.bekreftet_av == 63 && beh.behandlet_av == 64, JSON.stringify(beh))
  // Malen har 2 koblinger fra før (seed, bekreftet_av null). De 63 nye må ALLE ha bekreftet_av=Kjartan.
  const nye = (await q(c, `select count(*)::int n, count(*) filter (where bekreftet_av=$1)::int k from ressurs_kompetansemaal where bekreftet_at is not null`, [KJARTAN]))[0]
  krev('de 63 nye koblingene har bekreftet_av=Kjartan (RPC fikk auth.uid() via set_config)', nye.n === 63 && nye.k === 63, JSON.stringify(nye))
  await c.end(); adm(`drop database if exists ${DB}`)
}
console.log(`\nRESULTAT: ${ok} OK, ${feil} FEIL.`)
