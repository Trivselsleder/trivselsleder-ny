import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

// Resend Trinn B, steg 3c del 2: AUTOMATISK utsending av evalueringslenke.
//
// Kjøres av en daglig jobb (cron settes opp til slutt). Finner skoler som var
// på kurs (svart JA, kursdato passert) og som ikke har fått evalueringslenke
// ennå, og sender lenken til evalueringsskjemaet (/evaluering/:token).
//
// STEMPEL: vi bruker kurs_skole.evaluering_sendt_at som ENESTE kilde (samme
// tabell/mønster som de tre stemplene i del 1, og det hvem-star-for-tur.js
// allerede leser). evalueringer.sendt_tidspunkt lar vi stå tom — aldri to steder.
//
// TOKEN: lenken bruker evalueringer.token (IKKE svarskjemaets token). Vi kaller
// den idempotente RPC-en forbered_evalueringer(kurs_id) for å sikre at
// evaluerings-radene/tokens finnes, og leser så evalueringer-tabellen.
//
// TIDSPUNKT: sender kun hvis norsk klokke er nær evaluering_klokkeslett (13:30).
// Vercel kjører i UTC uten sommertid, så vi regner ut norsk tid med Intl +
// timeZone 'Europe/Oslo' (håndterer sommertid automatisk). Jobben vekkes hver
// time; reservasjonsvernet hindrer dobbeltsending uansett.
//
// NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes (tørrkjøring lov).
//
// FELLE 1: kurs hentes for seg og slås opp i map (ingen tvetydig embed).
// FELLE 2: mottaker-embed må peke på kurs_skole_mottaker_kurs_skole_id_fkey.

const resend = new Resend(process.env.RESEND_API_KEY)

// Hvor nær evaluering_klokkeslett (i minutter) vi tillater å sende. Halvåpent
// vindu [maal-30, maal+30) → med time-vis vekking treffer vi nøyaktig én gang.
const TIDSVINDU_MIN = 30

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}

function tekstTilHtml(tekst) {
  const esc = escapeHtml(tekst)
  return esc
    .split(/\n[ \t]*\n/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Klokke i Norge akkurat nå, som minutter siden midnatt.
function osloMinutterNaa() {
  const deler = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const t = Number(deler.find(d => d.type === 'hour')?.value) % 24
  const m = Number(deler.find(d => d.type === 'minute')?.value)
  return t * 60 + m
}

// Dagens dato i Norge som 'YYYY-MM-DD' (til dato-sammenligning i norsk tid).
// Vercel kjører i UTC, så "i dag" må vurderes i Europe/Oslo, ikke i serverens sone.
function osloDatoIdag() {
  const deler = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const g = (t) => deler.find(d => d.type === t)?.value
  return `${g('year')}-${g('month')}-${g('day')}`
}

// "13:30" → minutter siden midnatt (null hvis ugyldig).
function parseKlokkeslett(s) {
  const treff = /^(\d{1,2}):(\d{2})$/.exec((s || '').trim())
  if (!treff) return null
  const t = Number(treff[1])
  const m = Number(treff[2])
  if (t > 23 || m > 59) return null
  return t * 60 + m
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

  // ---- HVEM RINGER PÅ? ---- (manglet fram til 5. august)
  // Denne har to lovlige innringere: den daglige Vercel-cron-jobben, og en
  // ansatt som kjører den manuelt. Cron-stien står i vercel.json — altså i
  // klartekst i repoet — så uten denne sjekken kunne hvem som helst åpne
  // adressen i en nettleser og utløse ekte evaluerings-e-post.
  // KREVER at CRON_SECRET er satt i Vercel. Er den ikke satt, stopper
  // cron-jobben synlig i stedet for at endepunktet står åpent i stillhet.
  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  // Tørrkjøring er standard. Kun eksplisitt torrkjoring:false (body ELLER query)
  // slår den av. Den daglige cron-jobben vil kalle med torrkjoring=false.
  // Leses ETTER vakten, så en fremmed får 401 og ikke et hint om hva vi vil ha.
  const torrkjoring = !(req.body?.torrkjoring === false || req.query?.torrkjoring === 'false')
  // Testhjelp: hopp over tidsporten for en ekte prøvesending.
  const ignorerTidspunkt = (req.body?.ignorer_tidspunkt === true || req.query?.ignorer_tidspunkt === 'true')

  const naa = () => new Date().toISOString()

  // ---- Innstillinger ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', [
      'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url',
      'motor_aktiv', 'evaluering_klokkeslett',
      'epost_evaluering_emne', 'epost_evaluering_tekst',
    ])

  if (innstFeil) {
    return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  }
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))

  const avsenderNavn = innst.avsender_navn
  const avsenderEpost = innst.avsender_epost
  const svarTilEpost = innst.svar_til_epost
  const nettstedUrl = (innst.nettsted_url || '').trim().replace(/\/+$/, '')
  const motorAktiv = (innst.motor_aktiv || '').trim().toLowerCase()
  const emneMal = innst.epost_evaluering_emne
  const tekstMal = innst.epost_evaluering_tekst
  const maalMin = parseKlokkeslett(innst.evaluering_klokkeslett)

  if (!avsenderEpost || !avsenderNavn) {
    return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger-tabellen.' })
  }
  if (!nettstedUrl) {
    return res.status(500).json({ error: 'Mangler nettsted_url i innstillinger-tabellen — kan ikke bygge evalueringslenke.' })
  }
  if (!emneMal || !tekstMal) {
    return res.status(500).json({ error: 'Mangler epost_evaluering_emne/epost_evaluering_tekst i innstillinger-tabellen.' })
  }

  // ---- NØDBREMS ----
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(409).json({
      error: 'Nødbremsen er på: motor_aktiv står på «nei». Ekte utsending er stanset. Tørrkjøring er fortsatt tillatt.',
      motor_aktiv: motorAktiv,
    })
  }

  // ---- TIDSPORT (kun for ekte sending) ----
  const naaMin = osloMinutterNaa()
  const tidspunktOk = maalMin !== null && naaMin >= maalMin - TIDSVINDU_MIN && naaMin < maalMin + TIDSVINDU_MIN
  if (!torrkjoring && !ignorerTidspunkt && !tidspunktOk) {
    return res.status(200).json({
      ok: true,
      torrkjoring: false,
      tidspunkt_ok: false,
      grunn: maalMin === null
        ? 'Ugyldig evaluering_klokkeslett i innstillinger — sender ikke.'
        : `Ikke innenfor sendevinduet ennå (norsk tid ${Math.floor(naaMin / 60)}:${String(naaMin % 60).padStart(2, '0')}, mål ${innst.evaluering_klokkeslett}).`,
      sendt_antall: 0,
      sendt: [],
    })
  }

  const from = `${avsenderNavn} <${avsenderEpost}>`

  // ---- Finn kurs som er avholdt (kursdato I DAG eller tidligere) ----
  // Kurset holdes 13:00 og evalueringen skal ut kl 13:30 SAMME dag mens
  // opplevelsen er fersk — derfor <= (ikke <). Norsk dato fordi Vercel er i UTC.
  const iDagOslo = osloDatoIdag()

  const { data: kursRader, error: kursFeil } = await supabase
    .from('kurs')
    .select('id, navn, dato')
    .range(0, 9999)
  if (kursFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + kursFeil.message })
  }
  const avholdteKurs = (kursRader || []).filter(k => k.dato && String(k.dato).slice(0, 10) <= iDagOslo)
  const kursMap = Object.fromEntries(avholdteKurs.map(k => [k.id, k]))
  const avholdteIder = Object.keys(kursMap)

  const tomtSvar = {
    ok: true,
    torrkjoring,
    tidspunkt_ok: tidspunktOk,
    ...(torrkjoring ? { ville_sendt_antall: 0, forhandsvisning: [] } : { sendt_antall: 0, sendt: [] }),
    hoppet_over: [],
    feilet: [],
  }
  if (avholdteIder.length === 0) return res.status(200).json(tomtSvar)

  // ---- Kvalifiserte svar-rader: svart JA, ikke evaluering-sendt ennå ----
  const { data: rader, error: raderFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id, svart, kommer, evaluering_sendt_at,
      skoler(navn, hktl_navn, hktl_epost),
      kurs_skole_mottaker!kurs_skole_mottaker_kurs_skole_id_fkey(id, rolle, navn, epost)
    `)
    .eq('svart', true)
    .eq('kommer', true)
    .is('evaluering_sendt_at', null)
    .in('kurs_id', avholdteIder)
    .range(0, 9999)

  if (raderFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente svar-radene: ' + raderFeil.message })
  }
  if (!rader || rader.length === 0) return res.status(200).json(tomtSvar)

  // ---- Sikre evaluerings-rader/tokens (idempotent), så les token per svar-rad ----
  const kursIderMedSvar = [...new Set(rader.map(r => r.kurs_id))]
  for (const kid of kursIderMedSvar) {
    const { error: forbFeil } = await supabase.rpc('forbered_evalueringer', { p_kurs_id: kid })
    if (forbFeil) {
      // Ikke stopp hele jobben — skoler på andre kurs skal fortsatt kunne sendes.
      // Radene for dette kurset vil mangle token og havne i hoppet_over under.
    }
  }

  const svarIder = rader.map(r => r.id)
  const { data: evalRader, error: evalFeil } = await supabase
    .from('evalueringer')
    .select('kurs_skole_id, token')
    .in('kurs_skole_id', svarIder)
  if (evalFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente evaluerings-tokens: ' + evalFeil.message })
  }
  const tokenMap = Object.fromEntries((evalRader || []).map(e => [e.kurs_skole_id, e.token]))

  const forhandsvisning = []
  const sendt = []
  const feilet = []
  const hoppet_over = []

  for (const row of rader) {
    const kurs = kursMap[row.kurs_id]
    const skoleNavn = row.skoler?.navn || '(ukjent skole)'

    const token = tokenMap[row.id]
    if (!token) {
      hoppet_over.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'ingen evaluerings-token (forbered_evalueringer feilet?)' })
      continue
    }

    // FELLE 1: Evalueringen sendes måneder etter JA-svaret. Hovedkontakten kan
    // ha byttet i mellomtiden (f.eks. HTLA slutter til sommeren, skolen
    // registrerer ny). Evalueringen skal treffe DEN som er hovedkontakt NÅ.
    // Vi beholder den frosne mottaker-rad-id-en (for logg-FK + audit-stempel),
    // men bruker skolens nåværende hovedkontakt (skoler.hktl_*) som adresse.
    // Faller tilbake til den frosne adressen om skolen mangler gyldig nåværende
    // hovedkontakt. Evalueringslenken er per skole (evalueringer.token), så den
    // virker uansett hvem som er mottaker.
    const alle = row.kurs_skole_mottaker || []
    const frossenHtla = alle.find(m => m.rolle === 'htla') || null
    let htla = null
    if (frossenHtla) {
      const naaEpost = row.skoler?.hktl_epost
      const brukNaa = gyldigEpost(naaEpost)
      const bruktEpost = brukNaa ? naaEpost.trim() : frossenHtla.epost
      const naaNavn = (row.skoler?.hktl_navn || '').trim()
      const bruktNavn = brukNaa ? (naaNavn || frossenHtla.navn || '') : frossenHtla.navn
      if (gyldigEpost(bruktEpost)) {
        htla = { ...frossenHtla, epost: bruktEpost, navn: bruktNavn }
      }
    }
    if (!htla) {
      hoppet_over.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'ingen hovedkontakt (htla) med e-post' })
      continue
    }

    const verdier = {
      skolenavn: skoleNavn,
      kursnavn: kurs?.navn || '',
      kursdato: formaterDato(kurs?.dato),
      mottaker_navn: htla.navn || '',
    }
    const emne = fyllPlassholdere(emneMal, verdier)
    const brødtekst = tekstTilHtml(fyllPlassholdere(tekstMal, verdier))
    const lenke = `${nettstedUrl}/evaluering/${token}`
    const html = epostMal({
      overskrift: escapeHtml(emne),
      brødtekst,
      knapptekst: 'Åpne evalueringsskjemaet',
      knapplenke: lenke,
      fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet.',
    })

    // ---- TØRRKJØRING ----
    if (torrkjoring) {
      forhandsvisning.push({
        kurs_skole_id: row.id,
        skole: skoleNavn,
        kurs: kurs?.navn || '',
        mottaker_navn: htla.navn || null,
        mottaker_epost: htla.epost,
        emne,
        fra: from,
        svar_til: svarTilEpost || null,
        lenke,
      })
      continue
    }

    // ---- EKTE: reservér stempelet atomisk ----
    const tid = naa()
    const { data: reservert, error: reservFeil } = await supabase
      .from('kurs_skole')
      .update({ evaluering_sendt_at: tid })
      .eq('id', row.id)
      .is('evaluering_sendt_at', null)
      .select('id')

    if (reservFeil) {
      feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'kunne ikke reservere: ' + reservFeil.message })
      continue
    }
    if (!reservert || reservert.length === 0) {
      hoppet_over.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'allerede sendt (reservert)' })
      continue
    }

    let resendId = null
    let sendFeil = null
    try {
      const { data: sendData, error: rFeil } = await resend.emails.send({
        from,
        to: htla.epost,
        subject: emne,
        html,
        ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
      })
      if (rFeil) sendFeil = rFeil.message || String(rFeil)
      else resendId = sendData?.id || null
    } catch (e) {
      sendFeil = e?.message || String(e)
    }

    await supabase.from('epost_logg').insert({
      type: 'evaluering',
      mottaker_epost: htla.epost,
      mottaker_navn: htla.navn || null,
      kurs_skole_id: row.id,
      kurs_skole_mottaker_id: htla.id,
      status: sendFeil ? 'feil' : 'sendt',
      resend_id: resendId,
      feilmelding: sendFeil,
    })

    if (sendFeil) {
      // Frigi reservasjonen så raden kan forsøkes på nytt.
      await supabase.from('kurs_skole').update({ evaluering_sendt_at: null }).eq('id', row.id)
      feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, mottaker_epost: htla.epost, grunn: sendFeil })
      continue
    }

    // Audit: mottakerens sendt_at (E-posten er sendt → aldri frigi reservasjonen her).
    const { error: mottStempFeil } = await supabase
      .from('kurs_skole_mottaker')
      .update({ sendt_at: tid })
      .eq('id', htla.id)

    sendt.push({
      kurs_skole_id: row.id,
      skole: skoleNavn,
      mottaker_epost: htla.epost,
      resend_id: resendId,
      ...(mottStempFeil ? { sendt_men_audit_feilet: true, audit_grunn: mottStempFeil.message } : {}),
    })
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring,
    tidspunkt_ok: tidspunktOk,
    antall_kvalifiserte: rader.length,
    ...(torrkjoring
      ? { ville_sendt_antall: forhandsvisning.length, forhandsvisning }
      : { sendt_antall: sendt.length, sendt }),
    hoppet_over,
    feilet,
  })
}
