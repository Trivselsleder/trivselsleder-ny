import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt, erCronKall } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

// B3 (høring 17. aug): ÉN automatisk purring på UBESVART evaluering.
//
// Løftet: en skole som fikk evalueringen men ikke svarte, får ÉN vennlig
// påminnelse noen dager etter kursdagen (fanger «glemte det på bussen» uten å
// mase). Aldri mer enn én — låst av stempelet kurs_skole.eval_purring_sendt_at.
//
// Gjenbruker evalueringsteksten (epost_evaluering_emne/-tekst) og samme
// evaluerings-lenke (evalueringer.token), men setter «Påminnelse: » foran emnet
// så mottaker skjønner at det er en oppfølging. Ingen parallell mal.
//
// Kjører KUN når:
//   - evalueringen ER sendt (evaluering_sendt_at satt),
//   - den IKKE er besvart (evalueringer.svart_tidspunkt er null),
//   - påminnelsen ikke er sendt før (eval_purring_sendt_at er null),
//   - det har gått minst eval_purring_dager siden kursdagen.
//
// NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes (tørrkjøring lov).
// Innringere: Vercel-cron (Bearer CRON_SECRET) daglig, eller innlogget ansatt.

const resend = new Resend(process.env.RESEND_API_KEY)

function formaterDato(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' }) }
  catch { return iso }
}
const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''
function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) => (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}
function tekstTilHtml(tekst) {
  return escapeHtml(tekst).split(/\n[ \t]*\n/).map(a => a.trim()).filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`).join('\n')
}
function osloDatoIdag() {
  const deler = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const g = (t) => deler.find(d => d.type === t)?.value
  return `${g('year')}-${g('month')}-${g('day')}`
}
// 'YYYY-MM-DD' minus n kalenderdager → 'YYYY-MM-DD'.
function datoMinusDager(datoStr, n) {
  const d = new Date(datoStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// MÅL (norsk tid): eval-purringen skal gå kl 07:30 norsk tid HELE året.
// Vercel-cron kan bare UTC (uten sommertid), så vercel.json fyrer :30 hver
// time i vinduet 05–08 UTC ("30 5-8 * * *") — minuttet (30) kommer fra
// skjemaet, og tidsvakten i handleren slipper bare gjennom den fyringen der
// TIMEN i Norge faktisk er 07. Intl med timeZone 'Europe/Oslo' håndterer
// sommer-/vintertid automatisk (samme teknikk som i send-evaluering.js).
const MAAL_TIME_OSLO = 7
function osloTimeNaa() {
  const deler = new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false,
  }).formatToParts(new Date())
  return Number(deler.find((d) => d.type === 'hour')?.value) % 24
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  // ---- TIDSVAKT (kun cron-kall) ----
  // Cron-skjemaet fyrer flere ganger i UTC-vinduet (05:30–08:30); bare fyringen
  // der klokka i Norge er 07 (dvs. 07:30 med minuttet fra skjemaet) slipper
  // gjennom. En innlogget ansatt tidsstyres IKKE — manuell kjøring/
  // forhåndsvisning skal virke når som helst.
  if (erCronKall(req)) {
    const osloTime = osloTimeNaa()
    if (osloTime !== MAAL_TIME_OSLO) {
      return res.status(200).json({
        ok: true,
        hoppet_over: true,
        grunn: `hoppet over – ikke riktig tidspunkt (norsk time ${String(osloTime).padStart(2, '0')}, mål ${String(MAAL_TIME_OSLO).padStart(2, '0')}:30)`,
      })
    }
  }

  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')
  const naa = () => new Date().toISOString()

  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger').select('nokkel, verdi')
    .in('nokkel', ['avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv', 'eval_purring_dager', 'epost_evaluering_emne', 'epost_evaluering_tekst'])
  if (innstFeil) return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))

  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const svarTilEpost = innst.svar_til_epost
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const purringDager = Number.parseInt(innst.eval_purring_dager, 10)
  const emneMal = innst.epost_evaluering_emne
  const tekstMal = innst.epost_evaluering_tekst

  if (!avsenderEpost || !avsenderNavn) return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger.' })
  if (!nettstedUrl) return res.status(500).json({ error: 'Mangler nettsted_url i innstillinger.' })
  if (!emneMal || !tekstMal) return res.status(500).json({ error: 'Mangler epost_evaluering_emne/-tekst i innstillinger.' })
  if (!Number.isFinite(purringDager) || purringDager < 0) return res.status(500).json({ error: 'Mangler/ugyldig eval_purring_dager i innstillinger.' })

  const ekteSending = !torrkjoring && motorAktiv !== 'nei'
  const from = `${avsenderNavn} <${avsenderEpost}>`
  const iDag = osloDatoIdag()
  const cutoff = datoMinusDager(iDag, purringDager) // kursdato <= cutoff → nok dager gått

  // Kurs som er gamle nok (kursdato minst purringDager dager siden).
  const { data: kursRader, error: kursFeil } = await supabase.from('kurs').select('id, navn, dato').range(0, 9999)
  if (kursFeil) return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + kursFeil.message })
  const modneKurs = (kursRader || []).filter(k => k.dato && String(k.dato).slice(0, 10) <= cutoff)
  const kursMap = Object.fromEntries(modneKurs.map(k => [k.id, k]))
  const kursIder = modneKurs.map(k => k.id)
  if (kursIder.length === 0) {
    return res.status(200).json({ torrkjoring: !ekteSending, motor_aktiv: motorAktiv || null, kandidater: 0, sendt: 0 })
  }

  // Skoler som FIKK evalueringen, men ikke er purret ennå.
  const { data: rader, error: raderFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id, evaluering_sendt_at, eval_purring_sendt_at,
      skoler(navn, hktl_navn, hktl_epost),
      kurs_skole_mottaker!kurs_skole_mottaker_kurs_skole_id_fkey(id, rolle, navn, epost)
    `)
    .in('kurs_id', kursIder)
    .not('evaluering_sendt_at', 'is', null)
    .is('eval_purring_sendt_at', null)
    .range(0, 9999)
  if (raderFeil) return res.status(500).json({ error: 'Kunne ikke hente skoler: ' + raderFeil.message })
  if (!rader || rader.length === 0) {
    return res.status(200).json({ torrkjoring: !ekteSending, motor_aktiv: motorAktiv || null, kandidater: 0, sendt: 0 })
  }

  // Hvilke av disse har IKKE svart på evalueringen? (token + svart_tidspunkt)
  const svarIder = rader.map(r => r.id)
  const { data: evalRader, error: evalFeil } = await supabase
    .from('evalueringer').select('kurs_skole_id, token, svart_tidspunkt').in('kurs_skole_id', svarIder)
  if (evalFeil) return res.status(500).json({ error: 'Kunne ikke hente evalueringer: ' + evalFeil.message })
  const evalMap = Object.fromEntries((evalRader || []).map(e => [e.kurs_skole_id, e]))

  const kandidater = rader.filter(r => {
    const e = evalMap[r.id]
    return e && e.token && !e.svart_tidspunkt // finnes, har lenke, IKKE besvart
  })

  const forhandsvisning = []
  const sendt = []
  const feilet = []

  for (const row of kandidater) {
    const kurs = kursMap[row.kurs_id]
    const skoleNavn = row.skoler?.navn || '(ukjent skole)'
    const evalRad = evalMap[row.id]

    // Nåværende hovedkontakt (kan ha byttet), frossen mottaker-id for logg.
    const frossenHtla = (row.kurs_skole_mottaker || []).find(m => m.rolle === 'htla') || null
    let htla = null
    if (frossenHtla) {
      const naaEpost = row.skoler?.hktl_epost
      const brukNaa = gyldigEpost(naaEpost)
      const bruktEpost = brukNaa ? naaEpost.trim() : frossenHtla.epost
      const naaNavn = (row.skoler?.hktl_navn || '').trim()
      const bruktNavn = brukNaa ? (naaNavn || frossenHtla.navn || '') : frossenHtla.navn
      if (gyldigEpost(bruktEpost)) htla = { ...frossenHtla, epost: bruktEpost, navn: bruktNavn }
    }
    if (!htla) { feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'ingen hovedkontakt (htla) med e-post' }); continue }

    const verdier = { skolenavn: skoleNavn, kursnavn: kurs?.navn || '', kursdato: formaterDato(kurs?.dato), mottaker_navn: htla.navn || '' }
    const emne = 'Påminnelse: ' + fyllPlassholdere(emneMal, verdier)
    const brødtekst = tekstTilHtml(fyllPlassholdere(tekstMal, verdier))
    const lenke = `${nettstedUrl}/evaluering/${evalRad.token}`
    const html = epostMal({
      overskrift: escapeHtml(emne),
      brødtekst,
      knapptekst: 'Åpne evalueringsskjemaet',
      knapplenke: lenke,
      fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet.',
    })

    if (!ekteSending) {
      forhandsvisning.push({ kurs_skole_id: row.id, skole: skoleNavn, kurs: kurs?.navn || '', mottaker_epost: htla.epost, emne })
      continue
    }

    // Atomisk reservasjon: sett stempelet kun hvis det fremdeles er null.
    const tid = naa()
    const { data: reservert, error: reservFeil } = await supabase
      .from('kurs_skole').update({ eval_purring_sendt_at: tid }).eq('id', row.id).is('eval_purring_sendt_at', null).select('id')
    if (reservFeil) { feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'kunne ikke reservere: ' + reservFeil.message }); continue }
    if (!reservert || reservert.length === 0) continue // en annen kjøring tok den

    let resendId = null, sendFeil = null
    try {
      const { data: sendData, error: rFeil } = await resend.emails.send({ from, to: htla.epost, subject: emne, html, ...(svarTilEpost ? { replyTo: svarTilEpost } : {}) })
      if (rFeil) sendFeil = rFeil.message || String(rFeil)
      else resendId = sendData?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }

    await supabase.from('epost_logg').insert({
      type: 'evaluering',
      mottaker_epost: htla.epost, mottaker_navn: htla.navn || null,
      kurs_skole_id: row.id, kurs_skole_mottaker_id: htla.id,
      status: sendFeil ? 'feil' : 'sendt', resend_id: resendId, feilmelding: sendFeil,
    })

    if (sendFeil) {
      await supabase.from('kurs_skole').update({ eval_purring_sendt_at: null }).eq('id', row.id) // frigi for nytt forsøk
      feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, mottaker_epost: htla.epost, grunn: sendFeil })
      continue
    }
    sendt.push({ kurs_skole_id: row.id, skole: skoleNavn, mottaker_epost: htla.epost, resend_id: resendId })
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring: !ekteSending,
    motor_aktiv: motorAktiv || null,
    dager: purringDager,
    kandidater: kandidater.length,
    ...(ekteSending ? { sendt_antall: sendt.length, sendt } : { ville_sendt_antall: forhandsvisning.length, forhandsvisning }),
    feilet,
  })
}
