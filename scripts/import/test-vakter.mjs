#!/usr/bin/env node
// VAKT-BEVIS (OPPGAVE A/B/C, 5. sep): utelat HVER parameter i HVERT av de fem passene, og vis at
// hver gir en NAVNGITT hard stopp («HARD STOPP (<pass>): …») — ikke en tilfeldig TypeError.
// En TypeError inneholder aldri «HARD STOPP», så testen skiller de to. Del 2 (DB) viser OPPGAVE A
// positivt: med korrekt lekNids gir samlings-passet 355 medlemslenker og 155 vei-A-merker.
//
//   node scripts/import/test-vakter.mjs
//
// Del 1 er REN (ingen pg, ingen socket). Del 2 kjører mot lokal base (BEGIN/ROLLBACK).

import { writeFileSync } from 'node:fs'
import { byggLekPass } from './lib/lekpass.mjs'
import { byggMediePass } from './lib/mediepass.mjs'
import { byggDokumentPass } from './lib/dokumentpass.mjs'
import { byggSamlingPass, byggSamling } from './lib/samlingpass.mjs'
import { seedUdirMaal, byggOgSkrivAktivLaering } from './lib/aktivlaering.mjs'
import { byggKontekst, kjorAlleFem, KJ } from './test-alle-fem-pass.mjs'
import { detUuid } from './lib/uuid.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const L = []
const P = (s) => { console.log(s); L.push(s) }

// Gyldige stubs (nok til å passere ANDRE vakter, så den ene som testes er årsaken).
const KID = detUuid('kjoring', 'vakt-test')
const oppslagStub = { egnetId() {}, kategoriId() {}, dokumentTypeId() {}, fagId() {} }
const kStub = { query: async () => ({ rows: [] }) }
const Kok = { catName: {}, eqName: {} }
const fagmapOk = { gruppeTilFag: new Map(), undertermTilGruppe: new Map(), fagloese: new Set() }
const ctxOk = () => ({
  aliasTilNid: new Map([['x', '1']]), lekNids: new Set(['1']),
  avpubGameNids: new Set(), pubDocNids: new Set(), samlingNids: new Set(),
})

async function kaster(fn) { try { await fn(); return null } catch (e) { return e.message } }

let ok = 0, feil = 0
async function krevNavngitt(navn, passnavn, fn) {
  const m = await kaster(fn)
  const erNavngitt = m != null && m.includes('HARD STOPP') && m.includes(passnavn)
  const erTypeError = m != null && /is not a function|Cannot (read|destructure)|undefined/.test(m) && !m.includes('HARD STOPP')
  if (erNavngitt && !erTypeError) { ok++; P(`  OK   ${navn}`) }
  else { feil++; P(`  FEIL ${navn} — ${erTypeError ? 'TypeError (ikke en vakt)' : 'kastet ikke navngitt'}: ${m}`) }
}

async function main() {
  P('# Vakt-bevis — hver parameter i hvert pass gir NAVNGITT hard stopp (ikke TypeError)')
  P('')

  P('## lek-passet  byggLekPass(noder, kjoringId, oppslag, K, ctx)')
  await krevNavngitt('noder utelatt', 'lek-passet', () => byggLekPass(undefined, KID, oppslagStub, Kok, { pubDocNids: new Set() }))
  await krevNavngitt('kjoringId utelatt', 'lek-passet', () => byggLekPass([], undefined, oppslagStub, Kok, { pubDocNids: new Set() }))
  await krevNavngitt('oppslag utelatt', 'lek-passet', () => byggLekPass([], KID, undefined, Kok, { pubDocNids: new Set() }))
  await krevNavngitt('K utelatt', 'lek-passet', () => byggLekPass([], KID, oppslagStub, undefined, { pubDocNids: new Set() }))
  await krevNavngitt('ctx.pubDocNids utelatt (N1)', 'lek-passet', () => byggLekPass([], KID, oppslagStub, Kok, {}))
  P('')

  P('## medie-passet  byggMediePass(noder, kjoringId, finnesISti)')
  await krevNavngitt('noder utelatt', 'medie-passet', () => byggMediePass(undefined, KID, () => false))
  await krevNavngitt('kjoringId utelatt', 'medie-passet', () => byggMediePass([], undefined, () => false))
  await krevNavngitt('finnesISti utelatt', 'medie-passet', () => byggMediePass([], KID, undefined))
  P('')

  P('## dokument-passet  byggDokumentPass(docs, kjoringId, oppslag)')
  await krevNavngitt('docs utelatt', 'dokument-passet', () => byggDokumentPass(undefined, KID, oppslagStub))
  await krevNavngitt('kjoringId utelatt', 'dokument-passet', () => byggDokumentPass([], undefined, oppslagStub))
  await krevNavngitt('oppslag utelatt', 'dokument-passet', () => byggDokumentPass([], KID, undefined))
  P('')

  P('## samlings-passet  byggSamlingPass(samlinger, kjoringId, oppslag, ctx)  — 5 ctx-nøkler')
  await krevNavngitt('samlinger utelatt', 'samlings-passet', () => byggSamlingPass(undefined, KID, oppslagStub, ctxOk()))
  await krevNavngitt('kjoringId utelatt', 'samlings-passet', () => byggSamlingPass([], undefined, oppslagStub, ctxOk()))
  await krevNavngitt('oppslag utelatt', 'samlings-passet', () => byggSamlingPass([], KID, undefined, ctxOk()))
  await krevNavngitt('ctx utelatt helt', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, undefined))
  await krevNavngitt('ctx.aliasTilNid utelatt', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), aliasTilNid: undefined }))
  await krevNavngitt('ctx.lekNids utelatt', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), lekNids: undefined }))
  await krevNavngitt('ctx.lekNids TOMT (N3)', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), lekNids: new Set() }))
  await krevNavngitt('ctx.lekNids Set av TALL (N3-igjen)', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), lekNids: new Set([1, 2, 3]) }))
  await krevNavngitt('ctx.pubDocNids Set av TALL', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), pubDocNids: new Set([1]) }))
  await krevNavngitt('ctx.avpubGameNids utelatt', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), avpubGameNids: undefined }))
  await krevNavngitt('ctx.pubDocNids utelatt', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), pubDocNids: undefined }))
  await krevNavngitt('ctx.samlingNids utelatt', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), samlingNids: undefined }))
  // Den FEMTE omgåelsen (rev 2): riktig type, galt innhold — overlappende mengder.
  await krevNavngitt('samlingNids ⊇ lekNids (overlapp, relasjonsvakt)', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), samlingNids: new Set(['1']) }))
  await krevNavngitt('avpubGameNids ⊇ lekNids (overlapp)', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), avpubGameNids: new Set(['1']) }))
  await krevNavngitt('lekNids blandet streng+tall (alle elementer)', 'samlings-passet', () => byggSamlingPass([], KID, oppslagStub, { ...ctxOk(), lekNids: new Set(['1', 2]) }))
  P('')

  P('## byggSamling (eksportert) — offentlig sti forbi byggSamlingPass-vakten (N4)')
  await krevNavngitt('byggSamling uten kjoringId', 'samlings-passet', () => byggSamling({ nid: 1 }, undefined, oppslagStub, ctxOk()))
  await krevNavngitt('byggSamling med lekNids Set av tall', 'samlings-passet', () => byggSamling({ nid: 1 }, KID, oppslagStub, { ...ctxOk(), lekNids: new Set([1]) }))
  P('')

  P('## aktiv læring  seedUdirMaal(k, lk20json, koblingForslag)')
  await krevNavngitt('k utelatt', 'aktiv læring', () => seedUdirMaal(undefined, { kompetansemaal: [] }, []))
  await krevNavngitt('lk20json utelatt', 'aktiv læring', () => seedUdirMaal(kStub, undefined, []))
  await krevNavngitt('koblingForslag utelatt', 'aktiv læring', () => seedUdirMaal(kStub, { kompetansemaal: [] }, undefined))
  P('')

  P('## aktiv læring  byggOgSkrivAktivLaering(k, noder, vokab, fagmap, koblingForslag, uriTilId, kjoringId)')
  await krevNavngitt('k utelatt', 'aktiv læring', () => byggOgSkrivAktivLaering(undefined, [], new Map(), fagmapOk, [], new Map(), KID))
  await krevNavngitt('noder utelatt', 'aktiv læring', () => byggOgSkrivAktivLaering(kStub, undefined, new Map(), fagmapOk, [], new Map(), KID))
  await krevNavngitt('vokab utelatt', 'aktiv læring', () => byggOgSkrivAktivLaering(kStub, [], undefined, fagmapOk, [], new Map(), KID))
  await krevNavngitt('fagmap utelatt', 'aktiv læring', () => byggOgSkrivAktivLaering(kStub, [], new Map(), undefined, [], new Map(), KID))
  await krevNavngitt('koblingForslag utelatt', 'aktiv læring', () => byggOgSkrivAktivLaering(kStub, [], new Map(), fagmapOk, undefined, new Map(), KID))
  await krevNavngitt('uriTilId utelatt', 'aktiv læring', () => byggOgSkrivAktivLaering(kStub, [], new Map(), fagmapOk, [], undefined, KID))
  await krevNavngitt('kjoringId utelatt (N4)', 'aktiv læring', () => byggOgSkrivAktivLaering(kStub, [], new Map(), fagmapOk, [], new Map(), undefined))
  P('')

  P(`## Del 1 (rene vakter): ${ok} OK, ${feil} FEIL`)
  P('')

  // ── Del 2 (DB): OPPGAVE A positivt — korrekt lekNids gir 355 + 155 ──
  P('## Del 2 (DB) — OPPGAVE A positivt: samlings-passet med korrekt lekNids')
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect(); await k.query('begin')
  let sr = null, veiA = null
  try {
    const { skrivLekPass, byggLekPass: bLek } = await import('./lib/lekpass.mjs')
    const { skrivDokumentPass, byggDokumentPass: bDok } = await import('./lib/dokumentpass.mjs')
    const { byggSamlingPass: bSam, skrivSamlingPass } = await import('./lib/samlingpass.mjs')
    const ctx = await byggKontekst(k)
    await skrivDokumentPass(k, bDok(ctx.pubDocs, KJ, ctx.o).plan)
    await skrivLekPass(k, bLek(ctx.lekNoder, KJ, ctx.o, ctx.K, { pubDocNids: ctx.pubDocNids }).plan)
    const egnetFor = +(await k.query('select count(*) n from ressurs_egnet where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJ])).rows[0].n
    await skrivSamlingPass(k, bSam(ctx.pubSamlinger, KJ, ctx.o, ctx.samlingCtx).plan)
    sr = +(await k.query('select count(*) n from samling_ressurs where samling_id in (select id from samlinger where import_kjoring_id=$1)', [KJ])).rows[0].n
    const egnetEtter = +(await k.query('select count(*) n from ressurs_egnet where ressurs_id in (select id from ressurser where import_kjoring_id=$1)', [KJ])).rows[0].n
    veiA = egnetEtter - egnetFor
  } finally { await k.query('rollback'); await k.end() }
  P(`  samling_ressurs = ${sr}   (forventet 355)`)
  P(`  vei-A ressurs_egnet-merker fra samlinger = ${veiA}   (forventet 155)`)
  const del2Ok = sr === 355 && veiA === 155
  P(del2Ok ? '  OK — korrekt lekNids gir 355 og 155.' : '  FEIL — se over.')
  P('')

  P((feil === 0 && del2Ok) ? 'RESULTAT: alle vakter navngitt + OPPGAVE A positivt bekreftet.' : 'RESULTAT: minst én feil — se over.')
  writeFileSync(`${UT}/RESULTAT-vakter-5sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-vakter-5sep.txt`)
  if (feil !== 0 || !del2Ok) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
