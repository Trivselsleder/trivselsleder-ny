import { createClient } from '@supabase/supabase-js'

// Fjern ÉN bruker_skole-rad, avgrenset EKSAKT på (bruker_id, skole_id).
//
// TVILLING av api/skole/sett-medlem-rolle.js: samme vakthold, samme låsing.
// Endepunktet bruker service-nøkkelen og går utenom ALLE sperrer i basen (RLS,
// policyer). Da er vakten HER eneste barriere (jf. api/_vakt.js). Dette er
// TILGANGSDATA — å fjerne en kobling trekker tilbake en brukers adgang til en
// skole — så autoriseringen speiler sett-medlem-rolle.js 1:1:
//   1) Bearer-token kreves            → 401
//   2) rolle ∈ {skoleadmin,superadmin,ansatt} ellers → 403
//   3) profiles.aktiv === false       → 403
//   4) skoleadmin er låst til EGEN skole (må selv ha en rad mot skoleId) → 403
// Superadmin/ansatt kan fjerne på enhver skole.
//
// AVGRENSNING: sletter kun raden (bruker_id, skole_id). Aldri bredere. Rører
// ikke profilen, ikke skolen, ikke andre brukeres koblinger.
//
// SIKKERHETSNETT «siste kobling»: vi BLOKKERER ikke, men FLAGGER. Er raden som
// fjernes brukerens eneste gjenværende skolekobling, svarer vi varErSiste:true
// så grensesnittet kan advare tydeligere. En superadmin skal fortsatt kunne
// rette en feilkobling der brukeren bare har den ene — en hard sperre ville
// gjort nettopp den ryddejobben umulig.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Ikke autentisert.' })
  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: { user: caller } } = await supabase.auth.getUser(token)
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon.' })

  const { data: profil } = await supabase
    .from('profiles').select('rolle, aktiv').eq('id', caller.id).single()
  if (!['skoleadmin', 'superadmin', 'ansatt'].includes(profil?.rolle)) {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }
  if (profil?.aktiv === false) return res.status(403).json({ error: 'Kontoen er deaktivert.' })

  const { skoleId, brukerId } = req.body
  if (!skoleId || !brukerId) return res.status(400).json({ error: 'Mangler skoleId eller brukerId.' })

  // Skoleadmin kan kun fjerne paa sin egen skole.
  if (profil.rolle === 'skoleadmin') {
    const { data: tilgang } = await supabase
      .from('bruker_skole').select('skole_id')
      .eq('bruker_id', caller.id).eq('skole_id', skoleId).maybeSingle()
    if (!tilgang) return res.status(403).json({ error: 'Du har ikke tilgang til denne skolen.' })
  }

  // Hent raden som skal fjernes FØR sletting — så vi kan (1) returnere en klar
  // feil om den ikke finnes, og (2) navngi nøyaktig hva som ble fjernet.
  const { data: rad } = await supabase
    .from('bruker_skole')
    .select('bruker_id, skole_id, profiles ( navn, epost ), skoler ( navn )')
    .eq('bruker_id', brukerId).eq('skole_id', skoleId).maybeSingle()
  if (!rad) return res.status(404).json({ error: 'Fant ingen slik skolekobling å fjerne.' })

  // Tell brukerens koblinger FØR vi sletter, så vi vet om dette er den siste.
  const { count: antallForFjerning } = await supabase
    .from('bruker_skole')
    .select('skole_id', { count: 'exact', head: true })
    .eq('bruker_id', brukerId)
  const varErSiste = (antallForFjerning ?? 0) <= 1

  // Selve fjerningen — avgrenset EKSAKT på (bruker_id, skole_id). Aldri bredere.
  const { error: slettFeil } = await supabase
    .from('bruker_skole')
    .delete()
    .eq('bruker_id', brukerId).eq('skole_id', skoleId)
  if (slettFeil) return res.status(500).json({ error: slettFeil.message })

  return res.status(200).json({
    ok: true,
    varErSiste,
    fjernet: {
      brukerId,
      skoleId,
      brukerNavn: rad.profiles?.navn ?? null,
      brukerEpost: rad.profiles?.epost ?? null,
      skoleNavn: rad.skoler?.navn ?? null,
    },
  })
}
