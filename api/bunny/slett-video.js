import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { lesBunnyKonfig, BUNNY_BASE } from './_bunny.js'

// ============================================================================
// SLETT EN BUNNY-VIDEO — men KUN hvis ingen lek eller samling lenger peker på den.
// Brukes etter «Fjern video» og «Bytt video»: frontend har da allerede fjernet
// medier-raden, så guid-en er ute av bruk og trygg å slette.
//
// SIKKERHETSSPERRE: guid-en slås opp i BÅDE medier og samling_medie (de to eneste
// tabellene med bunny_video_id). Finnes den ett av stedene, nektes slettingen (409)
// — ellers kunne et feilkall tatt bort en video som fortsatt vises et annet sted.
//
// Kun innlogget ansatt/superadmin (service-nøkkel bak → må vokte seg selv).
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

  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const konfig = lesBunnyKonfig()
  if (konfig.feil) return res.status(500).json({ error: konfig.feil })
  const { apiKey, libraryId } = konfig

  const raa = (req.body?.guid ?? '').toString().trim()
  if (!raa) return res.status(400).json({ error: 'Mangler guid.' })
  // Normaliser før noe brukes: Bunny-guid-er er små bokstaver, og GUID er case-ufølsom
  // hos Bunny mens .eq under er case-følsom. STORE bokstaver ville derfor bommet på
  // «i bruk»-sjekken og likevel slettet den ekte videoen. Krev eksakt UUID-format, ellers
  // kunne en «guid» som ../collections/<id> normaliseres til et annet Bunny-endepunkt.
  const guid = raa.toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(guid)) {
    return res.status(400).json({ error: 'Ugyldig guid.' })
  }

  // Er guid-en fortsatt i bruk noe sted? Sjekk begge tabellene med service-nøkkel
  // (går utenom RLS, så vi ser ALT — nettopp derfor må vakten over stå). Bruk den
  // NORMALISERTE guid-en i begge oppslagene, samme verdi som sendes til Bunny under.
  const iMedier = await supabase.from('medier').select('id').eq('bunny_video_id', guid).limit(1)
  const iSamling = await supabase.from('samling_medie').select('id').eq('bunny_video_id', guid).limit(1)
  if (iMedier.error || iSamling.error) {
    return res.status(500).json({ error: 'Kunne ikke verifisere om videoen er i bruk.' })
  }
  if ((iMedier.data?.length || 0) > 0 || (iSamling.data?.length || 0) > 0) {
    return res.status(409).json({ error: 'Videoen er fortsatt i bruk og ble ikke slettet.' })
  }

  // Ikke i bruk → slett hos Bunny.
  let slett
  try {
    slett = await fetch(`${BUNNY_BASE}/library/${libraryId}/videos/${encodeURIComponent(guid)}`, {
      method: 'DELETE',
      headers: { AccessKey: apiKey, accept: 'application/json' },
    })
  } catch {
    return res.status(502).json({ error: 'Fikk ikke kontakt med Bunny.' })
  }
  // 404 = allerede borte hos Bunny → regn som slettet (idempotent, ingen feil).
  if (!slett.ok && slett.status !== 404) {
    return res.status(502).json({ error: `Bunny avviste slettingen (${slett.status}).` })
  }
  return res.status(200).json({ ok: true })
}
