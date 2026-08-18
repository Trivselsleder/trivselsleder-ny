import { normaliserKode, beregnHmac, tjenerKlient } from './_kode.js'

// POST /api/tu/hent-runde
// Body: { kode: "ABDK7F" }
//
// Sjekker at koden hører til en ÅPEN, UBRUKT runde — UTEN å merke den brukt
// (merkingen skjer først ved innsending, i tu_lever_svar). Returnerer
// spørsmålssettet + litt rundemetadata slik at elevflaten kan vise ett spørsmål
// per skjerm. Koden i seg selv sendes aldri videre til klienten, lagres aldri.
//
// Sikkerhet:
//  - Rå-kode kommer i POST-body, ikke URL (delplan 21.2 / fable B3.5).
//  - Vi slår opp på HMAC, aldri på klartekst.
//  - tu_koder/tu_svar er RLS-låst uten leserett; her brukes service-nøkkelen,
//    så denne funksjonen er selve «betjeningsluka». Den returnerer ALDRI
//    kode-rader, kun spørsmål + trinn/skoleår.
//  - Ingen kobling kode↔elev lagres; ingen IP; ingen tidsstempel.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ feil: 'Method not allowed' })

  const kodeNorm = normaliserKode(req.body?.kode)
  if (!kodeNorm) return res.status(400).json({ feil: 'TOM_KODE' })

  let supabase, hmac
  try {
    supabase = tjenerKlient()
    hmac = beregnHmac(kodeNorm)
  } catch (e) {
    console.error('TU hent-runde konfig-feil:', e.kode || e.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }

  // Finn ubrukt kode på en åpen runde. maybeSingle → ingen rad = ugyldig kode.
  const { data: koderad, error: kodeFeil } = await supabase
    .from('tu_koder')
    .select('runde_id, brukt')
    .eq('kode_hmac', hmac)
    .eq('brukt', false)
    .maybeSingle()

  if (kodeFeil) {
    console.error('TU hent-runde DB-feil (kode):', kodeFeil.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }
  if (!koderad) return res.status(404).json({ feil: 'UGYLDIG_KODE' })

  const { data: runde, error: rundeFeil } = await supabase
    .from('tu_runder')
    .select('id, trinn, skoleaar, semester, status, sporsmalversjon, land')
    .eq('id', koderad.runde_id)
    .maybeSingle()

  if (rundeFeil) {
    console.error('TU hent-runde DB-feil (runde):', rundeFeil.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }
  if (!runde || runde.status !== 'apen') return res.status(404).json({ feil: 'UGYLDIG_KODE' })

  // Spørsmålssettet for rundens versjon/land. i18n_tekst er NØKKELEN, ikke
  // teksten — elevflaten oversetter selv (bokmål/nynorsk/svensk).
  const { data: sporsmal, error: spmFeil } = await supabase
    .from('tu_sporsmal')
    .select('nummer, kategori, i18n_tekst, svarskala')
    .eq('versjon', runde.sporsmalversjon)
    .eq('land', runde.land)
    .order('nummer', { ascending: true })

  if (spmFeil) {
    console.error('TU hent-runde DB-feil (spørsmål):', spmFeil.message)
    return res.status(500).json({ feil: 'SERVERFEIL' })
  }
  if (!sporsmal || sporsmal.length === 0) return res.status(404).json({ feil: 'INGEN_SPORSMAL' })

  return res.status(200).json({
    runde: {
      trinn: runde.trinn,
      skoleaar: runde.skoleaar,
      semester: runde.semester,
      land: runde.land,
    },
    sporsmal: sporsmal.map((s) => ({
      nummer: s.nummer,
      kategori: s.kategori,
      // svarskala er en ordnet liste av i18n-nøkler (["tu.sp.1.svar.0", ...]).
      // Antall alternativer = lengden. Elevflaten viser tekst+symbol per index.
      antallAlternativer: Array.isArray(s.svarskala) ? s.svarskala.length : 0,
    })),
  })
}
