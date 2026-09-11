import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt, erCronKall } from '../_vakt.js'

// ============================================================================
// NATTLIG SLETTING AV UTLØPT PAPIRKURV (periodeplan + tl_hjul).
//
// Kjartans beslutning 10. sep 2026: «Arkiver» ble til «Slett» med 30 dagers
// papirkurv. En slettet plan/hjul (status='arkivert', arkivert_at satt av
// trigger i migr 115) ligger i papirkurven i 30 dager og kan gjenopprettes;
// deretter fjernes den for godt. Denne ruta gjør den endelige slettingen ved å
// kalle public.slett_utlopte_papirkurv() — barna forsvinner via CASCADE.
//
// HVORFOR EN VERCEL-CRON OG IKKE pg_cron: samme grunn som cron-anonymiser.js —
//   pg_cron er ikke installert (Supabase-standard), og selv om den var det,
//   logger den ikke returverdiene. Vi speiler i stedet tidsvakten der: samme
//   vakt (krevCronEllerAnsatt) og samme Oslo-tidsvakt.
//
// TIDSSONE (Oslo-tidsvakt): Vercel-cron kan bare UTC (uten sommertid).
//   vercel.json fyrer hver hele time i et UTC-vindu; tidsvakten her slipper bare
//   gjennom fyringen der klokka i Norge er MAAL_TIME_OSLO. Samme mønster og
//   samme vindu (UTC 01–02) som cron-anonymiser, som treffer norsk kl. 03 hele
//   året (vinter UTC02→03, sommer UTC01→03).
//
// NØDBREMS (motor_aktiv): BEVISST IKKE brukt her. motor_aktiv stopper ekte
//   UTSENDING (e-post). Denne ruta sender ingenting — den fullfører en sletting
//   brukeren allerede har bedt om, på en fastsatt frist. Å la send-bremsen kunne
//   stanse opprydding i det stille ville vært feil. Samme resonnement som
//   cron-anonymiser.
//
// TØRRKJØRING (fail-closed): ekte sletting skjer KUN når ?torrkjoring=false.
//   Standard er tørrkjøring. Funksjonen i basen har ingen forhåndsvisning (den
//   SLETTER når den kalles), så en tørrkjøring KALLER den ikke — den rører da
//   ingen data og sier fra. Vercel-cron kaller med ?torrkjoring=false.
//
// Innringere (samme vakt som cron-anonymiser / TU-auto-lukk):
//   1. Vercel-cron (Bearer CRON_SECRET) — tidsstyrt til norsk MAAL_TIME_OSLO.
//   2. En innlogget ansatt/superadmin — manuell kjøring, når som helst
//      (tidsstyres ikke). Standard blir da tørrkjøring med mindre
//      ?torrkjoring=false sendes eksplisitt.
// ============================================================================

// MÅL (norsk tid): kl 03:00 — midt på natta, minst aktivitet. Samme som
// cron-anonymiser (de to nattjobbene deler UTC-vindu; de er uavhengige kall).
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

  // Fail-closed: standard er tørrkjøring. Ekte sletting krever ?torrkjoring=false.
  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')

  // Tørrkjøring: funksjonen har ingen forhåndsvisning (den sletter når den
  // kalles), så vi kaller den IKKE. Ingen data rørt.
  if (torrkjoring) {
    return res.status(200).json({
      ok: true,
      torrkjoring: true,
      grunn: 'Tørrkjøring: slettefunksjonen skriver når den kalles og har ingen forhåndsvisning. Ingen data rørt. Send ?torrkjoring=false for å kjøre.',
    })
  }

  // ---- Ekte kjøring: slett papirkurv-rader eldre enn 30 dager i begge tabeller ----
  const r = await supabase.rpc('slett_utlopte_papirkurv')
  if (r.error) {
    console.error('cron-slett: slett_utlopte_papirkurv feilet:', r.error.message)
    return res.status(500).json({ ok: false, torrkjoring: false, feil: r.error.message })
  }
  const rad = Array.isArray(r.data) ? r.data[0] : r.data

  return res.status(200).json({
    ok: true,
    torrkjoring: false,
    slettet_periodeplan: Number(rad?.slettet_periodeplan ?? 0),
    slettet_tl_hjul: Number(rad?.slettet_tl_hjul ?? 0),
  })
}
