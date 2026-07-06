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
