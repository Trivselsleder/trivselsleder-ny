import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'

// Admin-CRUD for webinarer (kun ansatt/superadmin). Service-nøkkel + krevAnsatt,
// samme mønster som api/admin/*. Håndterer via body.handling:
//   list | opprett | oppdater | publiser | avpubliser | slett | pameldinger
// Service-nøkkelen leser/skriver også mote_lenke (kolonnen er låst for vanlige brukere).
const TYPER = ['nettverksmote', 'ra_webinar', 'intro_ekstern', 'opplaering']
const SYNLIGHET = ['intern', 'offentlig']
const STATUSER = ['utkast', 'publisert', 'gjennomfort', 'avlyst']

function reinFelter(d) {
  const ut = {}
  const str = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim())
  if ('tittel' in d) ut.tittel = str(d.tittel)
  if ('beskrivelse' in d) ut.beskrivelse = str(d.beskrivelse)
  if ('mote_lenke' in d) ut.mote_lenke = str(d.mote_lenke)
  if ('starter_at' in d) ut.starter_at = str(d.starter_at)
  if ('varighet_min' in d) { const v = parseInt(d.varighet_min, 10); ut.varighet_min = Number.isInteger(v) && v > 0 ? v : 45 }
  if ('maks_antall' in d) { const m = parseInt(d.maks_antall, 10); ut.maks_antall = Number.isInteger(m) && m > 0 ? m : null }
  if ('type' in d && TYPER.includes(d.type)) ut.type = d.type
  if ('synlighet' in d && SYNLIGHET.includes(d.synlighet)) ut.synlighet = d.synlighet
  if ('status' in d && STATUSER.includes(d.status)) ut.status = d.status
  if ('vert_ra' in d) ut.vert_ra = str(d.vert_ra)
  return ut
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const { data: { user: caller } } = await supabase.auth.getUser(req.headers.authorization.slice(7))
  const { handling } = req.body || {}

  // Felles validering for opprett/oppdater
  function valider(felt) {
    if (felt.starter_at != null && isNaN(new Date(felt.starter_at).getTime())) return 'Ugyldig starttidspunkt.'
    if (felt.mote_lenke && !/^https?:\/\//i.test(felt.mote_lenke)) return 'Møtelenke må starte med http:// eller https://.'
    return null
  }

  try {
    if (handling === 'list') {
      const { data, error } = await supabase
        .from('webinarer')
        .select('id, tittel, beskrivelse, type, synlighet, starter_at, varighet_min, mote_lenke, maks_antall, status, vert_ra, opprettet_at')
        .order('starter_at', { ascending: false })
      if (error) throw error
      // Antall aktive påmeldte per webinar
      const ids = (data || []).map((w) => w.id)
      let tellinger = {}
      if (ids.length) {
        const { data: pm } = await supabase
          .from('webinar_pameldinger').select('webinar_id').in('webinar_id', ids).is('avmeldt_at', null)
        for (const r of pm || []) tellinger[r.webinar_id] = (tellinger[r.webinar_id] || 0) + 1
      }
      return res.status(200).json({ webinarer: (data || []).map((w) => ({ ...w, antall_pameldte: tellinger[w.id] || 0 })) })
    }

    if (handling === 'opprett') {
      const felt = reinFelter(req.body)
      if (!felt.tittel || !felt.starter_at) return res.status(400).json({ error: 'Tittel og starttidspunkt er påkrevd.' })
      const vFeil = valider(felt); if (vFeil) return res.status(400).json({ error: vFeil })
      const { data, error } = await supabase.from('webinarer')
        .insert({ ...felt, opprettet_av: caller?.id || null }).select('id').single()
      if (error) throw error
      return res.status(200).json({ ok: true, id: data.id })
    }

    if (handling === 'oppdater') {
      if (!req.body.id) return res.status(400).json({ error: 'Mangler id.' })
      const felt = reinFelter(req.body)
      if ('tittel' in felt && !felt.tittel) return res.status(400).json({ error: 'Tittel kan ikke være tom.' })
      const vFeil = valider(felt); if (vFeil) return res.status(400).json({ error: vFeil })
      const { error } = await supabase.from('webinarer')
        .update({ ...felt, endret_at: new Date().toISOString() }).eq('id', req.body.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (handling === 'publiser' || handling === 'avpubliser') {
      if (!req.body.id) return res.status(400).json({ error: 'Mangler id.' })
      const nyStatus = handling === 'publiser' ? 'publisert' : 'utkast'
      const { error } = await supabase.from('webinarer')
        .update({ status: nyStatus, endret_at: new Date().toISOString() }).eq('id', req.body.id)
      if (error) throw error
      return res.status(200).json({ ok: true, status: nyStatus })
    }

    if (handling === 'slett') {
      if (!req.body.id) return res.status(400).json({ error: 'Mangler id.' })
      const { error } = await supabase.from('webinarer').delete().eq('id', req.body.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (handling === 'pameldinger') {
      if (!req.body.id) return res.status(400).json({ error: 'Mangler id.' })
      const { data, error } = await supabase
        .from('webinar_pameldinger')
        .select('id, navn, rolle, epost, kilde, bekreftet_at, nyhetsbrev_samtykke, avmeldt_at, opprettet_at')
        .eq('webinar_id', req.body.id)
        .order('opprettet_at', { ascending: true })
      if (error) throw error
      return res.status(200).json({ pameldinger: data || [] })
    }

    return res.status(400).json({ error: 'Ukjent handling.' })
  } catch (e) {
    console.error('webinar/admin-feil:', e) // detaljer kun i serverlogg
    return res.status(500).json({ error: 'Serverfeil. Prøv igjen, eller kontakt support.' })
  }
}
