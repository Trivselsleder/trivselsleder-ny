import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

function velkomstEpost(navn) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#F47920;padding:24px 32px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Trivselsleder</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 12px;">Velkommen, ${navn}!</h1>
      <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">
        Kontoen din er nå opprettet. Du kan logge inn og ta i bruk Trivselsleder-portalen.
      </p>
      <a href="https://trivselsleder.no/logg-inn"
         style="display:inline-block;background:#F47920;color:#fff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
        Gå til portalen
      </a>
      <p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.6;">
        Har du spørsmål? Ta kontakt på
        <a href="mailto:post@trivselsleder.no" style="color:#F47920;">post@trivselsleder.no</a>
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

  const { navn, epost, passord } = req.body
  if (!navn || !epost || !passord) return res.status(400).json({ error: 'Mangler påkrevde felter' })
  if (passord.length < 8) return res.status(400).json({ error: 'Passordet må være minst 8 tegn' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: epost,
    password: passord,
    email_confirm: true,
    user_metadata: { navn },
  })

  if (createError) {
    const duplikat = createError.message.toLowerCase().includes('already')
    return res.status(duplikat ? 409 : 500).json({
      error: duplikat ? 'Det finnes allerede en konto med denne e-postadressen.' : 'Kunne ikke opprette konto.',
    })
  }

  const { error: profilError } = await supabase
    .from('profiles')
    .insert({ id: userData.user.id, navn, rolle: 'ansatt' })

  if (profilError) {
    console.error('Profil-insert feil:', profilError.message)
    // Bruker er opprettet, men profil feilet — slett bruker for å unngå inkonsistens
    await supabase.auth.admin.deleteUser(userData.user.id)
    return res.status(500).json({ error: 'Kunne ikke opprette brukerprofil.' })
  }

  await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: epost,
    subject: `Velkommen til Trivselsleder, ${navn}!`,
    html: velkomstEpost(navn),
  })

  return res.status(200).json({ ok: true })
}
