import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLLE_LABEL = {
  superadmin:  'Superadmin (Trivselsleder AS)',
  ansatt:      'Ansatt (Trivselsleder AS)',
  skoleadmin:  'Skoleadmin',
  skoleansatt: 'Skoleansatt',
}

function epostHtml(navn, rolle, skolenavn, inviteLenke) {
  const fornavn = navn.split(' ')[0]
  const rolletekst = ROLLE_LABEL[rolle] ?? rolle
  const skoletekst = skolenavn ? `<p style="font-size:14px;color:#444;margin:0 0 8px;">Skole: <strong>${skolenavn}</strong></p>` : ''
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#F47920;padding:24px 32px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Trivselsleder</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 12px;">Du er invitert til Trivselsleder</h1>
      <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">
        Hei ${fornavn},
      </p>
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Rolle: <strong>${rolletekst}</strong></p>
      ${skoletekst}
      <p style="font-size:14px;color:#444;line-height:1.6;margin:16px 0 24px;">
        Klikk på knappen nedenfor for å sette passord og aktivere kontoen din.
      </p>
      <a href="${inviteLenke}"
         style="display:inline-block;background:#F47920;color:#fff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
        Aktiver konto
      </a>
      <p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.6;">
        Lenken er gyldig i 24 timer.
      </p>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
    <p style="font-size:12px;color:#aaa;text-align:center;padding:16px;">Trivselsleder · trivselsleder.no</p>
  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { epost, navn, rolle, skoleId } = req.body
  if (!epost || !navn || !rolle) return res.status(400).json({ error: 'Mangler påkrevde felt.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verifiser at kallet kommer fra en innlogget bruker
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Ikke autentisert.' })
  const token = authHeader.slice(7)

  const { data: { user: caller } } = await supabase.auth.getUser(token)
  if (!caller) return res.status(401).json({ error: 'Ugyldig sesjon.' })

  const { data: callerProfil } = await supabase
    .from('profiles')
    .select('rolle')
    .eq('id', caller.id)
    .single()

  const callerRolle = callerProfil?.rolle

  if (!['superadmin', 'ansatt', 'skoleadmin'].includes(callerRolle)) {
    return res.status(403).json({ error: 'Ingen tilgang.' })
  }

  // Skoleadmin kan kun invitere til sin egen skole, og kun skolerolle
  if (callerRolle === 'skoleadmin') {
    if (!['skoleadmin', 'skoleansatt'].includes(rolle)) {
      return res.status(403).json({ error: 'Du kan bare invitere skoleadmin eller skoleansatt.' })
    }
    if (!skoleId) return res.status(400).json({ error: 'Skole er påkrevd.' })
    const { data: tilgang } = await supabase
      .from('bruker_skole')
      .select('skole_id')
      .eq('bruker_id', caller.id)
      .eq('skole_id', skoleId)
      .maybeSingle()
    if (!tilgang) return res.status(403).json({ error: 'Du har ikke tilgang til denne skolen.' })
  }

  const origin = req.headers.origin || 'https://trivselsleder.no'

  // Generer invitasjonslenke uten at Supabase sender e-post
  const { data, error: linkFeil } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: epost,
    options: { redirectTo: `${origin}/sett-passord` },
  })
  if (linkFeil) return res.status(500).json({ error: linkFeil.message })

  const userId = data.user.id
  const inviteLenke = data.properties.action_link

  // Opprett profil
  const { error: profilFeil } = await supabase
    .from('profiles')
    .upsert({ id: userId, navn, rolle, epost, aktiv: true }, { onConflict: 'id' })
  if (profilFeil) return res.status(500).json({ error: profilFeil.message })

  // Knytt til skole hvis oppgitt
  let skolenavn = null
  if (skoleId) {
    const skoleRolle = ['skoleadmin', 'skoleansatt'].includes(rolle) ? rolle : 'skoleansatt'
    await supabase
      .from('bruker_skole')
      .upsert({ bruker_id: userId, skole_id: skoleId, rolle: skoleRolle }, { onConflict: 'bruker_id,skole_id' })

    const { data: skole } = await supabase.from('skoler').select('navn').eq('id', skoleId).single()
    skolenavn = skole?.navn ?? null
  }

  // Send branded e-post via Resend
  const { error: epostFeil } = await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: epost,
    subject: 'Invitasjon til Trivselsleder',
    html: epostHtml(navn, rolle, skolenavn, inviteLenke),
  })
  if (epostFeil) console.error('Resend feil:', epostFeil)

  return res.status(200).json({ ok: true })
}
