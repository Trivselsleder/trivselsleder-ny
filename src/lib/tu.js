import { supabase } from './supabase'
import { hentMinSkole } from './skole'

// ============================================================================
// Trivselsundersøkelsen — lærerflaten (steg 4). Datahjelpere.
//
// TILGANG (byggeplan 4.1): fanen og sidene er synlige KUN for
//   - superadmin (profiles.rolle)
//   - skoleadmin (profiles.rolle)
//   - HTLA (bruker_skole.tl_rolle = 'htla' på aktiv skolekobling)
// OPPRETTE runde kan derimot kun skoleadmin/superadmin (kanOpprette) — samme
// rollekilde (profiles.rolle fra AuthContext) som databasens RLS
// tu_har_tilgang_skole (migr 041) autoriserer på. En HTLA som kun er
// skoleansatt ser info-siden og foreldreinfo, men får en forklaringsboks i
// stedet for «Opprett runde»-knappen/skjemaet (justering 23. aug). RLS er
// uendret — frontend speiler den, den erstatter den ikke.
//
// PERSONVERN: dette biblioteket leser/skriver KUN tu_runder (runde/gruppe-
// metadata). tu_svar og tu_koder røres aldri fra klienten (RLS-stengt).
// ============================================================================

// --- Tilgangssjekk ----------------------------------------------------------
// Lett sjekk (brukes av fanen i SkoleLayout): superadmin/skoleadmin, eller
// HTLA på aktiv skolekobling (én HTLA per skole, migr 043).
export async function sjekkTuTilgang(bruker) {
  const rolle = bruker?.rolle
  if (rolle === 'superadmin' || rolle === 'skoleadmin') return true
  if (rolle !== 'skoleansatt') return false
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('bruker_skole')
    .select('tl_rolle')
    .eq('bruker_id', user.id)
    .eq('aktiv', true)
    .eq('tl_rolle', 'htla')
    .limit(1)
    .maybeSingle()
  return !!data
}

// Returnerer { tilgang, kanOpprette, skoleId, skoleNavn, erPotensiell }.
// kanOpprette = profiles.rolle er skoleadmin/superadmin — samme kilde som
// ProtectedRoute og samme roller som RLS-en (migr 041) autoriserer for INSERT.
export async function hentTuKontekst(bruker) {
  const tilgang = await sjekkTuTilgang(bruker)
  const kanOpprette = bruker?.rolle === 'superadmin' || bruker?.rolle === 'skoleadmin'
  if (!tilgang) return { tilgang: false, kanOpprette: false, skoleId: null, skoleNavn: null, erPotensiell: false }

  const skoleId = await hentMinSkole()
  let skoleNavn = null
  let erPotensiell = false
  if (skoleId) {
    const { data: skole } = await supabase
      .from('skoler')
      .select('navn, status')
      .eq('id', skoleId)
      .maybeSingle()
    skoleNavn = skole?.navn ?? null
    // Landingstekst-variant (byggeplan 4.1): «Potensielle» (nullpunkt-tilbudet)
    // får versjon 2; alle andre statuser regnes som medlemsvarianten.
    erPotensiell = skole?.status === 'Potensielle'
  }
  return { tilgang: true, kanOpprette, skoleId, skoleNavn, erPotensiell }
}

// --- Skoleår / semester -----------------------------------------------------
// Norsk skoleår: august–desember = høst (skoleåret starter), januar–juli = vår.
export function beregnSkoleaar(dato) {
  const d = dato instanceof Date ? dato : new Date(dato)
  const aar = d.getFullYear()
  return d.getMonth() >= 7 ? `${aar}/${aar + 1}` : `${aar - 1}/${aar}`
}

export function beregnSemester(dato) {
  const d = dato instanceof Date ? dato : new Date(dato)
  return d.getMonth() >= 7 ? 'host' : 'var'
}

// --- Runder (én rad per gruppe — beslutning C, variant a) -------------------
export async function hentTuRunder(skoleId) {
  if (!skoleId) return []
  const { data, error } = await supabase
    .from('tu_runder')
    .select('id, trinn, skoleaar, semester, status, gruppe_navn, elevtall, startdato, frist, tl_sporsmal, opprettet_at')
    .eq('skole_id', skoleId)
    .order('opprettet_at', { ascending: false })
    .order('trinn', { ascending: true })
  if (error) throw error
  return data || []
}

// Oppretter én tu_runder-rad PER gruppe (samme vindu/skoleår/semester/TL-valg).
// gruppe_navn ligger KUN på runden — aldri på svaret (personvernkravet i 064).
export async function opprettTuRunder({ skoleId, startdato, sluttdato, grupper, tlSporsmal }) {
  if (!skoleId) throw new Error('MANGLER_SKOLE')
  const skoleaar = beregnSkoleaar(startdato)
  const semester = beregnSemester(startdato)
  const { data: { user } } = await supabase.auth.getUser()
  const rader = grupper.map((g) => ({
    skole_id: skoleId,
    trinn: g.trinn,
    skoleaar,
    semester,
    status: 'utkast',
    gruppe_navn: g.navn.trim(),
    elevtall: g.elevtall,
    startdato,
    frist: sluttdato,
    tl_sporsmal: !!tlSporsmal,
    opprettet_av: user?.id ?? null,
  }))
  const { error } = await supabase.from('tu_runder').insert(rader)
  if (error) {
    // 23505 = unik-indeksen tu_runder_unik_gruppe (samme gruppe finnes alt).
    if (error.code === '23505') { const e = new Error('DUPLIKAT_GRUPPE'); e.kode = 'DUPLIKAT_GRUPPE'; throw e }
    // 42501 = RLS avviste (typisk HTLA uten skoleadmin-tilgang, se toppkommentar).
    if (error.code === '42501') { const e = new Error('INGEN_SKRIVETILGANG'); e.kode = 'INGEN_SKRIVETILGANG'; throw e }
    throw error
  }
  return rader.length
}

// --- 4.4 Live-status: «X av Y utdelte» per gruppe ---------------------------
// Ren aggregert telling via RPC tu_folg_med (migr 041, utvidet for HTLA i 068):
// utdelt = antall koder på runden, brukt = antall brukte. ALDRI svar-innhold.
// Autorisasjon skjer i DB-en (skoleadmin/superadmin eller aktiv HTLA på skolen);
// en bruker uten tilgang får «Ingen tilgang» og vi returnerer null (skjuler linja).
export async function hentTuFolgMed(rundeId) {
  const { data, error } = await supabase.rpc('tu_folg_med', { p_runde: rundeId })
  if (error) return null                      // ingen tilgang / feil → vis ingen telling
  const rad = Array.isArray(data) ? data[0] : data
  if (!rad) return null
  return { utdelt: rad.utdelt ?? 0, brukt: rad.brukt ?? 0 }
}

// --- 4.5 Manuell tidlig-lukk ------------------------------------------------
// Lukker en åpen runde før frist. DB-en (tu_lukk_runde, migr 045/068) arkiverer
// skjermet resultat, sletter kodene og re-stempler svarene (kollapser xmin →
// anonymitet-ved-konstruksjon). Autorisasjon i DB: skoleadmin/superadmin eller
// aktiv HTLA på egen skole. Returnerer void; kaster ved feil/uten tilgang.
export async function lukkTuRunde(rundeId) {
  const { error } = await supabase.rpc('tu_lukk_runde', { p_runde: rundeId })
  if (error) {
    // 42501 / «Ingen tilgang» → egen feiltype så UI kan vise vennlig melding.
    if (error.code === '42501' || /ingen tilgang/i.test(error.message || '')) {
      const e = new Error('INGEN_LUKKETILGANG'); e.kode = 'INGEN_LUKKETILGANG'; throw e
    }
    throw error
  }
}

// ============================================================================
// STEG 5 — SKOLENS RESULTATRAPPORT (utgang 1). Datahjelpere.
//
// Rapporten LESER tall KUN fra de tre skjermede funksjonene i basen:
//   tu_skole_resultat(p_runde)         -> hovedbildet (alle svaralternativer)
//   tu_skole_resultat_kjonn(p_runde)   -> kjønnsdelt (jente/gutt/annet)
//   tu_skole_utvikling(p_skole,p_trinn)-> utvikling over tid (fra arkiv)
// Den regner ALDRI egne tall fra rådata, omgår ALDRI skjermingen, og slår
// ALDRI sammen svaralternativer til ett tall.
//
// ⛔ ABSOLUTT FORBUD (oppdrag §1): kolonnen `skjult_aarsak` fra
// tu_skole_resultat_kjonn er REN INTERN og skal ALDRI nå rapporten. Vi kaster
// den HER, ved datagrensen — den plukkes bevisst bort i mapKjonn() under og
// legges ALDRI på noe objekt som sendes videre til UI/PDF. Rapporten leser
// KUN `skjult` (boolean) for å velge mellom fordeling og terskelmelding.
// ============================================================================

// (Husrød søylefarge på mobbing/alenegang ble FJERNET 28. aug — lederbeslutning
// Kjartan: alle søyler er petrol. Se tuRapportPdf.js. Kun retningsteksten under gjenstår.)
// «Lavere er bedre»-kategorier: der en lav prosent er det gode utfallet.
// Brukes KUN til en diskret, rolig retningstekst — aldri en vurdering av tallet.
export const LAVERE_BEDRE_KATEGORIER = ['mobbing', 'alenegang']

// Henter spørsmåls-metadata (nummer, kategori, antall svaralternativer) rett fra
// tu_sporsmal. Brukes til å rendre ALLE svaralternativer (som QuestBack), også
// de som er skjermet bort eller har null svar. authenticated har SELECT-grant.
export async function hentTuSporsmalMeta(land = 'NO', versjon = 1) {
  const { data, error } = await supabase
    .from('tu_sporsmal')
    .select('nummer, kategori, svarskala')
    .eq('land', land)
    .eq('versjon', versjon)
    .order('nummer', { ascending: true })
  if (error) throw error
  return (data || []).map((s) => ({
    nummer: s.nummer,
    kategori: s.kategori,
    // svarskala er en ordnet liste av i18n-nøkler (["tu.sp.1.svar.0", ...]).
    antallAlternativer: Array.isArray(s.svarskala) ? s.svarskala.length : 0,
  }))
}

// Hovedbildet: én rad per spørsmål. { sporsmal, kategori, antall, fordeling, homogen, skjult }
export async function hentTuSkoleResultat(rundeId) {
  const { data, error } = await supabase.rpc('tu_skole_resultat', { p_runde: rundeId })
  if (error) throw error
  return (data || []).map((r) => ({
    sporsmal: r.sporsmal,
    kategori: r.kategori,
    antall: r.antall,
    fordeling: r.fordeling,       // {"0":12,"2":8} eller null (skjult/homogen)
    homogen: !!r.homogen,
    skjult: !!r.skjult,
  }))
}

// Kjønnsdelt: én rad per (spørsmål, gruppe). skjult_aarsak KASTES her (§1) —
// den kopieres bevisst IKKE inn i objektet vi returnerer. Bare `skjult` beholdes.
function mapKjonn(rad) {
  return {
    sporsmal: rad.sporsmal,
    gruppe: rad.gruppe,           // 'total' | 'jente' | 'gutt' | 'annet'
    antall: rad.antall,
    fordeling: rad.fordeling,     // {"0":..} eller null
    homogen: !!rad.homogen,
    skjult: !!rad.skjult,
    // MERK: rad.skjult_aarsak leses IKKE. Årsaken forlater aldri denne funksjonen.
  }
}

export async function hentTuSkoleResultatKjonn(rundeId) {
  const { data, error } = await supabase.rpc('tu_skole_resultat_kjonn', { p_runde: rundeId })
  if (error) throw error
  return (data || []).map(mapKjonn)
}

// Utvikling over tid (fra arkiv). Tom liste = første runde (ingen tidligere).
export async function hentTuSkoleUtvikling(skoleId, trinn) {
  const { data, error } = await supabase.rpc('tu_skole_utvikling', {
    p_skole: skoleId, p_trinn: trinn,
  })
  if (error) throw error
  return data || []
}

// Samler alt rapporten trenger for én runde, i ett kall.
// rundeMeta = { id, skole_id, trinn, gruppe_navn, skoleaar, semester, startdato, frist }
export async function hentRapportData(rundeMeta, land = 'NO', versjon = 1) {
  const [meta, hoved, kjonn, utvikling] = await Promise.all([
    hentTuSporsmalMeta(land, versjon),
    hentTuSkoleResultat(rundeMeta.id),
    hentTuSkoleResultatKjonn(rundeMeta.id),
    hentTuSkoleUtvikling(rundeMeta.skole_id, rundeMeta.trinn),
  ])
  return { runde: rundeMeta, sporsmalMeta: meta, hoved, kjonn, utvikling }
}
