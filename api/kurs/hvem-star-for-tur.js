import { createClient } from '@supabase/supabase-js'

// Resend Trinn B, steg 3b: "hvem står for tur"-motoren.
//
// Denne funksjonen SENDER INGENTING og SKRIVER INGENTING til basen. Den bare
// leser og rapporterer fire lister med skoler som er klare for neste steg, samt
// en femte liste (mangler_epost) over skoler som ellers ville kvalifisert, men
// som ikke har en gyldig mottaker-e-post. Fordi den er ren lesing er den trygg
// å kalle så ofte vi vil.
//
// Modell: "systemet foreslår, mennesket bestemmer". Purring, trinn 3 og
// påminnelse blir bare LISTER her — RA trykker en knapp for å sende (bygges i
// 3d). Ingen cron, ingen automatikk i denne filen.
//
// Tar imot { kurs_id } (valgfritt, via query eller body). Uten kurs_id gjelder
// alle kurs.
//
// De fire listene:
//   1) PURRING     – ikke svart, forste_utsending_at eldre enn purring_dager (5),
//                    purring_sendt_at tom. Mottaker: hovedkontakt (htla).
//   2) TRINN 3     – ikke svart, forste_utsending_at eldre enn trinn3_dager (10),
//                    trinn3_sendt_at tom. Mottakere: øvrige TL-ansvarlige (tla),
//                    IKKE hovedkontakt. Én rad per tla-mottaker.
//   3) PÅMINNELSE  – svart JA (svart && kommer), kurset ikke avholdt ennå,
//                    paaminnelse_sendt_at tom. Ingen dagsregel. Mottaker: htla.
//   4) EVALUERING  – var på kurs (svart && kommer && kursdato passert),
//                    evaluering_sendt_at tom. Mottaker: htla.
//
// FELLE: kurs_skole har to fremmednøkler til kurs. Vi UNNGÅR tvetydigheten helt
// ved å hente kurs for seg og slå dem opp i et map (samme grep som
// send-invitasjon.js), i stedet for en embed.

function formaterDato(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

// Hele dager siden et tidsstempel (null hvis stempelet mangler).
function dagerSiden(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 86400000)
}

const gyldigEpost = (e) => typeof e === 'string' && e.trim() !== ''

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const kurs_id = req.query?.kurs_id || req.body?.kurs_id || null

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ---- Terskler (dager) fra innstillinger — kan endres uten kode ----
  const { data: innstRader, error: innstFeil } = await supabase
    .from('innstillinger')
    .select('nokkel, verdi')
    .in('nokkel', ['purring_dager', 'trinn3_dager'])

  if (innstFeil) {
    return res.status(500).json({ error: 'Kunne ikke lese innstillinger: ' + innstFeil.message })
  }
  const innst = Object.fromEntries((innstRader || []).map(r => [r.nokkel, r.verdi]))
  const purringDager = Number.parseInt(innst.purring_dager, 10)
  const trinn3Dager = Number.parseInt(innst.trinn3_dager, 10)

  if (!Number.isFinite(purringDager) || !Number.isFinite(trinn3Dager)) {
    return res.status(500).json({
      error: 'Mangler tallverdier for purring_dager/trinn3_dager i innstillinger-tabellen.',
    })
  }

  // ---- Kurs (hentes for seg, slås opp i map — unngår den tvetydige embeden) ----
  let kursSpm = supabase.from('kurs').select('id, navn, dato').range(0, 9999)
  if (kurs_id) kursSpm = kursSpm.eq('id', kurs_id)
  const { data: kursRader, error: kursFeil } = await kursSpm

  if (kursFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente kurs: ' + kursFeil.message })
  }
  if (kurs_id && (!kursRader || kursRader.length === 0)) {
    return res.status(404).json({ error: 'Fant ikke kurset: ' + kurs_id })
  }
  const kursMap = Object.fromEntries((kursRader || []).map(k => [k.id, k]))
  const kursIder = Object.keys(kursMap)

  if (kursIder.length === 0) {
    return res.status(200).json({
      ok: true,
      kurs_id,
      terskler: { purring_dager: purringDager, trinn3_dager: trinn3Dager },
      antall: { purring: 0, trinn3: 0, paaminnelse: 0, evaluering: 0, mangler_epost: 0 },
      purring: [], trinn3: [], paaminnelse: [], evaluering: [], mangler_epost: [],
    })
  }

  // ---- Svar-rader (skoler) på kursene, med skolenavn og alle mottakere ----
  const { data: koblinger, error: koblingFeil } = await supabase
    .from('kurs_skole')
    .select(`
      id, kurs_id, svart, kommer,
      forste_utsending_at, purring_sendt_at, trinn3_sendt_at,
      paaminnelse_sendt_at, evaluering_sendt_at,
      skoler(navn),
      kurs_skole_mottaker(id, rolle, navn, epost)
    `)
    .in('kurs_id', kursIder)
    .range(0, 9999)

  if (koblingFeil) {
    return res.status(500).json({ error: 'Kunne ikke hente skoler på kursene: ' + koblingFeil.message })
  }

  const purring = []
  const trinn3 = []
  const paaminnelse = []
  const evaluering = []
  const mangler_epost = []

  // Dagens dato (midnatt) — så et kurs "i dag" ikke veksler passert/ikke-passert
  // gjennom døgnet.
  const iDag = new Date()
  iDag.setHours(0, 0, 0, 0)

  for (const k of (koblinger || [])) {
    const kurs = kursMap[k.kurs_id]
    if (!kurs) continue // hører til et kurs vi ikke hentet — hopp over

    const skoleNavn = k.skoler?.navn || '(ukjent skole)'
    const kursNavn = kurs.navn || '(ukjent kurs)'
    const kursDato = formaterDato(kurs.dato)
    const dager = dagerSiden(k.forste_utsending_at)

    const mottakere = k.kurs_skole_mottaker || []
    const hovedkontakt = mottakere.find(m => m.rolle === 'htla') || null
    const tlaListe = mottakere.filter(m => m.rolle === 'tla')

    // Felles grunnobjekt for en rad; mottaker fylles inn av hver liste.
    const grunn = {
      kurs_skole_id: k.id,
      skole: skoleNavn,
      kurs: kursNavn,
      kursdato: kursDato,
      dager_siden_forste_utsending: dager,
    }
    const medMottaker = (m) => ({
      ...grunn,
      mottaker_navn: m?.navn || null,
      mottaker_epost: m?.epost || null,
    })
    const flaggMangler = (liste, grunnTekst) => {
      mangler_epost.push({ ...grunn, liste, grunn: grunnTekst })
    }

    const ikkeSvart = !k.svart
    const svartJa = k.svart === true && k.kommer === true
    const kursPassert = kurs.dato ? new Date(kurs.dato) < iDag : false
    const kursIkkeAvholdt = kurs.dato ? new Date(kurs.dato) >= iDag : false

    // ---- 1) PURRING: ikke svart, gammel nok, ikke purret ennå ----
    if (ikkeSvart && !k.purring_sendt_at && dager !== null && dager >= purringDager) {
      if (hovedkontakt && gyldigEpost(hovedkontakt.epost)) {
        purring.push(medMottaker(hovedkontakt))
      } else {
        flaggMangler('purring', 'ingen hovedkontakt (htla) med e-post')
      }
    }

    // ---- 2) TRINN 3: ikke svart, eldre enn trinn3, ikke sendt ennå ----
    //     Mottakere er øvrige TL-ansvarlige (tla), IKKE hovedkontakten.
    //     Én rad per tla-mottaker.
    if (ikkeSvart && !k.trinn3_sendt_at && dager !== null && dager >= trinn3Dager) {
      const medEpost = tlaListe.filter(m => gyldigEpost(m.epost))
      if (medEpost.length > 0) {
        for (const m of medEpost) trinn3.push(medMottaker(m))
      } else {
        flaggMangler('trinn3', 'ingen øvrige TL-ansvarlige (tla) med e-post')
      }
    }

    // ---- 3) PÅMINNELSE: svart JA, kurset ikke avholdt ennå, ikke påminnet ----
    //     Ingen dagsregel — RA bestemmer når. Mottaker: hovedkontakt.
    if (svartJa && kursIkkeAvholdt && !k.paaminnelse_sendt_at) {
      if (hovedkontakt && gyldigEpost(hovedkontakt.epost)) {
        paaminnelse.push(medMottaker(hovedkontakt))
      } else {
        flaggMangler('paaminnelse', 'ingen hovedkontakt (htla) med e-post')
      }
    }

    // ---- 4) EVALUERING: var på kurs (svart JA, kursdato passert), ikke evaluert ----
    //     Mottaker: hovedkontakt.
    if (svartJa && kursPassert && !k.evaluering_sendt_at) {
      if (hovedkontakt && gyldigEpost(hovedkontakt.epost)) {
        evaluering.push(medMottaker(hovedkontakt))
      } else {
        flaggMangler('evaluering', 'ingen hovedkontakt (htla) med e-post')
      }
    }
  }

  return res.status(200).json({
    ok: true,
    kurs_id,
    terskler: { purring_dager: purringDager, trinn3_dager: trinn3Dager },
    antall: {
      purring: purring.length,
      trinn3: trinn3.length,
      paaminnelse: paaminnelse.length,
      evaluering: evaluering.length,
      mangler_epost: mangler_epost.length,
    },
    purring,
    trinn3,
    paaminnelse,
    evaluering,
    mangler_epost,
  })
}
