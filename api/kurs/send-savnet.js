import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'
import { fyllPlassholdere, fjernTommePlassholderLinjer, tekstTilHtml, escapeHtml } from './_invitasjon-mal.js'

// B15 (høring pkt 10): omsorgsmail «vi savnet dere» til en skole som takket nei.
//
// Beslutning: DROPP «slik holder du kurs selv»-oppskriften. Send i stedet en varm
// hilsen (Ylvas skisse) — leker som slo an, kurshefte, videolenker (når klart),
// nominasjonslapper, peker mot neste kurs. INGEN bruksanvisning, INGEN oppfølging/
// evaluering av lokalt kurs. Sendes MANUELT av RA, én skole om gangen.
//
// Malen (emne + tekst) ligger i innstillinger (epost_savnet_emne/-tekst) så RA kan
// redigere den. Kun for skoler som har svart NEI (kommer=false). Nødbrems-styrt.

const resend = new Resend(process.env.RESEND_API_KEY)
const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const kursSkoleId = (req.body?.kurs_skole_id || '').toString().trim()
  const torrkjoring = (req.body?.torrkjoring !== false)
  if (!kursSkoleId) return res.status(400).json({ error: 'Mangler kurs_skole_id' })

  // ---- Innstillinger ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger').select('nokkel, verdi')
    .in('nokkel', ['avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv',
      'epost_savnet_emne', 'epost_savnet_tekst'])
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))
  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const svarTilEpost = innst.svar_til_epost
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const emneMal = innst.epost_savnet_emne
  const tekstMal = innst.epost_savnet_tekst

  if (!avsenderEpost || !avsenderNavn) return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger.' })
  if (!emneMal?.trim() || !tekstMal?.trim()) return res.status(500).json({ error: 'Mangler epost_savnet_emne/epost_savnet_tekst i innstillinger.' })
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(409).json({
      error: 'Nødbremsen er på: motor_aktiv står på «nei». Ekte utsending er stanset. Tørrkjøring er fortsatt tillatt.',
      motor_aktiv: motorAktiv,
    })
  }

  // ---- kurs_skole (må ha svart NEI) ----
  const { data: ks, error: ksFeil } = await supabase
    .from('kurs_skole')
    .select('id, kurs_id, kommer, svart, skoler(navn, hktl_navn, hktl_epost)')
    .eq('id', kursSkoleId).maybeSingle()
  if (ksFeil) return res.status(500).json({ error: 'Kunne ikke hente skoleraden: ' + ksFeil.message })
  if (!ks) return res.status(404).json({ error: 'Fant ikke skoleraden (kurs_skole).' })
  if (!(ks.svart === true && ks.kommer === false)) {
    return res.status(422).json({ error: 'Omsorgsmailen sendes kun til skoler som har svart nei.' })
  }

  // Mottaker: skolens nåværende hovedkontakt, fallback til htla-mottakerens adresse.
  const { data: htlaRader } = await supabase
    .from('kurs_skole_mottaker')
    .select('navn, epost').eq('kurs_skole_id', ks.id).eq('rolle', 'htla').limit(1)
  const htla = (htlaRader || [])[0] || null
  const mottakerEpost = gyldigEpost(ks.skoler?.hktl_epost) ? ks.skoler.hktl_epost.trim()
    : (gyldigEpost(htla?.epost) ? htla.epost.trim() : '')
  const mottakerNavn = ks.skoler?.hktl_navn || htla?.navn || ''
  if (!gyldigEpost(mottakerEpost)) return res.status(422).json({ error: 'Skolen har ingen gyldig hovedkontakt-adresse.' })

  const skoleNavn = ks.skoler?.navn || 'skolen'
  const from = `${avsenderNavn} <${avsenderEpost}>`
  const verdier = { skolenavn: skoleNavn, mottaker_navn: mottakerNavn }
  const emne = fyllPlassholdere(emneMal, verdier)
  const tekstUtenTomme = fjernTommePlassholderLinjer(tekstMal, verdier)
  const html = epostMal({
    overskrift: escapeHtml(emne),
    brødtekst: tekstTilHtml(fyllPlassholdere(tekstUtenTomme, verdier)),
    fottekst: 'En varm hilsen fra oss i Trivselsleder. Svar gjerne på denne e-posten om dere lurer på noe.',
    nettstedUrl,
  })

  // ---- TØRRKJØRING ----
  if (torrkjoring) {
    return res.status(200).json({
      ok: true, torrkjoring: true, motor_aktiv: motorAktiv || null,
      forhandsvisning: { skole: skoleNavn, mottaker_navn: mottakerNavn || null, mottaker_epost: mottakerEpost, emne, fra: from },
    })
  }

  // ---- EKTE KJØRING ----
  const tid = new Date().toISOString()
  let resendId = null, sendFeil = null
  try {
    const { data: sendData, error: rFeil } = await resend.emails.send({
      from, to: mottakerEpost, subject: emne, html,
      ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sendData?.id || null
  } catch (e) { sendFeil = e?.message || String(e) }

  await supabase.from('epost_logg').insert({
    type: 'savnet',
    mottaker_epost: mottakerEpost, mottaker_navn: mottakerNavn || null,
    kurs_skole_id: ks.id,
    status: sendFeil ? 'feil' : 'sendt', resend_id: resendId, feilmelding: sendFeil,
  })

  if (sendFeil) return res.status(200).json({ ok: false, sendt: false, skole: skoleNavn, grunn: sendFeil })

  // Stempel for visning («sendt <dato>»). Sperrer ikke gjensending.
  await supabase.from('kurs_skole').update({ savnet_sendt_at: tid }).eq('id', ks.id)
  return res.status(200).json({ ok: true, sendt: true, skole: skoleNavn, mottaker: mottakerEpost, resend_id: resendId })
}
