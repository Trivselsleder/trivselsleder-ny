import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'
import { norskDatoTid } from '../_webinar-epost.js'

// Inviter et segment til et webinar. Kun ansatt. Gjenbruker e-postmotorens vern:
// tørrkjøring standard, motor_aktiv nødbrems, atomisk reservasjon (unik indeks på
// webinar_invitasjon) → send → rull tilbake ved feil, én epost_logg-rad per forsøk.
//
// Segmenter:
//   { type:'nettverk', nettverk:'<navn>' } — aktive skoler i ett nettverk
//   { type:'alle_aktive' }                 — alle aktive skoler (kunder)
//   { type:'prospekt' }                    — potensielle skoler (EKSTERN) — QA-sperret
//
// EKSTERN utsending (prospekt) er BLOKKERT til innstillingen rektorliste_qa_ok='ja'
// (kap. 17.2: rektorlista må kvalitetssikres manuelt før første utsending).

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
// hktl → htla → rektor (samme fallback-kjede som src/lib/mottaker.js)
function finnMottaker(s) {
  const v = (f) => (s?.[f] || '').trim()
  if (v('hktl_epost')) return { epost: v('hktl_epost'), navn: v('hktl_navn') }
  if (v('htla_epost')) return { epost: v('htla_epost'), navn: v('htla_navn') }
  if (v('rektor_epost')) return { epost: v('rektor_epost'), navn: v('rektor_navn') }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const torrkjoring = (req.body?.torrkjoring !== false)
  const webinarId = req.body?.webinar_id
  const segment = req.body?.segment || {}
  if (!webinarId) return res.status(400).json({ error: 'Mangler webinar_id.' })
  const GYLDIGE_SEGMENT = ['nettverk', 'alle_aktive', 'prospekt']
  if (!GYLDIGE_SEGMENT.includes(segment.type)) return res.status(400).json({ error: 'Ukjent segment.' })

  // Innstillinger — feiler denne, må vi stoppe (nødbremsen skal aldri feile åpent).
  const { data: innstRader, error: innstErr } = await supabase.from('innstillinger').select('nokkel, verdi')
    .in('nokkel', ['motor_aktiv', 'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'rektorliste_qa_ok'])
  if (innstErr) return res.status(500).json({ error: 'Kunne ikke lese innstillinger (nødbrems usikker) — avbryter.' })
  const innst = Object.fromEntries((innstRader || []).map((r) => [r.nokkel, r.verdi]))
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const nettsted = (innst.nettsted_url || 'https://trivselsleder.no').replace(/\/$/, '')
  const fra = innst.avsender_epost ? `${innst.avsender_navn || 'Trivselsleder'} <${innst.avsender_epost}>` : 'Trivselsleder <noreply@trivselsleder.no>'

  // Nødbrems
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(200).json({ error: 'Nødbremsen er på (motor_aktiv = «nei»). Ekte utsending stanset. Tørrkjøring er lov.', motor_aktiv: motorAktiv })
  }
  // QA-sperre for ekstern (prospekt)
  if (segment.type === 'prospekt' && !torrkjoring && (innst.rektorliste_qa_ok || '').trim().toLowerCase() !== 'ja') {
    return res.status(200).json({ error: 'Ekstern utsending er sperret: rektorlista er ikke merket kvalitetssikret (rektorliste_qa_ok ≠ «ja»). Tørrkjøring er lov for å se hvem som ville fått invitasjon.', qa_sperre: true })
  }

  // Webinar (må være publisert for å invitere)
  const { data: w } = await supabase.from('webinarer')
    .select('id, tittel, beskrivelse, starter_at, varighet_min, synlighet, status').eq('id', webinarId).maybeSingle()
  if (!w) return res.status(404).json({ error: 'Fant ikke webinaret.' })
  if (w.status !== 'publisert') return res.status(400).json({ error: 'Publiser webinaret før du inviterer.' })
  if (new Date(w.starter_at).getTime() < Date.now()) return res.status(400).json({ error: 'Webinaret er allerede passert.' })
  // Prospekt/ekstern lenker til den OFFENTLIGE påmeldingssiden — den finner bare offentlige webinarer.
  if (segment.type === 'prospekt' && w.synlighet !== 'offentlig') {
    return res.status(400).json({ error: 'Eksterne (potensielle) kan bare inviteres til OFFENTLIGE webinarer — ellers virker ikke påmeldingslenken.' })
  }

  // Mottakerskoler
  let q = supabase.from('skoler').select('id, navn, hktl_navn, hktl_epost, htla_navn, htla_epost, rektor_navn, rektor_epost, nettverk, status')
  if (segment.type === 'prospekt') q = q.eq('status', 'Potensielle')
  else { q = q.eq('status', 'Aktiv'); if (segment.type === 'nettverk') { if (!segment.nettverk) return res.status(400).json({ error: 'Mangler nettverk.' }); q = q.eq('nettverk', segment.nettverk) } }
  const { data: skoler, error: sFeil } = await q
  if (sFeil) return res.status(500).json({ error: 'Kunne ikke hente skoler: ' + sFeil.message })

  // Allerede påmeldte (skal ikke inviteres) — for dette webinaret
  const { data: alt } = await supabase.from('webinar_pameldinger').select('epost').eq('webinar_id', webinarId).is('avmeldt_at', null)
  const paameldte = new Set((alt || []).map((r) => (r.epost || '').toLowerCase()))

  // Bygg mottakerliste (dedup på e-post, hopp over uten e-post / allerede påmeldt)
  const sett = new Set(); const mottakere = []; const utenEpost = []
  for (const s of skoler || []) {
    const m = finnMottaker(s)
    if (!m) { utenEpost.push(s.navn); continue }
    const key = m.epost.toLowerCase()
    if (sett.has(key) || paameldte.has(key)) continue
    sett.add(key)
    mottakere.push({ skole_id: s.id, epost: m.epost, navn: m.navn })
  }

  const segmentTekst = segment.type === 'nettverk' ? `nettverk:${segment.nettverk}` : segment.type
  const lenke = segment.type === 'prospekt' ? `${nettsted}/webinarer?meld=${webinarId}` : `${nettsted}/min-side/webinarer`
  const { dato, tid } = norskDatoTid(w.starter_at)
  const bygg = (navn) => epostMal({
    overskrift: `Invitasjon: ${esc(w.tittel)}`,
    brødtekst: `
      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">Hei${navn ? ' ' + esc(navn) : ''},</p>
      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 12px;">Vi inviterer dere til <b>${esc(w.tittel)}</b>.</p>
      <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 4px;"><b>Når:</b> ${esc(dato)} kl. ${esc(tid)} (${w.varighet_min || 45} min)</p>
      ${w.beskrivelse ? `<p style="font-size:14px;color:#555;line-height:1.6;margin:8px 0 18px;">${esc(w.beskrivelse)}</p>` : '<div style="height:10px"></div>'}`,
    knapptekst: 'Meld deg på', knapplenke: lenke,
    fottekst: 'Får du denne ved en feil, kan du se bort fra den.',
  })

  // TØRRKJØRING
  if (torrkjoring) {
    return res.status(200).json({
      torrkjoring: true, webinar: w.tittel, segment: segmentTekst,
      antall_mottakere: mottakere.length, uten_epost: utenEpost.length,
      forhandsvisning: mottakere.slice(0, 50).map((m) => ({ epost: m.epost, navn: m.navn })),
      ...(utenEpost.length ? { skoler_uten_epost: utenEpost.slice(0, 20) } : {}),
    })
  }

  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY mangler.' })
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Rydd reservasjoner fra et evt. tidligere AVBRUTT forsøk (reservert, aldri sendt,
  // eldre enn 10 min) så de kan forsøkes på nytt i stedet for å stå «allerede invitert».
  const stale = new Date(Date.now() - 10 * 60000).toISOString()
  await supabase.from('webinar_invitasjon').delete().eq('webinar_id', webinarId).is('sendt_at', null).lt('opprettet_at', stale)

  // Kapp per kall så vi ikke sprenger funksjonens maks-tid (kjør igjen for resten).
  const MAKS = 400
  const avkortet = mottakere.length > MAKS
  const koe = mottakere.slice(0, MAKS)

  let sendt = 0; const hoppet = []; const feilet = []
  for (const m of koe) {
    // Atomisk reservasjon via unik indeks (webinar_id, lower(epost))
    const { data: rez, error: rezFeil } = await supabase.from('webinar_invitasjon')
      .insert({ webinar_id: webinarId, skole_id: m.skole_id, epost: m.epost, mottaker_navn: m.navn || null, segment: segmentTekst })
      .select('id').single()
    if (rezFeil) {
      if (rezFeil.code === '23505') { hoppet.push({ epost: m.epost, grunn: 'allerede invitert' }); continue }
      feilet.push({ epost: m.epost, grunn: 'reservasjon: ' + rezFeil.message }); continue
    }

    let resendId = null, sendFeil = null
    try {
      const { data: sd, error: sF } = await resend.emails.send({
        from: fra, to: m.epost, subject: `Invitasjon: ${w.tittel}`, html: bygg(m.navn),
        ...(innst.svar_til_epost ? { replyTo: innst.svar_til_epost } : {}),
      })
      if (sF) sendFeil = sF.message || String(sF); else resendId = sd?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }

    try {
      await supabase.from('epost_logg').insert({
        type: 'webinar_invitasjon', mottaker_epost: m.epost, mottaker_navn: m.navn || null,
        status: sendFeil ? 'feil' : 'sendt', resend_id: resendId, feilmelding: sendFeil,
      })
    } catch (e) { console.error('Invitasjon: epost_logg feilet (ikke-kritisk):', e?.message) }

    if (sendFeil) {
      const { error: delErr } = await supabase.from('webinar_invitasjon').delete().eq('id', rez.id) // frigi reservasjonen
      if (delErr) console.error('Invitasjon: kunne ikke frigi reservasjon', rez.id, delErr.message)
      feilet.push({ epost: m.epost, grunn: sendFeil }); continue
    }
    const { error: oppdErr } = await supabase.from('webinar_invitasjon').update({ sendt_at: new Date().toISOString(), resend_id: resendId }).eq('id', rez.id)
    if (oppdErr) console.error('Invitasjon: sendt, men sendt_at-stempel glapp', rez.id, oppdErr.message)
    sendt++
  }

  return res.status(200).json({ torrkjoring: false, webinar: w.tittel, segment: segmentTekst, sendt, hoppet_over: hoppet.length, uten_epost: utenEpost.length, avkortet, ...(avkortet ? { gjenstaar: mottakere.length - MAKS } : {}), ...(feilet.length ? { feilet } : {}) })
}
