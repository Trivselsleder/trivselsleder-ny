import crypto from 'node:crypto'
import { normaliserKode, beregnHmac } from './_kode.js'

// ============================================================================
// Trivselsundersøkelsen — KODEGENERATOR (steg 4.3).
//
// Lager engangskodene som skrives på det utskrivbare arket (én kode per elev
// + 2 ekstra, jf. byggeplan 4.3). Rå-koden finnes KUN i svaret til lærerens
// nettleser og på papirarket — databasen ser bare HMAC (samme prinsipp som
// elevflaten, se _kode.js og migr 045).
//
// SPEILING AV FASIT (ufravikelig): normaliserKode + beregnHmac fra _kode.js
// er de SAMME funksjonene elevflaten validerer med (hent-runde/lever-svar).
// Rekkefølgen er alltid beregnHmac(normaliserKode(råkode)) — dermed gir koden
// på arket og elevens innskrevne kode identisk hash, uansett om eleven skriver
// små bokstaver, mellomrom eller bindestrek.
// ============================================================================

// Forvekslingsfritt alfabet (31 tegn): A–Z uten I, L, O + sifrene 2–9.
// Utelatt: O/0 (like), I/1/L (like), og dermed også sifrene 0 og 1.
// Alle tegn overlever normaliserKode uendret (store bokstaver, ingen
// mellomrom/bindestrek) — en generert kode ER sin egen normalform.
export const KODE_ALFABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

// 8 tegn à log2(31) ≈ 4,95 bit → ~39,6 bit entropi ≈ 8,5 × 10^11 kombinasjoner.
// Godt over nødvendig for engangskoder med kort levetid (rundevindu ~2 uker),
// og kort nok til at en elev kan taste den fra papir uten feil.
export const KODE_LENGDE = 8

// Vises som XXXX-XXXX på arket (lettere å lese/taste fra papir).
// Bindestreken fjernes av normaliserKode — den påvirker aldri HMAC.
export function formaterKode(kode) {
  return `${kode.slice(0, 4)}-${kode.slice(4)}`
}

// Én kryptografisk tilfeldig kode. crypto.randomInt (CSPRNG, avvisningsmetode
// uten modulo-skjevhet) — ALDRI Math.random.
export function genererKode() {
  let kode = ''
  for (let i = 0; i < KODE_LENGDE; i++) {
    kode += KODE_ALFABET[crypto.randomInt(KODE_ALFABET.length)]
  }
  return kode
}

// Et parti UNIKE råkoder (dedup internt før noe sendes til databasen).
// genererEn er injiserbar for tester (kollisjonssimulering) — standard er
// den kryptografiske generatoren over.
export function genererKodeparti(antall, genererEn = genererKode) {
  const sett = new Set()
  // Sikkerhetsventil mot evig løkke ved defekt injisert generator i test.
  let forsok = 0
  const maks = antall * 50
  while (sett.size < antall && forsok < maks) {
    sett.add(genererEn())
    forsok++
  }
  if (sett.size < antall) throw new Error('Klarte ikke generere nok unike koder')
  return [...sett]
}

// Hvor mange reservekoder som sendes med per forsøk. Databasen setter inn de
// første p_antall som ikke kolliderer globalt — reservene absorberer
// kollisjoner uten ekstra rundtur (sannsynlighet for kollisjon er i praksis
// forsvinnende: ~antall × eksisterende / 8,5e11).
export const KODE_RESERVE = 8

// Maks antall hele forsøk (nytt parti + nytt RPC-kall) før vi gir opp.
export const MAKS_FORSOK = 3

// ============================================================================
// Kjernen i 4.3: generer parti → HMAC → tu_generer_kodesett (migr 066) →
// map innsatte HMAC-er tilbake til råkoder.
//
// rpcKall er injiserbar for tester: async (hmacs, antall) => ({ data, error })
// — i produksjon et supabase.rpc('tu_generer_kodesett', ...) med BRUKERENS
// token (tu_har_tilgang_skole autoriserer på auth.uid()).
//
// KOLLISJONSHÅNDTERING (kritisk krav): RPC-en er atomisk — enten settes
// NØYAKTIG p_antall koder inn og runden åpnes, eller alt rulles tilbake
// (TU_KOLLISJON). Ved tilbakerulling genererer vi et HELT NYTT parti og
// prøver igjen (maks MAKS_FORSOK). Til slutt verifiseres at antall innsatte
// = forventet antall — hver råkode på arket HAR en rad i tu_koder.
// ============================================================================
export async function lagKodesett({ antall, rpcKall, genererEn = genererKode }) {
  let sisteFeil = null
  for (let runde = 0; runde < MAKS_FORSOK; runde++) {
    const raakoder = genererKodeparti(antall + KODE_RESERVE, genererEn)
    // hmac → råkode (for å oversette databasens svar tilbake til arket)
    const kart = new Map()
    const hmacs = []
    for (const raa of raakoder) {
      const hmac = beregnHmac(normaliserKode(raa)) // FASIT-rekkefølgen
      kart.set(hmac, raa)
      hmacs.push(hmac)
    }

    const { data, error } = await rpcKall(hmacs, antall)
    if (error) {
      sisteFeil = error
      // Kollisjon → alt rullet tilbake i databasen; prøv med nytt parti.
      if (/TU_KOLLISJON/.test(String(error.message || ''))) continue
      // Alle andre feil (tilgang, status, koder finnes) er endelige.
      throw error
    }

    const innsatte = Array.isArray(data) ? data : []
    if (innsatte.length !== antall) {
      // Skal ikke kunne skje (RPC-en garanterer antall eller exception) —
      // men vi stoler aldri på det uten å sjekke.
      const e = new Error(`Avvik: ${innsatte.length} av ${antall} koder satt inn`)
      e.kode = 'ANTALL_AVVIK'
      throw e
    }
    const koder = innsatte.map((h) => kart.get(h)).filter(Boolean)
    if (koder.length !== antall) {
      const e = new Error('Databasen returnerte ukjente HMAC-er')
      e.kode = 'UKJENT_HMAC'
      throw e
    }
    return koder
  }
  const e = new Error('Ga opp etter gjentatte kodekollisjoner')
  e.kode = 'KOLLISJON_MAKS'
  e.aarsak = sisteFeil
  throw e
}
