import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (req.method === 'GET') {
    // Hent alle kurs til dropdown (unntaksvei: viser ALLE kurs uansett nettverk/kommune)
    const { data, error } = await supabase
      .from('kurs')
      .select('id, navn, nettverk, dato, start_tid, slutt_tid')
      .order('dato', { ascending: false })

    if (error) {
      return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + error.message })
    }
    return res.status(200).json({ ok: true, kurs: data })
  }

  if (req.method === 'POST') {
    const { skoleId, kursId } = req.body
    if (!skoleId || !kursId) {
      return res.status(400).json({ error: 'Mangler skoleId eller kursId' })
    }

    // Sjekk om koblingen allerede finnes, for å unngå duplikat
    const { data: eksisterende } = await supabase
      .from('kurs_skole')
      .select('id')
      .eq('skole_id', skoleId)
      .eq('kurs_id', kursId)
      .maybeSingle()

    if (eksisterende) {
      return res.status(200).json({ ok: true, allerede_koblet: true })
    }

    const { data, error } = await supabase
      .from('kurs_skole')
      .insert({ skole_id: skoleId, kurs_id: kursId })
      .select('id, skole_id, kurs_id')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Kunne ikke koble skole til kurs: ' + error.message })
    }
    return res.status(200).json({ ok: true, kobling: data })
  }

  if (req.method === 'DELETE') {
    // Fjern en skole fra kurset (angre-veien for unntakskobling).
    // Sletter kurs_skole-raden — dermed også evt. svar og svar-lenke (lenke_token).
    // Frontend viser bekreftelsesdialog med svaret FØR dette kalles.
    const { koblingId } = req.body
    if (!koblingId) return res.status(400).json({ error: 'Mangler koblingId' })

    const { data, error } = await supabase
      .from('kurs_skole')
      .delete()
      .eq('id', koblingId)
      .select('id')
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: 'Kunne ikke fjerne kobling: ' + error.message })
    }
    if (!data) {
      return res.status(404).json({ error: 'Fant ingen kobling å fjerne — kanskje allerede fjernet. Lukk og åpne modalen på nytt.' })
    }
    return res.status(200).json({ ok: true, slettet: data.id })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
