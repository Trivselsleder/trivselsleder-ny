import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt, erCronKall } from '../_vakt.js'

// ============================================================================
// NATTLIG PERSONVERN-ANONYMISERING. Kjører TO personvernrutiner én gang i døgnet.
//
// NB OM NAVNET: mappa/ruta heter «brukslogg», men ruta rører NÅ BEGGE loggtabellene:
//   - public.anonymiser_bruk_hendelse()  (migr 088) → tabellen `bruk_hendelse`
//   - public.anonymiser_brukslogg()       (migr 096) → tabellen `brukslogg`
//   Navnet «brukslogg» er altså for snevert (historisk rørte ruta bare bruk_hendelse).
//   Full omdøping til et nøytralt navn (f.eks. api/personvern/cron-anonymiser.js) krever
//   en SAMTIDIG vercel.json-sti-endring i samme deploy — egen sak, ikke gjort her.
//
// Jobb 1 — bruk_hendelse (migr 088), to frister:
//   Steg 1 (30 dager): kobler søk fra BÅDE person (bruker_id) og skole (skole_id).
//           Søketeksten kan inneholde barnenavn; på en liten skole er skole_id
//           nesten like identifiserende som bruker_id.
//   Steg 2 (24 mnd):   fjerner selve søketeksten (sok_tekst) og bruker_id.
//   Returnerer koblet_fra_person + tekst_fjernet.
//
// Jobb 2 — brukslogg (migr 096), én frist:
//   12 mnd: nullstiller bruker_id (fjerner koblingen til personen); raden består
//           så aktivitetsstatistikk over tid bevares. Ingen søketekst i denne
//           tabellen, derfor ett steg (asymmetrien mot 088 er bevisst).
//           Returnerer frakoblet_person.
//
// Begge tall sendes rått tilbake i svaret (per jobb), så hver kjøring kan etterprøves.
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

  // ---- Ekte kjøring: kall BEGGE personvernrutinene, rapporter hver for seg ----
  // To uavhengige jobber på to tabeller. Én feiler ikke den andre: begge forsøkes,
  // hver rapporteres, og en feil i den ene skjuler ikke resultatet til den andre.

  // Jobb 1: bruk_hendelse (migr 088) — 30 dager / 24 mnd.
  const bh = await supabase.rpc('anonymiser_bruk_hendelse')
  if (bh.error) console.error('cron-anonymiser: anonymiser_bruk_hendelse feilet:', bh.error.message)
  const bhRad = Array.isArray(bh.data) ? bh.data[0] : bh.data

  // Jobb 2: brukslogg (migr 096) — 12 mnd, nullstiller bruker_id.
  const bl = await supabase.rpc('anonymiser_brukslogg')
  if (bl.error) console.error('cron-anonymiser: anonymiser_brukslogg feilet:', bl.error.message)
  const blRad = Array.isArray(bl.data) ? bl.data[0] : bl.data

  const svar = {
    ok: !bh.error && !bl.error,
    torrkjoring: false,
    bruk_hendelse: bh.error
      ? { feil: bh.error.message }
      : { koblet_fra_person: Number(bhRad?.koblet_fra_person ?? 0), tekst_fjernet: Number(bhRad?.tekst_fjernet ?? 0) },
    brukslogg: bl.error
      ? { feil: bl.error.message }
      : { frakoblet_person: Number(blRad?.frakoblet_person ?? 0) },
  }

  // 500 hvis NOEN jobb feilet, så cron-overvåkingen ser det — men begge resultatene
  // står i svaret, så en vellykket jobb ikke skjules av en mislykket.
  return res.status(bh.error || bl.error ? 500 : 200).json(svar)
}
