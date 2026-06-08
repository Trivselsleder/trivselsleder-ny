import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const ROLLE_LABEL = {
  skoleadmin:  'Skoleadmin (HTLA)',
  skoleansatt: 'TL-ansvarlig (TLA)',
}

function epostHtml(navn, rolle, skolenavn, inviteLenke) {
  const fornavn = navn.split(' ')[0]
  const rolletekst = ROLLE_LABEL[rolle] ?? rolle
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#F47920;padding:24px 32px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Trivselsleder</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 12px;">Velkommen til Trivselsleder!</h1>
      <p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">Hei ${fornavn},</p>
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Skolen din er registrert som Trivselsleder-skole.</p>
      <p style="font-size:14px;color:#444;margin:0 0 8px;">Skole: <strong>${skolenavn}</strong></p>
      <p style="font-size:14px;color:#444;margin:0 0 24px;">Din rolle: <strong>${rolletekst}</strong></p>
      <p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px;">
        Klikk på knappen nedenfor for å sette passord og aktivere kontoen din.
      </p>
      <a href="${inviteLenke}"
         style="display:inline-block;background:#F47920;color:#fff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
        Aktiver konto
      </a>
      <p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.6;">Lenken er gyldig i 24 timer.</p>
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
    <p style="font-size:12px;color:#aaa;text-align:center;padding:16px;">Trivselsleder · trivselsleder.no</p>
  </div>
</body>
</html>`
}

async function inviterEllerKnytt(supabase, { epost, navn, rolle, skoleId, skolenavn, origin }) {
  const { data: eksisterende } = await supabase
    .from('profiles')
    .select('id')
    .eq('epost', epost)
    .maybeSingle()

  if (eksisterende) {
    await supabase
      .from('bruker_skole')
      .upsert({ bruker_id: eksisterende.id, skole_id: skoleId, rolle }, { onConflict: 'bruker_id,skole_id' })
    return { status: 'eksisterer' }
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: epost,
    options: { redirectTo: `${origin}/sett-passord` },
  })
  if (error) return { status: 'feil', melding: error.message }

  const userId = data.user.id
  const inviteLenke = data.properties.action_link

  await supabase
    .from('profiles')
    .upsert({ id: userId, navn, rolle, epost, aktiv: true }, { onConflict: 'id' })

  await supabase
    .from('bruker_skole')
    .upsert({ bruker_id: userId, skole_id: skoleId, rolle }, { onConflict: 'bruker_id,skole_id' })

  const { error: epostFeil } = await resend.emails.send({
    from: 'noreply@trivselsleder.no',
    to: epost,
    subject: 'Velkommen til Trivselsleder – aktiver kontoen din',
    html: epostHtml(navn, rolle, skolenavn, inviteLenke),
  })
  if (epostFeil) console.error('Resend feil:', epostFeil)

  return { status: 'invitert' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    navn, orgNr, kommunenavn, fylke, type, status, ansvarlig,
    htlaNavn, htlaEpost,
    tlaNavn, tlaEpost,
  } = req.body

  if (!navn) return res.status(400).json({ error: 'Skolenavn er påkrevd.' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Bygg skole-objektet – upsert på org_nr hvis oppgitt, ellers vanlig insert
  const skoleData = {
    navn,
    ...(orgNr   ? { org_nr: orgNr }         : {}),
    ...(kommunenavn ? { kommunenavn }        : {}),
    ...(fylke   ? { fylke }                  : {}),
    ...(type    ? { type }                   : {}),
    ...(status  ? { status }                 : {}),
    ...(ansvarlig ? { ansvarlig }            : {}),
  }

  let skole
  if (orgNr) {
    const { data, error } = await supabase
      .from('skoler')
      .upsert(skoleData, { onConflict: 'org_nr' })
      .select('id, navn')
      .single()
    if (error) return res.status(500).json({ error: 'Kunne ikke opprette skole: ' + error.message })
    skole = data
  } else {
    const { data, error } = await supabase
      .from('skoler')
      .insert(skoleData)
      .select('id, navn')
      .single()
    if (error) return res.status(500).json({ error: 'Kunne ikke opprette skole: ' + error.message })
    skole = data
  }

  const origin = req.headers.origin || 'https://trivselsleder.no'
  const resultater = {}

  if (htlaEpost && htlaNavn) {
    resultater.htla = await inviterEllerKnytt(supabase, {
      epost:     htlaEpost,
      navn:      htlaNavn,
      rolle:     'skoleadmin',
      skoleId:   skole.id,
      skolenavn: skole.navn,
      origin,
    })
  }

  if (tlaEpost && tlaNavn) {
    resultater.tla = await inviterEllerKnytt(supabase, {
      epost:     tlaEpost,
      navn:      tlaNavn,
      rolle:     'skoleansatt',
      skoleId:   skole.id,
      skolenavn: skole.navn,
      origin,
    })
  }

  return res.status(200).json({ ok: true, skole, resultater })
}
