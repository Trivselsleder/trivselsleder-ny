#!/usr/bin/env node
// SABOTASJE-BEVIS rev 2 (DOM 3, 5. sep): sabotér KODEN (passenes PLAN-utdata), ikke rader i basen.
// Hver sabotasje transformerer planen ÉN pass produserer — nøyaktig effekten av en kode-bug — og
// kjører så portens EKTE sjekker (finnAvvik på antall + finnFpAvvik på innholds-md5 mot lagret fasit).
// Viser at porten nå FEILER på både antalls- og INNHOLDS-regresjoner (sistnevnte fanget den ikke før).
//
//   node scripts/import/test-sabotasje.mjs
//
// HARDSTOP: lokal base, BEGIN/ROLLBACK, ingenting mot Supabase, ingen git.

import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggMediePass, skrivMediePass } from './lib/mediepass.mjs'
import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { byggSamlingPass, skrivSamlingPass } from './lib/samlingpass.mjs'
import { byggOgSkrivAktivLaering } from './lib/aktivlaering.mjs'
import { byggKontekst, maal, fingeravtrykk, finnAvvik, finnFpAvvik, KJ } from './test-alle-fem-pass.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const L = []
const P = (s) => { console.log(s); L.push(s) }

// Kjør alle fem pass, men la `saboter` transformere PLANEN til én pass før skriving (= en kode-bug).
async function kjorMedPlanSabotasje(k, ctx, saboter = {}) {
  const dPlan = byggDokumentPass(ctx.pubDocs, KJ, ctx.o).plan; saboter.dokument?.(dPlan); await skrivDokumentPass(k, dPlan)
  const lPlan = byggLekPass(ctx.lekNoder, KJ, ctx.o, ctx.K, { pubDocNids: ctx.pubDocNids }).plan; saboter.lek?.(lPlan); await skrivLekPass(k, lPlan)
  const mPlan = byggMediePass(ctx.lekNoder, KJ, ctx.finnes).plan; saboter.medie?.(mPlan); await skrivMediePass(k, mPlan)
  const sPlan = byggSamlingPass(ctx.pubSamlinger, KJ, ctx.o, ctx.samlingCtx).plan; saboter.samling?.(sPlan); await skrivSamlingPass(k, sPlan)
  await byggOgSkrivAktivLaering(k, ctx.atluNoder, ctx.vokab, ctx.fagmap, ctx.koblingForslag, ctx.uriTilId, KJ)
}

async function medFriskBase(fn) {
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect(); await k.query('begin')
  try { return await fn(k) } finally { await k.query('rollback'); await k.end() }
}

async function main() {
  // trinn-kode↔id (for rotasjons-sabotasjen) — hentes én gang.
  const trinnKart = await medFriskBase(async (k) => {
    const rows = (await k.query("select id, kode from trinn where land='NO'")).rows
    const idTilKode = new Map(rows.map(r => [r.id, Number(r.kode)]))
    const kodeTilId = new Map(rows.map(r => [Number(r.kode), r.id]))
    return { idTilKode, kodeTilId }
  })
  const roterTrinnId = (id) => {
    const k = trinnKart.idTilKode.get(id); if (k == null) return id
    return trinnKart.kodeTilId.get((k % 10) + 1) ?? id      // 1→2 … 9→10 → 10→1 (bijektiv, antall uendret)
  }

  P('# Sabotasje-bevis rev 2 — KODE-sabotasje (plan-utdata), porten fanger antall OG innhold')
  P('')

  // ── Baseline: porten grønn ──
  const b = await medFriskBase(async (k) => {
    const ctx = await byggKontekst(k); await kjorMedPlanSabotasje(k, ctx, {})
    return { t: await maal(k), fp: await fingeravtrykk(k) }
  })
  const baseOk = finnAvvik(b.t).length === 0 && finnFpAvvik(b.fp).length === 0
  P(`## Baseline (usabotert): antall-avvik ${finnAvvik(b.t).length}, innholds-avvik ${finnFpAvvik(b.fp).length} → ${baseOk ? 'porten GRØNN (riktig)' : 'FEIL: baseline avviker'}`)
  P('')

  const saboterte = []
  async function proev(navn, beskr, saboter, forventTabell, type, baseSaboter) {
    const r = await medFriskBase(async (k) => {
      const ctx = await byggKontekst(k); await kjorMedPlanSabotasje(k, ctx, saboter)
      if (baseSaboter) await baseSaboter(k)     // for pass som skriver direkte (aktiv læring)
      return { t: await maal(k), fp: await fingeravtrykk(k) }
    })
    const aAvvik = finnAvvik(r.t), fAvvik = finnFpAvvik(r.fp)
    const fanget = type === 'antall' ? aAvvik.some(x => x.tabell === forventTabell) : fAvvik.some(x => x.tabell === forventTabell)
    const porten = (aAvvik.length || fAvvik.length) ? 'FEILER (exit 1)' : 'GRØNN — SLAPP GJENNOM'
    P(`## ${navn}`)
    P(`   ${beskr}`)
    P(`   antall-avvik: [${aAvvik.map(x => `${x.tabell} ${x.fasit}→${x.faktisk}`).join(', ') || 'ingen'}]`)
    P(`   innholds-avvik: [${fAvvik.map(x => x.tabell).join(', ') || 'ingen'}]`)
    P(`   porten: ${porten} · fanger ${forventTabell} (${type}): ${fanget ? 'JA' : 'NEI'}`)
    P('')
    saboterte.push(fanget && (aAvvik.length || fAvvik.length))
  }

  // A — kode: trinn-skriving fjernet for leker (antall endres)
  await proev('A — trinn-skriving fjernet (kode: plan.ressurs_trinn = [])',
    'Antall ressurs_trinn faller (leker mister alle trinn).',
    { lek: (p) => { p.ressurs_trinn = [] } }, 'ressurs_trinn', 'antall')

  // C — kode: alle trinn ROTERT (antall UENDRET, innhold galt) — Fables tredje sabotasje
  await proev('C — trinn ROTERT 1→2…10→1 (kode: samme antall, feil trinn)',
    'ressurs_trinn beholder 9120 rader, men hver på feil trinn — kun innholds-md5 avslører det.',
    { lek: (p) => { for (const r of p.ressurs_trinn) r.trinn_id = roterTrinnId(r.trinn_id) } }, 'ressurs_trinn', 'innhold')

  // D (egen) — kode: én dokument-tittel endret (antall uendret)
  await proev('D (egen) — dokument-tittel endret (kode: plan.dokumenter[0].tittel)',
    'dokumenter beholder 536 rader; én tittel endret → kun innholds-md5 avslører det.',
    { dokument: (p) => { if (p.dokumenter[0]) p.dokumenter[0].tittel = 'SABOTERT TITTEL' } }, 'dokumenter', 'innhold')

  // E (egen) — kode: én samling_ressurs rekkefolge endret (antall uendret)
  await proev('E (egen) — samling_ressurs rekkefolge endret (kode: plan.samling_ressurs[0].rekkefolge)',
    'samling_ressurs beholder 355 rader; én rekkefolge endret → kun innholds-md5 avslører det.',
    { samling: (p) => { if (p.samling_ressurs[0]) p.samling_ressurs[0].rekkefolge = 999 } }, 'samling_ressurs', 'innhold')

  // E1 (Fable) — kode: `sted` ROTERT på leker (inne→ute→begge→inne). ressurser beholder antall.
  const roterSted = (s) => ({ inne: 'ute', ute: 'begge', begge: 'inne' }[s] ?? s)
  await proev('E1 (Fable) — sted rotert inne→ute→begge→inne (kode: plan.ressurser[].sted)',
    'ressurser beholder 1126 rader; 157 leker på feil sted — bare all-kolonne-fingeravtrykket ser sted.',
    { lek: (p) => { for (const r of p.ressurser) r.sted = roterSted(r.sted) } }, 'ressurser', 'innhold')

  // E2 (Fable) — ALLE kompetansemål-tekster reversert. Aktiv læring skriver kompetansemaal DIREKTE
  // (ingen plan-krok), så effekten av kodefeilen reproduseres med en base-UPDATE av innholdet.
  await proev('E2 (Fable) — alle 1410 kompetansemål-tekster reversert (base: reverse(tekst))',
    'kompetansemaal beholder 1411 rader; hver tekst baklengs — bare all-kolonne-fingeravtrykket ser tekst.',
    {}, 'kompetansemaal', 'innhold',
    async (k) => { await k.query('update kompetansemaal set tekst=reverse(tekst), tekst_nb=reverse(tekst_nb)') })

  // ── COLLATION-INVARIANS: samme fingeravtrykk uansett DB-collation (JS-sort på kodeenheter) ──
  P('## Collation-invarians — tekst-tunge tabeller under C vs ICU (samme md5)')
  const collR = await medFriskBase(async (k) => {
    const ctx = await byggKontekst(k); await kjorMedPlanSabotasje(k, ctx, {})
    const md5AvHenting = async (tabell, filter, collate) => {
      const rows = (await k.query(`select r from (select (to_jsonb(t))::text r from ${tabell} t where ${filter}) s order by r collate "${collate}"`, filter.includes('$1') ? [KJ] : [])).rows.map(x => x.r)
      rows.sort()   // JS-sort etterpå — SQL-collate skal ikke påvirke sluttresultatet
      return createHash('md5').update(JSON.stringify(rows)).digest('hex').slice(0, 12)
    }
    const ut = {}
    for (const [tabell, filter] of [['ressurs_utstyr', 't.ressurs_id in (select id from ressurser where import_kjoring_id=$1)'], ['kompetansemaal', 'true']]) {
      ut[tabell] = { C: await md5AvHenting(tabell, filter, 'C'), ICU: await md5AvHenting(tabell, filter, 'und-x-icu') }
    }
    return ut
  })
  let collOk = true
  for (const [tabell, v] of Object.entries(collR)) {
    const lik = v.C === v.ICU
    if (!lik) collOk = false
    P(`  ${tabell.padEnd(20)} C=${v.C}  ICU=${v.ICU}  ${lik ? 'LIK' : 'ULIK!'}`)
  }
  P(`  → ${collOk ? 'Fingeravtrykket er collation-uavhengig (JS-sort på kodeenheter).' : 'ULIK — collation påvirker (FEIL).'}`)
  P('')

  const alt = baseOk && collOk && saboterte.length === 6 && saboterte.every(Boolean)
  P(alt
    ? 'RESULTAT: baseline grønn; porten FEILER på antalls-sabotasjen OG alle fem innholds-sabotasjene (inkl. E1 sted, E2 tekst); collation-uavhengig.'
    : 'RESULTAT: minst én sabotasje slapp gjennom, baseline avvek, eller collation-avvik — se over.')

  writeFileSync(`${UT}/RESULTAT-sabotasje-5sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-sabotasje-5sep.txt`)
  if (!alt) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
