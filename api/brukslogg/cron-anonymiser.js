import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt, erCronKall } from '../_vakt.js'

// ============================================================================
// BRUKSLOGG — ANONYMISERINGS-CRON. Kjører personvernrutinen
// public.anonymiser_bruk_hendelse() (migr 088) én gang i døgnet, natt.
//
// Rutinen gjør to ting (definert i basen, ikke her):
//   Steg 1 (30 dager): kobler søk fra BÅDE person (bruker_id) og skole
//           (skole_id). Søketeksten kan inneholde barnenavn; på en liten skole
//           er skole_id nesten like identifiserende som bruker_id.
//   Steg 2 (24 mnd):   fjerner selve søketeksten (sok_tekst) og bruker_id.
// Funksjonen returnerer to tall — koblet_fra_person og tekst_fjernet — som vi
// sender rått tilbake i svaret, slik at hver kjøring kan etterprøves.
//
// HVORFOR EN VERCEL-CRON OG IKKE pg_cron:
//   pg_cron er ikke installert i basen (Supabase-standard; bekreftes med
//   `select extname from pg_extension where extname = 'pg_cron';`). Selv om den
//   var det, logger pg_cron bare suksess/feil — ikke returverdiene. Denne ruta
//   speiler i stedet tidsvakten for TU-auto-lukk (api/tu/cron-auto-lukk.js):
//   samme vakt (krevCronEllerAnsatt) og samme Oslo-tidsvakt.
//
// TIDSSONE (Oslo-tidsvakt, mønster fra cron-tidssone-fiksen 21. aug):
//   Vercel-cron kan bare UTC (uten sommertid). vercel.json fyrer hver hele time
//   i et UTC-vindu; tidsvakten her slipper bare gjennom fyringen der klokka i
//   Norge er MAAL_TIME_OSLO. Tidssonelogikken ligger dermed ÉT sted (her).
//
// NØDBREMS (motor_aktiv): BEVISST IKKE brukt her. motor_aktiv stopper ekte
//   UTSENDING (e-post). Denne rutinen sender ingenting — den sletter
//   personopplysninger på lovpålagte frister. Å la send-bremsen kunne stanse
//   sletting i det stille ville vært feil: personvernrutinen MÅ kjøre. Den
//   eneste sperren her er tørrkjøring (fail-closed), se under.
//
// TØRRKJØRING (fail-closed): ekte anonymisering skjer KUN når ?torrkjoring=false.
//   Standard er tørrkjøring. Funksjonen i basen har ingen forhåndsvisning (den
//   SKRIVER når den kalles), så en tørrkjøring KALLER den ikke — den rører da
//   ingen data og sier fra. Vercel-cron kaller med ?torrkjoring=false.
//
// Innringere (samme vakt som TU-auto-lukk):
//   1. Vercel-cron (Bearer CRON_SECRET) — tidsstyrt til norsk MAAL_TIME_OSLO.
//   2. En innlogget ansatt/superadmin — manuell kjøring, når som helst
//      (tidsstyres ikke). Standard blir da tørrkjøring med mindre
//      ?torrkjoring=false sendes eksplisitt.
// ============================================================================

// MÅL (norsk tid): kl 03:00 norsk tid hele året — midt på natta, minst
// aktivitet. (Kan endres til én tallverdi hvis Kjartan vil ha et annet
// klokkeslett; husk da å justere UTC-vinduet i vercel.json tilsvarende.)
const MAAL_TIME_OSLO = 3

function osloTimeNaa() {
  const deler = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false,
  }).formatToParts(new Date())
  return Number(deler.find((d) => d.type === 'hour')?.value) % 24
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  // ---- TIDSVAKT (kun cron-kall) ----
  // Cron-skjemaet fyrer flere ganger i UTC-vinduet; bare fyringen der klokka i
  // Norge er MAAL_TIME_OSLO slipper gjennom. En innlogget ansatt tidsstyres IKKE.
  if (erCronKall(req)) {
    const osloTime = osloTimeNaa()
    if (osloTime !== MAAL_TIME_OSLO) {
      return res.status(200).json({
        ok: true,
        hoppet_over: true,
        grunn: `hoppet over – ikke riktig tidspunkt (norsk time ${String(osloTime).padStart(2, '0')}, mål ${String(MAAL_TIME_OSLO).padStart(2, '0')}:00)`,
      })
    }
  }

  // Fail-closed: standard er tørrkjøring. Ekte anonymisering krever ?torrkjoring=false.
  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')

  // Tørrkjøring: funksjonen har ingen forhåndsvisning (den skriver når den
  // kalles), så vi kaller den IKKE. Ingen data rørt.
  if (torrkjoring) {
    return res.status(200).json({
      ok: true,
      torrkjoring: true,
      grunn: 'Tørrkjøring: anonymiseringsfunksjonen skriver når den kalles og har ingen forhåndsvisning. Ingen data rørt. Send ?torrkjoring=false for å kjøre.',
    })
  }

  // ---- Ekte kjøring: kall personvernrutinen og returner de to tallene ----
  const { data, error } = await supabase.rpc('anonymiser_bruk_hendelse')
  if (error) {
    console.error('cron-anonymiser: anonymiser_bruk_hendelse feilet:', error.message)
    return res.status(500).json({ error: 'Anonymisering feilet: ' + error.message })
  }

  const rad = Array.isArray(data) ? data[0] : data
  return res.status(200).json({
    ok: true,
    torrkjoring: false,
    koblet_fra_person: Number(rad?.koblet_fra_person ?? 0),
    tekst_fjernet: Number(rad?.tekst_fjernet ?? 0),
  })
}
