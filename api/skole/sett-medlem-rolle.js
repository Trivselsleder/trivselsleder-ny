import { createClient } from '@supabase/supabase-js'

// Sett stilling + TL-rolle paa et EKSISTERENDE medlem av en skole.
// Samme laasing som oppdater-skole / inviter-bruker: skoleadmin er laast til egen
// skole; superadmin/ansatt kan endre paa enhver skole. Bruker service-noekkel, saa
// vakten HER er eneste barriere (jf. api/_vakt.js).
const STILLINGER = ['rektor', 'inspektor', 'styrer', 'ansatt']
const TL_ROLLER = ['htla', 'tla']

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

  const { skoleId, brukerId, stilling, tl_rolle } = req.body
  if (!skoleId || !brukerId) return res.status(400).json({ error: 'Mangler skoleId eller brukerId.' })

  // Skoleadmin kan kun endre paa sin egen skole.
  if (profil.rolle === 'skoleadmin') {
    const { data: tilgang } = await supabase
      .from('bruker_skole').select('skole_id')
      .eq('bruker_id', caller.id).eq('skole_id', skoleId).maybeSingle()
    if (!tilgang) return res.status(403).json({ error: 'Du har ikke tilgang til denne skolen.' })
  }

  const stillingVerdi = STILLINGER.includes(stilling) ? stilling : null
  const tlRolleVerdi = TL_ROLLER.includes(tl_rolle) ? tl_rolle : null

  // En HTLA per skole: hvis vi setter htla, sjekk at ingen ANNEN bruker har den her.
  // (Databasen haandhever det uansett via unik indeks; dette gir en vennlig melding.)
  if (tlRolleVerdi === 'htla') {
    const { data: annen } = await supabase
      .from('bruker_skole').select('bruker_id')
      .eq('skole_id', skoleId).eq('tl_rolle', 'htla').neq('bruker_id', brukerId).maybeSingle()
    if (annen) return res.status(409).json({ error: 'Skolen har allerede en HTLA. Endre den eksisterende forst.' })
  }

  const { error: oppdFeil } = await supabase
    .from('bruker_skole')
    .update({ stilling: stillingVerdi, tl_rolle: tlRolleVerdi })
    .eq('bruker_id', brukerId).eq('skole_id', skoleId)
  if (oppdFeil) {
    if (oppdFeil.code === '23505') return res.status(409).json({ error: 'Skolen har allerede en HTLA. Endre den eksisterende forst.' })
    return res.status(500).json({ error: oppdFeil.message })
  }

  return res.status(200).json({ ok: true })
}
