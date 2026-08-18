// Felles e-postmal for Trivselsleder.
// Gir den samme visuelle rammen (oransje topplinje, hvit kortboks, knapp, fot)
// som fire e-poster tidligere hadde hver sin identiske kopi av.
//
// Parametere (objekt):
//   overskrift  – tittel (h1) øverst i kortet
//   brødtekst   – HTML for selve innholdet (ett eller flere <p>-avsnitt)
//   knapptekst  – valgfri: tekst på knappen
//   knapplenke  – valgfri: URL knappen peker til (må følge med knapptekst)
//   fottekst    – valgfri: liten grå merknad nederst i kortet (over foten)
//   nettstedUrl – valgfri: domenet fotlenken skal peke til. Leses fra
//                 innstillinger (nettsted_url) av kallstedet. Uten verdi (eller
//                 med et ukjent domene) faller vi tilbake til den nye
//                 plattformen — ALDRI gamle trivselsleder.no.
const TILLATTE_FOT = [
  'https://trivselsleder.no',
  'https://www.trivselsleder.no',
  'https://trivselsleder-ny.vercel.app',
]
const FOT_FALLBACK = 'https://trivselsleder-ny.vercel.app'

export function epostMal({ overskrift, brødtekst, knapptekst, knapplenke, fottekst, nettstedUrl }) {
  // Fotlenken skal aldri kunne peke på et vilkårlig domene — samme forsvar som
  // for konto-lenkene. Ukjent/tom verdi → sikker fallback til ny plattform.
  const reinUrl = (nettstedUrl || '').trim().replace(/\/+$/, '')
  const fotUrl = TILLATTE_FOT.includes(reinUrl) ? reinUrl : FOT_FALLBACK
  const fotVist = fotUrl.replace(/^https?:\/\//, '')

  const knapp = (knapptekst && knapplenke)
    ? `<a href="${knapplenke}"
         style="display:inline-block;background:#FF7B31;color:#fff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:999px;text-decoration:none;">
        ${knapptekst}
      </a>`
    : ''

  const fot = fottekst
    ? `<p style="font-size:13px;color:#888;margin:24px 0 0;line-height:1.6;">${fottekst}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#FF7B31;padding:24px 32px;">
      <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Trivselsleder</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 12px;">${overskrift}</h1>
      ${brødtekst}
      ${knapp}
      ${fot}
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;">
    <p style="font-size:12px;color:#aaa;text-align:center;padding:16px;">Trivselsleder · <a href="${fotUrl}" style="color:#aaa;text-decoration:none;">${fotVist}</a></p>
  </div>
</body>
</html>`
}
