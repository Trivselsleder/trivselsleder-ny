import { normaliserKode, beregnHmac, tjenerKlient } from './_kode.js'

// POST /api/tu/lever-svar
// Body: { kode: "ABDK7F", svar: { "1": 0, "3": 2, ... }, trinn: 6, kjonn: "jente" }
//
// Reserverer koden + lagrer svaret atomisk via RPC tu_lever_svar (migr 046),
// som kjøres som service_role. Databasen:
//  - merker koden brukt og lagrer svaret i SAMME operasjon (umulig å bruke to ganger),
//  - lagrer ALDRI kobling kode↔svar, ingen elev-id, ingen tidsstempel,
//  - validerer at nøklene er 1–13 og verdiene innenfor hvert spørsmåls skala,
//  - validerer bakgrunnsvariablene trinn (5–10) og kjonn (jente/gutt/annet).
//
// BAKGRUNNSVARIABLER (trinn + kjønn) er OBLIGATORISK og sendes som EGNE felter,
// ikke inne i svar-objektet. De lagres som bakgrunnsvariabler på svaret, aldri
// koblet til kode/HMAC (migr 046). Kjønn = jente/gutt/annet (som Elevundersøkelsen).
//
// Eleven kan ha HOPPET OVER spørsmål — da mangler nøkkelen i svar-objektet, og
// det er et gyldig svar (delplan 21.2 pkt. 3). Vi sender bare de besvarte.

const KJONN_GYLDIGE = ['jente', 'gutt', 'annet']

// Konverter { "1": 0, "3": 2 } til rene heltall og dropp hoppede/ugyldige.
// Endelig validering skjer i databasen; dette er bare et førstelag.
function reneSvar(inn) {
  if (!inn || typeof inn !== 'object' || Array.isArray(inn)) return null
  const ut = {}
  for (const [k, v] of Object.entries(inn)) {
    if (!/^([1-9]|1[0-3])$/.test(k)) continue          // kun 1–13
    if (v === null || v === undefined || v === '') continue // hoppet over
    const tall = Number(v)
    if (!Number.isInteger(tall) || tall < 0) continue
    ut[k] = tall
  }
  return ut
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ feil: 'Method not allowed' })

  const kodeNorm = normaliserKode(req.body?.kode)
  if (!kodeNorm) return res.status(400).json({ feil: 'TOM_KODE' })

  const svar = reneSvar(req.body?.svar)
  if (!svar || Object.keys(svar).length === 0) {
    // Eleven har ikke svart på noe (alt hoppet over). Vi krever minst ett svar
    // for å ha noe å levere; databasen avviser tomt objekt uansett.
    return res.status(400).json({ feil: 'TOMT_SVAR' })
  }

  // Bakgrunnsvariabler — OBLIGATORISK. Valideres her OG i databasen (to lag).
  const trinn = Number(req.body?.trinn)
  if (!Number.isInteger(trinn) || trinn < 5 || trinn > 10) {
    return res.status(400).json({ feil: 'UGYLDIG_TRINN' })
  }
  const kjonn = req.body?.kjonn
  if (!KJONN_GYLDIGE.includes(kjonn)) {
    return res.status(400).json({ feil: 'UGYLDIG_KJONN' })
  }

  let supabase, hmac
  try {
    supabase = tjenerKlient()
    hmac = beregnHmac(kodeNorm)
  } catch (e) {
    console.error('TU lever-svar konfig-feil:', e.kode || e.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }

  const { error } = await supabase.rpc('tu_lever_svar', {
    p_kode_hmac: hmac,
    p_svar: svar,
    p_trinn: trinn,
    p_kjonn: kjonn,
  })

  if (error) {
    // «Ugyldig eller brukt kode» fra RPC-en er en forventet, brukervennlig
    // situasjon — ikke en serverfeil. Vi skiller den ut så eleven får riktig
    // beskjed, men røper aldri den rå Postgres-teksten.
    const melding = String(error.message || '')
    if (/brukt kode|Ugyldig eller brukt/i.test(melding)) {
      return res.status(409).json({ feil: 'BRUKT_KODE' })
    }
    if (/manglende trinn|Ugyldig eller manglende trinn/i.test(melding)) {
      return res.status(400).json({ feil: 'UGYLDIG_TRINN' })
    }
    if (/manglende kjonn|Ugyldig eller manglende kjonn/i.test(melding)) {
      return res.status(400).json({ feil: 'UGYLDIG_KJONN' })
    }
    if (/Ugyldig svar|Tomt eller ugyldig/i.test(melding)) {
      return res.status(400).json({ feil: 'UGYLDIG_SVAR' })
    }
    console.error('TU lever-svar RPC-feil:', melding)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }

  return res.status(200).json({ ok: true })
}
