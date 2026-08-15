// Felles bygg for webinar-e-post: .ics-vedlegg + HTML for bekreftelse og påminnelser.
// Bruker den felles epostMal-rammen. Møtelenke legges KUN i e-post (aldri i frontend).
import { epostMal } from './_epost-mal.js'

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Dato/tid i norsk tid (Vercel kjører UTC).
export function norskDatoTid(iso) {
  const d = new Date(iso)
  const dato = d.toLocaleDateString('nb-NO', { timeZone: 'Europe/Oslo', weekday: 'long', day: 'numeric', month: 'long' })
  const tid = d.toLocaleTimeString('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit' })
  return { dato, tid }
}

// .ics — UTC-tider uten skilletegn. Returnerer rå tekst.
function icsTid(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
export function byggIcs(webinar) {
  const start = icsTid(webinar.starter_at)
  const slutt = icsTid(new Date(new Date(webinar.starter_at).getTime() + (webinar.varighet_min || 45) * 60000))
  const escIcs = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\r\n|\r|\n/g, '\\n')
  const escUrl = (s) => String(s || '').replace(/\r\n|\r|\n/g, '') // URI-verdier skal ikke tekst-escapes (komma/semikolon)
  const linjer = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//trivselsleder.no//webinar//NO', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:webinar-${webinar.id}@trivselsleder.no`,
    `DTSTAMP:${icsTid(new Date())}`,   // obligatorisk i RFC 5545 (Outlook avviser uten)
    `DTSTART:${start}`, `DTEND:${slutt}`,
    `SUMMARY:${escIcs(webinar.tittel)}`,
    webinar.mote_lenke ? `URL:${escUrl(webinar.mote_lenke)}` : '',
    `DESCRIPTION:${escIcs([webinar.beskrivelse, webinar.mote_lenke ? `Møtelenke: ${webinar.mote_lenke}` : ''].filter(Boolean).join('\n\n'))}`,
    webinar.mote_lenke ? `LOCATION:${escUrl(webinar.mote_lenke)}` : '',
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean)
  return linjer.join('\r\n')
}
export function icsVedlegg(webinar) {
  return { filename: 'webinar.ics', content: Buffer.from(byggIcs(webinar), 'utf-8').toString('base64') }
}

// Bekreftelse ved påmelding — inkl. møtelenke-knapp.
export function bekreftelseEpost(webinar, { navn } = {}) {
  const { dato, tid } = norskDatoTid(webinar.starter_at)
  const hilsen = navn ? `Hei ${esc(navn)},` : 'Hei,'
  const brødtekst = `
    <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">${hilsen}</p>
    <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">
      Takk for påmeldingen til <b>${esc(webinar.tittel)}</b>.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 4px;"><b>Når:</b> ${esc(dato)} kl. ${esc(tid)} (${webinar.varighet_min || 45} min)</p>
    <p style="font-size:14px;color:#666;line-height:1.6;margin:0 0 20px;">Legg det gjerne i kalenderen din med vedlegget i denne e-posten. Vi sender en påminnelse dagen før.</p>`
  return {
    subject: `Påmeldt: ${webinar.tittel}`,
    html: epostMal({
      overskrift: 'Du er påmeldt 🎉',
      brødtekst,
      knapptekst: webinar.mote_lenke ? 'Åpne møtelenken' : undefined,
      knapplenke: webinar.mote_lenke || undefined,
      fottekst: 'Fikk du denne uten å melde deg på? Da kan du se bort fra den.',
    }),
  }
}

// Påminnelse. variant: '24t' (dagen før, m/ lenke) eller '1t' (rett før, kort).
export function paaminnelseEpost(webinar, { navn, variant } = {}) {
  const { dato, tid } = norskDatoTid(webinar.starter_at)
  const hilsen = navn ? `Hei ${esc(navn)},` : 'Hei,'
  if (variant === '1t') {
    return {
      subject: `Starter snart: ${webinar.tittel}`,
      html: epostMal({
        overskrift: 'Vi starter om litt',
        brødtekst: `
          <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">${hilsen}</p>
          <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 20px;">
            <b>${esc(webinar.tittel)}</b> starter kl. ${esc(tid)}. Klikk deg inn når du er klar.
          </p>`,
        knapptekst: webinar.mote_lenke ? 'Bli med nå' : undefined,
        knapplenke: webinar.mote_lenke || undefined,
      }),
    }
  }
  return {
    subject: `I morgen: ${webinar.tittel}`,
    html: epostMal({
      overskrift: 'Påminnelse om webinaret',
      brødtekst: `
        <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">${hilsen}</p>
        <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 4px;">
          Dette er en påminnelse om <b>${esc(webinar.tittel)}</b>.
        </p>
        <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 20px;"><b>Når:</b> ${esc(dato)} kl. ${esc(tid)}</p>`,
      knapptekst: webinar.mote_lenke ? 'Åpne møtelenken' : undefined,
      knapplenke: webinar.mote_lenke || undefined,
    }),
  }
}
