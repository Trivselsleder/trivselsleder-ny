import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { lesBunnyKonfig, tusSignatur, BUNNY_BASE } from './_bunny.js'

// ============================================================================
// START EN VIDEOOPPLASTING. Oppretter et TOMT video-objekt hos Bunny (kun metadata,
// ingen fil) og gir nettleseren en kortlivet TUS-signatur så DEN kan laste opp
// selve fila direkte. API-nøkkelen forlater aldri serveren.
//
// Kun innlogget ansatt/superadmin (krevAnsatt) — endepunktet bruker service-nøkkelen
// til å slå opp ressursen, så det MÅ selv sjekke hvem som ringer på (se ../_vakt.js).
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Rollevakt FØR vi validerer body — en fremmed skal få 401/403, ikke 400.
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const konfig = lesBunnyKonfig()
  if (konfig.feil) return res.status(500).json({ error: konfig.feil })
  const { apiKey, libraryId } = konfig

  const ressursId = req.body?.ressurs_id
  const tittel = (req.body?.tittel ?? '').toString().trim() || 'Uten tittel'
  if (!ressursId) return res.status(400).json({ error: 'Mangler ressurs_id.' })

  // Sjekk at leken finnes før vi lager noe hos Bunny (unngå foreldreløse videoer).
  const { data: ressurs, error: resErr } = await supabase
    .from('ressurser').select('id').eq('id', ressursId).maybeSingle()
  if (resErr) return res.status(500).json({ error: 'Kunne ikke slå opp leken.' })
  if (!ressurs) return res.status(404).json({ error: 'Leken finnes ikke.' })

  // Opprett video-objektet hos Bunny (tittel = lekens tittel). Ingen fil lastes opp her.
  let opprett
  try {
    opprett = await fetch(`${BUNNY_BASE}/library/${libraryId}/videos`, {
      method: 'POST',
      headers: { AccessKey: apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ title: tittel }),
    })
  } catch {
    return res.status(502).json({ error: 'Fikk ikke kontakt med Bunny.' })
  }
  if (!opprett.ok) {
    return res.status(502).json({ error: `Bunny avviste opprettelsen (${opprett.status}).` })
  }
  const video = await opprett.json().catch(() => ({}))
  const videoId = video?.guid
  if (!videoId) return res.status(502).json({ error: 'Bunny returnerte ingen video-id.' })

  // Signaturen utløper om 1 time — nok til en stor opplasting, kort nok til å ikke lekke.
  const expire = Math.floor(Date.now() / 1000) + 3600
  const signature = tusSignatur(libraryId, apiKey, expire, videoId)

  return res.status(200).json({ videoId, libraryId, expire, signature })
}
