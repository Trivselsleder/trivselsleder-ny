import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

// B2 (høring 17. aug): AUTOMATISK GJENTAKENDE PURRING.
//
// Løftet til de ansatte: purringen skal gjenta seg av seg selv til skolen svarer,
// så RA setter politikk ÉN gang i stedet for å trykke hver gang. Dette er motoren
// som gjør det.
//
// Forholdet til den MANUELLE purringen (send-oppfolging.js):
//   - Manuell purring bruker stempelet purring_sendt_at og går KUN én gang (RA
//     huker av og sender). Den røres ikke herfra.
//   - Auto-purring bruker sitt EGET stempel auto_purring_sist_at og gjentar seg
//     hvert `auto_purring_intervall_dager`. FØRSTE gang den går ut, setter den
//     også purring_sendt_at (hvis tomt), så skolen forsvinner fra den manuelle
//     purrelista — da unngår vi at RA og motoren purrer dobbelt.
//   - Selve e-posten er DEN SAMME som manuell purring: samme mal fra innstillinger
//     (epost_purring_emne/-tekst) og samme epostMal. Ingen parallell tekst.
//
// Kjører KUN når:
//   - kurs.auto_purring = true (RA har slått den på for kurset), og kursdato ikke passert,
//   - skolen ikke har svart (svart = false),
//   - skolen ikke er skjermet (auto_purring_skjermet = false),
//   - invitasjon er sendt (forste_utsending_at satt) og det har gått minst
//     purring_dager siden, og
//   - det har gått minst intervallet siden forrige auto-purring (eller aldri før).
//
// NØDBREMS: sender ekte e-post kun når torrkjoring=false OG motor_aktiv != 'nei'.
// Vercel-cron kaller med ?torrkjoring=false. Standard er tørrkjøring (fail-closed).
//
// Innringere (samme vakt som frys-kortantall/send-evaluering):
//   1. Vercel-cron (Bearer CRON_SECRET) — daglig.
//   2. En innlogget ansatt — for manuell kjøring/forhåndsvisning.

const resend = new Resend(process.env.RESEND_API_KEY)

// --- Rene tekst-/formathjelpere (speiler send-oppfolging.js; e-postINNHOLDET
//     hentes fra innstillinger, så det kan ikke drifte fra hverandre) ---
function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return iso }
}
function dagerSiden(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 86400000)
}
const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function lenkeggjor(escapet) {
  return escapet.replace(/https?:\/\/[^\s<)"]+/g, (url) => `<a href="${url}" style="color:#106C75;">${url}</a>`)
}
function tekstTilHtml(tekst) {
  return lenkeggjor(escapeHtml(tekst))
    .split(/\n[ \t]*\n/).map(a => a.trim()).filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}
function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}
function fjernTommePlassholderLinjer(mal, verdier) {
  return String(mal || '').split('\n').filter(linje => {
    const tokens = linje.match(/\{(\w+)\}/g) || []
    return !tokens.some(t => {
      const nokkel = t.slice(1, -1)
      return nokkel in verdier && (verdier[nokkel] === '' || verdier[nokkel] == null)
    })
  }).join('\n')
}
// Dagens dato i Norge som 'YYYY-MM-DD' (Vercel kjører i UTC).
function iDagOslo() {
  const deler = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const f = (t) => deler.find((p) => p.type === t)?.value
  return `${f('year')}-${f('month')}-${f('day')}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')

  // ---- Innstillinger ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', [
      'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url',
      'motor_aktiv', 'purring_dager', 'auto_purring_intervall_dager',
      'epost_purring_emne', 'epost_purring_tekst', 'epost_vertskap_notat',
    ])
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))

  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const svarTilEpost = innst.svar_til_epost
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const purringDager = Number.parseInt(innst.purring_dager, 10)
  const intervallDager = Number.parseInt(innst.auto_purring_intervall_dager, 10)
  const emneMal = innst.epost_purring_emne
  const tekstMal = innst.epost_purring_tekst
  const vertskapNotat = innst.epost_vertskap_notat || ''

  if (!avsenderEpost || !avsenderNavn) return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger.' })
  if (!nettstedUrl) return res.status(500).json({ error: 'Mangler nettsted_url i innstillinger.' })
  if (!emneMal || !tekstMal) return res.status(500).json({ error: 'Mangler epost_purring_emne/-tekst i innstillinger.' })
  if (!Number.isFinite(purringDager)) return res.status(500).json({ error: 'Mangler purring_dager i innstillinger.' })
  if (!Number.isFinite(intervallDager) || intervallDager < 1) return res.status(500).json({ error: 'Mangler/ugyldig auto_purring_intervall_dager i innstillinger.' })

  // Ekte sending kun når torrkjoring=false OG nødbremsen er av.
  const ekteSending = !torrkjoring && motorAktiv !== 'nei'

  const from = `${avsenderNavn} <${avsenderEpost}>`
  const kursinfoLenkeFor = (token) => `${nettstedUrl}/kursinfo/${token}`
  const svarLenkeFor = (token) => `${nettstedUrl}/svar/${token}`
  const iDag = iDagOslo()

  // ---- Kurs med auto-purring PÅ, som ikke er avholdt ----
  const { data: kursRader, error: kursFeil } = await supabase
    .from('kurs')
    .select('id, navn, dato, hall_id, oppmote_vertskap, oppmote_ovrige, auto_purring')
    .eq('auto_purring', true)
  if (kursFeil) return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + kursFeil.message })

  const aktiveKurs = (kursRader || []).filter(k => k.dato && String(k.dato).slice(0, 10) >= iDag)
  const kursMap = Object.fromEntries(aktiveKurs.map(k => [k.id, k]))
  const kursIder = aktiveKurs.map(k => k.id)
  if (kursIder.length === 0) {
    return res.status(200).json({ torrkjoring: !ekteSending, motor_aktiv: motorAktiv || null, aktuelle_kurs: 0, kandidater: 0, sendt: 0 })
  }

  // Haller for oppmøte-linja
  const hallIder = [...new Set(aktiveKurs.map(k => k.hall_id).filter(Boolean))]
  let hallMap = {}
  if (hallIder.length > 0) {
    const { data: hallRader } = await supabase.from('haller').select('id, navn').in('id', hallIder)
    hallMap = Object.fromEntries((hallRader || []).map(h => [h.id, h.navn]))
  }

  // ---- Ubesvarte, ikke-skjermede skoler på disse kursene ----
  const { data: rader, error: raderFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id, svart, er_vertskap, antall_tl,
      forste_utsending_at, purring_sendt_at, auto_purring_sist_at, auto_purring_skjermet,
      skoler(navn, hktl_navn, hktl_epost),
      kurs_skole_mottaker!kurs_skole_mottaker_kurs_skole_id_fkey(id, rolle, navn, epost, lenke_token)
    `)
    .in('kurs_id', kursIder)
    .eq('svart', false)
    .eq('auto_purring_skjermet', false)
    .range(0, 9999)
  if (raderFeil) return res.status(500).json({ error: 'Kunne ikke hente skoler: ' + raderFeil.message })

  // Kvalifisering: invitasjon sendt + gammel nok + intervall passert siden sist.
  const kandidater = (rader || []).filter(row => {
    if (!row.forste_utsending_at) return false
    const dagerFor = dagerSiden(row.forste_utsending_at)
    if (dagerFor === null || dagerFor < purringDager) return false
    const dagerSist = dagerSiden(row.auto_purring_sist_at)
    if (dagerSist !== null && dagerSist < intervallDager) return false
    return true
  })

  const forhandsvisning = []
  const sendt = []
  const feilet = []

  for (const row of kandidater) {
    const kurs = kursMap[row.kurs_id]
    const skoleNavn = row.skoler?.navn || '(ukjent skole)'
    if (!kurs) continue

    // Nåværende hovedkontakt (kan ha byttet siden invitasjonen), med frossen
    // lenke_token så lenken virker. Samme logikk som send-oppfolging (htla).
    const alle = row.kurs_skole_mottaker || []
    const h = alle.find(m => m.rolle === 'htla')
    let mottaker = null
    if (h) {
      const naaEpost = row.skoler?.hktl_epost
      const brukNaa = gyldigEpost(naaEpost)
      const bruktEpost = brukNaa ? naaEpost.trim() : h.epost
      const naaNavn = (row.skoler?.hktl_navn || '').trim()
      const bruktNavn = brukNaa ? (naaNavn || h.navn || '') : h.navn
      if (gyldigEpost(bruktEpost)) mottaker = { ...h, epost: bruktEpost, navn: bruktNavn }
    }
    if (!mottaker) {
      feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'ingen hovedkontakt (htla) med e-post' })
      continue
    }

    const oppmoteRaa = row.er_vertskap ? kurs.oppmote_vertskap : kurs.oppmote_ovrige
    const oppmotetid = oppmoteRaa ? String(oppmoteRaa).slice(0, 5) : ''
    const grunnverdier = {
      skolenavn: skoleNavn,
      kursnavn: kurs.navn || '',
      kursdato: formaterDato(kurs.dato),
      hall: (kurs.hall_id && hallMap[kurs.hall_id]) || '',
      oppmotetid,
      vertskapsnotat: row.er_vertskap ? vertskapNotat : '',
      antall_tl: row.antall_tl == null ? '' : String(row.antall_tl),
    }
    const tekstKilde = fjernTommePlassholderLinjer(tekstMal, grunnverdier)
    const verdier = { ...grunnverdier, mottaker_navn: mottaker.navn || '', kursinfolenke: kursinfoLenkeFor(mottaker.lenke_token) }
    const emne = fyllPlassholdere(emneMal, verdier)
    const brødtekst = tekstTilHtml(fyllPlassholdere(tekstKilde, verdier))
    const lenke = svarLenkeFor(mottaker.lenke_token)
    const html = epostMal({
      overskrift: escapeHtml(emne),
      brødtekst,
      knapptekst: 'Åpne svarskjemaet',
      knapplenke: lenke,
      fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet.',
    })

    if (!ekteSending) {
      forhandsvisning.push({ kurs_skole_id: row.id, skole: skoleNavn, kurs: kurs.navn || '', mottaker_epost: mottaker.epost, emne })
      continue
    }

    // ---- Atomisk reservasjon på auto_purring_sist_at (hindrer dobbel utsending
    //      hvis to kjøringer overlapper). Reserver kun hvis verdien er den vi leste. ----
    const nyTid = new Date().toISOString()
    const forrige = row.auto_purring_sist_at
    let q = supabase.from('kurs_skole').update({ auto_purring_sist_at: nyTid }).eq('id', row.id)
    q = forrige == null ? q.is('auto_purring_sist_at', null) : q.eq('auto_purring_sist_at', forrige)
    const { data: reservert, error: reservFeil } = await q.select('id')
    if (reservFeil) { feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'kunne ikke reservere: ' + reservFeil.message }); continue }
    if (!reservert || reservert.length === 0) { continue } // en annen kjøring tok den

    let sendFeil = null
    let resendId = null
    try {
      const { data: sendData, error: rFeil } = await resend.emails.send({
        from, to: mottaker.epost, subject: emne, html,
        ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
      })
      if (rFeil) sendFeil = rFeil.message || String(rFeil)
      else resendId = sendData?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }

    await supabase.from('epost_logg').insert({
      type: 'purring',
      mottaker_epost: mottaker.epost,
      mottaker_navn: mottaker.navn || null,
      kurs_skole_id: row.id,
      kurs_skole_mottaker_id: mottaker.id,
      status: sendFeil ? 'feil' : 'sendt',
      resend_id: resendId,
      feilmelding: sendFeil,
    })

    if (sendFeil) {
      // Rull tilbake reservasjonen så skolen forsøkes igjen neste kjøring.
      await supabase.from('kurs_skole').update({ auto_purring_sist_at: forrige }).eq('id', row.id)
      feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, mottaker_epost: mottaker.epost, grunn: sendFeil })
      continue
    }

    // Første gang: sett også purring_sendt_at (hvis tomt) så skolen forsvinner fra
    // den MANUELLE purrelista — motor og RA purrer aldri dobbelt.
    if (!row.purring_sendt_at) {
      await supabase.from('kurs_skole').update({ purring_sendt_at: nyTid }).eq('id', row.id).is('purring_sendt_at', null)
    }
    await supabase.from('kurs_skole_mottaker').update({ sendt_at: nyTid }).eq('id', mottaker.id)

    sendt.push({ kurs_skole_id: row.id, skole: skoleNavn, mottaker_epost: mottaker.epost, resend_id: resendId })
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring: !ekteSending,
    motor_aktiv: motorAktiv || null,
    intervall_dager: intervallDager,
    aktuelle_kurs: kursIder.length,
    kandidater: kandidater.length,
    ...(ekteSending ? { sendt_antall: sendt.length, sendt } : { ville_sendt_antall: forhandsvisning.length, forhandsvisning }),
    feilet,
  })
}
