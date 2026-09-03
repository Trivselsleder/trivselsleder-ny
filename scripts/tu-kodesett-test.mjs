/* global process, console */
// ============================================================================
// TU steg 4.3 — BEVIS-SKRIPT for kodegeneratoren (kjøres lokalt, rører ALDRI
// databasen). Kjør fra repo-roten:
//
//   TU_KODE_HMAC_KEY=test-nokkel node scripts/tu-kodesett-test.mjs
//
// Beviser:
//   1. Generatoren gir UNIKE koder i det forvekslingsfrie alfabetet
//      (aldri 0, O, 1, I, L), riktig lengde, kryptografisk kilde.
//   2. RUNDTUR: beregnHmac(normaliserKode(kode-slik-eleven-taster-den))
//      === HMAC-en kodegeneratoren lagret — for varianter med små bokstaver,
//      mellomrom og bindestrek (formatet på arket).
//   3. KOLLISJON: med en kjent HMAC «seedet» i en simulert tu_koder-tabell
//      (mock av RPC tu_generer_kodesett, samme semantikk som migr 066)
//      oppdages avviket og settet fylles opp til forventet antall.
//   4. Atomisk retry: en RPC som først svarer TU_KOLLISJON (alt rullet
//      tilbake) fører til nytt parti — og lykkes på forsøk to.
// ============================================================================
import assert from 'node:assert/strict'
import { normaliserKode, beregnHmac } from '../api/tu/_kode.js'
import {
  KODE_ALFABET, KODE_LENGDE, KODE_RESERVE,
  genererKode, genererKodeparti, formaterKode, lagKodesett,
} from '../api/tu/_kodesett.js'

if (!process.env.TU_KODE_HMAC_KEY) {
  console.error('Sett TU_KODE_HMAC_KEY i miljøet først (en hvilken som helst testverdi).')
  process.exit(1)
}

let ok = 0
function bevis(navn, fn) {
  fn()
  ok++
  console.log(`  ✓ ${navn}`)
}

// --- 1) Generatoren ---------------------------------------------------------
console.log('\n1) Generator: unikhet, alfabet, lengde')
bevis('alfabetet er forvekslingsfritt (uten 0 O 1 I L) og 31 tegn', () => {
  for (const forbudt of ['0', 'O', '1', 'I', 'L']) assert(!KODE_ALFABET.includes(forbudt), `alfabetet inneholder ${forbudt}`)
  assert.equal(new Set(KODE_ALFABET).size, KODE_ALFABET.length)
  assert.equal(KODE_ALFABET.length, 31)
})
bevis('10 000 koder: riktig lengde og kun alfabetets tegn', () => {
  for (let i = 0; i < 10000; i++) {
    const k = genererKode()
    assert.equal(k.length, KODE_LENGDE)
    for (const tegn of k) assert(KODE_ALFABET.includes(tegn), `ulovlig tegn ${tegn}`)
  }
})
bevis('genererKodeparti(1000) gir 1000 UNIKE koder', () => {
  const parti = genererKodeparti(1000)
  assert.equal(parti.length, 1000)
  assert.equal(new Set(parti).size, 1000)
})
bevis('koden er sin egen normalform (normaliserKode endrer den ikke)', () => {
  for (let i = 0; i < 1000; i++) {
    const k = genererKode()
    assert.equal(normaliserKode(k), k)
  }
})

// --- 2) Rundtur: arket ↔ elevflaten ----------------------------------------
console.log('\n2) Rundtur: HMAC fra generatoren === HMAC elevflaten beregner')
bevis('tastevarianter (små bokstaver, mellomrom, bindestrek) gir samme HMAC', () => {
  for (let i = 0; i < 500; i++) {
    const raa = genererKode()                       // slik generatoren lager den
    const lagret = beregnHmac(normaliserKode(raa))  // slik den lagres (FASIT-rekkefølgen)
    const paaArket = formaterKode(raa)              // XXXX-XXXX på arket
    // Slik elever faktisk taster: fra ark-formatet, med rot i store/små og mellomrom
    const varianter = [
      raa,
      paaArket,
      paaArket.toLowerCase(),
      ` ${raa.slice(0, 4)} ${raa.slice(4)} `,
      paaArket.replace('-', ' - '),
    ]
    for (const variant of varianter) {
      assert.equal(beregnHmac(normaliserKode(variant)), lagret,
        `variant «${variant}» ga en annen HMAC enn den lagrede`)
    }
  }
})
bevis('QR-lenkens fragmentverdi gir samme HMAC (kode med bindestrek i #kode=)', () => {
  const raa = genererKode()
  const fraLenke = decodeURIComponent(encodeURIComponent(formaterKode(raa)))
  assert.equal(beregnHmac(normaliserKode(fraLenke)), beregnHmac(normaliserKode(raa)))
})

// --- 3+4) Kollisjonshåndtering mot mock av migr 066 ------------------------
// Mocken speiler tu_generer_kodesett: sett inn de FØRSTE p_antall kandidatene
// som ikke finnes i «tabellen»; færre enn p_antall → TU_KOLLISJON og ALT
// rulles tilbake; ellers settes de inn og innsatte HMAC-er returneres.
function lagMockRpc(tabell /* Set av eksisterende kode_hmac */) {
  const kall = []
  const rpc = async (hmacs, antall) => {
    kall.push(hmacs.length)
    const ledige = hmacs.filter((h) => !tabell.has(h)).slice(0, antall)
    if (ledige.length < antall) {
      return { data: null, error: new Error(`TU_KOLLISJON: fikk ikke plass til ${antall} koder`) }
    }
    for (const h of ledige) tabell.add(h)   // «transaksjonen» fullføres
    return { data: ledige, error: null }
  }
  return { rpc, kall }
}

console.log('\n3) Kollisjon: seedet HMAC oppdages og settet fylles opp til forventet antall')
await (async () => {
  const ANTALL = 26   // 24 elever + 2
  // Seed: en kjent kode ligger ALLEREDE i tabellen (kollisjonen vi fremprovoserer)
  const kjentKode = 'ABCD2345'
  const kjentHmac = beregnHmac(normaliserKode(kjentKode))
  const tabell = new Set([kjentHmac])

  // Tving generatoren til å produsere den kjente koden FØRST, så ekte koder.
  let forste = true
  const riggetGenerator = () => {
    if (forste) { forste = false; return kjentKode }
    return genererKode()
  }

  const { rpc } = lagMockRpc(tabell)
  const koder = await lagKodesett({ antall: ANTALL, rpcKall: rpc, genererEn: riggetGenerator })

  assert.equal(koder.length, ANTALL, 'skal ende på NØYAKTIG forventet antall')
  assert(!koder.includes(kjentKode), 'den kolliderende koden skal IKKE stå på arket')
  assert.equal(new Set(koder).size, ANTALL, 'alle koder på arket er unike')
  for (const k of koder) {
    assert(tabell.has(beregnHmac(normaliserKode(k))), 'hver kode på arket HAR en rad i (mock-)tu_koder')
  }
  // Tabellen: 1 seedet + ANTALL innsatte = ANTALL + 1
  assert.equal(tabell.size, ANTALL + 1)
  ok++
  console.log(`  ✓ 1 seedet kollisjon absorbert av reservene (${ANTALL}+${KODE_RESERVE} kandidater sendt), ${ANTALL} koder innsatt`)
})()

console.log('\n4) Atomisk retry: TU_KOLLISJON på første forsøk → nytt parti → suksess')
await (async () => {
  const ANTALL = 10
  const tabell = new Set()
  const { rpc: ekteRpc, kall } = lagMockRpc(tabell)
  let forsteKall = true
  const rpcMedTvungetKollisjon = async (hmacs, antall) => {
    if (forsteKall) {
      forsteKall = false
      return { data: null, error: new Error('TU_KOLLISJON: fikk ikke plass til 10 koder') }
    }
    return ekteRpc(hmacs, antall)
  }
  const koder = await lagKodesett({ antall: ANTALL, rpcKall: rpcMedTvungetKollisjon })
  assert.equal(koder.length, ANTALL)
  assert.equal(kall.length, 1, 'bare det ANDRE forsøket nådde innsettingen')
  assert.equal(tabell.size, ANTALL, 'ingen rester fra det tilbakerullede forsøket')
  ok++
  console.log('  ✓ tilbakerullet forsøk etterlot ingenting; forsøk to satte inn nøyaktig antall')
})()

console.log('\n5) Engangsgaranti-feil stoppes (TU_KODER_FINNES prøves ALDRI på nytt)')
await (async () => {
  let kall = 0
  const rpc = async () => {
    kall++
    return { data: null, error: new Error('TU_KODER_FINNES: koder er allerede generert for runden') }
  }
  await assert.rejects(() => lagKodesett({ antall: 5, rpcKall: rpc }), /TU_KODER_FINNES/)
  assert.equal(kall, 1, 'endelige feil skal ikke gi retry')
  ok++
  console.log('  ✓ endelig feil ga nøyaktig ett RPC-kall og tydelig exception')
})()

console.log(`\nALLE BEVIS OK (${ok} sjekker). Ingen database ble rørt.`)
