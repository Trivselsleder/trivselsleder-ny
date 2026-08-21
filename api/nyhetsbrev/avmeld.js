// AVMELDING fra nyhetsbrev/Broadcasts — den lovpålagte kjernen, felles for alle
// bruksområdene (A/B/C).
//
// Flyt: hver utsending inneholder en personlig, ugjettbar lenke
//   {nettsted}/api/nyhetsbrev/avmeld?t=<avmelding_token>
// GET  → viser en liten bekreftelsesside med én knapp (skjer med POST).
//        (Én-klikks GET ville latt e-postskannere melde folk av ved uhell —
//        lenkeskannere følger GET, men sender ikke skjema.)
// POST → setter avmeldt_at i nyhetsbrev_mottakere + melder kontakten av hos
//        Resend (belte + bukseseler). Deretter er mottakeren umiddelbart ute av
//        alle framtidige utsendinger: mottakeruttrekket filtrerer på avmeldt_at,
//        og Resend holder selv avmeldte utenfor Broadcasts.
//
// Endepunktet er åpent (ingen innlogging — mottakere er ikke brukere). Tokenet
// ER autorisasjonen. Kjører med service-nøkkel; basen har ingen anon-tilgang.

import { createClient } from '@supabase/supabase-js'
import { avmeldKontakt } from './_resend.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// FABLE-KONTROLL 20. aug: e-postadressen kommer fra basen og vises i HTML.
// Basens epost-check tillater tegn som < og > (bare @ og mellomrom er forbudt),
// så adressen HTML-escapes før visning — ellers var dette et XSS-hull.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function side({ tittel, tekst, knapp }) {
  return `<!DOCTYPE html>
<html lang="no"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${tittel} – Trivselsleder</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Avenir Next',Avenir,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:60px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <div style="background:#FF7B31;padding:20px 28px;"><span style="color:#fff;font-size:18px;font-weight:700;">Trivselsleder</span></div>
    <div style="padding:28px;">
      <h1 style="font-size:20px;font-weight:800;color:#106C75;margin:0 0 10px;">${tittel}</h1>
      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 18px;">${tekst}</p>
      ${knapp || ''}
    </div>
  </div>
</body></html>`
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  const token = ((req.method === 'POST' ? req.body?.t : req.query?.t) || '').toString().trim()

  if (!UUID.test(token)) {
    return res.status(200).send(side({
      tittel: 'Lenken er ikke gyldig',
      tekst: 'Avmeldingslenken mangler eller er ufullstendig. Svar på e-posten du fikk fra oss og skriv at du vil meldes av, så ordner vi det manuelt med en gang.',
    }))
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: mottaker, error } = await supabase
    .from('nyhetsbrev_mottakere')
    .select('id, epost, avmeldt_at')
    .eq('avmelding_token', token)
    .maybeSingle()

  if (error) {
    return res.status(200).send(side({
      tittel: 'Noe gikk galt',
      tekst: 'Vi fikk ikke kontakt med systemet akkurat nå. Prøv igjen om et øyeblikk, eller svar på e-posten du fikk, så melder vi deg av manuelt.',
    }))
  }
  if (!mottaker) {
    return res.status(200).send(side({
      tittel: 'Fant ikke lenken',
      tekst: 'Denne avmeldingslenken kjenner vi ikke igjen. Svar på e-posten du fikk fra oss, så melder vi deg av manuelt.',
    }))
  }

  if (mottaker.avmeldt_at) {
    return res.status(200).send(side({
      tittel: 'Du er allerede avmeldt',
      tekst: `${esc(mottaker.epost)} står ikke lenger på lista vår, og du får ingen flere nyhetsbrev fra oss. Ombestemmer du deg, er det bare å svare på en tidligere e-post.`,
    }))
  }

  // GET: vis bekreftelsesknapp (skannervern). POST: utfør.
  if (req.method !== 'POST') {
    return res.status(200).send(side({
      tittel: 'Melde deg av?',
      tekst: `Trykk på knappen for å stoppe alle framtidige nyhetsbrev og utsendinger til <b>${esc(mottaker.epost)}</b>.`,
      knapp: `<form method="POST" action="/api/nyhetsbrev/avmeld" style="margin:0;">
        <input type="hidden" name="t" value="${token}">
        <button type="submit" style="background:#FF7B31;color:#fff;font-size:15px;font-weight:600;padding:12px 26px;border-radius:999px;border:none;cursor:pointer;">Meld meg av</button>
      </form>`,
    }))
  }

  const { error: oppdFeil } = await supabase
    .from('nyhetsbrev_mottakere')
    .update({ avmeldt_at: new Date().toISOString(), endret_at: new Date().toISOString() })
    .eq('id', mottaker.id)
  if (oppdFeil) {
    return res.status(200).send(side({
      tittel: 'Noe gikk galt',
      tekst: 'Avmeldingen ble ikke registrert. Prøv igjen, eller svar på e-posten du fikk, så melder vi deg av manuelt.',
    }))
  }

  // Belte + bukseseler: meld også av hos Resend. Feiler dette er mottakeren
  // LIKEVEL trygt ute (uttrekket filtrerer på avmeldt_at) — bare logg.
  try { await avmeldKontakt(mottaker.epost) }
  catch (e) { console.error('avmeld: Resend-avmelding feilet (ikke-kritisk):', e?.message) }

  return res.status(200).send(side({
    tittel: 'Du er nå avmeldt',
    tekst: `Det er registrert: ${esc(mottaker.epost)} får ingen flere nyhetsbrev eller masseutsendinger fra oss. Takk for tiden du var med — og døra står alltid åpen om du vil tilbake.`,
  }))
}
