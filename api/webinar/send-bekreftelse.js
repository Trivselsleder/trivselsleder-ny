import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { bekreftelseEpost, icsVedlegg } from '../_webinar-epost.js'

// Sender bekreftelse (m/ møtelenke + .ics) rett etter påmelding. Kalles av
// frontend med { pameldingId } etter at RPC meld_paa_webinar ga status 'ok'.
//
// Offentlig endepunkt (påmelding skjer også anonymt fra forsiden), men trygt:
//  - sender KUN til adressen som ligger lagret på påmeldingen (aldri en oppgitt adresse)
//  - idempotent på bekreftet_at (atomisk reservasjon) → kan ikke spammes
//  - service-nøkkel trengs for å lese mote_lenke (kolonnen er låst for vanlige brukere)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const pameldingId = req.body?.pameldingId
  if (!pameldingId) return res.status(400).json({ error: 'Mangler pameldingId.' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Serverkonfigurasjon mangler.' })
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // Hent påmeldingen
  const { data: pm, error: pmFeil } = await supabase
    .from('webinar_pameldinger')
    .select('id, webinar_id, navn, epost, bekreftet_at')
    .eq('id', pameldingId)
    .maybeSingle()
  if (pmFeil) { console.error('Bekreftelse: DB-feil', pmFeil); return res.status(500).json({ error: 'Databasefeil.' }) }
  if (!pm) return res.status(200).json({ ok: false }) // ukjent id — svar nøytralt, ingen enumerering
  if (pm.bekreftet_at) return res.status(200).json({ ok: true, alleredeSendt: true })

  // Hent webinaret (inkl. mote_lenke via service-nøkkel)
  const { data: w, error: wFeil } = await supabase
    .from('webinarer')
    .select('id, tittel, beskrivelse, starter_at, varighet_min, mote_lenke, status')
    .eq('id', pm.webinar_id)
    .maybeSingle()
  if (wFeil || !w) return res.status(200).json({ ok: false })
  if (w.status !== 'publisert') return res.status(200).json({ ok: true, sendt: false, grunn: 'ikke publisert' }) // avlyst/utkast → ingen bekreftelse

  // Nødbrems: motor_aktiv = 'nei' stanser ALL ekte sending (samme som e-postmotoren ellers).
  const { data: innst } = await supabase.from('innstillinger').select('nokkel, verdi').in('nokkel', ['motor_aktiv'])
  const motorAktiv = (innst?.find((r) => r.nokkel === 'motor_aktiv')?.verdi || '').trim().toLowerCase()
  if (motorAktiv === 'nei') return res.status(200).json({ ok: true, sendt: false, grunn: 'nødbrems' })

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY mangler.' })
  const resend = new Resend(process.env.RESEND_API_KEY)

  // ATOMISK reservasjon av bekreftet_at → dobbeltsendings-vern.
  const tid = new Date().toISOString()
  const { data: reservert, error: resFeil } = await supabase
    .from('webinar_pameldinger')
    .update({ bekreftet_at: tid })
    .eq('id', pm.id)
    .is('bekreftet_at', null)
    .select('id')
  if (resFeil) { console.error('Bekreftelse: reservasjon feilet', resFeil); return res.status(500).json({ error: 'Databasefeil.' }) }
  if (!reservert || reservert.length === 0) return res.status(200).json({ ok: true, alleredeSendt: true })

  // Send
  const { subject, html } = bekreftelseEpost(w, { navn: pm.navn })
  let resendId = null, sendFeil = null
  try {
    const { data: sd, error: rFeil } = await resend.emails.send({
      from: 'noreply@trivselsleder.no',
      to: pm.epost,
      subject, html,
      attachments: [icsVedlegg(w)],
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sd?.id || null
  } catch (e) { sendFeil = e?.message || String(e) }

  // Best-effort logg (skal aldri velte sendingen)
  try {
    await supabase.from('epost_logg').insert({
      type: 'webinar_bekreftelse', mottaker_epost: pm.epost, mottaker_navn: pm.navn || null,
      status: sendFeil ? 'feil' : 'sendt', resend_id: resendId, feilmelding: sendFeil,
    })
  } catch (e) { console.error('Bekreftelse: epost_logg feilet (ikke-kritisk):', e?.message) }

  if (sendFeil) {
    console.error('Bekreftelse: sending feilet:', sendFeil) // detaljer kun i serverlogg — aldri ut til offentlig kaller
    // Frigi reservasjonen så et nytt forsøk kan sende
    await supabase.from('webinar_pameldinger').update({ bekreftet_at: null }).eq('id', pm.id)
    return res.status(502).json({ error: 'Klarte ikke å sende bekreftelse.' })
  }
  return res.status(200).json({ ok: true, sendt: true })
}
