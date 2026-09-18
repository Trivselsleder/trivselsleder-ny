import { createClient } from '@supabase/supabase-js'

// Gyldige rolleverdier (samme sett som AdminBrukere-nedtrekket og profiles.rolle).
const ROLLER = ['superadmin', 'ansatt', 'skoleadmin', 'skoleansatt', 'feide']

// F2 (17. sep, migr 143): `authenticated` mistet UPDATE på profiles.rolle/aktiv, så
// rolle- og aktiv-endring KAN IKKE lenger gjøres direkte fra nettleseren (AdminBrukere
// skrev tidligere profiles.rolle/aktiv via brukerens egen sesjon). Dette endepunktet
// gjør endringen via service_role i stedet, og sjekker selv at kalleren er superadmin
// (service-nøkkelen går utenom RLS/kolonnerettigheter). Samme vaktmønster som
// api/admin/sett-nettverk.js og api/auth/inviter-bruker.js.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? (service-nøkkelen går utenom alle sperrer) ----
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Ikke autentisert.' })
  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon — last inn siden på nytt.' })
  const { data: callerProfil } = await supabase
    .from('profiles').select('rolle, aktiv').eq('id', caller.id).single()
  // Kun superadmin kan endre roller/aktiv (samme som /admin/brukere-ruten).
  if (callerProfil?.rolle !== 'superadmin') {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }
  // F1 (Fable-rekontroll 18. sep): en DEAKTIVERT superadmin (aktiv=false) fikk 200 og
  // kunne sette roller for andre og reaktivere seg selv — endepunktet avvek fra
  // husvakten krevAnsatt (api/_vakt.js), som avviser en deaktivert konto selv om
  // sesjonen ennå lever. Samme sjekk og formulering her.
  if (callerProfil?.aktiv === false) {
    return res.status(403).json({ error: 'Kontoen er deaktivert.' })
  }

  const { brukerId, rolle, aktiv } = req.body
  if (!brukerId) return res.status(400).json({ error: 'Mangler brukerId.' })
  if (rolle === undefined && aktiv === undefined) {
    return res.status(400).json({ error: 'Ingenting å endre (mangler rolle eller aktiv).' })
  }
  if (rolle !== undefined && !ROLLER.includes(rolle)) {
    return res.status(400).json({ error: 'Ukjent rolle.' })
  }
  if (aktiv !== undefined && typeof aktiv !== 'boolean') {
    return res.status(400).json({ error: 'aktiv må være true/false.' })
  }

  // Selvsjekk: en superadmin skal ikke kunne degradere eller deaktivere SEG SELV og
  // låse seg ute. Etter migr 143 har authenticated ingen UPDATE på rolle, så det finnes
  // ingen vei tilbake fra nettleseren. Serversjekken er den som teller (UI-gaten er høflighet).
  if (brukerId === caller.id && rolle !== undefined && rolle !== 'superadmin') {
    return res.status(400).json({ error: 'Du kan ikke endre din egen rolle. Be en annen superadmin gjøre det.' })
  }
  if (brukerId === caller.id && aktiv === false) {
    return res.status(400).json({ error: 'Du kan ikke deaktivere din egen konto.' })
  }

  const endring = {
    ...(rolle !== undefined ? { rolle } : {}),
    ...(aktiv !== undefined ? { aktiv } : {}),
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(endring)
    .eq('id', brukerId)
    .select('id, rolle, aktiv')
    .single()

  if (error) return res.status(500).json({ error: 'Kunne ikke oppdatere bruker: ' + error.message })
  return res.status(200).json({ ok: true, bruker: data })
}
