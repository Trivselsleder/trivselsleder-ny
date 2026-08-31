import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevCronEllerAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

// MODUL «Spørreundersøkelse til skolene» — MANUELL PURRING (påminnelse).
//
// KLON av api/skoleus/send-runde.js (systemets live-beviste utsendingsflyt), men:
//   - Sender KUN til mottakere som fikk lenke (sendt_at satt), IKKE har svart
//     (svart_at null), og IKKE er purret før (purring_sendt_at null). Den samme
//     lenka (lenke_token) — levende lenke, ingen ny token.
//   - Egen mal: epost_skoleus_purring_emne / epost_skoleus_purring_tekst (migr 085).
//     500-er trygt hvis nøklene mangler — ALDRI hardkodet fallback.
//   - ÉN-gangs-purring låst av atomisk reservasjon på purring_sendt_at (NULL→nå).
//     Purrer ALDRI samme mottaker to ganger; feiler Resend, frigis stempelet.
//   - epost_logg-rad per forsøk med type='skoleundersokelse_purring' (egen type så
//     purringer kan skilles fra førstegangsutsending i loggen; epost_logg.type har
//     ingen check-constraint — bekreftet i migr 082). kurs_skole-kolonnene står NULL.
//   - Regenererer IKKE mottakere: purring gjelder bare de som ALT er sendt til.
//
// TØRRKJØRING er standard (fail-closed): uten { torrkjoring:false } gjør ruten alt
// unntatt å kalle Resend og skrive tidsstempler/logg — den returnerer i stedet en
// lesbar liste over hvem som VILLE fått purring.
//
// NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes (tørrkjøring fortsatt lov).

const resend = new Resend(process.env.RESEND_API_KEY)

// {plassholder} → verdi. Ukjente plassholdere står urørt. Speiler send-runde.js.
function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// En naken URL i malen blir klikkbar (etter escapeHtml — ingen ny injeksjonsvei).
function lenkeggjor(escapet) {
  return escapet.replace(/https?:\/\/[^\s<)"]+/g, (url) =>
    `<a href="${url}" style="color:#106C75;">${url}</a>`)
}

// Ren tekst → HTML: tom linje = nytt avsnitt, enkel linjeskift = <br>. Hele teksten
// escapes så skole-/mottakerdata ikke kan injisere HTML.
function tekstTilHtml(tekst) {
  const esc = lenkeggjor(escapeHtml(tekst))
  return esc
    .split(/\n[ \t]*\n/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Er en {plassholder} på en linje tom, fjernes HELE linja før utfylling.
function fjernTommePlassholderLinjer(mal, verdier) {
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

// Bygg emne + HTML for én purre-mottaker. Delt av ekte utsending, forhåndsvisning og test.
function byggEpost({ emneMal, tekstMal, skoleNavn, mottakerNavn, lenke }) {
  const verdier = { skolenavn: skoleNavn, mottaker_navn: mottakerNavn || '' }
  const emne = fyllPlassholdere(emneMal, verdier)
  const tekstUtenTomme = fjernTommePlassholderLinjer(tekstMal, verdier)
  const html = epostMal({
    overskrift: 'Påminnelse: spørreundersøkelse fra Trivselsleder',
    brødtekst: tekstTilHtml(fyllPlassholdere(tekstUtenTomme, verdier)),
    knapptekst: 'Åpne undersøkelsen',
    knapplenke: lenke,
    fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet. Du kan åpne lenken på nytt og endre svaret så lenge undersøkelsen er åpen.',
  })
  return { emne, html }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? — cron ELLER innlogget ansatt. FØR validering av kroppen. ----
  const nekt = await krevCronEllerAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const { runde_id } = req.body || {}
  // Tørrkjøring er standard. Kun et eksplisitt torrkjoring:false slår den av.
  const torrkjoring = (req.body?.torrkjoring !== false)
  // Valgfri: send én test-purring til én adresse (ingen skriving, ingen reservasjon).
  const testEpost = (req.body?.test_epost || '').toString().trim() || null

  if (!runde_id) return res.status(400).json({ error: 'Mangler runde_id' })

  const naa = () => new Date().toISOString()

  // ---- Innstillinger (avsender + reply-to + PURRE-maler + nødbrems + nettsted_url) ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', [
      'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv',
      'epost_skoleus_purring_emne', 'epost_skoleus_purring_tekst',
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
  const emneMal = innst.epost_skoleus_purring_emne
  const tekstMal = innst.epost_skoleus_purring_tekst

  if (!avsenderEpost || !avsenderNavn) {
    return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger-tabellen.' })
  }
  if (!nettstedUrl) {
    return res.status(500).json({
      error: 'Mangler nettsted_url i innstillinger-tabellen — kan ikke bygge svarlenke. Legg inn nøkkelen (f.eks. https://trivselsleder-ny.vercel.app) og prøv igjen.',
    })
  }
  // SIKKERHETSVENTIL: uten purre-emne/-tekst i basen sender vi ALDRI en tom purring,
  // og faller ALDRI tilbake på hardkodet tekst.
  if (!emneMal || !emneMal.trim() || !tekstMal || !tekstMal.trim()) {
    return res.status(500).json({
      error: 'Mangler epost_skoleus_purring_emne/epost_skoleus_purring_tekst i innstillinger-tabellen (eller de er tomme). Kjør migrasjon 085 og/eller legg inn purre-malene før utsending.',
    })
  }
  // NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes (tørrkjøring er lov).
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(409).json({
      error: 'Nødbremsen er på: motor_aktiv står på «nei». Ekte utsending er stanset. ' +
             'Tørrkjøring (torrkjoring:true) er fortsatt tillatt for å se hva som ville gått ut.',
      motor_aktiv: motorAktiv,
    })
  }

  const from = `${avsenderNavn} <${avsenderEpost}>`
  const lenkeFor = (token) => `${nettstedUrl}/skoleundersokelse/${token}`

  // ---- Runden må finnes og være aktiv (ekte utsending). ----
  const { data: runde, error: rundeFeil } = await supabase
    .from('skoleus_runder')
    .select('id, navn, status')
    .eq('id', runde_id)
    .maybeSingle()
  if (rundeFeil) return res.status(500).json({ error: 'Kunne ikke lese runden: ' + rundeFeil.message })
  if (!runde) return res.status(404).json({ error: 'Fant ikke runden.' })
  if (!torrkjoring && runde.status !== 'aktiv') {
    return res.status(409).json({ error: `Runden må være aktiv for ekte purring (status er «${runde.status}»).` })
  }

  // ---- TEST TIL ÉN ADRESSE: bygg og send (eller vis) ÉN purring, ingen skriving. ----
  if (testEpost) {
    const { emne, html } = byggEpost({
      emneMal, tekstMal, skoleNavn: '(testskole)', mottakerNavn: 'testmottaker',
      lenke: lenkeFor('00000000-0000-0000-0000-000000000000'),
    })
    if (torrkjoring) {
      return res.status(200).json({ torrkjoring: true, test_epost: testEpost, emne, fra: from, svar_til: svarTilEpost || null })
    }
    if (motorAktiv === 'nei') {
      return res.status(409).json({ error: 'Nødbremsen er på (motor_aktiv=nei) — testsending stanset.' })
    }
    let resendId = null, sendFeil = null
    try {
      const { data: sendData, error: rFeil } = await resend.emails.send({
        from, to: testEpost, subject: `[TEST] ${emne}`, html,
        ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
      })
      if (rFeil) sendFeil = rFeil.message || String(rFeil)
      else resendId = sendData?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }
    if (sendFeil) return res.status(502).json({ ok: false, test_epost: testEpost, feil: sendFeil })
    return res.status(200).json({ ok: true, test_epost: testEpost, resend_id: resendId })
  }

  // ---- PURRE-UTTREKK: fikk lenke (sendt_at satt), IKKE svart, IKKE purret, har e-post.
  //      Ingen regenerering — purring gjelder bare de som alt er sendt til.
  const { data: mottakere, error: mottFeil } = await supabase
    .from('skoleus_mottaker')
    .select('id, navn, epost, lenke_token, skole_id, skoler(navn)')
    .eq('runde_id', runde_id)
    .not('sendt_at', 'is', null)
    .is('svart_at', null)
    .is('purring_sendt_at', null)
    .not('epost', 'is', null)
    .range(0, 9999)
  if (mottFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente mottakere: ' + mottFeil.message })
  }

  const forhandsvisning = [] // tørrkjøring
  const sendt = []           // ekte kjøring
  const feilet = []          // per mottaker som feilet — vi fortsetter uansett
  const hoppet_over = []     // uten e-post e.l.

  for (const m of (mottakere || [])) {
    const skoleNavn = m.skoler?.navn || '(ukjent skole)'
    if (!m.epost) {
      hoppet_over.push({ skole: skoleNavn, grunn: 'mangler e-post' })
      continue
    }
    const lenke = lenkeFor(m.lenke_token)
    const { emne, html } = byggEpost({ emneMal, tekstMal, skoleNavn, mottakerNavn: m.navn, lenke })

    // ---- TØRRKJØRING: ingen Resend, ingen skriving. ----
    if (torrkjoring) {
      forhandsvisning.push({
        skole: skoleNavn, mottaker_navn: m.navn || null, mottaker_epost: m.epost,
        emne, fra: from, svar_til: svarTilEpost || null, lenke,
      })
      continue
    }

    // ---- EKTE KJØRING ----
    // ATOMISK RESERVASJON: purring_sendt_at NULL→nå. Bare FØRSTE kjøring vinner raden;
    // purrer aldri samme mottaker to ganger.
    const tid = naa()
    const { data: reservert, error: reservFeil } = await supabase
      .from('skoleus_mottaker')
      .update({ purring_sendt_at: tid })
      .eq('id', m.id)
      .is('purring_sendt_at', null)
      .select('id')
    if (reservFeil) {
      feilet.push({ skole: skoleNavn, mottaker_epost: m.epost, grunn: 'kunne ikke reservere: ' + reservFeil.message })
      continue
    }
    if (!reservert || reservert.length === 0) {
      hoppet_over.push({ skole: skoleNavn, grunn: 'allerede purret (reservert)' })
      continue
    }

    // Vi holder reservasjonen. Send purringen.
    let resendId = null, sendFeil = null
    try {
      const { data: sendData, error: rFeil } = await resend.emails.send({
        from, to: m.epost, subject: emne, html,
        ...(svarTilEpost ? { replyTo: svarTilEpost } : {}),
      })
      if (rFeil) sendFeil = rFeil.message || String(rFeil)
      else resendId = sendData?.id || null
    } catch (e) { sendFeil = e?.message || String(e) }

    // Én rad til epost_logg per forsøk — også ved feil. kurs_skole-kolonnene står NULL.
    await supabase.from('epost_logg').insert({
      type: 'skoleundersokelse_purring',
      mottaker_epost: m.epost,
      mottaker_navn: m.navn || null,
      status: sendFeil ? 'feil' : 'sendt',
      resend_id: resendId,
      feilmelding: sendFeil,
    })

    if (sendFeil) {
      // FRIGI reservasjonen så mottakeren kan purres på nytt.
      await supabase.from('skoleus_mottaker').update({ purring_sendt_at: null }).eq('id', m.id)
      feilet.push({ skole: skoleNavn, mottaker_epost: m.epost, grunn: sendFeil })
      continue
    }

    sendt.push({ skole: skoleNavn, mottaker_epost: m.epost, resend_id: resendId })
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring,
    motor_aktiv: motorAktiv || null,
    runde: { id: runde.id, navn: runde.navn, status: runde.status },
    antall_mottakere: (mottakere || []).length,
    ...(torrkjoring
      ? { ville_sendt_antall: forhandsvisning.length, forhandsvisning }
      : { sendt_antall: sendt.length, sendt }),
    hoppet_over,
    feilet,
  })
}
