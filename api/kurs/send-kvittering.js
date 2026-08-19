import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostMal } from '../_epost-mal.js'

// B6 (høring 17. aug): KVITTERINGSMAIL etter at skolen har sendt svaret sitt.
//
// Julies punkt: skoler som svarer JA mister lett kursinfoen i innboksen og
// sender mange «finner ikke igjen»-mail. Kvitteringen gir dem kurs, dato, hall
// og oppmøtetid — og en VARIG lenke til kursinformasjonssiden som virker når
// som helst.
//
// Kalles av svarskjemaet (SvarSkjema.jsx) rett etter et vellykket svar, med
// skolens egen token. ANONYM (ingen innlogging) — men trygg fordi:
//   - mottakeradressen hentes fra BASEN (skolens registrerte kontakt via token),
//     ALDRI fra forespørselen, så den kan ikke misbrukes til å spamme andre;
//   - stempelet kvittering_sendt_at gjør at den sendes maks én gang;
//   - nødbremsen (motor_aktiv) gjelder som all annen utsending (fail-closed).
//
// Sendes kun når skolen KOMMER (kommer=true) — det er da kursinfoen betyr noe.

const resend = new Resend(process.env.RESEND_API_KEY)

function formaterDato(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch { return iso }
}
function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const token = (req.body?.token || '').toString().trim()
  if (!token) return res.status(400).json({ error: 'Mangler token' })

  // ---- Innstillinger ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger').select('nokkel, verdi')
    .in('nokkel', ['avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv'])
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))
  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const svarTilEpost = innst.svar_til_epost
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()

  if (!avsenderEpost || !avsenderNavn || !nettstedUrl) {
    // Kvitteringen er en bonus — mangler oppsett, feil vi stille (svaret er alt lagret).
    return res.status(200).json({ sendt: false, grunn: 'mangler avsender/nettsted_url i innstillinger' })
  }
  // Nødbrems: ingen ekte e-post når motoren er av.
  if (motorAktiv === 'nei') {
    return res.status(200).json({ sendt: false, grunn: 'motor_aktiv=nei (nødbrems)' })
  }

  // ---- token → mottaker → kurs_skole → kurs ----
  const { data: mott } = await supabase
    .from('kurs_skole_mottaker')
    .select('id, navn, epost, kurs_skole_id')
    .eq('lenke_token', token).limit(1).maybeSingle()

  let ksId = mott?.kurs_skole_id || null
  if (!ksId) {
    // Skolen kan ha åpnet via kurs_skole.lenke_token (fallback, som i RPC-en).
    const { data: ks0 } = await supabase.from('kurs_skole').select('id').eq('lenke_token', token).maybeSingle()
    ksId = ks0?.id || null
  }
  if (!ksId) return res.status(200).json({ sendt: false, grunn: 'fant ikke svar-raden' })

  const { data: ks } = await supabase
    .from('kurs_skole')
    .select('id, kurs_id, kommer, er_vertskap, kvittering_sendt_at, skoler(navn, hktl_navn, hktl_epost)')
    .eq('id', ksId).maybeSingle()
  if (!ks) return res.status(200).json({ sendt: false, grunn: 'fant ikke svar-raden' })

  if (ks.kommer !== true) return res.status(200).json({ sendt: false, grunn: 'skolen kommer ikke — ingen kvittering' })
  if (ks.kvittering_sendt_at) return res.status(200).json({ sendt: false, grunn: 'kvittering allerede sendt' })

  const { data: kurs } = await supabase
    .from('kurs').select('id, navn, dato, hall_id, oppmote_vertskap, oppmote_ovrige').eq('id', ks.kurs_id).maybeSingle()
  if (!kurs) return res.status(200).json({ sendt: false, grunn: 'fant ikke kurset' })

  let hallNavn = ''
  if (kurs.hall_id) {
    const { data: hallRad } = await supabase.from('haller').select('navn').eq('id', kurs.hall_id).maybeSingle()
    hallNavn = hallRad?.navn || ''
  }

  // Mottaker: den som svarte (token-mottaker), fallback til skolens hovedkontakt.
  const mottakerEpost = gyldigEpost(mott?.epost) ? mott.epost.trim()
    : (gyldigEpost(ks.skoler?.hktl_epost) ? ks.skoler.hktl_epost.trim() : '')
  const mottakerNavn = mott?.navn || ks.skoler?.hktl_navn || ''
  if (!gyldigEpost(mottakerEpost)) return res.status(200).json({ sendt: false, grunn: 'ingen gyldig mottakeradresse' })

  const oppmoteRaa = ks.er_vertskap ? kurs.oppmote_vertskap : kurs.oppmote_ovrige
  const oppmotetid = oppmoteRaa ? String(oppmoteRaa).slice(0, 5) : ''
  const kursinfoLenke = `${nettstedUrl}/kursinfo/${token}`

  // ---- ATOMISK RESERVASJON: send kun én gang ----
  const tid = new Date().toISOString()
  const { data: reservert, error: reservFeil } = await supabase
    .from('kurs_skole').update({ kvittering_sendt_at: tid }).eq('id', ks.id).is('kvittering_sendt_at', null).select('id')
  if (reservFeil) return res.status(200).json({ sendt: false, grunn: 'kunne ikke reservere: ' + reservFeil.message })
  if (!reservert || reservert.length === 0) return res.status(200).json({ sendt: false, grunn: 'allerede sendt (reservert)' })

  const skoleNavn = ks.skoler?.navn || 'skolen'
  const from = `${avsenderNavn} <${avsenderEpost}>`
  const fakta = [
    `<strong>Kurs:</strong> ${escapeHtml(kurs.navn || '')}`,
    kurs.dato ? `<strong>Dato:</strong> ${escapeHtml(formaterDato(kurs.dato))}` : '',
    hallNavn ? `<strong>Hall:</strong> ${escapeHtml(hallNavn)}` : '',
    oppmotetid ? `<strong>Oppmøte:</strong> ${escapeHtml(oppmotetid)}` : '',
  ].filter(Boolean).map(l => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 6px;">${l}</p>`).join('\n')

  const brødtekst =
    `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">Takk! Vi har registrert svaret for ${escapeHtml(skoleNavn)}. Her er det viktigste om kursdagen:</p>\n` +
    fakta +
    `\n<p style="font-size:15px;color:#444;line-height:1.6;margin:16px 0 0;">All informasjon om dagen ligger på kursinformasjonssiden. Lenken er personlig for skolen deres og virker når som helst — så dere alltid finner den igjen.</p>`

  let resendId = null, sendFeil = null
  try {
    const { data: sendData, error: rFeil } = await resend.emails.send({
      from, to: mottakerEpost,
      subject: `Kvittering: ${kurs.navn || 'kurset'}${kurs.dato ? ' ' + formaterDato(kurs.dato) : ''}`,
      html: epostMal({
        overskrift: 'Takk for svaret',
        brødtekst,
        knapptekst: 'Åpne kursinformasjonen',
        knapplenke: kursinfoLenke,
        fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert.',
      }),
      ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sendData?.id || null
  } catch (e) { sendFeil = e?.message || String(e) }

  await supabase.from('epost_logg').insert({
    type: 'kvittering',
    mottaker_epost: mottakerEpost, mottaker_navn: mottakerNavn || null,
    kurs_skole_id: ks.id, kurs_skole_mottaker_id: mott?.id || null,
    status: sendFeil ? 'feil' : 'sendt', resend_id: resendId, feilmelding: sendFeil,
  })

  if (sendFeil) {
    // Frigi reservasjonen så kvitteringen kan forsøkes igjen ved neste innsending.
    await supabase.from('kurs_skole').update({ kvittering_sendt_at: null }).eq('id', ks.id)
    return res.status(200).json({ sendt: false, grunn: sendFeil })
  }

  return res.status(200).json({ sendt: true, mottaker: mottakerEpost })
}
