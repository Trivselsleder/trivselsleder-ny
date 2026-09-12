import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { lesBunnyKonfig, BUNNY_BASE } from './_bunny.js'

// ============================================================================
// STATUS for én Bunny-video (GET ?guid=…). Brukes av redigeringsflaten til å vise
// «behandles hos Bunny» til status = 4 (Finished / klar til avspilling).
// Kun innlogget ansatt/superadmin.
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const konfig = lesBunnyKonfig()
  if (konfig.feil) return res.status(500).json({ error: konfig.feil })
  const { apiKey, libraryId } = konfig

  const raa = (req.query?.guid ?? '').toString().trim()
  if (!raa) return res.status(400).json({ error: 'Mangler guid.' })
  // Samme normalisering og validering som slett-video: små bokstaver + eksakt UUID-format,
  // ellers kan en «guid» som ../collections/<id> peke fetch mot et annet Bunny-endepunkt.
  const guid = raa.toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(guid)) {
    return res.status(400).json({ error: 'Ugyldig guid.' })
  }

  let svar
  try {
    svar = await fetch(`${BUNNY_BASE}/library/${libraryId}/videos/${encodeURIComponent(guid)}`, {
      method: 'GET',
      headers: { AccessKey: apiKey, accept: 'application/json' },
    })
  } catch {
    return res.status(502).json({ error: 'Fikk ikke kontakt med Bunny.' })
  }
  if (svar.status === 404) return res.status(404).json({ error: 'Videoen finnes ikke hos Bunny.' })
  if (!svar.ok) return res.status(502).json({ error: `Bunny svarte ${svar.status}.` })

  const video = await svar.json().catch(() => ({}))
  const status = typeof video?.status === 'number' ? video.status : null
  // Bunny Stream sine encode-statuskoder:
  //   0 created · 1 uploaded · 2 processing · 3 transcoding · 4 finished
  //   5 error · 6 upload failed · 7 JIT segmenting · 8 JIT playlists created
  // «klar» = videoen kan faktisk SPILLES for læreren. Det er status 4 (Finished) — og for
  // JIT-baserte bibliotek også 8 (JIT playlists created), som er den avspillbare slutt-
  // tilstanden ETTER 4 i den flyten. Vi tar med 8 slik at et JIT-bibliotek ikke blir stående
  // «behandles» for alltid dersom statusen går videre fra 4. 7 (JIT segmenting) er fortsatt
  // underveis og teller IKKE som klar. 5/6 er varig feil → egen melding i skjemaet.
  const klar = status === 4 || status === 8
  const feil = status === 5 || status === 6
  return res.status(200).json({ guid, status, klar, feil })
}
