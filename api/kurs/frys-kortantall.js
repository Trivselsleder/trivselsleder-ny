import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt } from '../_vakt.js'

// LAGRE + FRYSE KORT-TALL (N1).
//
// Kort-tallet per skole = antall trivselsledere + 10 %, rundet opp. Så lenge
// kurs_skole.antall_kort er TOMT (null), viser skjermen dette LEVENDE beregnede
// tallet — det endrer seg hvis skolen justerer antall TL. Ved midnatt på
// kursdagen fryses det: tallet skrives inn i antall_kort og endrer seg ikke mer.
//
// To lovlige innringere (samme vakt som send-evaluering.js):
//   1. Vercel-cron (Bearer CRON_SECRET) — kjører auto-frysingen daglig.
//   2. En innlogget ansatt — enten manuell overstyring av én rad, eller en
//      manuell kjøring av auto-frysingen.
//
// FROSSET = antall_kort IS NOT NULL. Ingen egen flagg-kolonne. En manuell
// overstyring skriver også antall_kort, så en overstyrt rad regnes som frosset.
//
// INGEN e-post sendes herfra, så nødbremsen (motor_aktiv) gjelder ikke — dette
// er en intern databaseoperasjon, ikke en utsending.

function beregnKort(antallTl) {
  if (!antallTl || antallTl < 0) return 0
  return Math.ceil(antallTl * 1.1)
}

// Dagens dato i Norge som 'YYYY-MM-DD'. Vercel kjører i UTC, så "i dag" må
// vurderes i Europe/Oslo (samme mønster som send-evaluering.js).
function iDagOslo() {
  const deler = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const f = (t) => deler.find((p) => p.type === t)?.value
  return `${f('year')}-${f('month')}-${f('day')}`
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

  const body = req.body || {}

  // ---- MANUELL OVERSTYRING: { id, antall_kort } fra en ansatt ----
  // antall_kort = heltall ≥ 0 låser raden på det tallet; antall_kort = null
  // tilbakestiller raden til levende beregning.
  if (body.id != null && 'antall_kort' in body) {
    let verdi = body.antall_kort
    if (verdi !== null) {
      verdi = parseInt(verdi, 10)
      if (!Number.isInteger(verdi) || verdi < 0) {
        return res.status(400).json({ error: 'antall_kort må være et heltall ≥ 0, eller null.' })
      }
    }
    const { error } = await supabase
      .from('kurs_skole').update({ antall_kort: verdi }).eq('id', body.id)
    if (error) return res.status(500).json({ error: 'Kunne ikke lagre: ' + error.message })
    return res.status(200).json({ overstyrt: body.id, antall_kort: verdi })
  }

  // ---- AUTO-FRYSING (cron eller manuell kjøring) ----
  // Tørrkjøring er standard; kun eksplisitt torrkjoring=false skriver.
  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')
  const iDag = iDagOslo()

  const { data: kursRader, error: kursFeil } = await supabase
    .from('kurs').select('id, navn, dato')
  if (kursFeil) return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + kursFeil.message })

  // Avholdt = kursdato i dag eller tidligere (norsk dato).
  const avholdteIder = (kursRader || [])
    .filter((k) => k.dato && String(k.dato).slice(0, 10) <= iDag)
    .map((k) => k.id)

  if (avholdteIder.length === 0) {
    return res.status(200).json({ torrkjoring, iDagOslo: iDag, aktuelle: 0, fryst: 0 })
  }

  // Kandidater: ikke frosset ennå, skolen kommer + har svart, antall TL satt,
  // og kurset er avholdt.
  const { data: rader, error: raderFeil } = await supabase
    .from('kurs_skole')
    .select('id, antall_tl, antall_kort, kurs_id')
    .is('antall_kort', null)
    .eq('kommer', true)
    .eq('svart', true)
    .in('kurs_id', avholdteIder)
    .range(0, 9999)
  if (raderFeil) return res.status(500).json({ error: 'Kunne ikke hente rader: ' + raderFeil.message })

  const aaFryse = (rader || []).filter((r) => r.antall_tl != null)

  if (torrkjoring) {
    return res.status(200).json({
      torrkjoring: true,
      iDagOslo: iDag,
      ville_fryst: aaFryse.length,
      forhandsvisning: aaFryse.map((r) => ({ id: r.id, antall_tl: r.antall_tl, antall_kort: beregnKort(r.antall_tl) })),
    })
  }

  let fryst = 0
  const feilet = []
  for (const r of aaFryse) {
    const { error } = await supabase
      .from('kurs_skole')
      .update({ antall_kort: beregnKort(r.antall_tl) })
      .eq('id', r.id)
      .is('antall_kort', null) // dobbel idempotens: rør aldri en alt frosset rad
    if (error) feilet.push({ id: r.id, error: error.message })
    else fryst++
  }

  return res.status(200).json({
    torrkjoring: false,
    iDagOslo: iDag,
    aktuelle: aaFryse.length,
    fryst,
    ...(feilet.length ? { feilet } : {}),
  })
}
