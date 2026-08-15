import { supabase } from './supabase'
import { hentMinSkole } from './skole'

// Webinar-modulen (v1). To publikum, én motor:
//  - internt (innlogget skole): hentKommendeWebinarer() via RLS
//  - offentlig (forside): hentOffentligeWebinarer() via SECURITY DEFINER-RPC
// Møtelenke eksponeres aldri i frontend — den sendes på e-post (beslutning 15. aug).

export const TYPE_ETIKETT = {
  nettverksmote: 'Nettverksmøte',
  ra_webinar: 'RA-webinar',
  intro_ekstern: 'Intro-webinar',
  opplaering: 'Opplæring',
}

// Kommende webinarer for innlogget skole (både interne og offentlige, publiserte).
export async function hentKommendeWebinarer() {
  const { data, error } = await supabase
    .from('webinarer')
    .select('id, tittel, beskrivelse, type, synlighet, starter_at, varighet_min, maks_antall, status')
    .eq('status', 'publisert')
    .gt('starter_at', new Date().toISOString())
    .order('starter_at', { ascending: true })
  if (error) throw error
  return data || []
}

// Kommende offentlige webinarer for forsiden/anonyme (uten møtelenke).
export async function hentOffentligeWebinarer() {
  const { data, error } = await supabase.rpc('hent_offentlige_webinarer')
  if (error) throw error
  return data || []
}

// Påmelding. skoleId hentes automatisk for innloggede interne påmeldinger.
export async function meldPaaWebinar({ webinarId, navn, epost, rolle = null, skoleId, nyhetsbrevSamtykke = false, intern = false }) {
  let sid = skoleId ?? null
  if (intern && !sid) {
    try { sid = await hentMinSkole() } catch { /* uinnlogget/ingen skole */ }
  }
  const { data, error } = await supabase.rpc('meld_paa_webinar', {
    p_webinar_id: webinarId,
    p_navn: navn,
    p_epost: epost,
    p_rolle: rolle,
    p_skole_id: sid,
    p_nyhetsbrev_samtykke: nyhetsbrevSamtykke,
  })
  if (error) throw error
  const rad = Array.isArray(data) ? data[0] : data

  // Fyr av bekreftelse-e-post (m/ møtelenke + .ics). Ikke-blokkerende: skjemaet
  // viser suksess uansett, og .ics kan lastes ned i nettleseren der og da.
  if (rad?.status === 'ok' && rad?.pamelding_id) {
    try {
      fetch('/api/webinar/send-bekreftelse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pameldingId: rad.pamelding_id }),
        keepalive: true, // overlever at brukeren navigerer bort rett etter påmelding
      }).catch(() => { /* stille — påmeldingen er lagret uansett */ })
    } catch { /* ignorer */ }
  }
  return rad || { status: 'ok' }
}

// ── Nedtelling ──────────────────────────────────────────────────────────────
// Returnerer visningstekst + «bli med nå»-modus (≤15 min før start, til slutt).
export function nedtelling(starterAt, naa = new Date(), varighetMin = 60) {
  const start = new Date(starterAt).getTime()
  const na = naa.getTime()
  const slutt = start + varighetMin * 60000
  const diff = start - na
  if (na >= slutt) return { status: 'ferdig', tekst: 'Avsluttet', bliMedNaa: false }
  if (diff <= 0) return { status: 'live', tekst: 'Pågår nå', bliMedNaa: true }
  if (diff <= 15 * 60000) return { status: 'snart', tekst: 'Starter straks', bliMedNaa: true }

  const min = Math.floor(diff / 60000)
  const dager = Math.floor(min / 1440)
  const timer = Math.floor((min % 1440) / 60)
  const rest = min % 60
  let tekst
  if (dager >= 1) tekst = `Om ${dager} ${dager === 1 ? 'dag' : 'dager'}${timer ? ` ${timer} t` : ''}`
  else if (timer >= 1) tekst = `Om ${timer} t ${rest} min`
  else tekst = `Om ${rest} min`
  return { status: 'kommer', tekst, bliMedNaa: false }
}

// ── Dato/tid ────────────────────────────────────────────────────────────────
export function datoLang(starterAt) {
  return new Date(starterAt).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
}
export function klokkeslett(starterAt) {
  return new Date(starterAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
}
// Kompakt dato-blokk til kort: { dag: '14', maaned: 'AUG', ukedag: 'tor' }
export function datoBlokk(starterAt) {
  const d = new Date(starterAt)
  return {
    dag: String(d.getDate()), // digit-only (unngå «14.» fra enkelte locale-ICU)
    maaned: d.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '').toUpperCase(),
    ukedag: d.toLocaleDateString('nb-NO', { weekday: 'short' }).replace('.', ''),
  }
}

// ── .ics-kalenderfil (client-side nedlasting) ──────────────────────────────
function icsDato(d) {
  // UTC-format uten skilletegn: 20260814T120000Z
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}
export function byggIcs(webinar) {
  const start = icsDato(webinar.starter_at)
  const slutt = icsDato(new Date(new Date(webinar.starter_at).getTime() + (webinar.varighet_min || 45) * 60000))
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\r\n|\r|\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//trivselsleder.no//webinar//NO',
    'BEGIN:VEVENT',
    `UID:webinar-${webinar.id}@trivselsleder.no`,
    `DTSTAMP:${icsDato(new Date())}`,   // obligatorisk i RFC 5545
    `DTSTART:${start}`, `DTEND:${slutt}`,
    `SUMMARY:${esc(webinar.tittel)}`,
    `DESCRIPTION:${esc(webinar.beskrivelse || 'Webinar fra Trivselsleder. Møtelenke kommer på e-post.')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}
export function lastNedIcs(webinar) {
  const blob = new Blob([byggIcs(webinar)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(webinar.tittel || 'webinar').replace(/[^\wæøåÆØÅ -]/g, '').slice(0, 40)}.ics`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
