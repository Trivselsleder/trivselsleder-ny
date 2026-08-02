import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { epostMal } from '../_epost-mal.js'

// Resend Trinn B, steg 3c del 1: sendefunksjon for de tre KNAPP-STYRTE
// utsendingene — purring, trinn 3 og påminnelse. (Evaluering og Eivind-varsel
// er automatiske og bygges i del 2 — ikke her.)
//
// Tar imot { type, kurs_skole_ids, torrkjoring }:
//   type            – 'purring' | 'trinn3' | 'paaminnelse'
//   kurs_skole_ids  – akkurat de radene RA har huket av. Vi sender KUN til disse,
//                     aldri "alle automatisk".
//   torrkjoring     – standard true (som send-invitasjon.js). Kun et eksplisitt
//                     torrkjoring:false slår den av og sender på ekte.
//
// NØDBREMS: innstillingen motor_aktiv. Står den på 'nei', nektes ekte sending
// (tørrkjøring er fortsatt lov, så man kan se hva som VILLE gått ut).
//
// Modellen er "systemet foreslår, mennesket bestemmer": vi stoler ikke blindt på
// frontend. Hver rad verifiseres på nytt mot de samme reglene som
// hvem-star-for-tur.js før den får e-post.
//
// FELLE 1: kurs_skole har to fremmednøkler til kurs → vi henter kurs for seg og
//          slår dem opp i et map (ingen tvetydig embed).
// FELLE 2: kurs_skole har to relasjoner til kurs_skole_mottaker → embeden må
//          peke eksplisitt på kurs_skole_mottaker_kurs_skole_id_fkey.

const resend = new Resend(process.env.RESEND_API_KEY)

// Per type: hvilket stempel som reserveres, hvilke innstillingsnøkler teksten
// hentes fra, hvilken rolle som er mottaker, logg-type og knapptekst.
const TYPER = {
  purring: {
    stempel: 'purring_sendt_at',
    emneNokkel: 'epost_purring_emne',
    tekstNokkel: 'epost_purring_tekst',
    logg: 'purring',
    mottakerRolle: 'htla',
    knapptekst: 'Åpne svarskjemaet',
  },
  trinn3: {
    stempel: 'trinn3_sendt_at',
    emneNokkel: 'epost_trinn3_emne',
    tekstNokkel: 'epost_trinn3_tekst',
    logg: 'trinn3',
    mottakerRolle: 'tla',
    knapptekst: 'Åpne svarskjemaet',
  },
  paaminnelse: {
    stempel: 'paaminnelse_sendt_at',
    emneNokkel: 'epost_paaminnelse_emne',
    tekstNokkel: 'epost_paaminnelse_tekst',
    logg: 'paaminnelse',
    mottakerRolle: 'htla',
    knapptekst: 'Se påmeldingen',
  },
}

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
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

// Ren tekst → HTML: tom linje = nytt avsnitt, enkel linjeskift = <br>.
// Hele teksten escapes så skoledata/tekst ikke kan injisere HTML.
function tekstTilHtml(tekst) {
  const esc = escapeHtml(tekst)
  return esc
    .split(/\n[ \t]*\n/)
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => `<p style="font-size:15px;color:#444;line-height:1.6;margin:0 0 16px;">${a.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, kurs_skole_ids } = req.body || {}
  const torrkjoring = (req.body?.torrkjoring !== false)

  const cfg = TYPER[type]
  if (!cfg) {
    return res.status(400).json({ error: "Ugyldig type. Må være 'purring', 'trinn3' eller 'paaminnelse'." })
  }
  if (!Array.isArray(kurs_skole_ids) || kurs_skole_ids.length === 0) {
    return res.status(400).json({ error: 'Mangler kurs_skole_ids (liste over radene som skal sendes til).' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const naa = () => new Date().toISOString()

  // ---- Innstillinger (avsender, svar-til, url, nødbrems, terskler, tekst) ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', [
      'avsender_navn', 'avsender_epost', 'svar_til_epost', 'nettsted_url',
      'motor_aktiv', 'purring_dager', 'trinn3_dager',
      cfg.emneNokkel, cfg.tekstNokkel,
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
  const purringDager = Number.parseInt(innst.purring_dager, 10)
  const trinn3Dager = Number.parseInt(innst.trinn3_dager, 10)
  const emneMal = innst[cfg.emneNokkel]
  const tekstMal = innst[cfg.tekstNokkel]

  if (!avsenderEpost || !avsenderNavn) {
    return res.status(500).json({ error: 'Mangler avsender_navn/avsender_epost i innstillinger-tabellen.' })
  }
  if (!nettstedUrl) {
    return res.status(500).json({ error: 'Mangler nettsted_url i innstillinger-tabellen — kan ikke bygge svarlenke.' })
  }
  if (!emneMal || !tekstMal) {
    return res.status(500).json({ error: `Mangler ${cfg.emneNokkel}/${cfg.tekstNokkel} i innstillinger-tabellen.` })
  }
  if ((type === 'purring' && !Number.isFinite(purringDager)) ||
      (type === 'trinn3' && !Number.isFinite(trinn3Dager))) {
    return res.status(500).json({ error: 'Mangler tallverdi for purring_dager/trinn3_dager i innstillinger-tabellen.' })
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
  const lenkeFor = (token) => `${nettstedUrl}/svar/${token}`

  // ---- Radene RA huket av, med skolenavn og mottakere (FELLE 2) ----
  const { data: rader, error: raderFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id, svart, kommer, antall_tl,
      forste_utsending_at, purring_sendt_at, trinn3_sendt_at,
      paaminnelse_sendt_at, evaluering_sendt_at,
      skoler(navn),
      kurs_skole_mottaker!kurs_skole_mottaker_kurs_skole_id_fkey(id, rolle, navn, epost, lenke_token)
    `)
    .in('id', kurs_skole_ids)

  if (raderFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente svar-radene: ' + raderFeil.message })
  }

  // ---- Kurs (FELLE 1) og haller i egne oppslag ----
  const kursIder = [...new Set((rader || []).map(r => r.kurs_id).filter(Boolean))]
  let kursMap = {}
  if (kursIder.length > 0) {
    const { data: kursRader, error: kursFeil } = await supabase
      .from('kurs')
      .select('id, navn, dato, hall_id, start_tid')
      .in('id', kursIder)
    if (kursFeil) {
      return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + kursFeil.message })
    }
    kursMap = Object.fromEntries((kursRader || []).map(k => [k.id, k]))
  }

  const hallIder = [...new Set(Object.values(kursMap).map(k => k.hall_id).filter(Boolean))]
  let hallMap = {}
  if (hallIder.length > 0) {
    const { data: hallRader, error: hallFeil } = await supabase
      .from('haller')
      .select('id, navn')
      .in('id', hallIder)
    if (hallFeil) {
      return res.status(500).json({ error: 'Kunne ikke hente haller: ' + hallFeil.message })
    }
    hallMap = Object.fromEntries((hallRader || []).map(h => [h.id, h.navn]))
  }

  const iDag = new Date()
  iDag.setHours(0, 0, 0, 0)

  const forhandsvisning = [] // tørrkjøring
  const sendt = []           // ekte, vellykket
  const feilet = []          // per mottaker/rad som feilet
  const hoppet_over = []     // kvalifiserer ikke, mangler mottaker, eller allerede sendt

  // Rader vi fikk tilbake (noen id-er kan mangle hvis de ikke finnes)
  const funnetIder = new Set((rader || []).map(r => r.id))
  for (const id of kurs_skole_ids) {
    if (!funnetIder.has(id)) hoppet_over.push({ kurs_skole_id: id, grunn: 'fant ikke svar-raden' })
  }

  for (const row of (rader || [])) {
    const kurs = kursMap[row.kurs_id]
    const skoleNavn = row.skoler?.navn || '(ukjent skole)'
    if (!kurs) {
      hoppet_over.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'fant ikke kurset' })
      continue
    }

    // --- 1) Verifiser at raden faktisk kvalifiserer (stol ikke på frontend) ---
    const dager = dagerSiden(row.forste_utsending_at)
    const ikkeSvart = !row.svart
    const svartJa = row.svart === true && row.kommer === true
    const kursIkkeAvholdt = kurs.dato ? new Date(kurs.dato) >= iDag : false

    let kvalifiserer = false
    let avvist = ''
    if (type === 'purring') {
      if (!ikkeSvart) avvist = 'skolen har allerede svart'
      else if (row.purring_sendt_at) avvist = 'purring allerede sendt'
      else if (dager === null || dager < purringDager) avvist = `ikke gammel nok (${dager ?? 'ingen første utsending'} < ${purringDager} dager)`
      else kvalifiserer = true
    } else if (type === 'trinn3') {
      if (!ikkeSvart) avvist = 'skolen har allerede svart'
      else if (row.trinn3_sendt_at) avvist = 'trinn 3 allerede sendt'
      else if (dager === null || dager < trinn3Dager) avvist = `ikke gammel nok (${dager ?? 'ingen første utsending'} < ${trinn3Dager} dager)`
      else kvalifiserer = true
    } else { // paaminnelse
      if (!svartJa) avvist = 'skolen har ikke svart JA'
      else if (!kursIkkeAvholdt) avvist = 'kurset er allerede avholdt (eller mangler dato)'
      else if (row.paaminnelse_sendt_at) avvist = 'påminnelse allerede sendt'
      else kvalifiserer = true
    }

    if (!kvalifiserer) {
      hoppet_over.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: avvist })
      continue
    }

    // --- 2) Finn mottaker(e) ---
    const alle = row.kurs_skole_mottaker || []
    let mottakere
    if (cfg.mottakerRolle === 'htla') {
      const h = alle.find(m => m.rolle === 'htla' && gyldigEpost(m.epost))
      mottakere = h ? [h] : []
    } else { // tla — alle øvrige med e-post
      mottakere = alle.filter(m => m.rolle === 'tla' && gyldigEpost(m.epost))
    }

    if (mottakere.length === 0) {
      hoppet_over.push({
        kurs_skole_id: row.id,
        skole: skoleNavn,
        grunn: cfg.mottakerRolle === 'htla'
          ? 'ingen hovedkontakt (htla) med e-post'
          : 'ingen øvrige TL-ansvarlige (tla) med e-post',
      })
      continue
    }

    // Plassholder-verdier felles for raden (mottaker_navn settes per mottaker)
    const grunnverdier = {
      skolenavn: skoleNavn,
      kursnavn: kurs.navn || '',
      kursdato: formaterDato(kurs.dato),
      hall: (kurs.hall_id && hallMap[kurs.hall_id]) || '',
      oppmotetid: kurs.start_tid || '',
      antall_tl: row.antall_tl == null ? '' : String(row.antall_tl),
    }

    const byggEpost = (m) => {
      const verdier = { ...grunnverdier, mottaker_navn: m.navn || '' }
      const emne = fyllPlassholdere(emneMal, verdier)
      const brødtekst = tekstTilHtml(fyllPlassholdere(tekstMal, verdier))
      const knapptekst = fyllPlassholdere(cfg.knapptekst, verdier)
      const lenke = lenkeFor(m.lenke_token)
      const html = epostMal({
        overskrift: escapeHtml(emne),
        brødtekst,
        knapptekst,
        knapplenke: lenke,
        fottekst: 'Lenken er personlig for din skole. Svar på selve e-posten blir ikke lest eller registrert — bruk skjemaet.',
      })
      return { emne, html, lenke }
    }

    // --- TØRRKJØRING: ingen reservasjon, ingen sending, ingen logg ---
    if (torrkjoring) {
      for (const m of mottakere) {
        const { emne, lenke } = byggEpost(m)
        forhandsvisning.push({
          kurs_skole_id: row.id,
          skole: skoleNavn,
          kurs: kurs.navn || '',
          mottaker_rolle: m.rolle,
          mottaker_navn: m.navn || null,
          mottaker_epost: m.epost,
          emne,
          fra: from,
          svar_til: svarTilEpost || null,
          lenke,
        })
      }
      continue
    }

    // --- 3) ATOMISK RESERVASJON av stempelet (dobbeltsendings-vernet) ---
    //     Én reservasjon per svar-rad. For trinn3 (flere mottakere) dekker
    //     stempelet hele raden; vi sender så til alle tla-mottakerne.
    const tid = naa()
    const { data: reservert, error: reservFeil } = await supabase
      .from('kurs_skole')
      .update({ [cfg.stempel]: tid })
      .eq('id', row.id)
      .is(cfg.stempel, null)
      .select('id')

    if (reservFeil) {
      feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'kunne ikke reservere: ' + reservFeil.message })
      continue
    }
    if (!reservert || reservert.length === 0) {
      hoppet_over.push({ kurs_skole_id: row.id, skole: skoleNavn, grunn: 'allerede sendt (reservert)' })
      continue
    }

    // --- 4-6) Send til hver mottaker, én epost_logg-rad per forsøk ---
    let noenOk = false
    for (const m of mottakere) {
      const { emne, html } = byggEpost(m)
      let resendId = null
      let sendFeil = null
      try {
        const { data: sendData, error: rFeil } = await resend.emails.send({
          from,
          to: m.epost,
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
        type: cfg.logg,
        mottaker_epost: m.epost,
        mottaker_navn: m.navn || null,
        kurs_skole_id: row.id,
        kurs_skole_mottaker_id: m.id,
        status: sendFeil ? 'feil' : 'sendt',
        resend_id: resendId,
        feilmelding: sendFeil,
      })

      if (sendFeil) {
        feilet.push({ kurs_skole_id: row.id, skole: skoleNavn, mottaker_epost: m.epost, grunn: sendFeil })
        continue
      }

      noenOk = true
      // Audit: stemple mottakerens sendt_at. E-posten ER sendt, så her frigir
      // vi aldri reservasjonen — vi rapporterer bare hvis stempelet glapp.
      const { error: mottStempFeil } = await supabase
        .from('kurs_skole_mottaker')
        .update({ sendt_at: tid })
        .eq('id', m.id)

      sendt.push({
        kurs_skole_id: row.id,
        skole: skoleNavn,
        mottaker_epost: m.epost,
        resend_id: resendId,
        ...(mottStempFeil ? { sendt_men_audit_feilet: true, audit_grunn: mottStempFeil.message } : {}),
      })
    }

    // 7) Gikk INGEN mottaker gjennom: frigi reservasjonen så raden kan forsøkes
    //    på nytt. (For htla betyr det den ene som feilet; for trinn3 alle.)
    if (!noenOk) {
      await supabase.from('kurs_skole').update({ [cfg.stempel]: null }).eq('id', row.id)
    }
  }

  return res.status(200).json({
    ok: feilet.length === 0,
    torrkjoring,
    type,
    motor_aktiv: motorAktiv || null,
    antall_forespurt: kurs_skole_ids.length,
    ...(torrkjoring
      ? { ville_sendt_antall: forhandsvisning.length, forhandsvisning }
      : { sendt_antall: sendt.length, sendt }),
    hoppet_over,
    feilet,
  })
}
