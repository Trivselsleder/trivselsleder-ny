#!/usr/bin/env node
// SAMLET REGRESJONSPORT rev 2 (5. sep, OPPGAVE D): kjør ALLE FEM passene i FK-orden, TO ganger mot
// frisk base. Vokter NÅ ALLE tabellene passene skriver til (ikke ti av dem), med et RIGG-PORTABELT
// fingeravtrykk (naturnøkler i stedet for auto-genererte identity-id-er, så det kan sammenlignes på
// tvers av rigger). Rekkefølge: dokument → lek → medie → samling → aktiv læring.
//
//   node scripts/import/test-alle-fem-pass.mjs            (kjør porten)
//   CAPTURE=1 node scripts/import/test-alle-fem-pass.mjs  (skriv ut målte tall uten å felle på fasit)
//
// Eksporterer maal/FASIT/finnAvvik/fingeravtrykk/kjorAlleFem for sabotasje-beviset.
// HARDSTOP: kun lokal base, BEGIN/ROLLBACK, ingenting mot Supabase, ingen git.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { lesItems, lesFilindeks } from './lib/kilde.mjs'
import { Oppslag } from './lib/oppslag.mjs'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggMediePass, skrivMediePass } from './lib/mediepass.mjs'
import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { finnLenkesamlingNids, byggSamlingPass, skrivSamlingPass, TESTNODE_NID } from './lib/samlingpass.mjs'
import { lastFagmapping } from './lib/fagmapping.mjs'
import { seedUdirMaal, byggOgSkrivAktivLaering, lastKoblingForslag } from './lib/aktivlaering.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
export const KJ = detUuid('kjoring', 'test-alle-fem-5sep')
const pub = (n) => n.status === 1 || n.status === '1'
const md5 = (s) => createHash('md5').update(s).digest('hex')

// FASIT for ALLE tabellene passene skriver til (målte verdier på frisk 001→103-base, ikke gjettet).
// Endres ETT tall, har en regresjon sluppet gjennom. kompetansemaal(_trinn) er seedet referansedata
// (ikke kjoring-stemplet) — telles totalt; deterministisk på en frisk base.
export const FASIT = {
  ressurser: 1126, ressurs_innhold: 1274, ressurs_kategori: 840, ressurs_utstyr: 1455,
  ressurs_trinn: 9120, ressurs_egnet: 193, ressurs_fag: 266,
  ressurs_kompetansemaal: 352, ressurs_kompetansemaal_forslag: 64, ressurs_dokument: 75,
  medier: 363,
  dokumenter: 536, dokument_dokumenttype: 738, dokument_sprak: 611, dokument_fag: 325,
  samlinger: 20, samling_innhold: 20, samling_ressurs: 355, samling_dokument: 9, samling_medie: 3,
  redaksjonell_ko: 894,
  kompetansemaal: 1411, kompetansemaal_trinn: 2385,   // seedet referansedata (målt på frisk base)
}

const rid = '(select id from ressurser where import_kjoring_id=$1)'
const did = '(select id from dokumenter where import_kjoring_id=$1)'
const sid = '(select id from samlinger where import_kjoring_id=$1)'

// ── Radtellinger for ALLE tabeller ──
export async function maal(k) {
  const q = async (sql, p) => +(await k.query(sql, p ?? [KJ])).rows[0].n
  return {
    ressurser: await q('select count(*) n from ressurser where import_kjoring_id=$1'),
    ressurs_innhold: await q(`select count(*) n from ressurs_innhold where ressurs_id in ${rid}`),
    ressurs_kategori: await q(`select count(*) n from ressurs_kategori where ressurs_id in ${rid}`),
    ressurs_utstyr: await q(`select count(*) n from ressurs_utstyr where ressurs_id in ${rid}`),
    ressurs_trinn: await q(`select count(*) n from ressurs_trinn where ressurs_id in ${rid}`),
    ressurs_egnet: await q(`select count(*) n from ressurs_egnet where ressurs_id in ${rid}`),
    ressurs_fag: await q(`select count(*) n from ressurs_fag where ressurs_id in ${rid}`),
    ressurs_kompetansemaal: await q('select count(*) n from ressurs_kompetansemaal where import_kjoring_id=$1'),
    ressurs_kompetansemaal_forslag: await q('select count(*) n from ressurs_kompetansemaal_forslag where import_kjoring_id=$1'),
    ressurs_dokument: await q(`select count(*) n from ressurs_dokument where ressurs_id in ${rid}`),
    medier: await q('select count(*) n from medier where import_kjoring_id=$1'),
    dokumenter: await q('select count(*) n from dokumenter where import_kjoring_id=$1'),
    dokument_dokumenttype: await q(`select count(*) n from dokument_dokumenttype where dokument_id in ${did}`),
    dokument_sprak: await q(`select count(*) n from dokument_sprak where dokument_id in ${did}`),
    dokument_fag: await q(`select count(*) n from dokument_fag where dokument_id in ${did}`),
    samlinger: await q('select count(*) n from samlinger where import_kjoring_id=$1'),
    samling_innhold: await q(`select count(*) n from samling_innhold where samling_id in ${sid}`),
    samling_ressurs: await q(`select count(*) n from samling_ressurs where samling_id in ${sid}`),
    samling_dokument: await q(`select count(*) n from samling_dokument where samling_id in ${sid}`),
    samling_medie: await q('select count(*) n from samling_medie where import_kjoring_id=$1'),
    redaksjonell_ko: await q('select count(*) n from redaksjonell_ko where import_kjoring_id=$1'),
    kompetansemaal: await q('select count(*) n from kompetansemaal', []),
    kompetansemaal_trinn: await q('select count(*) n from kompetansemaal_trinn', []),
  }
}

// Tabeller som avviker fra fasit (fasit=null = ikke voktet, kun rapportert).
export function finnAvvik(tall) {
  const avvik = []
  for (const [t, f] of Object.entries(FASIT)) {
    if (f == null) continue
    if (tall[t] !== f) avvik.push({ tabell: t, fasit: f, faktisk: tall[t] })
  }
  return avvik
}

// FASIT-FINGERAVTRYKK (C-retting): lagret md5 per tabell over det RIGG-PORTABLE naturnøkkel-innholdet.
// Fanger INNHOLDS-regresjoner som bevarer radantallet (f.eks. roterte trinn) — som antall-fasiten ikke ser.
// Målt på frisk 001→103-base; naturnøkler + rko.id fjernet gjør md5-ene stabile på tvers av rigger.
export const FASIT_FP = {
  ressurser: '51a753c26d25', ressurs_innhold: 'eedcccd13a2e', ressurs_kategori: 'eae01d50349e',
  ressurs_utstyr: '7f8ab8867a40', ressurs_trinn: '03134bfaa758', ressurs_egnet: '3587afd838a4',
  ressurs_fag: 'c874443282fa', ressurs_kompetansemaal: 'cbc0a7eda184', ressurs_kompetansemaal_forslag: '1f059a39a845',
  ressurs_dokument: '5e358c3bcfb3', medier: 'b9aa2e33840b', dokumenter: '064aa3ed84cb',
  dokument_dokumenttype: 'a370f6a4bafa', dokument_sprak: 'c6b78c3b7fb8', dokument_fag: '84de7dc963d1',
  samlinger: 'a6f034b28031', samling_innhold: '450fc0ba610f', samling_ressurs: '6d856d94907c',
  samling_dokument: 'bdbbec160447', samling_medie: '9082a8218a8a', redaksjonell_ko: 'b224d8a4e90e',
  kompetansemaal: '29217ee78767', kompetansemaal_trinn: '7ec8afeb00bd',
}

// Tabeller der INNHOLDS-md5 avviker fra fasit (fasit=null = ikke voktet).
export function finnFpAvvik(fp) {
  const avvik = []
  for (const [t, f] of Object.entries(FASIT_FP)) {
    if (f == null) continue
    const faktisk = (fp.per[t]?.md5 || '').slice(0, 12)
    if (faktisk !== f) avvik.push({ tabell: t, fasit: f, faktisk })
  }
  return avvik
}

// ── FINGERAVTRYKK rev 3 (C-retting): ALLE skrevne kolonner, skjema-utledet, collation-uavhengig ──
// to_jsonb(t) tar HVER kolonne (også nye fra en fremtidig migrasjon) — ingen håndskrevet kolonneliste.
// EKSKLUDERT (og hvorfor): (1) identity-id-er (is_identity) og timestamp/date-kolonner + import_kjoring_id
//   — ikke deterministiske. (2) identity-FK-id-er (kategori_id/utstyr_id/fag_id/trinn_id/egnet_id/
//   dokument_type_id/kompetansemaal_id/erstattet_av) — byttes mot naturnøkkel (navn/kode/uri) via join,
//   så en endret RELASJON fortsatt fanges. (3) manuelle: redaksjonell_ko.id (detUuid avledet av identity
//   kompetansemaal_id), ressurs_innhold.sokevektor (avledet søkeindeks), kompetansemaal.fag_id/trinn_id
//   (identity-FK; Udir-mål bruker uri/kompetansemaal_trinn, ikke disse).
// COLLATION-UAVHENGIG: ingen SQL-ORDER BY på tekst; radene sorteres i JS på kodeenheter (kollasjon-nøytralt).
const FP_FILTER = {
  ressurser: [`t.import_kjoring_id=$1`, true], ressurs_innhold: [`t.ressurs_id in ${rid}`, true],
  ressurs_kategori: [`t.ressurs_id in ${rid}`, true], ressurs_utstyr: [`t.ressurs_id in ${rid}`, true],
  ressurs_trinn: [`t.ressurs_id in ${rid}`, true], ressurs_egnet: [`t.ressurs_id in ${rid}`, true],
  ressurs_fag: [`t.ressurs_id in ${rid}`, true], ressurs_kompetansemaal: [`t.import_kjoring_id=$1`, true],
  ressurs_kompetansemaal_forslag: [`t.import_kjoring_id=$1`, true], ressurs_dokument: [`t.ressurs_id in ${rid}`, true],
  medier: [`t.import_kjoring_id=$1`, true], dokumenter: [`t.import_kjoring_id=$1`, true],
  dokument_dokumenttype: [`t.dokument_id in ${did}`, true], dokument_sprak: [`t.dokument_id in ${did}`, true],
  dokument_fag: [`t.dokument_id in ${did}`, true], samlinger: [`t.import_kjoring_id=$1`, true],
  samling_innhold: [`t.samling_id in ${sid}`, true], samling_ressurs: [`t.samling_id in ${sid}`, true],
  samling_dokument: [`t.samling_id in ${sid}`, true], samling_medie: [`t.import_kjoring_id=$1`, true],
  redaksjonell_ko: [`t.import_kjoring_id=$1`, true], kompetansemaal: [`true`, false], kompetansemaal_trinn: [`true`, false],
}
// [fk-kolonne, ref-tabell, ref-kolonne, 'left'?] — byttes mot naturnøkkel «<kol>_nk».
const FP_FK = {
  ressurs_kategori: [['kategori_id', 'kategorier', 'navn']], ressurs_utstyr: [['utstyr_id', 'utstyr', 'navn']],
  ressurs_trinn: [['trinn_id', 'trinn', 'kode']], ressurs_egnet: [['egnet_id', 'egnet_kategori', 'navn']],
  ressurs_fag: [['fag_id', 'fag', 'navn']], ressurs_kompetansemaal: [['kompetansemaal_id', 'kompetansemaal', 'uri']],
  ressurs_kompetansemaal_forslag: [['kompetansemaal_id', 'kompetansemaal', 'uri']],
  dokument_dokumenttype: [['dokument_type_id', 'dokument_type', 'navn']], dokument_fag: [['fag_id', 'fag', 'navn']],
  redaksjonell_ko: [['kompetansemaal_id', 'kompetansemaal', 'uri', 'left']],
  kompetansemaal_trinn: [['kompetansemaal_id', 'kompetansemaal', 'uri'], ['trinn_id', 'trinn', 'kode']],
  kompetansemaal: [['erstattet_av', 'kompetansemaal', 'uri', 'left']],
}
const FP_MANUELL_EKSKL = { redaksjonell_ko: ['id'], ressurs_innhold: ['sokevektor'], kompetansemaal: ['fag_id', 'trinn_id'] }

async function fpTabellSql(k, tabell) {
  const cols = (await k.query(
    "select column_name, is_identity, data_type, column_default from information_schema.columns where table_schema='public' and table_name=$1", [tabell])).rows
  // Auto-ekskluder (schema-utledet): identity, VOLATILE default-generatorer (nextval/gen_random_uuid/
  // uuid_generate → tilfeldige/sekvens-verdier), timestamp/date, og import_kjoring_id — alle ikke-
  // deterministiske. Fanger surrogat-id-er som is_identity IKKE flagger (f.eks. ressurs_innhold.id =
  // uuid default gen_random_uuid, satt av DB-en, tilfeldig per kjøring). Pass-satte detUuid-id-er
  // (ressurser/dokumenter/…) har samme default, men er dekket av kilde_nid — trygt å ekskludere.
  const autoEkskl = cols.filter(c => c.is_identity === 'YES' ||
    /nextval|gen_random_uuid|uuid_generate/.test(c.column_default || '') ||
    /timestamp|date/.test(c.data_type) || c.column_name === 'import_kjoring_id').map(c => c.column_name)
  const fk = FP_FK[tabell] || []
  const ekskl = [...new Set([...autoEkskl, ...(FP_MANUELL_EKSKL[tabell] || []), ...fk.map(f => f[0])])]
  const joins = fk.map((f, i) => `${f[3] === 'left' ? 'left ' : ''}join ${f[1]} x${i} on x${i}.id=t.${f[0]}`).join(' ')
  const adds = fk.map((f, i) => `'${f[0]}_nk', x${i}.${f[2]}`).join(', ')
  const rowExpr = `to_jsonb(t) - '{${ekskl.join(',')}}'::text[]` + (adds ? ` || jsonb_build_object(${adds})` : '')
  const [filter, brukKj] = FP_FILTER[tabell]
  return { sql: `select (${rowExpr})::text r from ${tabell} t ${joins} where ${filter}`, brukKj, ekskl }
}

export async function fingeravtrykk(k) {
  const per = {}; let alt = ''; const eksklRapport = {}
  for (const tabell of Object.keys(FP_FILTER)) {
    const { sql, brukKj, ekskl } = await fpTabellSql(k, tabell)
    const rader = (await k.query(sql, brukKj ? [KJ] : [])).rows.map(x => x.r)
    rader.sort()                                  // JS kodeenhet-sort → collation-uavhengig
    const s = JSON.stringify(rader)
    per[tabell] = { antall: rader.length, md5: md5(s) }; alt += `${tabell}:${s}\n`
    eksklRapport[tabell] = ekskl
  }
  return { per, total: md5(alt), ekskl: eksklRapport }
}

let K
export async function kjorAlleFem(k, ctx) {
  const { pubDocs, lekNoder, pubDocNids, finnes, o, pubSamlinger, samlingCtx, atluNoder, vokab, fagmap, koblingForslag, uriTilId } = ctx
  await skrivDokumentPass(k, byggDokumentPass(pubDocs, KJ, o).plan)
  await skrivLekPass(k, byggLekPass(lekNoder, KJ, o, K, { pubDocNids }).plan)
  await skrivMediePass(k, byggMediePass(lekNoder, KJ, finnes).plan)
  await skrivSamlingPass(k, byggSamlingPass(pubSamlinger, KJ, o, samlingCtx).plan)
  await byggOgSkrivAktivLaering(k, atluNoder, vokab, fagmap, koblingForslag, uriTilId, KJ)
}

// Bygg all kontekst + oppslag, klar til å kjøre passene. (Delt av porten og sabotasjeskriptet.)
// kjoringId: valgfri — porten/sabotasjen kaller uten argument og får den faste test-id-en KJ
// (determinisme). Importkjøreren sender sin EGEN per-kjøring-id inn, så anker-raden og alle
// stemplinger bruker samme id. Default = KJ ⇒ eksisterende kall er uendret.
export async function byggKontekst(k, kjoringId = KJ) {
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const docs = lesItems(ZIP, 'Content/document-nodes.json')
  const atluNoder = lesItems(ZIP, 'Content/atlu-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const objTermer = lesItems(ZIP, 'Vocabularies/learning_objectives-terms.json')
  const vokab = new Map(objTermer.map(t => [String(t.tid), t.name]))
  K = { catName: Object.fromEntries(catTerms.map(t => [String(t.tid), t.name])), eqName: Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name])) }
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t])), eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))
  const finnes = (sti) => lesFilindeks(ZIP).has(sti)
  const fagmap = lastFagmapping()
  const koblingForslag = lastKoblingForslag()
  const lk20 = JSON.parse(readFileSync('data/udir/lk20-kompetansemaal.json', 'utf8'))

  const pubGames = games.filter(pub)
  const samlingNids = finnLenkesamlingNids(games)
  const lekNoder = pubGames.filter(n => !samlingNids.has(String(n.nid)) && String(n.nid) !== String(TESTNODE_NID))
  const lekNids = new Set(lekNoder.map(n => String(n.nid)))
  const pubDocs = docs.filter(pub)
  const pubDocNids = new Set(pubDocs.map(d => String(d.nid)))
  const aliasTilNid = new Map(games.filter(g => g.url_alias).map(g => [g.url_alias, String(g.nid)]))
  const avpubGameNids = new Set(games.filter(g => !pub(g)).map(g => String(g.nid)))
  const pubSamlinger = games.filter(n => samlingNids.has(String(n.nid)) && pub(n))
  const samlingCtx = { aliasTilNid, lekNids, avpubGameNids, pubDocNids, samlingNids }

  const o = new Oppslag(k)
  await o.lesFaste()
  const katT = new Set(), utsT = new Set()
  for (const n of lekNoder) { for (const c of (n.field_game_category || [])) if (c.tid != null) katT.add(String(c.tid)); for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsT.add(String(e.target_id)) }
  for (const tid of [...katT]) for (const p of (catByTid.get(tid)?.parents || [])) if (catByTid.has(String(p))) katT.add(String(p))
  await o.opprettEllerGjenbruk([...katT].map(t => catByTid.get(t)).filter(Boolean), [...utsT].map(t => eqByTid.get(t)).filter(Boolean))
  await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2) on conflict (id) do update set antall_noder=excluded.antall_noder`, [kjoringId, lekNoder.length])
  const seed = await seedUdirMaal(k, lk20, koblingForslag)
  return { pubDocs, lekNoder, pubDocNids, finnes, o, pubSamlinger, samlingCtx, atluNoder, vokab, fagmap, koblingForslag, uriTilId: seed.uriTilId, lk20, K, kjoringId }
}

async function main() {
  const capture = process.env.CAPTURE === '1'
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  await k.query('begin')
  try {
    const ctx = await byggKontekst(k)
    await kjorAlleFem(k, ctx)
    const t1 = await maal(k); const fp1 = await fingeravtrykk(k)
    await seedUdirMaal(k, ctx.lk20, ctx.koblingForslag)
    await kjorAlleFem(k, ctx)
    const t2 = await maal(k); const fp2 = await fingeravtrykk(k)

    const P = (s) => console.log(s)
    P('# Regresjonsport rev 2 — ALLE tabeller voktet, rigg-portabelt fingeravtrykk')
    P('')
    P('## Radtall vs FASIT (kjøring 1 = kjøring 2?)')
    P('| tabell | fasit | kjøring1 | kjøring2 | |')
    P('|---|---|---|---|---|')
    for (const t of Object.keys(FASIT)) {
      const f = FASIT[t]
      const ok = (f == null || (t1[t] === f && t2[t] === f)) && t1[t] === t2[t]
      P(`| ${t} | ${f == null ? '(måles)' : f} | ${t1[t]} | ${t2[t]} | ${ok ? 'OK' : 'AVVIK!'} |`)
    }
    const avvik = finnAvvik(t1).concat(finnAvvik(t2))
    const fpAvvik = finnFpAvvik(fp1)                       // C: innholds-md5 mot LAGRET fasit
    const idempotent = Object.keys(FASIT).every(t => t1[t] === t2[t])
    const fpLik = fp1.total === fp2.total
    P('')
    P('## Innholds-fingeravtrykk (naturnøkler) — kjøring1 vs kjøring2, OG mot lagret FASIT_FP')
    let alleLike = true
    for (const t of Object.keys(fp1.per)) {
      const a = fp1.per[t], b = fp2.per[t]; const lik = a.md5 === b.md5 && a.antall === b.antall
      const fasit = FASIT_FP[t]; const mFasit = fasit == null ? '(måles)' : (a.md5.slice(0, 12) === fasit ? 'FASIT OK' : 'FASIT AVVIK!')
      if (!lik) alleLike = false
      P(`  ${t.padEnd(30)} ${String(a.antall).padStart(5)}  ${a.md5.slice(0, 12)} ${lik ? '=' : '≠'} ${b.md5.slice(0, 12)}  ${mFasit}`)
    }
    P('')
    P(`Total-fingeravtrykk kjøring 1: ${fp1.total}`)
    P(`Total-fingeravtrykk kjøring 2: ${fp2.total}`)
    P('')
    if (capture) {
      P('CAPTURE-modus — per-tabell md5 (12) for FASIT_FP:')
      for (const t of Object.keys(fp1.per)) P(`  ${t}: '${fp1.per[t].md5.slice(0, 12)}',`)
      P('')
      P('Ekskluderte kolonner per tabell (identity/timestamp/import_kjoring_id + FK-id→naturnøkkel + manuelle):')
      for (const t of Object.keys(fp1.ekskl)) if (fp1.ekskl[t].length) P(`  ${t}: ${fp1.ekskl[t].join(', ')}`)
      P('')
      P('CAPTURE er IKKE en dom (exit 2) — lim verdiene inn i FASIT_FP og kjør uten CAPTURE for dommen.')
      process.exit(2)   // aldri 0: capture kan ikke forveksles med grønt
    }
    if (avvik.length) { P('✗ REGRESJON (antall):'); for (const a of avvik) P(`   ${a.tabell}: fasit ${a.fasit}, faktisk ${a.faktisk}`) }
    else P(`✓ Alle ${Object.values(FASIT).filter(v => v != null).length} voktede radtall matcher fasit.`)
    if (fpAvvik.length) { P('✗ REGRESJON (innhold — antall uendret, md5 endret):'); for (const a of fpAvvik) P(`   ${a.tabell}: fasit-md5 ${a.fasit}, faktisk ${a.faktisk}`) }
    else P(`✓ Alle ${Object.values(FASIT_FP).filter(v => v != null).length} voktede innholds-md5 matcher lagret fasit.`)
    P(idempotent && alleLike && fpLik ? '✓ Idempotent (kjøring 1 = 2).' : '✗ Ikke-idempotent.')
    if (avvik.length || fpAvvik.length || !idempotent || !alleLike || !fpLik) process.exit(1)
  } finally {
    await k.query('rollback')
    await k.end()
  }
}

// Kjør main() kun ved direkte kjøring (ikke ved import fra sabotasjeskriptet).
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
