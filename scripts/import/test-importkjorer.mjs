#!/usr/bin/env node
// BEVIS for importkjøreren (import-kjorer.mjs). Kjører mot LOKAL base (kjorImport tar en lokal klient;
// den ekte sperren Skriver.koble brukes i CLI-modus mot øvingskopien — nettverk, ikke i BEVIS).
// kjorImport COMMITTER, så testen rydder med rullTilbake (slettKjøring) mellom stegene. Bygg fersk base
// med porten etter denne testen, før regresjon.
//
//   node scripts/import/test-importkjorer.mjs
//
// DETERMINISME: de bevisene som måler tall/fingeravtrykk sender inn en FAST id (KJ), fordi maal() og
// fingeravtrykk() i regresjonsporten filtrerer på KJ. Bevisene for per-kjøring-id (BEVIS 6/7) bruker
// derimot standarden (ny tilfeldig id per kjøring) — det er nettopp den egenskapen de skal vise.
//
// HARDSTOP: lokal base, ingenting mot Supabase/prod, ingen git.

import { writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { kjorImport, rullTilbake } from './import-kjorer.mjs'
import { maal, fingeravtrykk, FASIT, KJ } from './test-alle-fem-pass.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const TI = ['medier', 'dokumenter', 'dokument_dokumenttype', 'dokument_sprak', 'dokument_fag', 'ressurs_dokument', 'samlinger', 'samling_ressurs', 'samling_dokument', 'samling_medie']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
const status = async (k, id) => (await k.query('select status from import_kjoring where id=$1', [id])).rows[0]?.status

async function main() {
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()   // autocommit — kjorImport styrer sin egen begin/commit
  P('# Importkjører-bevis (mot lokal base)')
  P('')
  try {
    // ── BEVIS 1: full kjøring, alle tallene (fast id KJ for determinisme) ──
    const r1 = await kjorImport(k, { kjoringId: KJ })
    krev('kjøringen fullførte (ok)', r1.ok, r1.feil || '')
    const t1 = await maal(k)
    const feilTi = TI.filter(x => t1[x] !== FASIT[x])
    krev(`de ti tallene treffer (${TI.map(x => t1[x]).join('/')})`, feilTi.length === 0, feilTi.length ? 'avvik: ' + feilTi.join(',') : '')
    krev(`aktiv læring ressurs_kompetansemaal = 352`, t1.ressurs_kompetansemaal === 352, `${t1.ressurs_kompetansemaal}`)
    krev(`ressurs_egnet vei-A fra samlinger = 155`, r1.veiA === 155, `${r1.veiA}`)
    P('')

    // ── BEVIS 2: sesjonsvariabelen satt → kompetansemål-endringer logget med kjørings-id ──
    P('## BEVIS 2 — sesjonsvariabelen satt (kompetansemål-endringer logget med kjørings-id)')
    const logg = +(await k.query(`select count(*) n from endringslogg where import_kjoring_id=$1 and tabell in ('kompetansemaal','kompetansemaal_trinn')`, [KJ])).rows[0].n
    const totalt = +(await k.query(`select count(*) n from endringslogg where import_kjoring_id=$1`, [KJ])).rows[0].n
    krev(`endringslogg-rader med kjørings-id KJ (kompetansemaal/-trinn: ${logg}, totalt: ${totalt})`, logg > 0)
    P('')

    // ── BEVIS 5: to kjøringer med SAMME faste id → identisk fingeravtrykk ──
    P('## BEVIS 5 — to kjøringer (fast id), identisk fingeravtrykk')
    const fp1 = await fingeravtrykk(k)
    await rullTilbake(k, KJ)                        // slettKjøring (BESTÅTT) rydder kjøring 1
    const r2 = await kjorImport(k, { kjoringId: KJ })
    krev('kjøring 2 fullførte', r2.ok, r2.feil || '')
    const fp2 = await fingeravtrykk(k)
    krev(`identisk total-fingeravtrykk (${fp1.total.slice(0, 12)} = ${fp2.total.slice(0, 12)})`, fp1.total === fp2.total)
    await rullTilbake(k, KJ)                        // rydd før feilkobling-testen
    P('')

    // ── BEVIS 3: simulert FEILKOBLING (peker på noe som ikke finnes) → stopp + tilbakerulling ──
    P('## BEVIS 3 — simulert feilkobling → kjøreren stopper og ruller tilbake')
    const r3 = await kjorImport(k, {
      kjoringId: KJ,
      saboter: { lek: (p) => { p.ressurs_dokument.push({ ressurs_id: p.ressurser[0].id, dokument_id: '00000000-0000-0000-0000-000000000000', rekkefolge: 0 }) } },
    })
    krev('kjøreren stoppet (ok=false)', r3.ok === false, r3.feil)
    const etterFeil = await maal(k)
    const restTi = TI.filter(x => etterFeil[x] !== 0)
    krev('ingenting committet (alle ti tabeller = 0 etter tilbakerulling)', restTi.length === 0, restTi.length ? 'rest: ' + restTi.map(x => `${x}=${etterFeil[x]}`).join(',') : '')
    P('')

    // ── BEVIS 4: rekkefølgen HÅNDHEVET — lek før dokument → kjøreren NEKTER (ikke FK-feil) ──
    P('## BEVIS 4 — rekkefølgen håndhevet (lek før dokument → kjøreren nekter)')
    const r4 = await kjorImport(k, { kjoringId: KJ, rekkefolge: ['lek', 'dokument', 'medie', 'samling', 'aktiv_laering'] })
    const nektet = r4.ok === false && /kjøreren nekter/.test(r4.feil || '') && /lek/.test(r4.feil) && /dokument/.test(r4.feil)
    krev('kjøreren NEKTER lek før dokument (ikke en FK-feil)', nektet, r4.feil)
    const etter4 = await maal(k)
    krev('ingenting committet av det nektede forsøket', TI.every(x => etter4[x] === 0))
    P('')

    // ── BEVIS 6: hver kjøring får SIN EGEN id (standard = ny uuid) + status settes til ferdig ──
    P('## BEVIS 6 — to påfølgende kjøringer får ULIKE id-er, og status settes til ferdig')
    const ra = await kjorImport(k)                  // ingen kjoringId → ny tilfeldig id
    krev('kjøring A fullførte', ra.ok, ra.feil || '')
    krev(`kjøring A fikk en ekte uuid (${ra.kjoringId})`, UUID_RE.test(ra.kjoringId || ''))
    krev('kjøring A sin id er IKKE testens faste KJ', ra.kjoringId !== KJ)
    const statusA = await status(k, ra.kjoringId)
    krev(`status satt til «ferdig» etter vellykket kjøring (${statusA})`, statusA === 'ferdig')   // ← BEVIS «status ferdig»
    await rullTilbake(k, ra.kjoringId)
    const rb = await kjorImport(k)                  // ingen kjoringId → NY tilfeldig id igjen
    krev('kjøring B fullførte', rb.ok, rb.feil || '')
    krev(`kjøring B fikk en ANNEN id enn A (${ra.kjoringId.slice(0, 8)}… ≠ ${rb.kjoringId.slice(0, 8)}…)`, rb.kjoringId !== ra.kjoringId)
    await rullTilbake(k, rb.kjoringId)
    P('')

    // ── BEVIS 7: slettKjøring på ÉN kjøring lar en ANNEN stå urørt ──
    // To kjøringer av SAMME kilde kan ikke sameksistere (upsert på deterministiske rad-id-er restempler
    // radene). Derfor: kjøring A er en EKTE full import; kjøring B er en liten UAVHENGIG kjøring med egne
    // (syntetiske, ikke-kolliderende) rader i en EIER-tabell (ressurser) og et SIKKERHETSNETT (redaksjonell_ko)
    // — nettopp det slettKjøring dekker. Så sletter vi A og viser at B er urørt.
    P('## BEVIS 7 — slettKjøring(A) lar den andre kjøringen (B) stå urørt')
    const idA = randomUUID(), idB = randomUUID()
    const rA = await kjorImport(k, { kjoringId: idA, merke: 'bevis7-A' })
    krev('kjøring A (ekte full import) fullførte', rA.ok, rA.feil || '')
    // Bygg uavhengig kjøring B for hånd (autocommit-klient → hver insert commiter umiddelbart).
    await k.query(`insert into import_kjoring (id, kilde, status, antall_noder, notat) values ($1,'240826-eksport','ferdig',0,'bevis7-B') on conflict (id) do nothing`, [idB])
    const synthRes = randomUUID()
    await k.query(`insert into ressurser (id, import_kjoring_id, ressurstype, status) values ($1,$2,'lek','publisert')`, [synthRes, idB])
    await k.query(`insert into redaksjonell_ko (id, type, status, import_kjoring_id) values ($1,'annet','ny',$2)`, [randomUUID(), idB])
    const cnt = async (sql, id) => +(await k.query(sql, [id])).rows[0].n
    const førA = await cnt('select count(*) n from ressurser where import_kjoring_id=$1', idA)
    const førB_res = await cnt('select count(*) n from ressurser where import_kjoring_id=$1', idB)
    const førB_ko = await cnt('select count(*) n from redaksjonell_ko where import_kjoring_id=$1', idB)
    await rullTilbake(k, idA)                       // slettKjøring(A)
    const etterA = await cnt('select count(*) n from ressurser where import_kjoring_id=$1', idA)
    const etterB_res = await cnt('select count(*) n from ressurser where import_kjoring_id=$1', idB)
    const etterB_ko = await cnt('select count(*) n from redaksjonell_ko where import_kjoring_id=$1', idB)
    const statusEtterA = await status(k, idA)
    krev(`kjøring A slettet (ressurser ${førA} → ${etterA})`, førA > 0 && etterA === 0)
    krev(`kjøring A merket «rullet_tilbake» (${statusEtterA})`, statusEtterA === 'rullet_tilbake')
    krev(`kjøring B URØRT — eier-rad ressurser (${førB_res} → ${etterB_res}) og sikkerhetsnett redaksjonell_ko (${førB_ko} → ${etterB_ko})`,
      etterB_res === førB_res && førB_res === 1 && etterB_ko === førB_ko && førB_ko === 1)
    await rullTilbake(k, idB)                       // rydd B
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL. Kjøreren eier rekkefølgen (håndhevet), setter sesjonsvariabelen, gir hver kjøring sin egen id, setter status ferdig, håndhever stoppregelen og ruller tilbake id-skopet via slettKjøring.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    await rullTilbake(k, KJ).catch(() => {})       // rydd uansett (fast id)
    await k.end()
  }
  writeFileSync(`${UT}/RESULTAT-importkjorer-6sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-importkjorer-6sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
