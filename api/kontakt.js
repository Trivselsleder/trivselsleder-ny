import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostMal } from './_epost-mal.js'
import { krevMotorAktiv, loggEpost } from './_epost.js'

// KONTAKTSKJEMAET (18. sep 2026). Fram til nå gjorde src/pages/Kontakt.jsx kun
// setSent(true) — meldingen forsvant, og besøkende trodde de hadde fått svar i posten.
// Denne ruten sender en ekte e-post til post@trivselsleder.no og logger forsøket.
//
// INGEN TABELL denne runden (Kjartans beslutning): henvendelsen lever kun i e-posten.
// Følgen er at nødbremsen er fail-CLOSED HER PÅ EN STRENGERE MÅTE enn på påmelding:
// mens en påmelding lagres i basen før e-posten gates, har kontaktskjemaet ingen base å
// falle tilbake på. Er motoren av, kan vi ikke ta imot meldingen uten å miste den — da
// svarer vi med feil, slik at avsenderen får beskjed og kan prøve igjen, i stedet for et
// falskt «takk». Se TIL-CLAUDE-notatet: en egen tabell bør vurderes senere for varighet.

const resend = new Resend(process.env.RESEND_API_KEY)

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Enkel, tolerant e-postsjekk. Ikke en fullstendig RFC-validering — bare nok til å fange
// åpenbare skrivefeil server-side (klientvalideringen alene er ikke nok, den kan omgås).
const EPOST_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const d = req.body || {}
  const navn = String(d.navn ?? '').trim()
  const epost = String(d.epost ?? '').trim()
  const skole = String(d.skole ?? '').trim()
  const melding = String(d.melding ?? '').trim()

  // Server er den reelle vakten. Skole er valgfritt; resten er påkrevd.
  const mangler = []
  if (!navn) mangler.push('Navn')
  if (!epost) mangler.push('E-post')
  else if (!EPOST_RE.test(epost)) mangler.push('Gyldig e-post')
  if (!melding) mangler.push('Melding')
  if (mangler.length) {
    return res.status(400).json({ error: `Mangler eller ugyldige felter: ${mangler.join(', ')}` })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Mangler env-var:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey })
    return res.status(500).json({ error: 'Serverkonfigurasjon mangler (SUPABASE_SERVICE_ROLE_KEY).' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Nødbrems (fail-closed). Ingen base å lagre i → er motoren av, MÅ vi svare med feil,
  // ellers mister vi meldingen mens avsenderen tror den er mottatt.
  const brems = await krevMotorAktiv(supabase)
  if (brems) {
    console.warn('[kontakt] motor_aktiv stengt — henvendelse ikke sendt')
    return res.status(brems.status).json({ error: brems.error })
  }

  const brødtekst = `
    <p style="font-size:14px;color:#444;margin:0 0 8px;">Ny henvendelse fra kontaktskjemaet på nettsiden.</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0;">
      <tr><td style="padding:7px 12px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">Navn</td><td style="padding:7px 12px;color:#111;font-size:13px;">${esc(navn)}</td></tr>
      <tr><td style="padding:7px 12px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">E-post</td><td style="padding:7px 12px;color:#111;font-size:13px;">${esc(epost)}</td></tr>
      ${skole ? `<tr><td style="padding:7px 12px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">Skole</td><td style="padding:7px 12px;color:#111;font-size:13px;">${esc(skole)}</td></tr>` : ''}
    </table>
    <p style="font-size:13px;font-weight:700;color:#FF7B31;text-transform:uppercase;letter-spacing:.5px;margin:24px 0 4px;">Melding</p>
    <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 8px;white-space:pre-wrap;">${esc(melding)}</p>`

  let resendId = null, sendFeil = null
  try {
    const { data: sendData, error: rFeil } = await resend.emails.send({
      from: 'noreply@trivselsleder.no',
      to: 'post@trivselsleder.no',
      replyTo: epost,
      subject: `Ny henvendelse fra kontaktskjemaet: ${navn}`,
      html: epostMal({ overskrift: 'Ny henvendelse', brødtekst }),
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sendData?.id || null
  } catch (e) { sendFeil = e?.message || String(e) }

  await loggEpost(supabase, {
    type: 'kontaktskjema',
    mottaker_epost: 'post@trivselsleder.no',
    mottaker_navn: navn,
    status: sendFeil ? 'feil' : 'sendt',
    resend_id: resendId,
    feilmelding: sendFeil,
  })

  // Feilet utsendingen → meldingen er tapt (ingen base). Svar med feil så avsenderen kan
  // prøve igjen; frontenden viser ALDRI «takk» på annet enn 200.
  if (sendFeil) {
    return res.status(502).json({ error: 'Kunne ikke sende meldingen akkurat nå. Prøv igjen, eller send en e-post direkte til post@trivselsleder.no.' })
  }

  return res.status(200).json({ ok: true })
}
