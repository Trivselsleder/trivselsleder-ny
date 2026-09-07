#!/usr/bin/env node
// MEKANISK TEST av samlings-passet (steg 11) mot en ekte 001→102-base.
// Kjører oppslag + lek-pass (medlemsleker) + dokument-pass (mål-dokumenter) som forutsetning,
// så samlings-passet. Teller FAKTISKE rader, kjører to ganger for determinisme, ruller tilbake.

import { lesItems, lesFilindeks } from './lib/kilde.mjs'
import { Oppslag } from './lib/oppslag.mjs'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { finnLenkesamlingNids, byggSamlingPass, skrivSamlingPass, TESTNODE_NID } from './lib/samlingpass.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const KJORING_ID = detUuid('kjoring', 'test-samling-4sep')
const pub = (n) => n.status === 1 || n.status === '1'

async function tell(k) {
  const q = async (sql, p = []) => +(await k.query(sql, p)).rows[0].n
  const samlingFilter = 'where samling_id in (select id from samlinger where import_kjoring_id=$1)'
  return {
    samlinger: await q('select count(*) n from samlinger where import_kjoring_id=$1', [KJORING_ID]),
    samling_innhold: await q(`select count(*) n from samling_innhold ${samlingFilter}`, [KJORING_ID]),
    samling_ressurs: await q(`select count(*) n from samling_ressurs ${samlingFilter}`, [KJORING_ID]),
    samling_medie: await q('select count(*) n from samling_medie where import_kjoring_id=$1', [KJORING_ID]),
    samling_dokument: await q(`select count(*) n from samling_dokument ${samlingFilter}`, [KJORING_ID]),
    ressurs_dokument: await q('select count(*) n from ressurs_dokument where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJORING_ID]),
  }
}

async function main() {
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const docs = lesItems(ZIP, 'Content/document-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const K = { catName: Object.fromEntries(catTerms.map(t => [String(t.tid), t.name])), eqName: Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name])) }
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t])), eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))

  const samlingNids = finnLenkesamlingNids(games)                 // C1: alle 21
  const aliasTilNid = new Map(games.filter(g => g.url_alias).map(g => [g.url_alias, String(g.nid)]))
  const avpubGameNids = new Set(games.filter(g => !pub(g)).map(g => String(g.nid)))
  const pubGames = games.filter(pub)
  // Leke-strømmen: publiserte game-noder MINUS samlinger MINUS testnoden.
  const lekNoder = pubGames.filter(n => !samlingNids.has(String(n.nid)) && String(n.nid) !== String(TESTNODE_NID))
  const lekNids = new Set(lekNoder.map(n => String(n.nid)))
  const pubSamlinger = games.filter(n => samlingNids.has(String(n.nid)) && pub(n))   // 20 (17734 avpub ut)
  const pubDocs = docs.filter(pub)
  const pubDocNids = new Set(pubDocs.map(d => String(d.nid)))

  // Referte termer for opprett-eller-gjenbruk (fra leke-strømmen).
  const katT = new Set(), utsT = new Set()
  for (const n of lekNoder) { for (const c of (n.field_game_category || [])) if (c.tid != null) katT.add(String(c.tid)); for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsT.add(String(e.target_id)) }
  for (const tid of [...katT]) for (const p of (catByTid.get(tid)?.parents || [])) if (catByTid.has(String(p))) katT.add(String(p))
  const kategoriTermer = [...katT].map(t => catByTid.get(t)).filter(Boolean)
  const utstyrTermer = [...utsT].map(t => eqByTid.get(t)).filter(Boolean)

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  const P = (s) => console.log(s)

  await k.query('begin')
  try {
    const o = new Oppslag(k)
    await o.lesFaste()
    await o.opprettEllerGjenbruk(kategoriTermer, utstyrTermer)
    await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2) on conflict (id) do update set antall_noder=excluded.antall_noder`, [KJORING_ID, lekNoder.length])

    // Forutsetninger, FK-ordnet: dokument-passet FØRST (ressurs_dokument.dokument_id → dokumenter),
    // så lek-passet (medlemsleker + ressurs_dokument via lek-veien, F3). pubDocNids ruter lek→dokument.
    await skrivDokumentPass(k, byggDokumentPass(pubDocs, KJORING_ID, o).plan)
    await skrivLekPass(k, byggLekPass(lekNoder, KJORING_ID, o, K, { pubDocNids }).plan)

    const ctx = { aliasTilNid, lekNids, avpubGameNids, pubDocNids, samlingNids }
    const egnetFør = +(await k.query('select count(*) n from ressurs_egnet where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJORING_ID])).rows[0].n

    // ── Samlings-passet ──
    const s1 = byggSamlingPass(pubSamlinger, KJORING_ID, o, ctx)
    await skrivSamlingPass(k, s1.plan)
    const t1 = await tell(k)
    const egnetEtter = +(await k.query('select count(*) n from ressurs_egnet where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJORING_ID])).rows[0].n

    // ── Determinisme: kjør en gang til på samme base ──
    await skrivSamlingPass(k, byggSamlingPass(pubSamlinger, KJORING_ID, o, ctx).plan)
    const t2 = await tell(k)

    // ── Rapport ──
    P(`# Samlings-pass (steg 11) — mekanisk test mot 001→102-base`)
    P(`Lenkesamlinger (C1): ${samlingNids.size} totalt · ${pubSamlinger.length} publisert (17734 avpublisert ut, FLAGG D)`)
    P(`Leke-strømmen: ${lekNoder.length} leker (867 publiserte − 20 samlinger − testnode 20062)`)
    P(``)
    P(`## FAKTISK skrevet i basen (0 FK/CHECK-feil)`)
    for (const t of Object.keys(t1)) P(`  ${t.padEnd(18)} ${t1[t]}`)
    P(`  ressurs_egnet-merking (vei A): ${egnetEtter - egnetFør} nye egnet-rader på medlemsleker`)
    P(``)
    P(`## Plan-telling (samlings-passet)`)
    for (const t of Object.keys(s1.telling)) P(`  ${t.padEnd(18)} ${s1.telling[t]}`)
    P(``)
    P(`## redaksjonell_ko per type (samlings-passet)`)
    for (const [t, n] of Object.entries(s1.køTyper).sort((a, b) => b[1] - a[1])) P(`  ${t.padEnd(22)} ${n}`)
    if (!Object.keys(s1.køTyper).length) P(`  (ingen)`)
    P(``)
    P(`## Determinisme (kjøring 1 vs 2 på samme base)`)
    const likt = Object.keys(t1).every(t => t1[t] === t2[t])
    for (const t of Object.keys(t1)) P(`  ${t.padEnd(18)} kjøring1=${t1[t]}  kjøring2=${t2[t]}  ${t1[t] === t2[t] ? 'OK' : 'AVVIK!'}`)
    P(``)
    P(likt ? `RESULTAT: identiske tall i begge kjøringer → deterministisk og idempotent. IDer skrevet, ikke navn.` : `RESULTAT: AVVIK — se over.`)
  } finally {
    await k.query('rollback')
    await k.end()
  }
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
