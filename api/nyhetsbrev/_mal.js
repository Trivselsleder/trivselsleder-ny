// E-postmal for NYHETSBREV/BROADCASTS (Bruk A: webinar-oppfølging).
//
// Egen mal (ikke epostMal fra _epost-mal.js) fordi nyhetsbrev har LOVPÅLAGT
// bunntekst: hvorfor mottakeren får e-posten, personlig avmeldingslenke og
// personvernlenke. Rammen (oransje topplinje, hvitt kort, rund knapp) speiler
// den eksisterende Resend-malen, så alt fra Trivselsleder ser likt ut.
//
// STRUKTUREN er inspirert av Storebrands webinar-oppfølging (20. aug 2026):
//   1) varm takk-topp   2) «gikk du glipp / se igjen»-blokk (samme mail virker
//   for både deltakere og de som ikke kom)   3) opptak + kommende webinarer
//   4) kort «spørsmål?»   5) tydelig bunn med grunnlag + avmelding + personvern.
// Det VISUELLE er Trivselsleders eget (grafisk identitet v2):
//   oransje #FF7B31 · petrol #106C75 · lys teal #54A1AB · grå #EBEBED.
//
// Avmeldingslenken: kallstedet sender inn enten den bokstavelige flettekoden
// {{{contact.avmelding_url}}} (Resend Broadcasts fletter per mottaker) eller en
// eksempel-URL for forhåndsvisning i admin.

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function norskDato(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('nb-NO', {
    timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long',
  })
}

const P = 'font-size:15px;color:#333;line-height:1.65;margin:0 0 14px;'

// Emneforslag — dobbel vinkling: virker både som takk og som «gikk du glipp?».
export function brukAEmne(webinar, opptakLenke) {
  return opptakLenke
    ? `Takk for denne gangen — her er opptaket av «${webinar.tittel}»`
    : `Takk for denne gangen — webinaret «${webinar.tittel}»`
}

// Bygger hele e-posten for Bruk A. Returnerer HTML-strengen.
export function brukAHtml({ webinar, opptakLenke, nettsted, avmeldingUrl }) {
  const dato = norskDato(webinar.starter_at)

  // Opptaksseksjonen utelates i sin helhet når lenken (ennå) mangler —
  // webinar-modulens opptaksdel kommer i V1.1.
  const opptakBlokk = opptakLenke ? `
      <div style="background:#EBEBED;border-radius:12px;padding:22px 24px;margin:6px 0 22px;">
        <h2 style="font-size:17px;font-weight:700;color:#106C75;margin:0 0 8px;">Gikk du glipp av webinaret — eller vil du se det igjen?</h2>
        <p style="${P}">Ingen fare: hele webinaret ligger klart som opptak. Se det når det passer deg, eller del det med en kollega som ikke fikk vært med.</p>
        <a href="${esc(opptakLenke)}"
           style="display:inline-block;background:#FF7B31;color:#ffffff;font-size:15px;font-weight:600;padding:12px 26px;border-radius:999px;text-decoration:none;">
          Se opptaket
        </a>
      </div>` : ''

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Avenir Next',Avenir,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#FF7B31;padding:24px 32px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px;">Trivselsleder</span>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:22px;font-weight:800;color:#106C75;margin:0 0 12px;">Takk for at du ble med!</h1>
      <p style="${P}">Hei,</p>
      <p style="${P}">Vi håper du fikk nyttige idéer og konkret inspirasjon fra webinaret <b>«${esc(webinar.tittel)}»</b>${dato ? ` ${esc(dato)}` : ''}. Det er alltid like kjekt å møte dere som står i skolegården og får trivselsarbeidet til å skje.</p>
      ${opptakBlokk}
      <h2 style="font-size:16px;font-weight:700;color:#106C75;margin:0 0 6px;">Vil du få med deg neste webinar?</h2>
      <p style="${P}">Vi samler alle kommende webinarer og nettverksmøter på én side, sammen med informasjon om påmelding. <a href="${esc(nettsted)}/webinarer" style="color:#106C75;font-weight:600;">Se hva som kommer&nbsp;→</a></p>
      <h2 style="font-size:16px;font-weight:700;color:#106C75;margin:18px 0 6px;">Spørsmål?</h2>
      <p style="font-size:15px;color:#333;line-height:1.65;margin:0;">Svar gjerne direkte på denne e-posten, så hjelper vi deg. Vi setter også stor pris på innspill til temaer for kommende webinarer.</p>
    </div>
    <div style="background:#106C75;padding:24px 32px;">
      <p style="font-size:12.5px;color:#ffffff;line-height:1.7;margin:0 0 10px;opacity:.95;">
        Du får denne e-posten fordi du er registrert som kontaktperson for Trivselsleder-programmet på din skole.
        Ønsker du ikke slike e-poster fra oss, kan du <a href="${avmeldingUrl}" style="color:#ffffff;text-decoration:underline;">melde deg av her</a> — da stopper alle framtidige utsendinger umiddelbart.
      </p>
      <p style="font-size:12.5px;color:#ffffff;line-height:1.7;margin:0;opacity:.95;">
        <a href="${esc(nettsted)}/personvern" style="color:#ffffff;text-decoration:underline;">Les om personvern</a>
        &nbsp;·&nbsp; <a href="${esc(nettsted)}" style="color:#ffffff;text-decoration:underline;">trivselsleder.no</a>
        &nbsp;·&nbsp; Trivselsleder AS
      </p>
    </div>
  </div>
</body>
</html>`
}
