import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt, erCronKall } from '../_vakt.js'

// ============================================================================
// TU 4.5 — AUTO-LUKK-CRON. Lukker trivselsundersøkelse-runder når vinduet er
// ute (frist = vinduets siste dag → runden lukkes dagen ETTER frist).
//
// TIDSSONE (Oslo-tidsvakt, mønster fra cron-tidssone-fiksen 21. aug):
//   Vercel-cron kan bare UTC (uten sommertid). vercel.json fyrer hver hele
//   time i et UTC-vindu; tidsvakten her slipper bare gjennom fyringen der
//   klokka i Norge er MAAL_TIME_OSLO. Da beregnes dagens KALENDERDAG i Norge
//   (osloDatoIdag) og sendes til DB-funksjonen tu_auto_lukk_forfalne, slik at
//   «forfalt» alltid måles mot norsk dato — aldri mot UTC. Tidssonelogikken
//   ligger dermed ÉT sted (her), ikke spredt inn i SQL-en.
//
// NØDBREMS / FAIL-CLOSED (samme regel som de andre cron-jobbene):
//   Ekte lukking (p_utfor=true) skjer KUN når torrkjoring=false OG
//   motor_aktiv != 'nei'. Ellers tørrkjøres motoren (teller forfalne runder,
//   rører ingen data). Vercel-cron kaller med ?torrkjoring=false. Standard er
//   tørrkjøring — motoren rører aldri ekte data «ved uhell».
//
// Innringere (samme vakt som kursjobbene):
//   1. Vercel-cron (Bearer CRON_SECRET) — tidsstyrt til norsk MAAL_TIME_OSLO.
//   2. En innlogget ansatt/superadmin — manuell kjøring/forhåndsvisning, når
//      som helst (tidsstyres ikke). Standard blir da tørrkjøring med mindre
//      ?torrkjoring=false sendes eksplisitt.
// ============================================================================

// MÅL (norsk tid): auto-lukk kjører kl 06:00 norsk tid hele året — tidlig på
// dagen, før skoler er i gang, så en runde som gikk ut i går lukkes «over natta».
// (Kan endres til én tallverdi hvis Kjartan vil ha et annet klokkeslett.)
const MAAL_TIME_OSLO = 6

function osloTimeNaa() {
  const deler = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false,
  }).formatToParts(new Date())
  return Number(deler.find((d) => d.type === 'hour')?.value) % 24
}

// Dagens kalenderdato i Norge som 'YYYY-MM-DD' (en-CA gir ISO-format).
function osloDatoIdag() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
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

  // Fail-closed: standard er tørrkjøring. Ekte lukking krever ?torrkjoring=false.
  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')

  // ---- Nødbrems: motor_aktiv ----
  const { data: innstRad, error: innstFeil } = await supabase
    .from('innstillinger').select('verdi').eq('nokkel', 'motor_aktiv').maybeSingle()
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const motorAktiv = (innstRad?.verdi || '').trim().toLowerCase()

  // Ekte lukking KUN når ikke tørrkjøring OG motoren er på. Ellers tørrkjør.
  const utfor = !torrkjoring && motorAktiv !== 'nei'

  const idagOslo = osloDatoIdag()

  const { data, error } = await supabase.rpc('tu_auto_lukk_forfalne', {
    p_idag_oslo: idagOslo,
    p_utfor: utfor,
  })
  if (error) return res.status(500).json({ error: 'Auto-lukk feilet: ' + error.message })

  const rad = Array.isArray(data) ? data[0] : data
  return res.status(200).json({
    ok: true,
    idag_oslo: idagOslo,
    torrkjoring: !utfor,
    motor_aktiv: motorAktiv || null,
    forfalne: rad?.kandidater ?? 0,
    lukket: rad?.lukket ?? 0,
  })
}
