#!/usr/bin/env node
// BEVIS for migrasjon 104 (kompetansemaal-endringssporing). Alt i ÉN transaksjon som RULLES TILBAKE
// (basen røres ikke). Sesjonsvariabelen trivsel.import_kjoring_id settes med set_config(...,true) —
// slik transaksjonsåpneren (importkjøreren) skal gjøre det.
//
//   node scripts/import/test-104-sporing.mjs   (mot trivsel_port_test på 001-104)
//
// BEVIS 3: triggeren fyrer nå på kompetansemaal_trinn og logger forrige verdi + import_kjoring_id.
// BEVIS 4: en 'opprett'-rad kan SLETTES via loggen; en 'endre'-rad kan REVERSERES til forrige verdi.
// + negativ kontroll: uten sesjonsvariabel logges endringen fortsatt, men med import_kjoring_id = NULL.

import { writeFileSync } from 'node:fs'

const DBURL = process.env.OPPSLAG_TESTDB || 'postgresql://kjartaneide@localhost:5432/trivsel_port_test'
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const KJ = '11111111-2222-3333-4444-555555555555'   // test-kjøring
const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

async function main() {
  const pg = (await import('pg')).default
  const k = new pg.Client({ connectionString: DBURL })
  await k.connect()
  await k.query('begin')
  P('# Migrasjon 104 — sporingsbevis (rullet tilbake, basen urørt)')
  P('')
  try {
    await k.query(`insert into import_kjoring (id, kilde, status, antall_noder) values ($1,'104-test','paagaar',1) on conflict (id) do nothing`, [KJ])
    // Transaksjonsåpneren setter kjøringskonteksten (spec punkt 7). true = kun denne transaksjonen.
    await k.query(`select set_config('trivsel.import_kjoring_id', $1, true)`, [KJ])

    // Test-mål (tekst_nb tilfredsstiller km_maalform_minst_ett) + to trinn. Rullet tilbake etterpå.
    const kmId = (await k.query(`insert into kompetansemaal (uri, kode, tekst, tekst_nb, laereplanversjon, laereplan_kode, utgatt)
      values ('test:104:'||gen_random_uuid(), 'T104', 'opprinnelig', 'opprinnelig', 'LK20', 'TST01-01', false) returning id`)).rows[0].id
    const trinn = (await k.query(`select id, kode from trinn where land='NO' and kode ~ '^[0-9]+$' order by kode::int limit 3`)).rows
    const [t1, t2, t3] = trinn
    const utgatt0 = (await k.query(`select utgatt from kompetansemaal where id=$1`, [kmId])).rows[0].utgatt

    // ── BEVIS 3: opprett + endre på kompetansemaal_trinn logges (med import_kjoring_id og forrige verdi) ──
    P('## BEVIS 3 — triggeren fyrer på kompetansemaal_trinn')
    await k.query(`insert into kompetansemaal_trinn (kompetansemaal_id, trinn_id) values ($1,$2)`, [kmId, t1.id])
    const opprett = (await k.query(`select handling, import_kjoring_id, full_rad from endringslogg
      where tabell='kompetansemaal_trinn' and full_rad->>'kompetansemaal_id'=$1 and handling='opprett' order by id desc limit 1`, [String(kmId)])).rows[0]
    krev(`INSERT logget som 'opprett' med import_kjoring_id`, opprett && opprett.handling === 'opprett' && opprett.import_kjoring_id === KJ, `kjøring=${opprett?.import_kjoring_id}`)

    await k.query(`update kompetansemaal_trinn set trinn_id=$1 where kompetansemaal_id=$2 and trinn_id=$3`, [t2.id, kmId, t1.id])
    const endre = (await k.query(`select handling, endringer, import_kjoring_id from endringslogg
      where tabell='kompetansemaal_trinn' and handling='endre' and import_kjoring_id=$1 order by id desc limit 1`, [KJ])).rows[0]
    const gammelTrinn = endre?.endringer?.trinn_id?.gammel
    krev(`UPDATE logget som 'endre' med FORRIGE verdi (trinn_id gammel=${JSON.stringify(gammelTrinn)})`, endre && String(gammelTrinn) === String(t1.id) && endre.import_kjoring_id === KJ)
    P('')

    // ── BEVIS 4a: 'endre' på kompetansemaal REVERSERES til forrige verdi ──
    P('## BEVIS 4a — endret rad reverseres til forrige verdi (utgatt)')
    await k.query(`update kompetansemaal set utgatt=$1 where id=$2`, [!utgatt0, kmId])   // endre: gammel=utgatt0
    const kmEndre = (await k.query(`select endringer from endringslogg where tabell='kompetansemaal' and handling='endre'
      and rad_id=$1 and import_kjoring_id=$2 order by id desc limit 1`, [String(kmId), KJ])).rows[0]
    const utgattGammel = kmEndre?.endringer?.utgatt?.gammel
    // Reverser: sett feltet tilbake til gammel-verdien fra loggen.
    await k.query(`update kompetansemaal set utgatt=$1 where id=$2`, [utgattGammel, kmId])
    const naa = (await k.query(`select utgatt from kompetansemaal where id=$1`, [kmId])).rows[0].utgatt
    krev(`utgatt ${utgatt0}→${!utgatt0}, reversert via logg til gammel=${JSON.stringify(utgattGammel)} → nå ${naa}`, utgattGammel === utgatt0 && naa === utgatt0)
    P('')

    // ── BEVIS 4b: 'opprett'-rad SLETTES, funnet via loggen (import_kjoring_id) ──
    // Egen, ren-innsatt rad (kmId, t3) — aldri oppdatert, så opprett-loggens full_rad peker på den.
    P('## BEVIS 4b — ny rad (opprett) slettes, funnet via loggen')
    await k.query(`insert into kompetansemaal_trinn (kompetansemaal_id, trinn_id) values ($1,$2)`, [kmId, t3.id])
    const forFinnes = (await k.query(`select count(*) n from kompetansemaal_trinn where kompetansemaal_id=$1 and trinn_id=$2`, [kmId, t3.id])).rows[0].n
    // Finn opprett-raden for (kmId, t3) i loggen (denne kjøringen) og slett via full_rad.
    const oR = (await k.query(`select full_rad from endringslogg where tabell='kompetansemaal_trinn' and handling='opprett'
      and import_kjoring_id=$1 and full_rad->>'trinn_id'=$2`, [KJ, String(t3.id)])).rows
    for (const r of oR) await k.query(`delete from kompetansemaal_trinn where kompetansemaal_id=$1 and trinn_id=$2`, [r.full_rad.kompetansemaal_id, r.full_rad.trinn_id])
    const etterFinnes = (await k.query(`select count(*) n from kompetansemaal_trinn where kompetansemaal_id=$1 and trinn_id=$2`, [kmId, t3.id])).rows[0].n
    krev(`opprett-rad funnet via logg og slettet: finnes ${forFinnes} → ${etterFinnes}`, oR.length === 1 && +forFinnes === 1 && +etterFinnes === 0)
    P('')

    // ── Negativ kontroll: uten sesjonsvariabel → import_kjoring_id NULL, men endringen skjer ──
    P('## Negativ kontroll — uten sesjonsvariabel logges endringen, men uten kjørings-id')
    await k.query(`select set_config('trivsel.import_kjoring_id', '', true)`)
    await k.query(`update kompetansemaal set utgatt=$1 where id=$2`, [!utgatt0, kmId])   // garantert endring
    const utenKj = (await k.query(`select import_kjoring_id from endringslogg where tabell='kompetansemaal'
      and rad_id=$1 order by id desc limit 1`, [String(kmId)])).rows[0]
    const utgattNaa = (await k.query(`select utgatt from kompetansemaal where id=$1`, [kmId])).rows[0].utgatt
    krev('endring logget med import_kjoring_id = NULL, men utgatt faktisk satt', utenKj.import_kjoring_id === null && utgattNaa === !utgatt0)
    P('')

    P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL. Triggeren fyrer på kompetansemaal_trinn med forrige verdi + kjørings-id; opprett kan slettes, endre kan reverseres; fravær av sesjonsvariabel gir NULL uten å blokkere.` : `RESULTAT: ${feil} FEIL — se over.`)
  } finally {
    await k.query('rollback')   // basen røres ikke
    await k.end()
  }
  writeFileSync(`${UT}/RESULTAT-104-sporing-6sep.txt`, L.join('\n') + '\n')
  console.log('\nResultatfil:', `${UT}/RESULTAT-104-sporing-6sep.txt`)
  if (feil !== 0) process.exit(1)
}

main().catch(e => { console.error('FEIL:', e.message); if (e.stack) console.error(e.stack); process.exit(1) })
