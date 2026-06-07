import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

function epostHtml(resetLenke) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#F47920;padding:24px 32px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Trivselsleder</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 12px;">Tilbakestill passordet ditt</h1>
      <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 24px;">
        Vi mottok en forespørsel om å tilbakestille passordet til denne kontoen.
        Klikk på knappen nedenfor for å velge et nytt passord.
      </p>
      <a href="${resetLenke}"
         style="display:inline-block;background:#F47920;color:#fff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
        Sett nytt passord
      </a>
      <p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.6;">
        Lenken er gyldig i 24 timer. Hvis du ikke ba om dette, kan du ignorere denne e-posten —
        passordet ditt forblir uendret.
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

  const { epost } = req.body
  if (!epost) return res.status(400).json({ error: 'Mangler e-post' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const origin = req.headers.origin || 'https://trivselsleder.no'

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

  await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: epost,
    subject: 'Tilbakestill passordet ditt – Trivselsleder',
    html: epostHtml(resetLenke),
  })

  return res.status(200).json({ ok: true })
}
