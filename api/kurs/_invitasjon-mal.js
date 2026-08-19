import { epostMal } from '../_epost-mal.js'

// DELT e-postbygging for kursinvitasjoner.
//
// B9 (høring 17. aug) trengte «Send invitasjon på nytt» til én skole. Den e-posten
// skal se NØYAKTIG ut som førstegangsinvitasjonen. For å unngå to kopier som
// siger fra hverandre, bor selve byggingen her og gjenbrukes av send-paa-nytt.js.
//
// MERK: send-invitasjon.js (førstegangsutsendingen — den viktigste e-posten i
// systemet) har fortsatt sin egen innebygde kopi av denne logikken, med vilje
// urørt så den verifiserte kjerneflyten ikke risikeres. byggInvitasjonEpost her
// er en tro port av den. Samkjør de to i en senere opprydding (se byggelista).

export function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Bytt ut {plassholder} med verdier. Ukjente plassholdere står urørt.
export function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}

// En naken URL i malen blir klikkbar. Kjøres ETTER escapeHtml, så det som
// gjøres om til <a> er allerede ufarliggjort tekst — ingen ny injeksjonsvei.
export function lenkeggjor(escapet) {
  return escapet.replace(/https?:\/\/[^\s<)"]+/g, (url) =>
    `<a href="${url}" style="color:#106C75;">${url}</a>`)
}

// Ren tekst → HTML: tom linje = nytt avsnitt, enkel linjeskift = <br>.
export function tekstTilHtml(tekst) {
  const esc = lenkeggjor(escapeHtml(tekst))
  return esc
    .split(/\n[ \t]*\n/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Er en {plassholder} på en linje tom, fjernes HELE linja før utfylling.
export function fjernTommePlassholderLinjer(mal, verdier) {
  return String(mal || '')
    .split('\n')
    .filter(linje => {
      const tokens = linje.match(/\{(\w+)\}/g) || []
      return !tokens.some(t => {
        const nokkel = t.slice(1, -1)
        return nokkel in verdier && (verdier[nokkel] === '' || verdier[nokkel] == null)
      })
    })
    .join('\n')
}

// Bygg én ferdig kursinvitasjon (emne + HTML) for én skole på ett kurs.
//
// Innganger:
//   innst      – nøkkel→verdi fra innstillinger (avsender_navn/epost, svar_til_epost,
//                epost_invitasjon_emne/tekst, epost_vertskap_notat)
//   kurs       – { navn, dato, oppmote_vertskap, oppmote_ovrige }
//   hallNavn   – hallens navn (kan være '')
//   kobling    – kurs_skole-raden { er_vertskap, flyttet_fra_kurs, skoler:{navn} }
//   htla       – mottakeren invitasjonen sendes til { navn, epost, lenke_token }
//   nettstedUrl– ren base-URL (uten skråstrek til slutt)
//
// Returnerer { from, to, subject, html, replyTo, lenke } — klart for resend.emails.send.
export function byggInvitasjonEpost({ innst, kurs, hallNavn, kobling, htla, nettstedUrl }) {
  const from = `${innst.avsender_navn} <${innst.avsender_epost}>`
  const svarTilEpost = innst.svar_til_epost
  const emneMal = innst.epost_invitasjon_emne
  const tekstMal = innst.epost_invitasjon_tekst
  const vertskapNotat = innst.epost_vertskap_notat || ''

  const skoleNavn = kobling.skoler?.navn || '(ukjent skole)'
  const kursDato = formaterDato(kurs.dato)
  const lenke = `${nettstedUrl}/svar/${htla.lenke_token}`
  const kursinfoLenke = `${nettstedUrl}/kursinfo/${htla.lenke_token}`
  const oppmoteRaa = kobling.er_vertskap ? kurs.oppmote_vertskap : kurs.oppmote_ovrige

  const verdier = {
    skolenavn: skoleNavn,
    kursnavn: kurs.navn || '',
    kursdato: kursDato,
    hall: hallNavn,
    oppmotetid: oppmoteRaa ? String(oppmoteRaa).slice(0, 5) : '',
    vertskapsnotat: kobling.er_vertskap ? vertskapNotat : '',
    mottaker_navn: htla.navn || '',
    kursinfolenke: kursinfoLenke,
  }
  const emne = fyllPlassholdere(emneMal, verdier)
  const tekstUtenTomme = fjernTommePlassholderLinjer(tekstMal, verdier)
  // B4b: flyttet skole får en tydelig merknad øverst — automatisk, uten at malen endres.
  const flyttetFraHtml = kobling.flyttet_fra_kurs
    ? `<p style="font-size:15px;color:#B5560F;line-height:1.6;margin:0 0 16px;font-weight:600;">Merk: dere er flyttet hit fra ${escapeHtml(kobling.flyttet_fra_kurs)}. Denne invitasjonen gjelder det nye kurset — sjekk dato, hall og oppmøtetid under.</p>\n`
    : ''
  const html = epostMal({
    overskrift: `Invitasjon til kurs: ${escapeHtml(verdier.kursnavn)}`,
    brødtekst: flyttetFraHtml + tekstTilHtml(fyllPlassholdere(tekstUtenTomme, verdier)),
    knapptekst: 'Åpne svarskjemaet',
    knapplenke: lenke,
    fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet.',
  })

  return { from, to: htla.epost, subject: emne, html, replyTo: svarTilEpost || null, lenke }
}
