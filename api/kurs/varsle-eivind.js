import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostMal } from '../_epost-mal.js'

// Resend Trinn B, steg 3c del 2: internt varsel til Eivind ved kjøpsinteresse.
//
// Hendelsesdrevet — kalles fra evalueringsskjemaet rett etter at en skole har
// lagret et svar med kjøpsinteresse. Går KUN til adressen i innstillinger
// (eivind_epost), aldri til en skole. Kort og faktatungt: Eivind trenger data.
//
// Tar imot { token, torrkjoring }. token er evalueringens token. Tørrkjøring er
// standard true (som de andre); skjemaet kaller med torrkjoring:false.
//
// NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes, UTEN unntak. Én bryter
// skal stoppe alt, også interne varsler. Kjøpsinteressen går ikke tapt — den
// ligger i basen og vises i admin uansett.
//
// FELLE 1: kurs hentes for seg (ingen tvetydig embed).
// FELLE 2: mottaker-embed må peke på kurs_skole_mottaker_kurs_skole_id_fkey.

const resend = new Resend(process.env.RESEND_API_KEY)

// Kjøpsinteresse-verdier som skal utløse varsel. 'nei'/tomt gjør ingenting.
const INTERESSE = new Set(['pakke', 'samtale'])

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function formaterKr(n) {
  if (n == null || n === '') return ''
  const tall = Number(n)
  if (Number.isNaN(tall)) return String(n)
  return tall.toLocaleString('nb-NO') + ' kr'
}

const KJOP_ETIKETT = { pakke: 'Vil kjøpe pakke', samtale: 'Ønsker en samtale', nei: 'Ikke nå' }

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}

// Én faktalinje i varselet: etikett + verdi. Hopper over tomme verdier.
function faktalinje(etikett, verdi) {
  if (verdi == null || String(verdi).trim() === '') return ''
  return `<tr>
    <td style="padding:4px 12px 4px 0;color:#888;font-size:14px;vertical-align:top;white-space:nowrap;">${escapeHtml(etikett)}</td>
    <td style="padding:4px 0;color:#111;font-size:14px;font-weight:600;">${escapeHtml(verdi)}</td>
  </tr>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token } = req.body || {}
  const torrkjoring = (req.body?.torrkjoring !== false)

  if (!token) return res.status(400).json({ error: 'Mangler token.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- Innstillinger ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', ['avsender_navn', 'avsender_epost', 'motor_aktiv', 'eivind_epost', 'epost_eivind_emne'])

  if (innstFeil) {
    return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  }
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))

  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const eivindEpost = (innst.eivind_epost || '').trim()
  const emneMal = innst.epost_eivind_emne

  if (!avsenderEpost || !avsenderNavn) {
    return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger-tabellen.' })
  }
  if (!eivindEpost) {
    return res.status(500).json({ error: 'Mangler eivind_epost i innstillinger-tabellen.' })
  }

  // ---- NØDBREMS (uten unntak — også for interne varsler) ----
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(409).json({
      error: 'Nødbremsen er på: motor_aktiv står på «nei». Ekte utsending er stanset. Kjøpsinteressen er lagret og synlig i admin.',
      motor_aktiv: motorAktiv,
    })
  }

  // ---- Evalueringen (via token) ----
  const { data: evalRader, error: evalFeil } = await supabase
    .from('evalueringer')
    .select('id, kurs_skole_id, kjopsinteresse, valgt_pakke_navn, valgt_pakke_pris, gullkorn, eivind_varslet_at')
    .eq('token', token)
    .limit(1)

  if (evalFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente evalueringen: ' + evalFeil.message })
  }
  const evaluering = (evalRader || [])[0]
  if (!evaluering) {
    return res.status(404).json({ error: 'Fant ingen evaluering for dette tokenet.' })
  }

  // ---- Bare varsle ved faktisk kjøpsinteresse ----
  const kjop = (evaluering.kjopsinteresse || '').trim().toLowerCase()
  if (!INTERESSE.has(kjop)) {
    return res.status(200).json({ ok: true, sendt: false, grunn: 'ingen kjøpsinteresse (' + (kjop || 'tomt') + ')' })
  }

  // ---- Skole, kurs og kontaktperson ----
  const { data: ksRader, error: ksFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id,
      skoler(navn),
      kurs_skole_mottaker!kurs_skole_mottaker_kurs_skole_id_fkey(rolle, navn, epost)
    `)
    .eq('id', evaluering.kurs_skole_id)
    .limit(1)

  if (ksFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente skole/kontakt: ' + ksFeil.message })
  }
  const ks = (ksRader || [])[0]
  const skoleNavn = ks?.skoler?.navn || '(ukjent skole)'

  let kurs = null
  if (ks?.kurs_id) {
    const { data: kursRad } = await supabase
      .from('kurs')
      .select('id, navn, dato')
      .eq('id', ks.kurs_id)
      .single()
    kurs = kursRad || null
  }

  const alle = ks?.kurs_skole_mottaker || []
  const kontakt = alle.find(m => m.rolle === 'htla') || alle[0] || null

  const kursNavn = kurs?.navn || ''
  const kursDato = formaterDato(kurs?.dato)
  const pakke = evaluering.valgt_pakke_navn || (kjop === 'samtale' ? 'Ønsker samtale (ingen pakke valgt)' : '')
  const pris = formaterKr(evaluering.valgt_pakke_pris)

  // Emne-plassholder: pakkenavnet hvis skolen valgte pakke, ellers «ønsker samtale».
  const pakkevalg = evaluering.valgt_pakke_navn
    ? evaluering.valgt_pakke_navn
    : (kjop === 'samtale' ? 'ønsker samtale' : (KJOP_ETIKETT[kjop] || kjop))

  const emne = fyllPlassholdere(emneMal || 'Kjøpsinteresse: {skolenavn}', {
    skolenavn: skoleNavn, kursnavn: kursNavn, kursdato: kursDato, pakkevalg,
  })

  // ---- Bygg det faktatunge varselet (brødtekst i kode) ----
  const rader = [
    faktalinje('Skole', skoleNavn),
    faktalinje('Kurs', kursNavn),
    faktalinje('Kursdato', kursDato),
    faktalinje('Interesse', KJOP_ETIKETT[kjop] || kjop),
    faktalinje('Valgt pakke', pakke),
    faktalinje('Pris', pris),
    faktalinje('Kontaktperson', kontakt?.navn || ''),
    faktalinje('E-post', kontakt?.epost || ''),
  ].filter(Boolean).join('\n')

  const gullkornBlokk = (evaluering.gullkorn && evaluering.gullkorn.trim() !== '')
    ? `<p style="font-size:14px;color:#444;line-height:1.6;margin:20px 0 0;">
         <span style="color:#888;">Gullkorn:</span><br>«${escapeHtml(evaluering.gullkorn.trim())}»
       </p>`
    : ''

  const brødtekst = `
    <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">
      En skole har vist kjøpsinteresse i evalueringen:
    </p>
    <table style="border-collapse:collapse;margin:0;">${rader}</table>
    ${gullkornBlokk}`

  const html = epostMal({
    overskrift: escapeHtml(emne),
    brødtekst,
    fottekst: 'Automatisk varsel fra evalueringsskjemaet. Kjøpsinteressen er også synlig i admin.',
  })

  const from = `${avsenderNavn} <${avsenderEpost}>`

  // ---- TØRRKJØRING ----
  if (torrkjoring) {
    return res.status(200).json({
      ok: true,
      torrkjoring: true,
      allerede_varslet: !!evaluering.eivind_varslet_at,
      ville_sendt_til: eivindEpost,
      emne,
      skole: skoleNavn,
      kurs: kursNavn,
      interesse: KJOP_ETIKETT[kjop] || kjop,
      pakke: pakke || null,
      pris: pris || null,
      kontakt: kontakt ? { navn: kontakt.navn || null, epost: kontakt.epost || null } : null,
    })
  }

  // ---- EKTE ----

  // Reservasjonsvern: flipp eivind_varslet_at fra NULL til nå i ETT kall. Bare
  // den FØRSTE lagringen med kjøpsinteresse vinner; en andre lagring får null
  // rader tilbake og hoppes over. (Endrer skolen svaret fra «nei» til «pakke»
  // senere, var stempelet tomt første gang, så det blir ett reelt varsel.)
  const tid = new Date().toISOString()
  const { data: reservert, error: reservFeil } = await supabase
    .from('evalueringer')
    .update({ eivind_varslet_at: tid })
    .eq('id', evaluering.id)
    .is('eivind_varslet_at', null)
    .select('id')

  if (reservFeil) {
    return res.status(500).json({ ok: false, sendt: false, error: 'Kunne ikke reservere varsel: ' + reservFeil.message })
  }
  if (!reservert || reservert.length === 0) {
    return res.status(200).json({ ok: true, sendt: false, grunn: 'allerede varslet (reservert)' })
  }

  let resendId = null
  let sendFeil = null
  try {
    const { data: sendData, error: rFeil } = await resend.emails.send({
      from,
      to: eivindEpost,
      subject: emne,
      html,
      // Svar-til = skolens kontaktperson, så Eivind kan svare direkte.
      ...(kontakt?.epost ? { replyTo: kontakt.epost } : {}),
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sendData?.id || null
  } catch (e) {
    sendFeil = e?.message || String(e)
  }

  await supabase.from('epost_logg').insert({
    type: 'eivind_varsel',
    mottaker_epost: eivindEpost,
    mottaker_navn: 'Eivind',
    kurs_skole_id: evaluering.kurs_skole_id,
    status: sendFeil ? 'feil' : 'sendt',
    resend_id: resendId,
    feilmelding: sendFeil,
  })

  if (sendFeil) {
    // Frigi reservasjonen så varselet kan forsøkes på nytt ved neste lagring.
    await supabase.from('evalueringer').update({ eivind_varslet_at: null }).eq('id', evaluering.id)
    return res.status(502).json({ ok: false, sendt: false, error: sendFeil })
  }

  return res.status(200).json({ ok: true, sendt: true, til: eivindEpost, resend_id: resendId })
}
