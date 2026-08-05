import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
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

  if (req.method === 'PATCH') {
    // Peke ut (eller fjerne) vertskap på én kurs_skole-rad. Flere skoler kan være
    // vertskap på samme kurs — dette er en ren av/på per rad, ikke «velg én».
    const { koblingId, erVertskap } = req.body
    if (!koblingId || typeof erVertskap !== 'boolean') {
      return res.status(400).json({ error: 'Mangler koblingId eller erVertskap (boolean)' })
    }

    const { data, error } = await supabase
      .from('kurs_skole')
      .update({ er_vertskap: erVertskap })
      .eq('id', koblingId)
      .select('id, er_vertskap')
      .maybeSingle()

    if (error) {
      return res.status(500).json({ error: 'Kunne ikke oppdatere vertskap: ' + error.message })
    }
    if (!data) {
      return res.status(404).json({ error: 'Fant ingen kobling å oppdatere — lukk og åpne modalen på nytt.' })
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
