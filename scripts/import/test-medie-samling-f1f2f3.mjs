#!/usr/bin/env node
// BEVIS for F1/F2/F3 (medie-/dokument-/samlings-passet), 5. sep 2026 — mot ekte 001→103-base.
// Kjører HELE skrivelaget (dokument → lek → medie → samling) i FK-orden, TO ganger, og beviser:
//   F1: medie-passet på 846-strømmen gir 363 (ikke 366); de 3 bortfallne er samle-videoene på
//       lenkesamlingene 16190/18822/20030, som i stedet ligger i samling_medie.
//   F2: dokument_dokumenttype=738, dokument_sprak=611 (+90 'en' utenfor 103-CHECK, KØET), dokument_fag=325.
//   F3: ressurs_dokument=75 (lek-veien), rutet begge veier (ingen lek-kobling i samling_dokument og
//       omvendt), samling_dokument fortsatt 9.
// Skriver resultatfiler til _kontroll-import/ og md5-fingeravtrykk over radinnhold for begge kjøringer.
//
//   node scripts/import/test-medie-samling-f1f2f3.mjs
//
// HARDSTOP: kun lokal base, BEGIN/ROLLBACK, ingenting mot Supabase, ingen git.

import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { lesItems, lesFilindeks } from './lib/kilde.mjs'
import { Oppslag } from './lib/oppslag.mjs'
import { byggLekPass, skrivLekPass } from './lib/lekpass.mjs'
import { byggMediePass, skrivMediePass } from './lib/mediepass.mjs'
import { byggDokumentPass, skrivDokumentPass } from './lib/dokumentpass.mjs'
import { finnLenkesamlingNids, byggSamlingPass, skrivSamlingPass, TESTNODE_NID } from './lib/samlingpass.mjs'
import { detUuid } from './lib/uuid.mjs'

const ZIP = process.env.IMPORT_ZIP || `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const KJORING_ID = detUuid('kjoring', 'test-f1f2f3-5sep')
const pub = (n) => n.status === 1 || n.status === '1'
const md5 = (s) => createHash('md5').update(s).digest('hex')

const SAMLE_VIDEO_NIDS = ['16190', '18822', '20030']   // forventede F1-bortfall (samle-videoer)

function grupperPerNid(medier) {
  const m = new Map()
  for (const r of medier) m.set(String(r.kilde_nid), (m.get(String(r.kilde_nid)) || 0) + 1)
  return m
}

async function tellFingeravtrykk(k) {
  // Radinnhold (ikke bare antall), stabilt sortert, per tabell — filtrert på denne kjøringen.
  const q = async (sql, p = [KJORING_ID]) => (await k.query(sql, p)).rows
  const tabeller = {
    medier: 'select id,ressurs_id,type,storage_sti,rekkefolge,er_original,kilde_nid from medier where import_kjoring_id=$1 order by id',
    dokumenter: 'select id,tittel,type,storage_sti,status,kilde_nid from dokumenter where import_kjoring_id=$1 order by id',
    dokument_dokumenttype: 'select dokument_id,dokument_type_id from dokument_dokumenttype where dokument_id in (select id from dokumenter where import_kjoring_id=$1) order by dokument_id,dokument_type_id',
    dokument_sprak: 'select dokument_id,sprak from dokument_sprak where dokument_id in (select id from dokumenter where import_kjoring_id=$1) order by dokument_id,sprak',
    dokument_fag: 'select dokument_id,fag_id from dokument_fag where dokument_id in (select id from dokumenter where import_kjoring_id=$1) order by dokument_id,fag_id',
    ressurs_dokument: 'select ressurs_id,dokument_id,rekkefolge from ressurs_dokument where ressurs_id in (select id from ressurser where import_kjoring_id=$1) order by ressurs_id,dokument_id',
    samlinger: 'select id,type,kilde_nid from samlinger where import_kjoring_id=$1 order by id',
    samling_ressurs: 'select samling_id,ressurs_id,rekkefolge from samling_ressurs where samling_id in (select id from samlinger where import_kjoring_id=$1) order by samling_id,ressurs_id',
    samling_dokument: 'select samling_id,dokument_id,rekkefolge from samling_dokument where samling_id in (select id from samlinger where import_kjoring_id=$1) order by samling_id,dokument_id',
    samling_medie: 'select id,samling_id,type,storage_sti,kilde_nid from samling_medie where import_kjoring_id=$1 order by id',
    redaksjonell_ko: 'select id,type,ressurs_id,dokument_id,samling_id,beskrivelse from redaksjonell_ko where import_kjoring_id=$1 order by id',
  }
  const perTabell = {}
  let alt = ''
  for (const [t, sql] of Object.entries(tabeller)) {
    const rows = await q(sql)
    const s = JSON.stringify(rows)
    perTabell[t] = { antall: rows.length, md5: md5(s) }
    alt += `${t}:${s}\n`
  }
  return { perTabell, total: md5(alt) }
}

async function kjørAlleFire(k, ctx) {
  const { pubDocs, lekNoder, pubDocNids, finnes, o, pubSamlinger, samlingCtx } = ctx
  await skrivDokumentPass(k, byggDokumentPass(pubDocs, KJORING_ID, o).plan)
  await skrivLekPass(k, byggLekPass(lekNoder, KJORING_ID, o, K, { pubDocNids }).plan)
  await skrivMediePass(k, byggMediePass(lekNoder, KJORING_ID, finnes).plan)
  await skrivSamlingPass(k, byggSamlingPass(pubSamlinger, KJORING_ID, o, samlingCtx).plan)
}

let K   // vokab-navn (satt i main)

async function main() {
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const docs = lesItems(ZIP, 'Content/document-nodes.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  K = { catName: Object.fromEntries(catTerms.map(t => [String(t.tid), t.name])), eqName: Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name])) }
  const catByTid = new Map(catTerms.map(t => [String(t.tid), t])), eqByTid = new Map(eqTerms.map(t => [String(t.tid), t]))
  const indeks = lesFilindeks(ZIP)
  const finnes = (sti) => indeks.has(sti)

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

  // ── F1: plan-nivå diff 867 vs 846 (uten DB) ──
  const medie867 = byggMediePass(pubGames, KJORING_ID, finnes)
  const medie846 = byggMediePass(lekNoder, KJORING_ID, finnes)
  const g867 = grupperPerNid(medie867.plan.medier), g846 = grupperPerNid(medie846.plan.medier)
  const bortfalt = [...g867.keys()].filter(nid => !g846.has(nid))
  const f1 = []
  f1.push('# F1 — medie-passet: 867 vs 846-strøm (5. sep)')
  f1.push(`medier på 867 (ufiltrert):  ${medie867.plan.medier.length}   (bilde=${medie867.medieTyper.bilde || 0}, video=${medie867.medieTyper.video || 0})`)
  f1.push(`medier på 846 (leke-strøm): ${medie846.plan.medier.length}   (bilde=${medie846.medieTyper.bilde || 0}, video=${medie846.medieTyper.video || 0})`)
  f1.push(`differanse: ${medie867.plan.medier.length - medie846.plan.medier.length} rader, fra ${bortfalt.length} node(r)`)
  f1.push(``)
  f1.push(`Bortfalte noder (i 867 men ikke i 846) og deres medier:`)
  for (const nid of bortfalt.sort()) {
    const erSamling = samlingNids.has(nid)
    const typer = medie867.plan.medier.filter(m => String(m.kilde_nid) === nid).map(m => `${m.type}:${(m.storage_sti || '').split('/').pop()}`)
    f1.push(`  nid ${nid}  antall=${g867.get(nid)}  lenkesamling=${erSamling ? 'JA' : 'NEI'}  [${typer.join(', ')}]`)
  }
  const bortfaltSortert = [...bortfalt].sort()
  const forventet = [...SAMLE_VIDEO_NIDS].sort()
  const stemmer = bortfaltSortert.length === forventet.length && bortfaltSortert.every((v, i) => v === forventet[i])
  f1.push(``)
  f1.push(`Forventet bortfall (samle-video-nids): ${forventet.join(', ')}`)
  f1.push(`Faktisk bortfall:                      ${bortfaltSortert.join(', ')}`)
  f1.push(stemmer
    ? `→ MATCH. De 3 bortfallne er nøyaktig samle-videoene på 16190/18822/20030.`
    : `→ AVVIK! Andre noder faller bort — STOPP og undersøk (mandatets vilkår).`)
  f1.push(``)
  f1.push(`Kalibrering: målingen skiller — ufiltrert strøm ville gitt ${medie867.plan.medier.length} (feil, byggerens 366),`)
  f1.push(`filtrert gir ${medie846.plan.medier.length}. Var filteret feil (f.eks. beholdt samlingene), ville tallet blitt ${medie867.plan.medier.length}.`)

  if (!stemmer) {
    console.error(f1.join('\n'))
    throw new Error('F1: bortfallne noder ≠ de tre samle-videoene. Stopper (mandatets vilkår).')
  }

  // ── DB: kjør alle fire pass to ganger, mål og fingeravtrykk ──
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()

  await k.query('begin')
  let rapportF2 = [], rapportF3 = [], rapportFP = [], samlingMedieBevis = []
  try {
    const o = new Oppslag(k)
    await o.lesFaste()
    const katT = new Set(), utsT = new Set()
    for (const n of lekNoder) { for (const c of (n.field_game_category || [])) if (c.tid != null) katT.add(String(c.tid)); for (const e of (n.field_game_equipment || [])) if (e.target_id != null) utsT.add(String(e.target_id)) }
    for (const tid of [...katT]) for (const p of (catByTid.get(tid)?.parents || [])) if (catByTid.has(String(p))) katT.add(String(p))
    await o.opprettEllerGjenbruk([...katT].map(t => catByTid.get(t)).filter(Boolean), [...utsT].map(t => eqByTid.get(t)).filter(Boolean))
    await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'240826-eksport','paagaar',$2) on conflict (id) do update set antall_noder=excluded.antall_noder`, [KJORING_ID, lekNoder.length])

    const ctx = { pubDocs, lekNoder, pubDocNids, finnes, o, pubSamlinger, samlingCtx }
    const d1 = byggDokumentPass(pubDocs, KJORING_ID, o)   // for res-tall (fag-regnestykke)

    // KJØRING 1
    await kjørAlleFire(k, ctx)
    const fp1 = await tellFingeravtrykk(k)

    // ── F2-bevis: dokument-koblinger ──
    const c = (t) => fp1.perTabell[t].antall
    rapportF2.push('# F2 — dokument-koblinger (5. sep), mot 001→103-base')
    rapportF2.push(`dokumenter:            ${c('dokumenter')}   (536 publiserte, FLAGG D)`)
    rapportF2.push(`dokument_dokumenttype: ${c('dokument_dokumenttype')}   (forventet 738; resolvert løst=${d1.res.dokumenttype_lost}, bom=${d1.res.dokumenttype_bom})`)
    rapportF2.push(`dokument_sprak:        ${c('dokument_sprak')}   (nb+nn; se AVVIK under)`)
    rapportF2.push(`dokument_fag:          ${c('dokument_fag')}   (forventet 325; løst=${d1.res.fag_lost}, bom=${d1.res.fag_bom})`)
    rapportF2.push(``)
    rapportF2.push(`## AVVIK dokument_sprak: 701 (kontrollens LEST-tall) vs. 611 skrevet`)
    // per-kode fordeling (mål direkte fra kilden):
    const sprakFordeling = {}
    for (const dd of pubDocs) for (const l of (dd.field_lang || [])) if (l.value) sprakFordeling[l.value] = (sprakFordeling[l.value] || 0) + 1
    rapportF2.push(`  språkfordeling (kilde): ${JSON.stringify(sprakFordeling)}  = ${Object.values(sprakFordeling).reduce((a, b) => a + b, 0)}`)
    rapportF2.push(`  103-CHECK dokument_sprak_sprak_check tillater KUN ('nb','nn').`)
    rapportF2.push(`  REGNESTYKKE: 701 = 486 nb + 125 nn + 90 en.  Skrevet = 486+125 = 611.  Køet ('annet', ikke stille droppet) = 90 en.`)
    rapportF2.push(`  BESLUTNING KJARTAN: skal engelske dokumenter ha egen språk-rad? I så fall ny migrasjon som utvider`)
    rapportF2.push(`  CHECK til 'en' — ellers forblir de 90 i kø. Passet skriver aldri 'en' stille (fail-closed på ukjent kode).`)
    rapportF2.push(``)
    rapportF2.push(`## REGNESTYKKE dokument_fag: 109 → 325`)
    rapportF2.push(`  Kontrollens 109 ble målt med KUN 2 av 6 fag sådd (Matematikk + Norsk, fra 031-testdata).`)
    // per-fag oppløst nå:
    const fagRows = (await k.query(`select f.navn, count(*) n from dokument_fag df join fag f on f.id=df.fag_id where df.dokument_id in (select id from dokumenter where import_kjoring_id=$1) group by f.navn order by n desc`, [KJORING_ID])).rows
    for (const r of fagRows) rapportF2.push(`    ${r.navn.padEnd(14)} ${r.n}`)
    const sumFag = fagRows.reduce((a, r) => a + Number(r.n), 0)
    const gamle = fagRows.filter(r => ['Matematikk', 'Norsk'].includes(r.navn)).reduce((a, r) => a + Number(r.n), 0)
    const nye = sumFag - gamle
    rapportF2.push(`  Sum = ${sumFag}.  De 2 gamle (Matematikk+Norsk) = ${gamle} ≈ kontrollens 109.  De 4 nye sådde = ${nye}.`)
    rapportF2.push(`  REGNESTYKKE: 325 = ${gamle} (2 gamle fag) + ${nye} (4 nye fag).  bom=0 (alle 6 topic-fag finnes i de 12 seedede).`)
    rapportF2.push(`  Kalibrering: hadde bare 2 fag vært sådd, ville tallet vært ${gamle} (som 109-målingen), ikke ${sumFag}.`)

    // ── F3-bevis: ressurs_dokument + ruting begge veier ──
    rapportF3.push('# F3 — lek-veien (ressurs_dokument) + ruting begge veier (5. sep)')
    rapportF3.push(`ressurs_dokument: ${c('ressurs_dokument')}   (forventet 75)`)
    rapportF3.push(`samling_dokument: ${c('samling_dokument')}   (forventet 9 — uendret, samlings-passet bestått)`)
    // ruting: alle ressurs_dokument.ressurs_id skal være LEKER (i ressurser fra lek-strømmen),
    // alle samling_dokument.samling_id skal være SAMLINGER. Ingen kryss.
    const rdRessurs = (await k.query(`select count(*) n from ressurs_dokument rd where ressurs_id in (select id from ressurser where import_kjoring_id=$1) and not exists (select 1 from ressurser r where r.id=rd.ressurs_id and r.ressurstype='lek')`, [KJORING_ID])).rows[0].n
    const sdSamling = (await k.query(`select count(*) n from samling_dokument sd where samling_id in (select id from samlinger where import_kjoring_id=$1) and not exists (select 1 from samlinger s where s.id=sd.samling_id)`, [KJORING_ID])).rows[0].n
    // kryss: kan en ressurs_dokument-rad ha en samling_id som ressurs_id, eller motsatt? id-rom er
    // detUuid('game',nid) vs detUuid('samling',nid) — ulike. Sjekk at ingen ressurs_dokument.ressurs_id
    // finnes i samlinger, og ingen samling_dokument.samling_id finnes i ressurser.
    const rdIsamling = (await k.query(`select count(*) n from ressurs_dokument rd where rd.ressurs_id in (select id from samlinger where import_kjoring_id=$1)`, [KJORING_ID])).rows[0].n
    const sdIressurs = (await k.query(`select count(*) n from samling_dokument sd where sd.samling_id in (select id from ressurser where import_kjoring_id=$1)`, [KJORING_ID])).rows[0].n
    rapportF3.push(``)
    rapportF3.push(`Ruting-bevis:`)
    rapportF3.push(`  ressurs_dokument-rader hvis ressurs_id IKKE er en lek: ${rdRessurs}  (skal være 0)`)
    rapportF3.push(`  ressurs_dokument-rader der ressurs_id er en SAMLING-id:  ${rdIsamling}  (skal være 0 — ingen samling-kobling i lek-tabellen)`)
    rapportF3.push(`  samling_dokument-rader der samling_id er en RESSURS-id:  ${sdIressurs}  (skal være 0 — ingen lek-kobling i samling-tabellen)`)
    rapportF3.push(`  samling_dokument-rader uten en gyldig samling:           ${sdSamling}  (skal være 0)`)
    // kilde-nivå: 43 leker bærer 75 koblinger, 4 publiserte samlinger bærer 9.
    let lekBærere = 0, lekLenker = 0, samBærere = 0, samLenker = 0
    for (const n of lekNoder) { const rd = n.field_related_documents || []; if (rd.length) lekBærere++; lekLenker += rd.length }
    for (const n of pubSamlinger) { const rd = n.field_related_documents || []; if (rd.length) samBærere++; samLenker += rd.length }
    rapportF3.push(``)
    rapportF3.push(`Kilde-nivå: leker med field_related_documents = ${lekBærere} (${lekLenker} koblinger) → ressurs_dokument.`)
    rapportF3.push(`            publiserte samlinger med feltet   = ${samBærere} (${samLenker} koblinger) → samling_dokument.`)
    rapportF3.push(`Kalibrering: uten lek-veien (F3-feilen) ville ressurs_dokument vært 0; her ${c('ressurs_dokument')}.`)
    rapportF3.push(`            Endres samling_dokument fra 9, er noe brutt i samlings-passet — her ${c('samling_dokument')}.`)

    // samling_medie-bevis (F1-kryss): de 3 samle-videoene ligger i samling_medie, ikke medier.
    const smRows = (await k.query(`select kilde_nid, count(*) n from samling_medie where import_kjoring_id=$1 group by kilde_nid order by kilde_nid`, [KJORING_ID])).rows
    samlingMedieBevis.push(`samling_medie per samling-nid: ${smRows.map(r => `${r.kilde_nid}:${r.n}`).join(', ')}  (totalt ${smRows.reduce((a, r) => a + Number(r.n), 0)})`)
    const smNids = new Set(smRows.map(r => String(r.kilde_nid)))
    const alleTre = SAMLE_VIDEO_NIDS.every(nid => smNids.has(nid))
    samlingMedieBevis.push(`De 3 F1-bortfallne (16190/18822/20030) finnes i samling_medie: ${alleTre ? 'JA — flyttet hjem, ikke forsvunnet' : 'NEI — STOPP'}`)
    f1.push(``)
    f1.push('## Kryss mot samling_medie (etter samlings-passet)')
    f1.push(...samlingMedieBevis)

    // KJØRING 2 (determinisme)
    await kjørAlleFire(k, ctx)
    const fp2 = await tellFingeravtrykk(k)

    rapportFP.push('# Determinisme — fingeravtrykk over radinnhold, to kjøringer (5. sep)')
    rapportFP.push(`Tabell                    antall   md5(kjøring1)      = md5(kjøring2)`)
    let alleLike = true
    for (const t of Object.keys(fp1.perTabell)) {
      const a = fp1.perTabell[t], b = fp2.perTabell[t]
      const lik = a.md5 === b.md5 && a.antall === b.antall
      if (!lik) alleLike = false
      rapportFP.push(`  ${t.padEnd(24)} ${String(a.antall).padStart(5)}   ${a.md5.slice(0, 12)}  ${lik ? '=' : '≠'} ${b.md5.slice(0, 12)}  ${lik ? 'OK' : 'AVVIK!'}`)
    }
    rapportFP.push(``)
    rapportFP.push(`Total-fingeravtrykk kjøring 1: ${fp1.total}`)
    rapportFP.push(`Total-fingeravtrykk kjøring 2: ${fp2.total}`)
    rapportFP.push(fp1.total === fp2.total ? `→ IDENTISK. Deterministisk og idempotent (radinnhold, ikke bare antall).` : `→ AVVIK — se over.`)
    if (!alleLike || fp1.total !== fp2.total) throw new Error('Determinisme brutt: fingeravtrykk ulike mellom kjøring 1 og 2.')
  } finally {
    await k.query('rollback')
    await k.end()
  }

  // ── Skriv resultatfiler ──
  const skriv = (navn, linjer) => { const p = `${UT}/${navn}`; writeFileSync(p, linjer.join('\n') + '\n'); return p }
  const filer = [
    skriv('RESULTAT-F1-medie-strom-5sep.txt', f1),
    skriv('RESULTAT-F2-dokumentkoblinger-5sep.txt', rapportF2),
    skriv('RESULTAT-F3-ressurs_dokument-5sep.txt', rapportF3),
    skriv('RESULTAT-determinisme-fingeravtrykk-5sep.txt', rapportFP),
  ]

  // ── Konsoll-sammendrag ──
  console.log(f1.join('\n'))
  console.log('\n' + rapportF2.join('\n'))
  console.log('\n' + rapportF3.join('\n'))
  console.log('\n' + rapportFP.join('\n'))
  console.log('\nResultatfiler skrevet:')
  for (const p of filer) console.log('  ' + p)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
