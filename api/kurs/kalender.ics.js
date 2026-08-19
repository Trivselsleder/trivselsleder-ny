import { createClient } from '@supabase/supabase-js'

// C2 (høring): kalender-feed (.ics) via token-lenke.
//
// Filnavnet gir ruta /api/kurs/kalender.ics — en abonnements-URL kalenderapper
// (Google/Apple/Outlook) kan legge til. INGEN innlogging: selve tokenen er nøkkelen.
//   ?token=<profiles.kalender_token>     → RA-feed: kurs i RA-ens nettverk
//   ?token=<kursholdere.kalender_token>  → kursholder-feed: kurs de skal holde
//   ?token=<kalender_alle_token>         → alle kurs
// Ukjent/mangler token → 404/400. Vi legger ALDRI persondata i feeden (kun kurs,
// dato, tid, hall, nettverk).

// ---- .ics-hjelpere ----
function esc(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}
function pad(n) { return String(n).padStart(2, '0') }
function dtstampUTC(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
function datoKompakt(dato) { return String(dato).slice(0, 10).replace(/-/g, '') } // YYYYMMDD
function tidKompakt(t) { return String(t || '').slice(0, 8).replace(/:/g, '').padEnd(6, '0') } // HHMMSS
function nesteDagKompakt(dato) {
  const d = new Date(String(dato).slice(0, 10) + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

export default async function handler(req, res) {
  const token = (req.query?.token || '').toString().trim()
  if (!token) { res.status(400).send('Mangler token.'); return }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- Løs opp tokenen: alle → RA → kursholder ----
  let modus = null, kalendernavn = 'Trivselsleder'
  let kursQuery = null

  const { data: alle } = await supabase
    .from('innstillinger').select('verdi').eq('nokkel', 'kalender_alle_token').maybeSingle()
  if (alle?.verdi && alle.verdi === token) {
    modus = 'alle'; kalendernavn = 'Alle kurs · Trivselsleder'
  }

  if (!modus) {
    const { data: prof } = await supabase
      .from('profiles').select('id, navn').eq('kalender_token', token).maybeSingle()
    if (prof?.id) {
      modus = 'ra'; kalendernavn = 'Mine kurs · Trivselsleder'
      const { data: nettv } = await supabase
        .from('nettverk_ansvarlig').select('nettverk').eq('bruker_id', prof.id).range(0, 9999)
      const nettverk = [...new Set((nettv || []).map(n => n.nettverk).filter(Boolean))]
      kursQuery = nettverk.length === 0 ? { tomt: true } : { nettverkIn: nettverk }
    }
  }

  if (!modus) {
    const { data: kh } = await supabase
      .from('kursholdere').select('id, navn').eq('kalender_token', token).maybeSingle()
    if (kh?.id) {
      modus = 'kursholder'; kalendernavn = `${kh.navn || 'Kursholder'} · Trivselsleder`
      kursQuery = { holder: kh.id }
    }
  }

  if (!modus) { res.status(404).send('Ukjent kalender-lenke.'); return }

  // ---- Hent kursene for feeden ----
  let kurs = []
  if (modus !== 'alle' && kursQuery?.tomt) {
    kurs = []
  } else {
    let q = supabase.from('kurs')
      .select('id, navn, dato, start_tid, slutt_tid, hall_id, nettverk, kursholder_id, backup_kursholder_id')
      .not('dato', 'is', null).range(0, 9999)
    if (kursQuery?.nettverkIn) q = q.in('nettverk', kursQuery.nettverkIn)
    if (kursQuery?.holder) q = q.or(`kursholder_id.eq.${kursQuery.holder},backup_kursholder_id.eq.${kursQuery.holder}`)
    const { data } = await q
    kurs = data || []
  }

  // Haller for LOCATION
  const hallIder = [...new Set(kurs.map(k => k.hall_id).filter(Boolean))]
  let hallMap = {}
  if (hallIder.length > 0) {
    const { data: haller } = await supabase.from('haller').select('id, navn').in('id', hallIder)
    hallMap = Object.fromEntries((haller || []).map(h => [h.id, h.navn]))
  }

  // ---- Bygg .ics ----
  const naa = dtstampUTC(new Date())
  const linjer = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trivselsleder//Kursplanlegger//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(kalendernavn)}`,
    'X-WR-TIMEZONE:Europe/Oslo',
  ]
  for (const k of kurs) {
    const hall = k.hall_id ? (hallMap[k.hall_id] || '') : ''
    const sammendrag = k.navn || 'Lekekurs'
    const beskr = [k.nettverk ? `Nettverk: ${k.nettverk}` : '', hall ? `Hall: ${hall}` : ''].filter(Boolean).join('\n')
    linjer.push('BEGIN:VEVENT')
    linjer.push(`UID:kurs-${k.id}@trivselsleder-ny`)
    linjer.push(`DTSTAMP:${naa}`)
    if (k.start_tid) {
      // Flytende lokaltid (Europe/Oslo hos norske brukere) — ingen VTIMEZONE nødvendig.
      linjer.push(`DTSTART:${datoKompakt(k.dato)}T${tidKompakt(k.start_tid)}`)
      if (k.slutt_tid) linjer.push(`DTEND:${datoKompakt(k.dato)}T${tidKompakt(k.slutt_tid)}`)
      else linjer.push('DURATION:PT2H')
    } else {
      // Heldags
      linjer.push(`DTSTART;VALUE=DATE:${datoKompakt(k.dato)}`)
      linjer.push(`DTEND;VALUE=DATE:${nesteDagKompakt(k.dato)}`)
    }
    linjer.push(`SUMMARY:${esc(sammendrag)}`)
    if (hall) linjer.push(`LOCATION:${esc(hall)}`)
    if (beskr) linjer.push(`DESCRIPTION:${esc(beskr)}`)
    linjer.push('END:VEVENT')
  }
  linjer.push('END:VCALENDAR')

  const ics = linjer.join('\r\n') + '\r\n'
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="trivselsleder.ics"')
  res.setHeader('Cache-Control', 'public, max-age=900') // 15 min
  res.status(200).send(ics)
}
