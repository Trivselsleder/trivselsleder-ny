import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Felles hjelpere for elevflaten (Trivselsundersøkelsen, steg 3).
//
// PRINSIPP (delplan 21.2 + migr 045):
//  - Rå-koden når ALDRI databasen. Serveren beregner HMAC(kode, hemmelig nøkkel)
//    og databasen lagrer/sammenligner bare HMAC-verdien.
//  - Koden kommer inn via POST-body, aldri i URL — så den ikke havner i
//    infrastruktur-logger (Vercel/Supabase fører kortvarige tekniske logger).
//  - Vi lagrer aldri koden, aldri IP, aldri tidspunkt i VÅRE tabeller.

// Normaliser koden slik læreren og eleven kan skrive den litt ulikt uten at det
// gjør noe: fjern mellomrom/bindestrek, store bokstaver. Kodealfabetet (steg 4,
// kodegeneratoren) utelater forvekslbare tegn (O/0, I/1, L), men elever kan
// likevel taste feil — normaliseringen fanger de vanligste avskriftsfeilene.
export function normaliserKode(raa) {
  return String(raa ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '')
}

// HMAC-SHA256 med server-nøkkel (miljøvariabel). Samme algoritme som
// kodegeneratoren i steg 4 må bruke. Base-16 (hex) for stabil sammenligning.
// (Default: server-env. Vault-varianten — åpen beslutning i 045 — ville flyttet
//  nøkkelen til Supabase Vault; den endrer bare HVOR nøkkelen leses, ikke formatet.)
export function beregnHmac(kodeNormalisert) {
  const nokkel = process.env.TU_KODE_HMAC_KEY
  if (!nokkel) {
    const feil = new Error('Mangler TU_KODE_HMAC_KEY')
    feil.kode = 'MANGLER_NOKKEL'
    throw feil
  }
  return crypto.createHmac('sha256', nokkel).update(kodeNormalisert).digest('hex')
}

// Service-role-klient. KUN server-side (Vercel env). Anon kaller aldri DB direkte
// for denne modulen (tu_lever_svar er service_role etter migr 045).
export function tjenerKlient() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    const feil = new Error('Serverkonfigurasjon mangler')
    feil.kode = 'MANGLER_KONFIG'
    throw feil
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
