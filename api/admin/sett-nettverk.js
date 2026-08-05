import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { skoleId, nettverk } = req.body
  if (!skoleId || !nettverk) {
    return res.status(400).json({ error: 'Mangler skoleId eller nettverk' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? ----
  // Dette endepunktet bruker service-nøkkelen og går utenom alle sperrer. Da
  // MÅ det selv sjekke hvem som kaller — ellers står det åpent for hele
  // internett. Manglet fram til 4. aug (funnet av agenttest 3).
  // Samme mønster som api/auth/inviter-bruker.js.
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ikke autentisert.' })
  }
  const { data: { user: caller } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon — last inn siden på nytt.' })
  const { data: callerProfil } = await supabase
    .from('profiles').select('rolle').eq('id', caller.id).single()
  if (!['superadmin', 'ansatt'].includes(callerProfil?.rolle)) {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }

  const { data, error } = await supabase
    .from('skoler')
    .update({ nettverk })
    .eq('id', skoleId)
    .select('id, navn, nettverk')
    .single()

  if (error) {
    return res.status(500).json({ error: 'Kunne ikke sette nettverk: ' + error.message })
  }

  return res.status(200).json({ ok: true, skole: data })
}
