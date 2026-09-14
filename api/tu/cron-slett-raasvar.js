import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt, erCronKall } from '../_vakt.js'

// ============================================================================
// NATTLIG 90-DAGERS SLETTING AV RÅ ELEVSVAR (Trivselsundersøkelsen).
//
// Kobler public.tu_slett_utgatte_raasvar() (migr 045) til en Vercel-cron. Funksjonen
// sletter RÅSVAR (tu_svar) for runder som er lukket for mer enn 'retensjon_dager'
// siden (retensjonen ligger i tu_innstillinger, lovet frist i TU-dokumentasjonen), og
// ALDRI uten at arkivraden finnes (tidsserien i tu_arkiv må aldri tapes). Frem til nå
// var funksjonen aldri koblet til en cron, så slettingen skjedde ikke.
//
// SAMME MØNSTER som cron-anonymiser.js og papirkurv/cron-slett.js:
//   samme vakt (krevCronEllerAnsatt), samme Oslo-tidsvakt, samme tørrkjøringsflagg.
//
// HVORFOR VERCEL-CRON OG IKKE pg_cron: pg_cron er ikke installert (Supabase-standard),
//   og logger uansett ikke returverdien. Vi speiler tidsvakten fra de to andre nattjobbene.
//
// NØDBREMS (motor_aktiv): BEVISST IKKE brukt. motor_aktiv stopper ekte UTSENDING (e-post).
//   Denne ruta sender ingenting — den sletter personopplysninger på en lovpålagt frist og
//   MÅ kunne kjøre. Eneste sperre er tørrkjøring (fail-closed), som de to andre.
//
// TØRRKJØRING (fail-closed): ekte sletting skjer KUN ved ?torrkjoring=false. Funksjonen har
//   ingen forhåndsvisning (den SLETTER når den kalles), så en tørrkjøring KALLER den ikke.
//   Vercel-cron kaller med ?torrkjoring=false.
//
// Innringere: (1) Vercel-cron (Bearer CRON_SECRET), tidsstyrt til norsk MAAL_TIME_OSLO;
//   (2) innlogget ansatt/superadmin, manuell kjøring (tidsstyres ikke), tørrkjøring med
//   mindre ?torrkjoring=false sendes eksplisitt.
// ============================================================================

// MÅL (norsk tid): kl 03:00 — samme som de to andre nattlige personvernjobbene (de deler
// UTC-vinduet 01–02 i vercel.json; uavhengige kall).
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

  // Tørrkjøring: funksjonen har ingen forhåndsvisning (den sletter når den kalles), så vi
  // kaller den IKKE. Ingen data rørt.
  if (torrkjoring) {
    return res.status(200).json({
      ok: true,
      torrkjoring: true,
      grunn: 'Tørrkjøring: slettefunksjonen skriver når den kalles og har ingen forhåndsvisning. Ingen data rørt. Send ?torrkjoring=false for å kjøre.',
    })
  }

  // ---- Ekte kjøring: slett utgåtte råsvar (returnerer antall slettede rader) ----
  const r = await supabase.rpc('tu_slett_utgatte_raasvar')
  if (r.error) {
    console.error('cron-slett-raasvar: tu_slett_utgatte_raasvar feilet:', r.error.message)
    return res.status(500).json({ ok: false, torrkjoring: false, feil: r.error.message })
  }

  return res.status(200).json({
    ok: true,
    torrkjoring: false,
    slettet_raasvar: Number(r.data ?? 0),
  })
}
