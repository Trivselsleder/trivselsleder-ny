#!/usr/bin/env node
// N1-BEVIS (5. sep): ctx.pubDocNids er OBLIGATORISK i lek-passet.
// Uten parameteren skal byggLekPass/byggLek KASTE høylytt før noe bygges — aldri returnere 0 i stillhet.
// Med parameteren skal ressurs_dokument bli 75 som før.
//
//   node scripts/import/test-n1-pubdocnids.mjs
//
// «Uten»-delen trenger ingen base (vakten kaster før oppslag/DB røres). «Med»-delen måles i basen.

import { writeFileSync } from 'node:fs'
import { lesItems } from './lib/kilde.mjs'
import { Oppslag } from './lib/oppslag.mjs'
import { byggLek, byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { finnLenkesamlingNids, TESTNODE_NID } from './lib/samlingpass.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const KJORING_ID = detUuid('kjoring', 'test-n1-5sep')
const pub = (n) => n.status === 1 || n.status === '1'
const L = []
const P = (s) => { console.log(s); L.push(s) }

async function main() {
  P('# N1 — ctx.pubDocNids obligatorisk i lek-passet (5. sep)')
  P('')

  // ── DEL 1: UTEN parameteren → skal kaste høylytt (ingen base rørt) ──
  P('## 1. byggLekPass UTEN ctx.pubDocNids')
  let kastet = false, melding = ''
  try {
    byggLekPass([], KJORING_ID, null, null)   // vakten kaster før noe annet brukes
  } catch (e) { kastet = true; melding = e.message }
  P(`  kastet: ${kastet ? 'JA' : 'NEI'}`)
  P(`  feilmelding (ordrett): ${melding}`)
  // også byggLek direkte (den er eksportert og kan kalles standalone)
  let kastet2 = false, melding2 = ''
  try { byggLek({ nid: 1 }, KJORING_ID, null, null) } catch (e) { kastet2 = true; melding2 = e.message }
  P(`  byggLek direkte kastet: ${kastet2 ? 'JA' : 'NEI'}  ·  «${melding2}»`)
  if (!kastet || !kastet2) { P('  → FEIL: skulle ha kastet. STOPP.'); skrivUt(); throw new Error('N1: byggLekPass/byggLek kastet ikke uten pubDocNids.') }
  P('  → OK: hard stopp, ingen stille 0.')
  P('')

  // ── DEL 2: MED parameteren → ressurs_dokument = 75 ──
  P('## 2. byggLekPass MED ctx.pubDocNids (tomt Set → 0; ekte Set → 75)')
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const docs = lesItems(ZIP, 'Content/document-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const K = { catName: Object.fromEntries(catTerms.map(t => [String(t.tid), t.name])), eqName: Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name])) }
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t])), eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))
  const pubGames = games.filter(pub)
  const samlingNids = finnLenkesamlingNids(games)
  const lekNoder = pubGames.filter(n => !samlingNids.has(String(n.nid)) && String(n.nid) !== String(TESTNODE_NID))
  const pubDocs = docs.filter(pub)
  const pubDocNids = new Set(pubDocs.map(d => String(d.nid)))

  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  await k.query('begin')
  try {
    const o = new Oppslag(k)
    await o.lesFaste()
    const katT = new Set(), utsT = new Set()
    for (const n of lekNoder) { for (const c of (n.field_game_category || [])) if (c.tid != null) katT.add(String(c.tid)); for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsT.add(String(e.target_id)) }
    for (const tid of [...katT]) for (const p of (catByTid.get(tid)?.parents || [])) if (catByTid.has(String(p))) katT.add(String(p))
    await o.opprettEllerGjenbruk([...katT].map(t => catByTid.get(t)).filter(Boolean), [...utsT].map(t => eqByTid.get(t)).filter(Boolean))
    await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2) on conflict (id) do update set antall_noder=excluded.antall_noder`, [KJORING_ID, lekNoder.length])

    // Plan-nivå: tomt Set → 0 ressurs_dokument (men lenke_upublisert-kø synlig); ekte Set → 75.
    const planTom = byggLekPass(lekNoder, KJORING_ID, o, K, { pubDocNids: new Set() })
    const planEkte = byggLekPass(lekNoder, KJORING_ID, o, K, { pubDocNids })
    const køUpubTom = planTom.plan.redaksjonell_ko.filter(r => r.type === 'lenke_upublisert').length
    P(`  tomt Set:  ressurs_dokument plan = ${planTom.plan.ressurs_dokument.length}  ·  lenke_upublisert-kø = ${køUpubTom} (synlig, ikke stille)`)
    P(`  ekte Set:  ressurs_dokument plan = ${planEkte.plan.ressurs_dokument.length}`)

    // DB-nivå: skriv dokument-pass (FK) + lek-pass med ekte Set, tell ressurs_dokument.
    await skrivDokumentPass(k, byggDokumentPass(pubDocs, KJORING_ID, o).plan)
    await skrivLekPass(k, planEkte.plan)
    const rd = +(await k.query('select count(*) n from ressurs_dokument where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJORING_ID])).rows[0].n
    P(`  ressurs_dokument i basen (ekte Set): ${rd}   (forventet 75)`)
    if (rd !== 75) { P('  → FEIL: ikke 75.'); throw new Error(`N1: ressurs_dokument=${rd}, forventet 75.`) }
    P('  → OK: 75 som før.')
  } finally {
    await k.query('rollback')
    await k.end()
  }
  skrivUt()
}

function skrivUt() {
  const p = `${UT}/RESULTAT-N1-pubdocnids-5sep.txt`
  writeFileSync(p, L.join('\n') + '\n')
  console.log('\nResultatfil:', p)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
