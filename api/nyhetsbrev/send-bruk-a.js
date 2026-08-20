// BRUK A — webinar-oppfølging til egne skoler (Resend Broadcasts).
//
// Én mail med dobbel vinkling (takk til de som deltok + «gikk du glipp?» til de
// som ikke kom) til skolenes kontaktpersoner: HTLA-mottakeren (samme
// fallback-kjede som resten av systemet: hktl → htla → rektor) og valgfritt
// TLA-ene (skoler.tla_kontakter).
//
// Soft opt-in (Kjartans forretningsvurdering, plan 20. aug): mottakerne står på
// lista fra start, får første utsending, og har personlig avmeldingslenke i
// brevet. Grunnlaget LOGGES per mottaker: samtykke_modell='soft_opt_in',
// samtykke_kilde='kontaktperson_tl_program', samtykke_tidspunkt.
//
// handling='forhandsvis' → tørrkjøring: mottakerantall + liste + ferdig HTML.
//                          Ingen Resend-kall, ingen skriving. Alltid lov.
// handling='send'        → krever motor_aktiv='ja' (nødbrems, fail closed):
//   1) mottakere upsertes i nyhetsbrev_mottakere (avmeldte holdes UTE)
//   2) Resend: egenskap avmelding_url + NYTT segment per utsending + kontakter
//   3) Broadcast opprettes med {{{contact.avmelding_url}}} i bunnteksten
//   4) sendes nå, eller planlegges (planlagt_at) — f.eks. kort tid etter webinaret
//   5) logg i nyhetsbrev_utsendinger + epost_logg
//
// Opptakslenken kan mangle (webinar-modulens opptaksdel er V1.1) — da utelates
// hele opptaksseksjonen i brevet. har_opptak_registrert hinter til admin om at
// det finnes opptak i webinar_opptak (lenken må inntil videre limes inn manuelt).

import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { brukAHtml, brukAEmne } from './_mal.js'
import { sikreAvmeldingEgenskap, opprettSegment, upsertKontakt, opprettBroadcast, sendBroadcast } from './_resend.js'

const gyldigEpost = (e) => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim())

// HTLA-mottaker: samme kjede som src/lib/mottaker.js (hktl → htla → rektor).
function finnHovedmottaker(s) {
  const v = (f) => (s?.[f] || '').trim()
  if (gyldigEpost(v('hktl_epost'))) return { epost: v('hktl_epost'), navn: v('hktl_navn') }
  if (gyldigEpost(v('htla_epost'))) return { epost: v('htla_epost'), navn: v('htla_navn') }
  if (gyldigEpost(v('rektor_epost'))) return { epost: v('rektor_epost'), navn: v('rektor_navn') }
  return null
}

function slug(s) {
  return String(s || '').toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'webinar'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const HANDLINGER = ['forhandsvis', 'send', 'test']
  const handling = HANDLINGER.includes(req.body?.handling) ? req.body.handling : 'forhandsvis'
  const webinarId = req.body?.webinar_id
  const inkluderTla = req.body?.inkluder_tla === true
  const opptakLenke = (req.body?.opptak_lenke || '').toString().trim() || null
  const emneOverstyr = (req.body?.emne || '').toString().trim() || null
  const planlagtAt = (req.body?.planlagt_at || '').toString().trim() || null
  if (!webinarId) return res.status(400).json({ error: 'Mangler webinar_id.' })
  if (opptakLenke && !/^https:\/\//.test(opptakLenke)) {
    return res.status(400).json({ error: 'Opptakslenken må være en https-adresse.' })
  }

  // Innstillinger — feiler lesingen, stopper vi (nødbremsen skal aldri feile åpent).
  const { data: innstRader, error: innstErr } = await supabase
    .from('innstillinger').select('nokkel, verdi')
    .in('nokkel', ['motor_aktiv', 'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url'])
  if (innstErr) return res.status(500).json({ error: 'Kunne ikke lese innstillinger (nødbrems usikker) — avbryter.' })
  const innst = Object.fromEntries((innstRader || []).map((r) => [r.nokkel, r.verdi]))
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const nettsted = (innst.nettsted_url || 'https://trivselsleder-ny.vercel.app').trim().replace(/\/+$/, '')
  const fra = innst.avsender_epost
    ? `${innst.avsender_navn || 'Trivselsleder'} <${innst.avsender_epost}>`
    : 'Trivselsleder <noreply@trivselsleder.no>'

  // Webinar
  const { data: w } = await supabase.from('webinarer')
    .select('id, tittel, beskrivelse, starter_at, varighet_min, status')
    .eq('id', webinarId).maybeSingle()
  if (!w) return res.status(404).json({ error: 'Fant ikke webinaret.' })
  const sluttTid = new Date(new Date(w.starter_at).getTime() + (w.varighet_min || 45) * 60000)
  const avholdt = sluttTid.getTime() < Date.now()

  // Opptak-hint (V1.1-kobling): finnes det registrert opptak i webinar-modulen?
  const { data: opptakRader } = await supabase.from('webinar_opptak')
    .select('id').eq('webinar_id', webinarId).is('slettet_at', null).limit(1)
  const harOpptakRegistrert = (opptakRader || []).length > 0

  // ── Mottakeruttrekk: aktive skolers kontaktpersoner ───────────────────────
  const { data: skoler, error: sFeil } = await supabase.from('skoler')
    .select('id, navn, hktl_navn, hktl_epost, htla_navn, htla_epost, rektor_navn, rektor_epost, tla_kontakter')
    .eq('status', 'Aktiv')
  if (sFeil) return res.status(500).json({ error: 'Kunne ikke hente skoler: ' + sFeil.message })

  const sett = new Set(); const kandidater = []; const utenEpost = []
  for (const s of skoler || []) {
    const hoved = finnHovedmottaker(s)
    if (hoved) {
      const n = hoved.epost.toLowerCase()
      if (!sett.has(n)) { sett.add(n); kandidater.push({ epost: n, navn: hoved.navn || null, rolle: 'htla', skole_id: s.id, skole_navn: s.navn }) }
    } else utenEpost.push(s.navn)
    if (inkluderTla && Array.isArray(s.tla_kontakter)) {
      for (const t of s.tla_kontakter) {
        const e = (t?.epost || '').trim()
        if (!gyldigEpost(e)) continue
        const n = e.toLowerCase()
        if (!sett.has(n)) { sett.add(n); kandidater.push({ epost: n, navn: (t?.navn || '').trim() || null, rolle: 'tla', skole_id: s.id, skole_navn: s.navn }) }
      }
    }
  }

  // Avmeldte skal ALDRI med — sjekk mot samtykkebasen.
  const { data: avmeldteRader, error: aFeil } = await supabase
    .from('nyhetsbrev_mottakere').select('epost').not('avmeldt_at', 'is', null)
  if (aFeil) return res.status(500).json({ error: 'Kunne ikke lese avmeldingslista — avbryter (sender heller ikke én for mye).' })
  const avmeldte = new Set((avmeldteRader || []).map((r) => r.epost.toLowerCase()))
  const mottakere = kandidater.filter((k) => !avmeldte.has(k.epost))
  const ekskludertAvmeldt = kandidater.length - mottakere.length

  const emne = emneOverstyr || brukAEmne(w, opptakLenke)

  // ── TØRRKJØRING / FORHÅNDSVISNING ─────────────────────────────────────────
  if (handling === 'forhandsvis') {
    return res.status(200).json({
      torrkjoring: true,
      webinar: w.tittel, avholdt, har_opptak_registrert: harOpptakRegistrert,
      motor_aktiv: motorAktiv || null,
      antall_mottakere: mottakere.length,
      ekskludert_avmeldt: ekskludertAvmeldt,
      uten_epost: utenEpost.length,
      skoler_uten_epost: utenEpost.slice(0, 20),
      mottakere: mottakere.slice(0, 100).map((m) => ({ epost: m.epost, navn: m.navn, rolle: m.rolle, skole: m.skole_navn })),
      emne, fra,
      html: brukAHtml({ webinar: w, opptakLenke, nettsted, avmeldingUrl: '#personlig-avmeldingslenke-flettes-inn-per-mottaker' }),
    })
  }

  // ── EKTE UTSENDING / PLANLEGGING / TEST ───────────────────────────────────
  // Nødbremsen gjelder ALT som faktisk sender e-post — også test til én adresse
  // (husregel 9: fail closed, ingen unntak).
  if (motorAktiv !== 'ja') {
    return res.status(409).json({ error: 'Nødbremsen er på (motor_aktiv ≠ «ja»). Ekte utsending/planlegging/test er stanset. Forhåndsvisning er fortsatt lov.', motor_aktiv: motorAktiv || null })
  }
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY mangler.' })

  // TEST: ekte Broadcast, men til et segment med KUN én valgt adresse (f.eks.
  // din egen). Beviser hele kjeden — kontaktegenskap, fletting av personlig
  // avmeldingslenke, avsender — uten å røre skolene.
  if (handling === 'test') {
    const testEpost = (req.body?.test_epost || '').toString().trim().toLowerCase()
    if (!gyldigEpost(testEpost)) return res.status(400).json({ error: 'Oppgi en gyldig test_epost.' })

    const naaT = new Date().toISOString()
    let { data: testRad } = await supabase.from('nyhetsbrev_mottakere')
      .select('id, epost, navn, avmelding_token, avmeldt_at').ilike('epost', testEpost).maybeSingle()
    if (!testRad) {
      const { data: ny, error: nyFeil } = await supabase.from('nyhetsbrev_mottakere')
        .insert({ epost: testEpost, navn: 'Testmottaker', rolle: 'ekstern', nyhetsbrev_samtykke: true, samtykke_modell: 'soft_opt_in', samtykke_kilde: 'intern_test', samtykke_tidspunkt: naaT })
        .select('id, epost, navn, avmelding_token, avmeldt_at').single()
      if (nyFeil) return res.status(500).json({ error: 'Kunne ikke registrere testmottaker: ' + nyFeil.message })
      testRad = ny
    }
    if (testRad.avmeldt_at) return res.status(422).json({ error: 'Testadressen er avmeldt — velg en annen, eller fjern avmeldt_at manuelt.' })

    const datoT = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    try {
      await sikreAvmeldingEgenskap(nettsted)
      const segId = await opprettSegment(`bruk-a-TEST-${datoT}-${slug(w.tittel)}`)
      const synkSvar = await upsertKontakt({
        epost: testRad.epost, fornavn: (testRad.navn || '').split(/\s+/)[0] || null,
        avmeldingUrl: `${nettsted}/api/nyhetsbrev/avmeld?t=${testRad.avmelding_token}`, segmentId: segId,
      })
      if (!synkSvar.ok) return res.status(502).json({ error: 'Testkontakten kom ikke inn i segmentet: ' + (synkSvar.grunn || 'ukjent') })
      const htmlT = brukAHtml({ webinar: w, opptakLenke, nettsted, avmeldingUrl: '{{{contact.avmelding_url}}}' })
      const bcId = await opprettBroadcast({ segmentId: segId, fra, emne: '[TEST] ' + emne, html: htmlT, svarTil: innst.svar_til_epost || null, navn: `TEST Bruk A: ${w.tittel}` })
      await sendBroadcast(bcId, null)
      return res.status(200).json({ ok: true, test: true, sendt_til: testRad.epost, broadcast_id: bcId })
    } catch (e) {
      return res.status(502).json({ error: 'Test-utsendingen feilet: ' + e.message })
    }
  }

  if (mottakere.length === 0) return res.status(422).json({ error: 'Ingen mottakere å sende til.' })

  let planlagtIso = null
  if (planlagtAt) {
    const d = new Date(planlagtAt)
    if (isNaN(d.getTime()) || d.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Planlagt tidspunkt må være et gyldig tidspunkt fram i tid.' })
    }
    planlagtIso = d.toISOString()
  }
  if (!avholdt) {
    // Oppfølging FØR webinaret er avholdt gir bare mening som planlagt utsending etterpå.
    if (!planlagtIso) return res.status(400).json({ error: 'Webinaret er ikke avholdt ennå. Velg et planlagt tidspunkt etter at det er ferdig, eller vent til etterpå.' })
    if (new Date(planlagtIso).getTime() < sluttTid.getTime()) {
      return res.status(400).json({ error: 'Planlagt tidspunkt må være ETTER at webinaret er ferdig (' + sluttTid.toISOString() + ').' })
    }
  }

  // Hvem trykket send (til loggen)
  let opprettetAv = null
  try {
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization.slice(7))
    opprettetAv = user?.id || null
  } catch { /* logg-felt, ikke kritisk */ }

  // 1) Samtykkebasen: upsert mottakerne (soft opt-in logges på NYE rader;
  //    eksisterende rader beholder sitt opprinnelige grunnlag).
  const { data: eksRader, error: eksFeil } = await supabase
    .from('nyhetsbrev_mottakere').select('id, epost, avmelding_token, avmeldt_at')
  if (eksFeil) return res.status(500).json({ error: 'Kunne ikke lese mottakerbasen: ' + eksFeil.message })
  const eksisterende = new Map((eksRader || []).map((r) => [r.epost.toLowerCase(), r]))

  const naa = new Date().toISOString()
  const nyeRader = mottakere.filter((m) => !eksisterende.has(m.epost)).map((m) => ({
    epost: m.epost, navn: m.navn, rolle: m.rolle,
    skole_id: m.skole_id, skole_navn: m.skole_navn,
    nyhetsbrev_samtykke: true,
    samtykke_modell: 'soft_opt_in',
    samtykke_kilde: 'kontaktperson_tl_program',
    samtykke_tidspunkt: naa,
  }))
  if (nyeRader.length) {
    const { error: insFeil } = await supabase.from('nyhetsbrev_mottakere').insert(nyeRader)
    if (insFeil) return res.status(500).json({ error: 'Kunne ikke registrere mottakere: ' + insFeil.message })
  }
  // Oppdater navn/rolle/skole på eksisterende (ikke samtykkefeltene) — buntet,
  // så gjentatte utsendinger til samme base ikke tar ett HTTP-kall per rad i serie.
  const oppdateringer = mottakere.filter((m) => eksisterende.has(m.epost))
  for (let i = 0; i < oppdateringer.length; i += 8) {
    await Promise.all(oppdateringer.slice(i, i + 8).map((m) =>
      supabase.from('nyhetsbrev_mottakere')
        .update({ navn: m.navn, rolle: m.rolle, skole_id: m.skole_id, skole_navn: m.skole_navn, endret_at: naa })
        .eq('id', eksisterende.get(m.epost).id)))
  }

  // Les tilbake tokens for alle mottakerne i denne utsendingen.
  // Buntet i grupper på 100 så URL-en mot PostgREST aldri blir for lang.
  const baseRader = []
  const alleEposter = mottakere.map((m) => m.epost)
  for (let i = 0; i < alleEposter.length; i += 100) {
    const { data: del, error: delFeil } = await supabase
      .from('nyhetsbrev_mottakere')
      .select('id, epost, navn, avmelding_token, avmeldt_at')
      .in('epost', alleEposter.slice(i, i + 100))
    if (delFeil) return res.status(500).json({ error: 'Kunne ikke lese tilbake mottakerne: ' + delFeil.message })
    baseRader.push(...(del || []))
  }
  if (!baseRader.length) return res.status(500).json({ error: 'Kunne ikke lese tilbake mottakerne: tomt svar' })
  const aktive = baseRader.filter((r) => !r.avmeldt_at)

  // 2) Resend: egenskap + segment + kontakter
  const datoStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const segmentNavn = `bruk-a-${datoStr}-${slug(w.tittel)}`
  let segmentId
  try {
    await sikreAvmeldingEgenskap(nettsted)
    segmentId = await opprettSegment(segmentNavn)
  } catch (e) {
    return res.status(502).json({ error: 'Resend-oppsett feilet (segment/egenskap): ' + e.message })
  }

  const feiletSynk = []
  let synket = 0
  const BUNT = 8
  for (let i = 0; i < aktive.length; i += BUNT) {
    const bunt = aktive.slice(i, i + BUNT)
    await Promise.all(bunt.map(async (r) => {
      const avmeldingUrl = `${nettsted}/api/nyhetsbrev/avmeld?t=${r.avmelding_token}`
      const fornavn = (r.navn || '').trim().split(/\s+/)[0] || null
      try {
        const svar = await upsertKontakt({ epost: r.epost, fornavn, avmeldingUrl, segmentId })
        if (svar.ok) {
          synket++
          if (svar.id) await supabase.from('nyhetsbrev_mottakere').update({ resend_contact_id: svar.id }).eq('id', r.id)
        } else feiletSynk.push({ epost: r.epost, grunn: svar.grunn })
      } catch (e) {
        feiletSynk.push({ epost: r.epost, grunn: e.message })
      }
    }))
  }
  if (synket === 0) {
    return res.status(502).json({ error: 'Ingen kontakter kom inn i Resend-segmentet — utsendingen er IKKE opprettet.', feilet_synk: feiletSynk.slice(0, 20) })
  }

  // 3) Broadcast med personlig avmeldingslenke flettet per mottaker
  const html = brukAHtml({ webinar: w, opptakLenke, nettsted, avmeldingUrl: '{{{contact.avmelding_url}}}' })
  let broadcastId
  try {
    broadcastId = await opprettBroadcast({
      segmentId, fra, emne, html,
      svarTil: innst.svar_til_epost || null,
      navn: `Bruk A: ${w.tittel} (${datoStr})`,
    })
  } catch (e) {
    return res.status(502).json({ error: 'Kunne ikke opprette Broadcast: ' + e.message })
  }

  // 4) Send nå eller planlegg
  try {
    await sendBroadcast(broadcastId, planlagtIso)
  } catch (e) {
    // Broadcast ligger som utkast i Resend — logg og meld tydelig fra.
    await supabase.from('nyhetsbrev_utsendinger').insert({
      bruk: 'A', emne, webinar_id: w.id, opptak_lenke: opptakLenke, inkluder_tla: inkluderTla,
      segment_navn: segmentNavn, resend_segment_id: segmentId, resend_broadcast_id: broadcastId,
      antall_mottakere: synket, status: 'feilet', feilmelding: 'Sending feilet: ' + e.message, opprettet_av: opprettetAv,
    })
    return res.status(502).json({ error: 'Broadcast ble opprettet, men sending/planlegging feilet: ' + e.message + ' (ligger som utkast i Resend-dashbordet)', broadcast_id: broadcastId })
  }

  // 5) Logg
  const { error: loggFeil } = await supabase.from('nyhetsbrev_utsendinger').insert({
    bruk: 'A', emne, webinar_id: w.id, opptak_lenke: opptakLenke, inkluder_tla: inkluderTla,
    segment_navn: segmentNavn, resend_segment_id: segmentId, resend_broadcast_id: broadcastId,
    antall_mottakere: synket,
    status: planlagtIso ? 'planlagt' : 'sendt',
    planlagt_at: planlagtIso, sendt_at: planlagtIso ? null : naa,
    opprettet_av: opprettetAv,
  })
  if (loggFeil) console.error('send-bruk-a: utsendingslogg feilet (ikke-kritisk):', loggFeil.message)
  try {
    await supabase.from('epost_logg').insert({
      type: 'nyhetsbrev_bruk_a', mottaker_epost: null, mottaker_navn: `${synket} mottakere (broadcast)`,
      status: planlagtIso ? 'planlagt' : 'sendt', resend_id: broadcastId,
    })
  } catch (e) { console.error('send-bruk-a: epost_logg feilet (ikke-kritisk):', e?.message) }

  return res.status(200).json({
    ok: true,
    ...(planlagtIso ? { planlagt: true, planlagt_at: planlagtIso } : { sendt: true }),
    antall_mottakere: synket,
    hoppet_over_avmeldt: ekskludertAvmeldt,
    segment: segmentNavn, broadcast_id: broadcastId,
    ...(feiletSynk.length ? { feilet_synk: feiletSynk.slice(0, 20), feilet_synk_antall: feiletSynk.length } : {}),
  })
}
