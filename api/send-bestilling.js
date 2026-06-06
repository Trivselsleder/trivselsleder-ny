import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function internEpost({ skolenavn, antallKort, kontaktperson, epost, leveringsadresse, kortpris, porto, total, melding }) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><title>Ny Kulturkort-bestilling</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <div style="border-left:4px solid #F47920;padding-left:16px;margin-bottom:24px;">
    <h1 style="margin:0;font-size:22px;color:#F47920;">Ny Kulturkort-bestilling</h1>
    <p style="margin:4px 0 0;color:#666;">Fra ${escapeHtml(skolenavn)}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:15px;">
    <tr style="background:#f9f9f9;">
      <td style="padding:10px 12px;font-weight:600;width:180px;">Skolenavn</td>
      <td style="padding:10px 12px;">${escapeHtml(skolenavn)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;font-weight:600;">Antall kort</td>
      <td style="padding:10px 12px;">${escapeHtml(antallKort)}</td>
    </tr>
    <tr style="background:#f9f9f9;">
      <td style="padding:10px 12px;font-weight:600;">Kontaktperson</td>
      <td style="padding:10px 12px;">${escapeHtml(kontaktperson)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;font-weight:600;">E-post</td>
      <td style="padding:10px 12px;"><a href="mailto:${escapeHtml(epost)}" style="color:#F47920;">${escapeHtml(epost)}</a></td>
    </tr>
    <tr style="background:#f9f9f9;">
      <td style="padding:10px 12px;font-weight:600;">Leveringsadresse</td>
      <td style="padding:10px 12px;">${escapeHtml(leveringsadresse)}</td>
    </tr>
  </table>

  <div style="margin-top:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:#F47920;color:#fff;padding:10px 16px;font-weight:700;font-size:14px;">Prissammendrag</div>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr>
        <td style="padding:10px 16px;">Kortpris (${escapeHtml(antallKort)} stk × 40 kr)</td>
        <td style="padding:10px 16px;text-align:right;">${escapeHtml(String(kortpris))} kr</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:10px 16px;">Porto</td>
        <td style="padding:10px 16px;text-align:right;">${escapeHtml(String(porto))} kr</td>
      </tr>
      <tr style="border-top:2px solid #F47920;">
        <td style="padding:12px 16px;font-weight:700;">Totalpris (eks. mva)</td>
        <td style="padding:12px 16px;text-align:right;font-weight:700;color:#F47920;font-size:17px;">${escapeHtml(String(total))} kr</td>
      </tr>
    </table>
  </div>

  ${melding ? `<div style="margin-top:20px;padding:14px 16px;background:#f9f9f9;border-radius:8px;font-size:14px;"><strong>Tilleggsinfo:</strong><br>${escapeHtml(melding)}</div>` : ''}

  <p style="margin-top:24px;font-size:13px;color:#999;">Svar direkte på denne e-posten for å kontakte bestilleren.</p>
</body>
</html>`
}

function kundeBekreftelse({ kontaktperson, skolenavn, antallKort, leveringsadresse, kortpris, porto, total }) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><title>Bekreftelse på Kulturkort-bestilling</title></head>
<body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:48px;">🎉</div>
    <h1 style="font-size:24px;margin:8px 0 4px;">Takk for bestillingen, ${escapeHtml(kontaktperson)}!</h1>
    <p style="color:#666;margin:0;">Vi har mottatt din bestilling og behandler den så snart som mulig.</p>
  </div>

  <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <div style="background:linear-gradient(135deg,#F47920,#D6006E);color:#fff;padding:14px 20px;">
      <strong style="font-size:16px;">Ordresammendrag</strong>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr style="background:#f9f9f9;">
        <td style="padding:10px 16px;font-weight:600;">Skole</td>
        <td style="padding:10px 16px;">${escapeHtml(skolenavn)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-weight:600;">Antall Kulturkort</td>
        <td style="padding:10px 16px;">${escapeHtml(antallKort)} stk</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:10px 16px;font-weight:600;">Leveres til</td>
        <td style="padding:10px 16px;">${escapeHtml(leveringsadresse)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;">Kortpris</td>
        <td style="padding:10px 16px;">${escapeHtml(String(kortpris))} kr</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:10px 16px;">Porto</td>
        <td style="padding:10px 16px;">${escapeHtml(String(porto))} kr</td>
      </tr>
      <tr style="border-top:2px solid #F47920;">
        <td style="padding:12px 16px;font-weight:700;">Totalpris (eks. mva)</td>
        <td style="padding:12px 16px;font-weight:700;color:#F47920;font-size:17px;">${escapeHtml(String(total))} kr</td>
      </tr>
    </table>
  </div>

  <div style="background:#fff8f0;border:1px solid #F47920;border-radius:8px;padding:16px 20px;font-size:14px;color:#444;">
    <strong>Hva skjer nå?</strong>
    <ol style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
      <li>Vi kontrollerer bestillingen og sender deg en faktura</li>
      <li>Kortene pakkes og sendes til leveringsadressen</li>
      <li>Du mottar en e-post med sporingsinformasjon</li>
    </ol>
  </div>

  <p style="margin-top:24px;font-size:14px;color:#666;">
    Spørsmål? Ta kontakt på
    <a href="mailto:kulturkort@trivselsleder.no" style="color:#F47920;">kulturkort@trivselsleder.no</a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#aaa;text-align:center;">Trivselsleder · trivselsleder.no</p>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { skolenavn, antallKort, kontaktperson, epost, gate, postnummer, poststed, melding, kortpris, porto, total } = req.body

  if (!skolenavn || !antallKort || !kontaktperson || !epost || !gate || !postnummer || !poststed) {
    return res.status(400).json({ error: 'Mangler påkrevde felt' })
  }

  const leveringsadresse = `${gate}, ${postnummer} ${poststed}`
  const data = { skolenavn, antallKort, kontaktperson, epost, leveringsadresse, kortpris, porto, total, melding }

  try {
    await Promise.all([
      resend.emails.send({
        from: 'Kulturkort <noreply@trivselsleder.no>',
        to: ['kulturkort@trivselsleder.no'],
        replyTo: epost,
        subject: `Ny Kulturkort-bestilling fra ${skolenavn}`,
        html: internEpost(data),
      }),
      resend.emails.send({
        from: 'Kulturkort <noreply@trivselsleder.no>',
        to: [epost],
        subject: 'Bekreftelse på din Kulturkort-bestilling',
        html: kundeBekreftelse(data),
      }),
    ])

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Resend feil:', err)
    return res.status(500).json({ error: 'Kunne ikke sende e-post' })
  }
}
