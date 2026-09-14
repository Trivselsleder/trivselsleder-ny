import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostMal } from '../_epost-mal.js'
import { trygFallbackOrigin } from '../_vakt.js'
import { krevMotorAktiv, loggEpost } from '../_epost.js'

const resend = new Resend(process.env.RESEND_API_KEY)

function epostHtml(resetLenke, nettstedUrl) {
  return epostMal({
    overskrift: 'Tilbakestill passordet ditt',
    brødtekst: `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">
        Vi mottok en forespørsel om å tilbakestille passordet til denne kontoen.
        Klikk på knappen nedenfor for å velge et nytt passord.
      </p>`,
    knapptekst: 'Sett nytt passord',
    knapplenke: resetLenke,
    fottekst: 'Lenken er gyldig i 24 timer. Hvis du ikke ba om dette, kan du ignorere denne e-posten — passordet ditt forblir uendret.',
    nettstedUrl,
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { epost } = req.body
  if (!epost) return res.status(400).json({ error: 'Mangler e-post' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Kun kjente adresser godtas — se trygtOrigin i api/_vakt.js.
  const origin = await trygFallbackOrigin(req, supabase)

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: epost,
    options: { redirectTo: `${origin}/sett-passord` },
  })

  if (error) {
    // Ikke avslør om e-postadressen finnes — alltid svar OK til bruker
    console.error('generateLink feil:', error.message)
    return res.status(200).json({ ok: true })
  }

  const resetLenke = data.properties.action_link

  // Nødbrems (fail-closed): ingen ekte e-post når bremsen er av. Vi svarer fortsatt 200 (samme svar
  // uansett), så bremsen avslører ikke om e-postadressen finnes.
  const brems = await krevMotorAktiv(supabase)
  if (brems) {
    console.warn('[glemt-passord] motor_aktiv stengt — reset-e-post ikke sendt')
    return res.status(200).json({ ok: true })
  }

  let resendId = null, sendFeil = null
  try {
    const { data: sendData, error: rFeil } = await resend.emails.send({
      from: 'noreply@trivselsleder.no',
      to: epost,
      subject: 'Tilbakestill passordet ditt – Trivselsleder',
      html: epostHtml(resetLenke, origin),
    })
    if (rFeil) sendFeil = rFeil.message || String(rFeil)
    else resendId = sendData?.id || null
  } catch (e) { sendFeil = e?.message || String(e) }
  if (sendFeil) console.error('Resend feil:', sendFeil)

  await loggEpost(supabase, {
    type: 'passord_reset',
    mottaker_epost: epost,
    status: sendFeil ? 'feil' : 'sendt',
    resend_id: resendId,
    feilmelding: sendFeil,
  })

  return res.status(200).json({ ok: true })
}
