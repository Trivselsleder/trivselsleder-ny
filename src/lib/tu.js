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
