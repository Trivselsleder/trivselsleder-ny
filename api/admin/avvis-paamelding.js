import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'

// AVVISNING AV PÅMELDING. Setter KUN status = 'avvist' på selve påmeldings-raden.
//
// VARSLING BEVISST FJERNET (19. sep 2026, Kjartans beslutning): et e-postvarsel til rektor
// ved avvisning ble bygget 18. sep, men rullet tilbake dagen etter. På sytten år er ingen
// skole noen gang blitt avvist ved påmelding — funksjonen brukes ikke. En ubrukt knapp som
// sender e-post til en rektor er verre enn ingen knapp. Derfor ingen Resend, ingen
// krevMotorAktiv, ingen epostMal, ingen loggEpost her. Blir avvisning en reell arbeidsflyt
// senere, tas varslingen opp igjen som egen beslutning.
//
// De tekniske forbedringene fra 18. sep beholdes fordi de er riktige uansett:
//  - krevAnsatt: sjekker hvem som ringer på (service-nøkkelen går utenom alle sperrer) og
//    fanger deaktiverte kontoer (aktiv = false).
//  - atomisk claim: hindrer at to samtidige klikk/faner dobbeltregistrerer avvisningen.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? (FØR vi rører kroppen) ----
  // Samme rekkefølge som godkjenn-paamelding: en fremmed får 401, ikke 400.
  const vakt = await krevAnsatt(req, supabase)
  if (vakt) return res.status(vakt.status).json({ error: vakt.error })

  const { paameldinId } = req.body || {}
  if (!paameldinId) return res.status(400).json({ error: 'Mangler paameldinId' })

  const { error: hentFeil } = await supabase
    .from('paameldinger')
    .select('id')
    .eq('id', paameldinId)
    .single()
  if (hentFeil) return res.status(404).json({ error: 'Påmelding ikke funnet' })

  // ATOMISK CLAIM (dobbeltregistrering): bare den FØRSTE kjøringen som flipper status til
  // 'avvist' lykkes. To samtidige klikk (eller to admin-faner) → den andre får 0 rader og
  // stoppes her (409). Skoleregisteret røres aldri — avvisning markerer KUN påmeldings-raden.
  const { data: claim, error: statusFeil } = await supabase
    .from('paameldinger')
    .update({ status: 'avvist' })
    .eq('id', paameldinId)
    .neq('status', 'avvist')
    .select('id')
  if (statusFeil) {
    return res.status(500).json({ error: 'Kunne ikke avvise påmelding: ' + statusFeil.message })
  }
  if (!claim || claim.length === 0) {
    return res.status(409).json({ error: 'Denne påmeldingen er allerede avvist.' })
  }

  return res.status(200).json({ ok: true })
}
