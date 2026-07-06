import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { paameldinId } = req.body
  if (!paameldinId) return res.status(400).json({ error: 'Mangler paameldinId' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: p, error: hentFeil } = await supabase
    .from('paameldinger')
    .select('*')
    .eq('id', paameldinId)
    .single()
  if (hentFeil) return res.status(404).json({ error: 'Påmelding ikke funnet' })

  // Var påmeldingen godkjent (dvs. finnes en aktivert skole for den) før avvisningen?
  const varGodkjent = p.status === 'godkjent'

  const { error: statusFeil } = await supabase
    .from('paameldinger')
    .update({ status: 'avvist' })
    .eq('id', paameldinId)
  if (statusFeil) {
    return res.status(500).json({ error: 'Kunne ikke avvise påmelding: ' + statusFeil.message })
  }

  // Kun hvis påmeldingen var godkjent: deaktiver skolen som ble opprettet ved godkjenning.
  // Ingenting slettes — koblinger og brukere bevares, slik at skolen kan reaktiveres
  // ved en ny godkjenning. Hvis påmeldingen var 'ny'/'påmeldt' rører vi IKKE skoler-tabellen
  // (det kan finnes en annen, ekte skole med samme org.nr).
  let skoleSattInaktiv = null
  if (varGodkjent) {
    const { data: skole, error: skoleFeil } = await supabase
      .from('skoler')
      .update({ status: 'Inaktiv' })
      .eq('org_nr', p.organisasjonsnummer)
      .eq('status', 'Aktiv')
      .select('id, navn')
      .maybeSingle()
    if (skoleFeil) {
      console.error('Kunne ikke sette skole inaktiv:', skoleFeil.message)
    } else if (skole) {
      skoleSattInaktiv = skole
    }
  }

  return res.status(200).json({ ok: true, varGodkjent, skoleSattInaktiv })
}
