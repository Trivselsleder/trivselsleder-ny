#!/usr/bin/env node
// ETAPPE 6 — IMPORTSKRIPT (skjelett). TØRRMODUS ER STANDARD (fail-closed):
// uten --skriv skrives INGENTING til noen base. Tørrmodus leser eksporten, anvender ALLE
// reglene, og skriver ut hva som VILLE blitt lagret — tabell for tabell.
//
// Kjør:   node scripts/import/import.mjs                 (tørrmodus, alle leker)
//         node scripts/import/import.mjs --antall 50     (tørrmodus, 50 «tilfeldige»)
//         node scripts/import/import.mjs --skriv         (EKTE skriving — krever .env.import)
//         node scripts/import/import.mjs --slett-kjoring <uuid>
// Se LES-MEG.md.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { lesItems, lesFilindeks } from './lib/kilde.mjs'
import { lesEnv, Skriver, SKRIVEREKKEFOLGE } from './lib/db.mjs'
import { detUuid, detMedieUuid } from './lib/uuid.mjs'
import * as R from './lib/regler.mjs'

// ── CLI ──────────────────────────────────────────────────────────────────────
const arg = process.argv.slice(2)
const flagg = (n) => arg.includes(n)
const verdi = (n, d) => { const i = arg.indexOf(n); return i >= 0 ? arg[i + 1] : d }
const DRY = !flagg('--skriv')
const ANTALL = verdi('--antall', null) ? parseInt(verdi('--antall'), 10) : null
const SLETT = verdi('--slett-kjoring', null)
const ENV_STI = verdi('--env', 'scripts/import/.env.import')
const MERKE = verdi('--merke', 'torrkjoring-50')
const KJORING_ID = verdi('--kjoring-id', detUuid('kjoring', MERKE))

// zip-sti: --zip, ellers IMPORT_ZIP fra .env.import (om den finnes), ellers standard Desktop-sti.
function finnZip() {
  if (verdi('--zip', null)) return verdi('--zip')
  try { if (existsSync(ENV_STI)) { const e = lesEnv(ENV_STI); if (e.IMPORT_ZIP) return e.IMPORT_ZIP } } catch { /* .env valgfri i tørrmodus */ }
  return `${process.env.HOME}/Desktop/Høst 2026/trivselslederno_Full_Export_240826.zip`
}
const ZIP = finnZip()

// ── Kilder (kun de nødvendige JSON-medlemmene, via vakten) ──────────────────
function lastKilder() {
  const games = lesItems(ZIP, 'Content/game-nodes.json')
  const eqTerms = lesItems(ZIP, 'Vocabularies/game_equipment-terms.json')
  const catTerms = lesItems(ZIP, 'Vocabularies/game_category-terms.json')
  const eqName = Object.fromEntries(eqTerms.map(t => [String(t.tid), t.name]))
  const catName = Object.fromEntries(catTerms.map(t => [String(t.tid), t.name]))
  const indeks = lesFilindeks(ZIP)
  return { games, eqName, catName, indeks, finnes: (sti) => indeks.has(sti) }
}

// ── Plan-akkumulator ────────────────────────────────────────────────────────
function nyPlan() { const p = {}; for (const t of SKRIVEREKKEFOLGE) p[t] = []; return p }
const køRad = (kjøringId, felt) => ({ id: detUuid('ko', `${kjøringId}-${felt.type}-${felt.ressurs_id || felt.dokument_id || felt.medie_id || 'x'}-${(felt.forklaring || '').slice(0, 40)}`), ...felt, import_kjoring_id: kjøringId, status: 'ny' })

// ── HOPP OVER-regler (pkt 6): upublisert; (wheel/play_schedule/advantages leses aldri her) ──
function skalHoppes(node) {
  if (!(node.status === 1 || node.status === '1')) return 'upublisert'
  return null
}

// ── Prosessér ÉN game-node → planbidrag + avvik ─────────────────────────────
function prosesserLek(node, K, plan) {
  const nid = node.nid
  const rid = detUuid('game', nid)
  const nh = R.normHtml(node.field_description?.[0]?.safe_value || node.field_description?.[0]?.value || '')

  // Antall (R1–R8)
  const ant = R.regelAntall(R.etikettVerdi(nh, 'Antall'))
  if (ant.avvik) plan.redaksjonell_ko.push(køRad(K.kjøringId, { ...ant.avvik, ressurs_id: rid }))
  // Sted (146 mappbare)
  const sted = R.regelSted(nh)
  // Utstyr (U1)
  const utstyr = R.regelUtstyr(node.field_game_equipment, K.eqName)
  // Trinn/skoletype
  const trinn = R.regelTrinn(node.field_school_type)
  if (trinn.ukjenteKoder.length) plan.redaksjonell_ko.push(køRad(K.kjøringId, { type: 'annet', forklaring: `Ukjent skoletype-kode(r): ${trinn.ukjenteKoder.join(',')}`, ressurs_id: rid }))
  // Kategori (Move it-normalisering)
  const kategorier = (node.field_game_category || []).map(c => R.normaliserKategori(c.name || K.catName[String(c.tid)] || ''))
  // Beskrivelse (renset HTML, media ut, google docs vask)
  const beskrivelse = R.rensBeskrivelse(node.field_description?.[0]?.safe_value || '')
  // Medier (safe_value file-div)
  const medier = R.regelMedier(node.field_description?.[0]?.safe_value || '', K.finnes)

  // ── ressurser ──
  plan.ressurser.push({
    id: rid, kilde_nid: String(nid), import_kjoring_id: K.kjøringId, ressurstype: 'lek',
    sted: sted.sted, antall_min: ant.min, antall_maks: ant.max, status: 'publisert',
    // kan_ledes_av_elever: FYLLES ALDRI (ingen kilde) → utelatt (DB-default false)
  })
  // ── ressurs_innhold (nb-rad + evt. tom nn-rad) ──
  const språk = (node.field_lang || []).map(l => l.value)
  const primærSpråk = språk[0] || 'nb'
  plan.ressurs_innhold.push({
    ressurs_id: rid, sprak: primærSpråk, tittel: node.title || null,
    beskrivelse: beskrivelse || null, antall_raatekst: ant.raatekst, ferskhet: 'gjeldende',
    // formaal: FYLLES ALDRI maskinelt
  })
  // Nynorsk-rad tom med ferskhet 'mangler' der språkmerket finnes men teksten ikke gjør det.
  if (språk.includes('nn') && primærSpråk !== 'nn') {
    plan.ressurs_innhold.push({ ressurs_id: rid, sprak: 'nn', tittel: null, beskrivelse: null, antall_raatekst: null, ferskhet: 'mangler' })
    plan.redaksjonell_ko.push(køRad(K.kjøringId, { type: 'annet', forklaring: `Nynorsk-merket, men ingen nn-tekst i eksporten — tom nn-rad opprettet.`, ressurs_id: rid }))
  }
  // ── koblinger ──
  for (const k of kategorier) if (k) plan.ressurs_kategori.push({ ressurs_id: rid, kategori_navn: k })
  for (const u of utstyr.utstyrsnavn) plan.ressurs_utstyr.push({ ressurs_id: rid, utstyr_navn: u })  // U1: 428 er allerede droppet
  for (const t of trinn.trinnKoder) plan.ressurs_trinn.push({ ressurs_id: rid, trinn_kode: t })
  for (const e of trinn.egnetNavn) plan.ressurs_egnet.push({ ressurs_id: rid, egnet_navn: e })       // S → SFO/AKS
  // ── medier ──
  let mrek = 0
  for (const m of medier) {
    if (m.avvik) plan.redaksjonell_ko.push(køRad(K.kjøringId, { ...m.avvik, ressurs_id: rid }))
    if (m.youtube_id) {   // ekstern YouTube — ingen fil, ingen medie-rad her; flagg til kø
      plan.redaksjonell_ko.push(køRad(K.kjøringId, { type: 'annet', forklaring: `YouTube-embed (${m.youtube_id}) — håndteres utenfor filmedier.`, ressurs_id: rid })); continue
    }
    // Alt-tekst-regelen gjelder KUN bilder (video/pdf trenger ikke alt-tekst).
    let altTekst = null, altKilde = null
    if (m.type === 'bilde') {
      const alt = R.regelAltTekst(null, node.title)   // eksporten har ingen alt-tekst på embeds
      altTekst = alt.alt_tekst; altKilde = alt.alt_tekst_kilde
      if (alt.avvik) plan.redaksjonell_ko.push(køRad(K.kjøringId, { ...alt.avvik, ressurs_id: rid }))
    }
    plan.medier.push({
      id: detMedieUuid('game', nid, m.fid, m.type), ressurs_id: rid, type: m.type,
      bunny_video_id: null,                          // FASE 2 fyller denne for video
      storage_sti: m.storage_sti, original_filnavn: m.original_filnavn,
      alt_tekst: altTekst, alt_tekst_kilde: altKilde,
      er_original: m.er_original, rekkefolge: mrek++, kilde_nid: String(nid), import_kjoring_id: K.kjøringId,
    })
  }
  // field_icon / field_image (strukturerte felt) er IKKE dekket av safe_value-media-regelen →
  // flagg til kø framfor å gjette (jf. TORRKJORING-EN-LEK.md E-hull #2). Ingen medie-rad.
  if ((node.field_icon || []).length) plan.redaksjonell_ko.push(køRad(K.kjøringId, { type: 'annet', forklaring: `field_icon satt (${node.field_icon[0]?.filename}) — ingen regel for ikon; må avklares.`, ressurs_id: rid }))
  if ((node.field_image || []).length) plan.redaksjonell_ko.push(køRad(K.kjøringId, { type: 'annet', forklaring: `field_image satt (${node.field_image[0]?.filename}) — strukturert bildefelt uten importregel; må avklares.`, ressurs_id: rid }))

  // ── tilleggsmateriale (field_related_documents → dokumenter + ressurs_dokument) ──
  for (const d of (node.field_related_documents || [])) {
    const docNid = d.target_id
    const did = detUuid('document', docNid)
    // dokument-raden lages av dokument-passet; her registrerer vi koblingen (H1: 42 delt).
    plan.ressurs_dokument.push({ ressurs_id: rid, dokument_id: did, kilde_dok_nid: String(docNid) })
  }
}

// ── Kjør ─────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now()
  console.log(`# Importskjelett — ${DRY ? 'TØRRMODUS (skriver ingenting)' : 'SKRIVEMODUS'}`)
  console.log(`Kjøring-id: ${KJORING_ID}  ·  zip: ${ZIP}`)

  if (SLETT) {
    if (DRY) { console.log(`[tørrmodus] ville slettet alle rader fra kjøring ${SLETT} (én operasjon).`); return }
    const s = new Skriver({ dryRun: false, envSti: ENV_STI }); await s.koble(); await s.slettKjøring(SLETT); await s.ferdig()
    console.log(`Slettet kjøring ${SLETT}.`); return
  }

  const K0 = lastKilder()
  const K = { ...K0, kjøringId: KJORING_ID }
  let leker = K.games

  // HOPP OVER upublisert; tell det.
  const hoppet = { upublisert: 0 }
  leker = leker.filter(n => { const h = skalHoppes(n); if (h) { hoppet[h] = (hoppet[h] || 0) + 1; return false } return true })

  // Utvalg: --antall N gir N «tilfeldige» via stabil hash-sortering (reproduserbart, ingen Math.random).
  if (ANTALL) {
    leker = leker.slice().sort((a, b) => createHash('md5').update('s' + a.nid).digest('hex').localeCompare(createHash('md5').update('s' + b.nid).digest('hex'))).slice(0, ANTALL)
  }

  const plan = nyPlan()
  plan.import_kjoring.push({ id: KJORING_ID, kilde: '240826-eksport', status: 'paagaar', antall_noder: leker.length })
  const regelTelling = {}, medieTelling = { bilde: 0, video: 0 }
  for (const n of leker) {
    const a = R.regelAntall(R.etikettVerdi(R.normHtml(n.field_description?.[0]?.safe_value || ''), 'Antall'))
    regelTelling[a.regel] = (regelTelling[a.regel] || 0) + 1
    prosesserLek(n, K, plan)
  }
  for (const m of plan.medier) medieTelling[m.type] = (medieTelling[m.type] || 0) + 1

  const ms = Date.now() - t0

  // ── Rapport ──
  console.log(`\n## Behandlet ${leker.length} leker (hoppet over upublisert: ${hoppet.upublisert})`)
  console.log(`\n### Rader per tabell (i skriverekkefølge)`)
  for (const t of SKRIVEREKKEFOLGE) if (plan[t].length) console.log(`  ${t.padEnd(24)} ${plan[t].length}`)
  const køTyper = {}
  for (const r of plan.redaksjonell_ko) køTyper[r.type] = (køTyper[r.type] || 0) + 1
  console.log(`\n### Avvik (redaksjonell_ko) per type`)
  for (const [t, n] of Object.entries(køTyper).sort((a, b) => b[1] - a[1])) console.log(`  ${t.padEnd(24)} ${n}`)
  console.log(`\nTid: ${ms} ms`)

  // Valgfri markdown-rapport (brukes til TORRKJORING-50.md).
  const RAPPORT = verdi('--rapport', null)
  if (RAPPORT) {
    const l = []
    l.push('# Tørrkjøring — 50 tilfeldige leker (skjelettets selvtest)')
    l.push('')
    l.push(`**Generert av:** \`node scripts/import/import.mjs --antall ${leker.length} --rapport ...\` (TØRRMODUS — ingenting skrevet til noen base).`)
    l.push(`**Kjøring-id (deterministisk fra «${MERKE}»):** \`${KJORING_ID}\``)
    l.push(`**Utvalg:** ${leker.length} leker, valgt reproduserbart ved stabil hash-sortering av nid (ingen Math.random).`)
    l.push(`**Kilde:** ${ZIP} (kun JSON-medlemmer lest via vakt; ingen binær-utpakking).`)
    l.push(`**Tid:** ${ms} ms.`)
    l.push('')
    l.push(`## Hopp over`)
    l.push(`- Upubliserte leker hoppet over (globalt i eksporten): **${hoppet.upublisert}**. (wheel/play_schedule/advantages leses aldri.)`)
    l.push('')
    l.push('## Rader per tabell (i FK-skriverekkefølge)')
    l.push('| Tabell | Rader |')
    l.push('|---|---:|')
    for (const t of SKRIVEREKKEFOLGE) if (plan[t].length) l.push(`| \`${t}\` | ${plan[t].length} |`)
    l.push('')
    l.push('## Antall-regel som traff (R1–R8)')
    l.push('| Regel | Leker |')
    l.push('|---|---:|')
    for (const [r, n] of Object.entries(regelTelling).sort((a, b) => b[1] - a[1])) l.push(`| ${r} | ${n} |`)
    l.push('')
    l.push('## Medier (safe_value file-div)')
    l.push(`- Bilde: **${medieTelling.bilde}** · Video: **${medieTelling.video}** (video får \`bunny_video_id=NULL\` — fylles i fase 2).`)
    l.push('')
    l.push('## Avvik (redaksjonell_ko) per type')
    l.push('| Type | Antall |')
    l.push('|---|---:|')
    for (const [t, n] of Object.entries(køTyper).sort((a, b) => b[1] - a[1])) l.push(`| ${t} | ${n} |`)
    l.push('')
    l.push('## Merknader')
    l.push('- `manglende_alttekst` = én per medie (eksporten har ingen alt-tekst på embeds) → tittel brukt som fallback, `alt_tekst_kilde=\'fallback\'`, kø-rad opprettet. WCAG-kravet er dermed dekket midlertidig og synlig for redaksjonen.')
    l.push('- `annet` dekker bl.a. R5-usikkerhet, utolkbart antall, tom nynorsk-rad, YouTube-embed, og `field_icon`/`field_image` (strukturerte felt uten importregel — flagget, ikke gjettet).')
    l.push('- `ressurs_trinn` er mange rader fordi skoletype→trinn ekspanderer (B→1–7, U→8–10, K→1–10, BH→bhg); S→`ressurs_egnet` «SFO/AKS».')
    l.push('- Ingen `ressurs_kompetansemaal`-rader: kompetansemål hører til atlu (aktiv læring), ikke game-leker.')
    l.push('- `kan_ledes_av_elever` skrives ALDRI (ingen kilde) — utelatt fra insert, DB-default gjelder.')
    l.push('')
    writeFileSync(RAPPORT, l.join('\n') + '\n')
    console.log(`\nRapport skrevet: ${RAPPORT}`)
  }

  if (!DRY) {
    console.log('\n>>> SKRIVEMODUS: skriver planen i FK-rekkefølge (én transaksjon, stoppregel).')
    const s = new Skriver({ dryRun: false, envSti: ENV_STI })
    await s.koble(); await s.skrivPlan(plan); await s.ferdig()
    console.log('Ferdig skrevet.')
  } else {
    console.log('\n[tørrmodus] Ingenting skrevet. Kjør med --skriv (og .env.import) for ekte import.')
  }
  return { plan, køTyper, ms, antall: leker.length, hoppet }
}

main().catch(e => { console.error('FEIL:', e.message); process.exit(1) })
export { main }
