import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '../_vakt.js'
import { epostMal } from '../_epost-mal.js'

// Resend Trinn B, steg 3a: automatisk førstegangsutsending av kursinvitasjon.
//
// Tar imot { kurs_id, torrkjoring } og sender KUN til hovedkontakten (rolle 'htla')
// for hver skole på kurset — dette er trinn 1 i trappetrinnet. Øvrige TL-ansvarlige
// (rolle 'tla') skal IKKE ha noe nå.
//
// TØRRKJØRING er standard: uten { torrkjoring: false } gjør endepunktet alt bortsett
// fra å kalle Resend og skrive produksjonsdata (ingen epost_logg, ingen tidsstempler).
// Det returnerer i stedet en lesbar liste over hvem som VILLE fått e-post.
//
// Dobbeltsending: en kurs_skole-rad med forste_utsending_at satt hoppes alltid over.

const resend = new Resend(process.env.RESEND_API_KEY)

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Bytt ut {plassholder} med verdier. Ukjente plassholdere står urørt.
function fyllPlassholdere(mal, verdier) {
  return String(mal || '').replace(/\{(\w+)\}/g, (treff, nokkel) =>
    (nokkel in verdier ? (verdier[nokkel] ?? '') : treff))
}

// En naken URL i malen blir klikkbar. Kjøres ETTER escapeHtml, så det som
// gjøres om til <a> er allerede ufarliggjort tekst — ingen ny injeksjonsvei.
// Trengs fordi {kursinfolenke} skrives inn som ren adresse i malteksten.
function lenkeggjor(escapet) {
  return escapet.replace(/https?:\/\/[^\s<)"]+/g, (url) =>
    `<a href="${url}" style="color:#106C75;">${url}</a>`)
}

// Ren tekst → HTML: tom linje = nytt avsnitt, enkel linjeskift = <br>.
// Hele teksten escapes så skoledata/tekst ikke kan injisere HTML.
function tekstTilHtml(tekst) {
  const esc = lenkeggjor(escapeHtml(tekst))
  return esc
    .split(/\n[ \t]*\n/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Er en {plassholder} på en linje tom, fjernes HELE linja før utfylling — en
// invitasjon som sier «Sted: » er verre enn en som ikke nevner sted. Samme regel
// som strip-logikken i påminnelsen, generalisert til alle plassholderne.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- HVEM RINGER PÅ? ---- (manglet fram til 5. august)
  // Sjekken kommer FØR valideringen av kroppen, så en fremmed får 401 og ikke
  // 400. Et 400-svar røper at endepunktet finnes og hva det vil ha.
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })

  const { kurs_id } = req.body || {}
  // Tørrkjøring er standard. Kun et eksplisitt torrkjoring:false slår den av.
  const torrkjoring = (req.body?.torrkjoring !== false)

  if (!kurs_id) return res.status(400).json({ error: 'Mangler kurs_id' })

  const naa = () => new Date().toISOString()

  // ---- Innstillinger (avsender + reply-to) — leses fra basen, ikke hardkodet ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', [
      'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url', 'motor_aktiv',
      'epost_invitasjon_emne', 'epost_invitasjon_tekst', 'epost_vertskap_notat',
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
  const emneMal = innst.epost_invitasjon_emne
  const tekstMal = innst.epost_invitasjon_tekst
  // Mangler innstillingen → tom streng (linja strippes), ikke avbryt.
  const vertskapNotat = innst.epost_vertskap_notat || ''

  if (!avsenderEpost || !avsenderNavn) {
    return res.status(500).json({
      error: 'Mangler avsender_navn/avsender_epost i innstillinger-tabellen.',
    })
  }
  if (!nettstedUrl) {
    return res.status(500).json({
      error: 'Mangler nettsted_url i innstillinger-tabellen — kan ikke bygge svarlenke. Legg inn nøkkelen (f.eks. https://trivselsleder-ny.vercel.app) og prøv igjen.',
    })
  }
  // SIKKERHETSVENTIL: uten emne/tekst i basen sender vi ALDRI en tom invitasjon,
  // og faller ALDRI tilbake på hardkodet tekst. Invitasjonen er navet — den
  // oppretter mottaker-radene — så heller stopp tydelig enn å sende søppel.
  if (!emneMal || !emneMal.trim() || !tekstMal || !tekstMal.trim()) {
    return res.status(500).json({
      error: 'Mangler epost_invitasjon_emne/epost_invitasjon_tekst i innstillinger-tabellen (eller de er tomme). Legg inn malene før du sender invitasjoner.',
    })
  }
  // NØDBREMS: motor_aktiv = 'nei' → ekte sending nektes (tørrkjøring er lov).
  // Samme bryter uten unntak som send-oppfolging/send-evaluering/varsle-eivind.
  if (!torrkjoring && motorAktiv === 'nei') {
    return res.status(409).json({
      error: 'Nødbremsen er på: motor_aktiv står på «nei». Ekte utsending er stanset. ' +
             'Tørrkjøring (torrkjoring:true) er fortsatt tillatt for å se hva som ville gått ut.',
      motor_aktiv: motorAktiv,
    })
  }

  const from = `${avsenderNavn} <${avsenderEpost}>`
  const lenkeFor = (token) => `${nettstedUrl}/svar/${token}`
  // A5: samme token, annen side. Invitasjonens KNAPP peker fortsatt på
  // svarskjemaet — skolen har ikke svart ennå. Men {kursinfolenke} er
  // tilgjengelig i malen for den som vil nevne siden i teksten.
  const kursinfoLenkeFor = (token) => `${nettstedUrl}/kursinfo/${token}`

  // ---- Kurs (hentes direkte på id — ingen embed, så tvetydigheten mellom de to
  //      fremmednøklene kurs_skole→kurs oppstår ikke i det hele tatt) ----
  const { data: kurs, error: kursFeil } = await supabase
    .from('kurs')
    .select('id, navn, dato, hall_id, oppmote_vertskap, oppmote_ovrige')
    .eq('id', kurs_id)
    .single()

  if (kursFeil || !kurs) {
    return res.status(404).json({ error: 'Fant ikke kurset: ' + (kursFeil?.message || 'ukjent id') })
  }
  const kursDato = formaterDato(kurs.dato)

  // Hall-navn til {hall}-plassholderen. Service-rollen har SELECT på haller
  // (verifisert — samme rolle send-oppfolging bruker). Mangler den, feiler vi
  // tydelig her i stedet for å sende en invitasjon uten sted.
  let hallNavn = ''
  if (kurs.hall_id) {
    const { data: hallRad, error: hallFeil } = await supabase
      .from('haller').select('navn').eq('id', kurs.hall_id).single()
    if (hallFeil) {
      return res.status(500).json({ error: 'Kunne ikke hente hall: ' + hallFeil.message })
    }
    hallNavn = hallRad?.navn || ''
  }

  // ---- Alle svar-rader (skoler) på kurset ----
  const { data: koblinger, error: koblingFeil } = await supabase
    .from('kurs_skole')
    .select('id, forste_utsending_at, skole_id, er_vertskap, skoler(navn)')
    .eq('kurs_id', kurs_id)
    .range(0, 9999)

  if (koblingFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente skoler på kurset: ' + koblingFeil.message })
  }

  const forhandsvisning = [] // tørrkjøring: hvem som ville fått e-post
  const sendt = []           // ekte kjøring: fullført
  const feilet = []          // per skole som feilet — vi fortsetter uansett
  const hoppet_over = []     // allerede sendt eller ingen hovedkontakt

  for (const kobling of (koblinger || [])) {
    const skoleNavn = kobling.skoler?.navn || '(ukjent skole)'

    // 2) Aldri sende dobbelt — RASK VEI. Er feltet allerede satt i masse-lesingen,
    //    slipper vi å bygge mottakere. Men denne lesingen er IKKE autoriteten:
    //    den ekte reservasjonen skjer atomisk rett før sending (se under), slik at
    //    vernet holder selv om denne masse-select-en skulle vise feil.
    if (kobling.forste_utsending_at) {
      hoppet_over.push({ skole: skoleNavn, grunn: 'allerede sendt', forste_utsending_at: kobling.forste_utsending_at })
      continue
    }

    // 3) Bygg mottaker-rader (idempotent)
    const { error: genFeil } = await supabase.rpc('opprett_kurs_skole_mottakere', {
      p_kurs_skole_id: kobling.id,
    })
    if (genFeil) {
      feilet.push({ skole: skoleNavn, grunn: 'kunne ikke opprette mottakere: ' + genFeil.message })
      continue // 8) fortsett til neste skole
    }

    // 4) KUN hovedkontakten (rolle 'htla') — trinn 1 i trappetrinnet
    const { data: htlaRader, error: mottFeil } = await supabase
      .from('kurs_skole_mottaker')
      .select('id, navn, epost, lenke_token')
      .eq('kurs_skole_id', kobling.id)
      .eq('rolle', 'htla')
      .limit(1)

    if (mottFeil) {
      feilet.push({ skole: skoleNavn, grunn: 'kunne ikke hente hovedkontakt: ' + mottFeil.message })
      continue
    }
    const htla = (htlaRader || [])[0]
    if (!htla || !htla.epost) {
      // Ingen hovedkontakt med e-post: la forste_utsending_at stå tom så det kan
      // kjøres på nytt når kontakten er lagt inn.
      hoppet_over.push({ skole: skoleNavn, grunn: 'ingen hovedkontakt (htla) med e-post' })
      continue
    }

    // 5) Egen lenke bygget på mottakerens egen lenke_token
    const lenke = lenkeFor(htla.lenke_token)

    // Bygg e-posten fra malen i innstillinger — nøyaktig samme mønster som de fem
    // andre. Overskrift/knapptekst/fottekst blir stående i koden (som de andre).
    // OPPMØTETID styres av er_vertskap på DENNE raden (skolen), ikke mottakerrollen.
    const oppmoteRaa = kobling.er_vertskap ? kurs.oppmote_vertskap : kurs.oppmote_ovrige
    const verdier = {
      skolenavn: skoleNavn,
      kursnavn: kurs.navn || '',
      kursdato: kursDato,
      hall: hallNavn,
      oppmotetid: oppmoteRaa ? String(oppmoteRaa).slice(0, 5) : '',
      vertskapsnotat: kobling.er_vertskap ? vertskapNotat : '',
      mottaker_navn: htla.navn || '',
      kursinfolenke: kursinfoLenkeFor(htla.lenke_token),
    }
    const emne = fyllPlassholdere(emneMal, verdier)
    const tekstUtenTomme = fjernTommePlassholderLinjer(tekstMal, verdier)
    const html = epostMal({
      overskrift: `Invitasjon til kurs: ${escapeHtml(verdier.kursnavn)}`,
      brødtekst: tekstTilHtml(fyllPlassholdere(tekstUtenTomme, verdier)),
      knapptekst: 'Åpne svarskjemaet',
      knapplenke: lenke,
      fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet.',
    })

    // ---- TØRRKJØRING: ingen Resend, ingen skriving. Bare vis hvem som ville fått ----
    if (torrkjoring) {
      forhandsvisning.push({
        skole: skoleNavn,
        mottaker_navn: htla.navn || null,
        mottaker_epost: htla.epost,
        emne,
        fra: from,
        svar_til: svarTilEpost || null,
        lenke,
      })
      continue
    }

    // ---- EKTE KJØRING ----

    // 6) ATOMISK RESERVASJON — selve dobbeltsendings-vernet.
    //    Vi flipper forste_utsending_at fra NULL til nå i ETT kall. Betingelsen
    //    .is('forste_utsending_at', null) gjør at bare den FØRSTE kjøringen vinner:
    //    en andre kjøring får null rader tilbake og hopper over. Dette er
    //    uavhengig av masse-lesingen over, så et upålitelig les-resultat kan
    //    ikke lenger føre til dobbeltsending.
    const tid = naa()
    const { data: reservert, error: reservFeil } = await supabase
      .from('kurs_skole')
      .update({ forste_utsending_at: tid })
      .eq('id', kobling.id)
      .is('forste_utsending_at', null)
      .select('id')

    if (reservFeil) {
      feilet.push({ skole: skoleNavn, mottaker_epost: htla.epost, grunn: 'kunne ikke reservere utsending: ' + reservFeil.message })
      continue // 8) fortsett til neste skole
    }
    if (!reservert || reservert.length === 0) {
      // Raden var allerede reservert av en tidligere kjøring → aldri send dobbelt.
      hoppet_over.push({ skole: skoleNavn, grunn: 'allerede sendt (reservert)' })
      continue
    }

    // Vi holder reservasjonen. Nå sendes e-posten.
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

    // 7) Én rad til epost_logg per forsøk — også ved feil
    await supabase.from('epost_logg').insert({
      type: 'kursinvitasjon',
      mottaker_epost: htla.epost,
      mottaker_navn: htla.navn || null,
      kurs_skole_id: kobling.id,
      kurs_skole_mottaker_id: htla.id,
      status: sendFeil ? 'feil' : 'sendt',
      resend_id: resendId,
      feilmelding: sendFeil,
    })

    if (sendFeil) {
      // Sendingen feilet: FRIGI reservasjonen så skolen kan forsøkes på nytt.
      // (Slik holder vi på regelen om at stempelet bare står når e-post faktisk gikk.)
      await supabase.from('kurs_skole').update({ forste_utsending_at: null }).eq('id', kobling.id)
      feilet.push({ skole: skoleNavn, mottaker_epost: htla.epost, grunn: sendFeil })
      continue // 8) fortsett til neste skole
    }

    // 8) Sendt OK. forste_utsending_at står allerede (fra reservasjonen).
    //    Stemple mottakerens sendt_at (audit). E-posten ER sendt, så her frigir
    //    vi ALDRI reservasjonen — vi rapporterer bare hvis audit-stempelet glapp.
    const { data: mottStemp, error: mottStempFeil } = await supabase
      .from('kurs_skole_mottaker')
      .update({ sendt_at: tid })
      .eq('id', htla.id)
      .select('id')

    if (mottStempFeil || (mottStemp?.length ?? 0) === 0) {
      feilet.push({
        skole: skoleNavn,
        mottaker_epost: htla.epost,
        resend_id: resendId,
        sendt_men_audit_feilet: true,
        grunn: 'E-post sendt og reservert OK, men mottakerens sendt_at kunne ikke skrives: ' +
               (mottStempFeil ? mottStempFeil.message : 'oppdateringen traff ingen rad'),
      })
      continue
    }

    sendt.push({ skole: skoleNavn, mottaker_epost: htla.epost, resend_id: resendId })
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring,
    motor_aktiv: motorAktiv || null,
    kurs: { id: kurs.id, navn: kurs.navn },
    antall_skoler: (koblinger || []).length,
    ...(torrkjoring
      ? { ville_sendt_antall: forhandsvisning.length, forhandsvisning }
      : { sendt_antall: sendt.length, sendt }),
    hoppet_over,
    feilet,
  })
}
