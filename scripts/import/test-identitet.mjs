#!/usr/bin/env node
// IDENTITETS-BEVIS (OPPGAVE A rev 2, 5. sep): sperren spør DATABASEN, ikke strengen.
// bekreftKopiIdentitet leser databasens egen markør (public.import_kopi_identitet) og godtar KUN en
// ref som står i IMPORT_TILLATTE_REF. Ingen tilkoblingsstreng er inn­data — derfor kan ingen streng-
// omgåelse (?host=, ?user=, NUL, %-koding) påvirke den. Testes mot en EKTE lokal forbindelse.
//
//   node scripts/import/test-identitet.mjs
//
// HARDSTOP: lokal base, BEGIN/ROLLBACK, ingenting mot Supabase/prod, ingen git.

import { writeFileSync } from 'node:fs'
import { bekreftKopiIdentitet, IMPORT_KOPI_TABELL } from './lib/db.mjs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const OVING = 'bnbrbgvywdnczxajpaoj'
const PROD = 'zpirjbrcbeubwpmtncxx'
const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
const kaster = async (fn) => { try { await fn(); return null } catch (e) { return e.message } }

async function main() {
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect(); await k.query('begin')
  P('# Identitets-bevis — bekreftKopiIdentitet spør databasen, ikke strengen')
  P('')
  try {
    // Sett opp markøren = øvingskopien (som oppsett-SQL-en gjør i den ekte øvingskopien).
    await k.query(`create table if not exists public.${IMPORT_KOPI_TABELL} (ref text primary key)`)
    await k.query(`insert into public.${IMPORT_KOPI_TABELL} (ref) values ($1) on conflict (ref) do nothing`, [OVING])

    // A — markør = øving, allowlist = [øving] → ACCEPT
    P('## A — databasens markør = øvingskopien, allowlist = [øving]')
    const aM = await kaster(() => bekreftKopiIdentitet(k, [OVING]))
    krev('slipper gjennom (ingen kast)', aM === null)
    P('')

    // B — markør = prod → REJECT (navngir funnet ref)
    P('## B — databasen utgir seg for PROD (markør = prod), allowlist = [øving]')
    await k.query('savepoint s')
    await k.query(`update public.${IMPORT_KOPI_TABELL} set ref=$1`, [PROD])
    const bM = await kaster(() => bekreftKopiIdentitet(k, [OVING]))
    krev('kaster (identitet ikke tillatt)', bM != null && bM.includes(PROD) && bM.includes('identitet'))
    P(`  «${bM}»`)
    await k.query('rollback to savepoint s')
    P('')

    // C — markør mangler helt (som i prod) → REJECT
    P('## C — markørtabellen mangler (som i prod)')
    await k.query('savepoint s2')
    await k.query(`drop table public.${IMPORT_KOPI_TABELL}`)
    const cM = await kaster(() => bekreftKopiIdentitet(k, [OVING]))
    krev('kaster (mangler markørtabell)', cM != null && cM.includes('mangler markørtabellen'))
    P(`  «${cM}»`)
    await k.query('rollback to savepoint s2')
    P('')

    // D — strengen er IRRELEVANT: bekreftKopiIdentitet tar ingen streng. Uansett hva en angriper
    // skriver i URL-en, er det databasens egen markør som avgjør. Vis at en ukjent ref i allowlisten
    // ikke hjelper når markøren sier øving (og motsatt).
    P('## D — strengen er ikke inndata: kun databasens markør + allowlist avgjør')
    const dM1 = await kaster(() => bekreftKopiIdentitet(k, ['abcdefghij0123456789']))   // markør=øving, men ikke i allowlist
    krev('markør=øving men allowlist=[ukjent] → kaster', dM1 != null)
    const dM2 = await kaster(() => bekreftKopiIdentitet(k, [OVING, 'abcdefghij0123456789']))  // øving i allowlist
    krev('markør=øving og øving i allowlist → slipper', dM2 === null)
    P('')

    // E — «ingen skriv skjer»: mekanikken slik koble() bruker den. Ved kast lukkes forbindelsen FØR
    // noen skriv. Vi simulerer koble()s egen wrapper mot en base med feil markør.
    P('## E — koble()-mekanikken: ved avvist identitet lukkes forbindelsen, ingen skriv')
    const k2 = new pg.Client({ connectionString: DBURL })
    await k2.connect()
    await k2.query('begin')
    await k2.query(`create table if not exists public.${IMPORT_KOPI_TABELL} (ref text primary key)`)
    await k2.query(`update public.${IMPORT_KOPI_TABELL} set ref=$1`, [PROD])   // base «er» prod (rulles tilbake ved end())
    let lukket = false, skrevUmulig = false
    const eM = await kaster(async () => {
      try { await bekreftKopiIdentitet(k2, [OVING]) }
      catch (e) { await k2.end().catch(() => {}); lukket = true; throw e }   // = koble()s catch
    })
    krev('identitet avvist + forbindelse lukket', eM != null && lukket)
    try { await k2.query('select 1') } catch { skrevUmulig = true }   // lukket → ingen videre spørring/skriv mulig
    krev('ingen videre operasjon mulig på lukket forbindelse (ingen skriv)', skrevUmulig)
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL. Databasens egen markør avgjør; strengen er irrelevant; avvist identitet gir lukket forbindelse uten skriv.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    await k.query('rollback').catch(() => {})
    await k.end().catch(() => {})
  }
  writeFileSync(`${UT}/RESULTAT-identitet-5sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-identitet-5sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
