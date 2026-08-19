import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { byggInvitasjonEpost } from './_invitasjon-mal.js'

// B9 (høring 17. aug): «Send invitasjon på nytt» til ÉN skole.
//
// Bruk: en skole finner ikke igjen invitasjonen, kontakten er byttet, eller
// utsendingen glapp. RA trykker «Send på nytt» i «Se svar», og hovedkontakten
// (htla) får en helt ny, identisk invitasjon — samme mal som førstegangs-
// utsendingen (delt via _invitasjon-mal.js), med skolens egen lenke.
//
// Forskjeller fra send-invitasjon.js:
//   - gjelder ÉN kurs_skole (ikke hele kurset),
//   - hopper ALDRI over på forste_utsending_at — dette ER en bevisst ny sending.
//
// Uendret fra resten: ansatt-vakt, tørrkjøring som standard, nødbrems (motor_aktiv),
// og én rad i epost_logg per forsøk (type «invitasjon-paa-nytt» så sendeloggen
// skiller den fra førstegangsinvitasjonen).

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Vakt FØR validering av kroppen — en fremmed skal få 401, ikke 400.
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const kursSkoleId = (req.body?.kurs_skole_id || '').toString().trim()
  const torrkjoring = (req.body?.torrkjoring !== false) // standard: tørrkjøring
  if (!kursSkoleId) return res.status(400).json({ error: 'Mangler kurs_skole_id' })

  // ---- Innstillinger (avsender + maler) — leses fra basen, ikke hardkodet ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', [
      'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv',
      'epost_invitasjon_emne', 'epost_invitasjon_tekst', 'epost_vertskap_notat',
    ])
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()

  if (!innst.avsender_epost || !innst.avsender_navn) {
    return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger-tabellen.' })
  }
  if (!nettstedUrl) {
    return res.status(500).json({ error: 'Mangler nettsted_url i innstillinger — kan ikke bygge svarlenke.' })
  }
  if (!innst.epost_invitasjon_emne?.trim() || !innst.epost_invitasjon_tekst?.trim()) {
    return res.status(500).json({ error: 'Mangler epost_invitasjon_emne/epost_invitasjon_tekst i innstillinger (eller de er tomme).' })
  }
  // NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes (tørrkjøring er lov).
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(409).json({
      error: 'Nødbremsen er på: motor_aktiv står på «nei». Ekte utsending er stanset. ' +
             'Tørrkjøring (torrkjoring:true) er fortsatt tillatt for å se hva som ville gått ut.',
      motor_aktiv: motorAktiv,
    })
  }

  // ---- kurs_skole → kurs → hall ----
  const { data: kobling, error: kobFeil } = await supabase
    .from('kurs_skole')
    .select('id, kurs_id, er_vertskap, flyttet_fra_kurs, forste_utsending_at, skoler(navn)')
    .eq('id', kursSkoleId)
    .maybeSingle()
  if (kobFeil) return res.status(500).json({ error: 'Kunne ikke hente skoleraden: ' + kobFeil.message })
  if (!kobling) return res.status(404).json({ error: 'Fant ikke skoleraden (kurs_skole).' })

  const { data: kurs, error: kursFeil } = await supabase
    .from('kurs')
    .select('id, navn, dato, hall_id, oppmote_vertskap, oppmote_ovrige')
    .eq('id', kobling.kurs_id)
    .single()
  if (kursFeil || !kurs) return res.status(404).json({ error: 'Fant ikke kurset: ' + (kursFeil?.message || 'ukjent id') })

  let hallNavn = ''
  if (kurs.hall_id) {
    const { data: hallRad } = await supabase.from('haller').select('navn').eq('id', kurs.hall_id).maybeSingle()
    hallNavn = hallRad?.navn || ''
  }

  // Sørg for at mottaker-radene finnes (idempotent) og hent hovedkontakten (htla).
  const { error: genFeil } = await supabase.rpc('opprett_kurs_skole_mottakere', { p_kurs_skole_id: kobling.id })
  if (genFeil) return res.status(500).json({ error: 'Kunne ikke opprette/oppdatere mottakere: ' + genFeil.message })

  const { data: htlaRader, error: mottFeil } = await supabase
    .from('kurs_skole_mottaker')
    .select('id, navn, epost, lenke_token')
    .eq('kurs_skole_id', kobling.id)
    .eq('rolle', 'htla')
    .limit(1)
  if (mottFeil) return res.status(500).json({ error: 'Kunne ikke hente hovedkontakt: ' + mottFeil.message })
  const htla = (htlaRader || [])[0]
  if (!htla || !htla.epost) {
    return res.status(422).json({ error: 'Skolen har ingen hovedkontakt (htla) med e-postadresse. Legg inn kontakten før du sender på nytt.' })
  }

  const bygg = byggInvitasjonEpost({ innst, kurs, hallNavn, kobling, htla, nettstedUrl })
  const skoleNavn = kobling.skoler?.navn || '(ukjent skole)'

  // ---- TØRRKJØRING: ingen Resend, ingen skriving. Bare vis hvem som ville fått ----
  if (torrkjoring) {
    return res.status(200).json({
      ok: true,
      torrkjoring: true,
      motor_aktiv: motorAktiv || null,
      forhandsvisning: {
        skole: skoleNavn,
        mottaker_navn: htla.navn || null,
        mottaker_epost: htla.epost,
        emne: bygg.subject,
        fra: bygg.from,
        svar_til: bygg.replyTo,
        lenke: bygg.lenke,
      },
    })
  }

  // ---- EKTE KJØRING ----
  const tid = new Date().toISOString()
  let resendId = null, sendFeil = null
  try {
    const { data: sendData, error: rFeil } = await resend.emails.send({
      from: bygg.from,
      to: bygg.to,
      subject: bygg.subject,
      html: bygg.html,
      ...(bygg.replyTo ? { replyTo: bygg.replyTo } : {}),
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sendData?.id || null
  } catch (e) {
    sendFeil = e?.message || String(e)
  }

  // Én rad i epost_logg per forsøk — også ved feil.
  await supabase.from('epost_logg').insert({
    type: 'invitasjon-paa-nytt',
    mottaker_epost: htla.epost,
    mottaker_navn: htla.navn || null,
    kurs_skole_id: kobling.id,
    kurs_skole_mottaker_id: htla.id,
    status: sendFeil ? 'feil' : 'sendt',
    resend_id: resendId,
    feilmelding: sendFeil,
  })

  if (sendFeil) {
    return res.status(200).json({ ok: false, sendt: false, skole: skoleNavn, grunn: sendFeil })
  }

  // Audit-stempler. sendt_at oppdateres alltid (siste sending). forste_utsending_at
  // settes KUN hvis den var tom (glapp ved første forsøk) — vi flytter den aldri.
  await supabase.from('kurs_skole_mottaker').update({ sendt_at: tid }).eq('id', htla.id)
  if (!kobling.forste_utsending_at) {
    await supabase.from('kurs_skole').update({ forste_utsending_at: tid }).eq('id', kobling.id).is('forste_utsending_at', null)
  }

  return res.status(200).json({ ok: true, sendt: true, skole: skoleNavn, mottaker: htla.epost, resend_id: resendId })
}
