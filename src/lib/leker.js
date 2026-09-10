import { supabase } from './supabase'

// Kanoniske FALLBACK-lister. Etappe 7 D1: basen er sannheten — trinn/sesong-nedtrekkene
// hentes nå fra tabellene (hentTrinnListe/hentSesongListe) og overskriver disse ved
// sidelast. De beholdes som umiddelbar visning + trygt fall om en DB-lesing feiler, så et
// kjerne-filter aldri står tomt. TRINN_NO brukes dessuten som NO-oppslag i Min side-søket
// (fritekst «4. trinn» → kode) og som kanon-grunnlag i Aktiv læring.
export const TRINN_NO = [
  ['bhg', 'Barnehage'], ['1', '1. trinn'], ['2', '2. trinn'], ['3', '3. trinn'], ['4', '4. trinn'],
  ['5', '5. trinn'], ['6', '6. trinn'], ['7', '7. trinn'], ['8', '8. trinn'], ['9', '9. trinn'], ['10', '10. trinn'],
]
export const SESONGER = ['Vinter', 'Vår', 'Sommer', 'Høst']

// Kanonisk «egnet for»-fallback (egnet_kategori). Samme rolle som TRINN_NO/SESONGER:
// vises umiddelbart, overskrives av hentEgnetListe() ved sidelast.
export const EGNET_NO = [
  'Friminutt', 'Kroppsøving', 'SFO/AKS', 'Aktiv læring', 'Move It', 'FYSAK',
  'Bli kjent / klassemiljø', 'Aktivitetsdager', 'Sosial kompetanse', 'TL-Mester',
  'Leker for 100+ elever', 'Barnehage',
]

// Utstyrsfilteret viser bare termer brukt på minst så mange leker (visningsregel besluttet
// 7. sep: 215 termer → 117). Ingenting slettes; endre kun dette tallet for å justere terskelen.
export const UTSTYR_MIN_LEKER = 2

const VELG = `
  id, sted, antall_min, antall_maks, kan_ledes_av_elever, redaksjonell_rating, ressurstype, status, endret_at,
  ressurs_innhold ( sprak, tittel, formaal, beskrivelse, forberedelse, inndeling, utgangsposisjon, kronologi, regler, variasjoner, instruktoernotat, antall_raatekst ),
  ressurs_egnet ( egnet_kategori ( navn ) ),
  ressurs_trinn ( trinn ( kode, navn, land ) ),
  ressurs_utstyr ( utstyr ( navn ) ),
  ressurs_sesong ( sesong ( navn ) ),
  medier ( type, bunny_video_id, alt_tekst, storage_sti, alt_tekst_kilde, rekkefolge ),
  vurderinger ( stjerner )
`

// Slank liste-select: som VELG, men UTEN de sju lange tekstfeltene (forberedelse,
// inndeling, utgangsposisjon, kronologi, regler, variasjoner, instruktoernotat) —
// de utgjorde ~37 % av svaret og vises aldri i listen (kun på lekesiden via hentLek).
// Beholder redaksjonell_rating + vurderinger (periodeplanens auto-forslag bruker rating)
// og medier(type,bunny_video_id) (kort trenger å vite OM det finnes video).
const VELG_LISTE = `
  id, sted, antall_min, antall_maks, redaksjonell_rating, ressurstype, status,
  ressurs_innhold ( sprak, tittel, formaal ),
  ressurs_egnet ( egnet_kategori ( navn ) ),
  ressurs_trinn ( trinn ( kode, navn ) ),
  ressurs_utstyr ( utstyr ( navn ) ),
  ressurs_sesong ( sesong ( navn ) ),
  medier ( type, bunny_video_id ),
  vurderinger ( stjerner )
`

function tekst(rad) {
  const inn = rad.ressurs_innhold || []
  return inn.find((i) => i.sprak === 'nb') || inn.find((i) => i.sprak === 'nn') || inn[0] || {}
}

// Felles antall-formatering (skjerm, kort og PDF bruker DENNE — aldri ordet «null» i visning).
//   min + maks  → «min–maks» (tankestrek)
//   bare min    → råtekst hvis satt, ellers «Fra {min}»
//   bare maks   → «Opptil {maks}»
//   ingen tall  → råtekst hvis satt, ellers null (kalleren viser «–» eller skjuler feltet)
export function formaterAntall(min, maks, raatekst = null) {
  const raa = typeof raatekst === 'string' && raatekst.trim() ? raatekst.trim() : null
  const harTall = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))
  const nMin = harTall(min) ? Number(min) : null
  const nMaks = harTall(maks) ? Number(maks) : null
  if (nMin !== null && nMaks !== null) return `${nMin}–${nMaks}`
  if (nMin !== null) return raa || `Fra ${nMin}`
  if (nMaks !== null) return `Opptil ${nMaks}`
  return raa
}

export function formLek(rad) {
  const t = tekst(rad)
  const utstyr = (rad.ressurs_utstyr || []).map((x) => x.utstyr?.navn).filter(Boolean)
  const video = (rad.medier || []).find((m) => m.type === 'video') || null
  const bilder = (rad.medier || [])
    .filter((m) => m.type === 'bilde')
    .sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0))
  const stjerner = (rad.vurderinger || []).map((v) => v.stjerner)
  const snitt = stjerner.length
    ? stjerner.reduce((a, b) => a + b, 0) / stjerner.length
    : rad.redaksjonell_rating ?? null
  return {
    id: rad.id,
    tittel: t.tittel,
    tekst: t,
    sted: rad.sted,
    antallMin: rad.antall_min,
    antallMaks: rad.antall_maks,
    antallRaatekst: t.antall_raatekst ?? null,   // 094: kolonnen bor på ressurs_innhold, ikke ressurser
    kanLedesAvElever: rad.kan_ledes_av_elever,
    ressurstype: rad.ressurstype,
    status: rad.status,          // D3: redigeringsflaten trenger status + endringsstempel (lås)
    endretAt: rad.endret_at,     // rå streng fra basen — sendes UENDRET som lås-token (funn 4b)
    egnet: (rad.ressurs_egnet || []).map((x) => x.egnet_kategori?.navn).filter(Boolean),
    trinn: (rad.ressurs_trinn || []).map((x) => x.trinn).filter(Boolean),
    utstyr,
    sesong: (rad.ressurs_sesong || []).map((x) => x.sesong?.navn).filter(Boolean),
    video,
    bilder,
    harVideo: !!(video && video.bunny_video_id),
    utenUtstyr: utstyr.length === 0,
    rating: snitt,
    antallStjerner: stjerner.length,
  }
}

// Vis trinn kompakt: «3. trinn, 4. … 7. trinn» → «3.–7. trinn».
// Sammenhengende tall slås til intervall; ikke-numeriske (barnehage, svenske) beholdes.
export function trinnKort(trinnListe) {
  const navn = (trinnListe || []).map((t) => (typeof t === 'string' ? t : t?.navn)).filter(Boolean)
  const tall = []
  const andre = []
  for (const n of navn) {
    const m = /^(\d+)\.?\s*trinn/i.exec(n)
    if (m) tall.push(Number(m[1]))
    else andre.push(n)
  }
  const unike = [...new Set(tall)].sort((a, b) => a - b)
  const grupper = []
  let i = 0
  while (i < unike.length) {
    let j = i
    while (j + 1 < unike.length && unike[j + 1] === unike[j] + 1) j++
    grupper.push(unike[i] === unike[j] ? `${unike[i]}. trinn` : `${unike[i]}.–${unike[j]}. trinn`)
    i = j + 1
  }
  const deler = [...grupper, ...andre]
  return deler.length ? deler.join(', ') : '—'
}

// Liste-henting (periodeplan-plukker, Min side-forslag): slank select uten de sju
// lange tekstfeltene. «Finn en lek» bruker IKKE denne lenger — den søker server-side
// via sokLeker() nedenfor.
export async function hentLeker() {
  const { data, error } = await supabase
    .from('ressurser')
    .select(VELG_LISTE)
    .eq('status', 'publisert')
    .neq('ressurstype', 'aktiv_laering') // aktiv læring er egen side (Fag + Trinn)
  if (error) throw error
  return (data || []).map(formLek)
}

// Server-side søk for «Finn en lek» (etappe 4): all fritekst + filtrering +
// sideinndeling gjøres i basen (RPC sok_leker, migr 089). Returnerer kun feltene
// listen bruker + totalt antall treff. «Last mer» øker offset med limit.
export async function sokLeker(filtre = {}) {
  const {
    sok = '', egnet = '', trinn = '', skoletype = '', sted = '', utstyr = '',
    utenUtstyr = false, sesong = '', kunVideo = false, kunFav = false,
    offset = 0, limit = 50,
  } = filtre
  const args = {
    p_sok: sok.trim() || null,
    p_egnet: egnet || null,
    p_trinn: trinn || null,
    p_sted: sted || null,
    p_utstyr: utstyr || null,
    p_uten_utstyr: !!utenUtstyr,
    p_sesong: sesong || null,
    p_kun_video: !!kunVideo,
    p_kun_fav: !!kunFav,
    p_limit: limit,
    p_offset: offset,
  }
  // p_skoletype (migr 105) sendes KUN når satt, så vanlige søk fortsatt matcher funksjonen
  // selv om 105 ikke er kjørt ennå (migrasjon kjøres alltid før kode pushes). Avledningen
  // (barneskole → trinn 1–7 osv.) bor i RPC-en; frontend sender bare koden.
  if (skoletype) args.p_skoletype = skoletype
  const { data, error } = await supabase.rpc('sok_leker', args)
  if (error) throw error
  const rader = data || []
  const totalt = rader.length ? Number(rader[0].totalt_antall) : 0
  return { leker: rader.map(formLekListe), totalt }
}

// Formar én RPC-rad til samme form som LekeKort venter (delmengde av formLek).
function formLekListe(r) {
  return {
    id: r.id,
    tittel: r.tittel,
    tekst: { formaal: r.formaal },
    sted: r.sted,
    antallMin: r.antall_min,
    antallMaks: r.antall_maks,
    egnet: r.egnet || [],
    trinn: r.trinn || [],
    utenUtstyr: r.uten_utstyr,
    harVideo: r.har_video,
  }
}

// Filterlistene hentes fra basen (etappe 7 D1) etter samme mønster som utstyr under:
// slå opp taksonomitabellen, hent den ene kolonnen filteret trenger, gi tilbake en
// ren liste. Endrer en ansatt et navn i basen, følger nedtrekket etter av seg selv.

// «Egnet for» — egnet_kategori, i redaksjonell rekkefølge (rekkefolge). Verdi = navn
// (det sok_leker matcher på), så vi henter kun navn — som utstyr.
export async function hentEgnetListe() {
  const { data, error } = await supabase.from('egnet_kategori').select('navn').order('rekkefolge')
  if (error) throw error
  return (data || []).map((e) => e.navn).filter(Boolean)
}

// Sesong — sesong-tabellen, i rekkefolge. Verdi = navn.
export async function hentSesongListe() {
  const { data, error } = await supabase.from('sesong').select('navn').order('rekkefolge')
  if (error) throw error
  return (data || []).map((s) => s.navn).filter(Boolean)
}

// Trinn er LANDSSTYRT (trinn.land): henter [kode, navn]-par for ETT land i tabellrekkefølge,
// standard Norge. Filteret sender kode (ikke navn) til sok_leker, så vi henter begge — derfor
// ikke en ren utstyr-kopi. Land-parameteren er første stedet Sverige berører etappe 7; den
// koster ingenting nå og gjør det trivielt å vise svenske trinn senere (hentTrinnListe('SE')).
export async function hentTrinnListe(land = 'NO') {
  const { data, error } = await supabase.from('trinn').select('kode, navn').eq('land', land).order('id')
  if (error) throw error
  return (data || []).map((t) => [t.kode, t.navn])
}

// Fag (LK20) — fag-tabellen, alfabetisk. Verdi = navn (Aktiv læring filtrerer klientside).
export async function hentFagListe() {
  const { data, error } = await supabase.from('fag').select('navn').order('navn')
  if (error) throw error
  return (data || []).map((f) => f.navn).filter(Boolean)
}

// Fag med id — for redigeringsskjemaets fag-panel (aktiv læring), der vi sender fag_ids til RPC-en.
export async function hentFagValg() {
  const { data, error } = await supabase.from('fag').select('id, navn').order('navn')
  if (error) throw error
  return data || []
}

// Utstyr-facetten hentes lett fra taksonomitabellen. VISNINGSREGEL (etappe 7 D1): vis bare
// termer brukt på minst `minLeker` leker. Vi henter hvert utstyrs koblingsrader
// (ressurs_utstyr) og teller dem — koblingstabellens PK er (ressurs_id, utstyr_id), så
// arraylengden ER antall distinkte leker. Ingenting slettes: termer under terskel beholder
// fritekstsøk, alle andre filtre og synlighet på selve leken.
export async function hentUtstyrListe(minLeker = UTSTYR_MIN_LEKER) {
  const { data, error } = await supabase
    .from('utstyr')
    .select('navn, ressurs_utstyr ( ressurs_id )')
    .order('navn')
  if (error) throw error
  return (data || [])
    .filter((u) => (u.ressurs_utstyr?.length || 0) >= minLeker)
    .map((u) => u.navn)
    .filter(Boolean)
}

export async function hentLek(id) {
  const { data, error } = await supabase.from('ressurser').select(VELG).eq('id', id).single()
  if (error) throw error
  return formLek(data)
}

export async function hentDokumenter(ressursId) {
  // 091B: koblingen lek↔dokument bor nå i ressurs_dokument (ressurs_id,
  // dokument_id, rekkefolge). Vi går via koblingstabellen og henter det
  // publiserte dokumentet. !inner + status-filter speiler den gamle
  // server-side «status=publisert»-silinga; rekkefolge gir stabil sortering.
  const { data } = await supabase
    .from('ressurs_dokument')
    .select('rekkefolge, dokumenter!inner ( id, tittel, type, status )')
    .eq('ressurs_id', ressursId)
    .eq('dokumenter.status', 'publisert')
    .order('rekkefolge', { ascending: true, nullsFirst: false })
  return (data || []).map((r) => ({
    id: r.dokumenter.id,
    tittel: r.dokumenter.tittel,
    type: r.dokumenter.type,
  }))
}

// Aktiv læring = egen innholdstype (ressurstype='aktiv_laering'), med Fag + Trinn.
// Prøver rik spørring med fag; faller trygt tilbake til lek-filtrering hvis
// fag-koblingen ikke finnes ennå (da er fag tomt til taksonomien importeres).
export async function hentAktivLaering() {
  try {
    const { data, error } = await supabase
      .from('ressurser')
      .select(`${VELG}, ressurs_fag ( fag ( navn ) )`)
      .eq('status', 'publisert')
      .eq('ressurstype', 'aktiv_laering')
    if (error) throw error
    return (data || []).map((r) => ({
      ...formLek(r),
      fag: (r.ressurs_fag || []).map((x) => x.fag?.navn).filter(Boolean),
    }))
  } catch {
    // Fag-koblingen finnes ikke ennå — hent aktiv læring uten fag (fag fylles ved import).
    const { data, error } = await supabase
      .from('ressurser')
      .select(VELG)
      .eq('status', 'publisert')
      .eq('ressurstype', 'aktiv_laering')
    if (error) throw error
    return (data || []).map((r) => ({ ...formLek(r), fag: [] }))
  }
}

// Dokumentbank (Maler & materiell): frittstående + lek-koblede dokumenter, facet = Type.
// Bred select (*) så vi tåler at kolonnenavn (url/fil) varierer; tom liste ved feil.
export async function hentDokumentbank() {
  // Bred select (*) så vi tåler kolonnenavn-variasjon. Ekte feil bobler opp til
  // siden (vises som feil, ikke som «tom bank»). Publisert-filter gjøres klientside
  // i tilfelle status-kolonnen ikke finnes.
  const { data, error } = await supabase.from('dokumenter').select('*')
  if (error) throw error
  return (data || [])
    .filter((d) => d.status === undefined || d.status === null || d.status === 'publisert')
    .map(formDokument)
}

function formDokument(d) {
  // Bare ekte http(s)-lenker blir klikkbare. Storage-stier («dokumenter/x.pdf») lar
  // vi ligge til lagrings-URL wires ordentlig ved import — unngår 404-lenker.
  const kandidat = d.url || d.fil_url || d.lenke || null
  const url = typeof kandidat === 'string' && /^https?:\/\//.test(kandidat) ? kandidat : null
  return {
    id: d.id,
    tittel: d.tittel || 'Uten tittel',
    type: d.type || 'Annet',
    sprak: d.sprak || d.maalform || null,
    ressursId: d.ressurs_id ?? null,
    url,
  }
}

// --- Redigering (kun interne; RLS på ressurser/ressurs_innhold = fase3_intern) ---

// D3/D2: lagre en hel ressurs i ÉN transaksjon via RPC-en lagre_ressurs (migr 107).
// payload = jsonb-en spesifikasjonen beskriver. Skjemaet sender KUN nøklene det redigerer
// (fravær = «rør ikke», funn 3/7). endret_at MÅ være radens RÅ streng (lek.endretAt), aldri
// gjennom Date() (funn 4b). Returnerer { id, endret_at, opprettet }. Basens forståelige
// feilmeldinger (P0001 «Noen andre lagret …», «Alt-tekst påkrevd …») bobler opp som error.message.
export async function lagreRessurs(payload) {
  const { data, error } = await supabase.rpc('lagre_ressurs', { p_data: payload })
  if (error) throw error
  return data
}

// D3 redigering: hent HELE ressursen med ALLE språkrader + medier + fag + kompetansemål, for
// redigeringsskjemaet (språkfane, alt-tekst, aktiv læring-panel). hentLek() gir kun ett språk og
// er for lesing; denne er for skriving. RLS slipper interne til utkast også.
export async function hentRessursForRedigering(id) {
  const { data, error } = await supabase
    .from('ressurser')
    .select(`
      id, ressurstype, sted, antall_min, antall_maks, status, endret_at,
      ressurs_innhold ( sprak, tittel, beskrivelse, formaal, forberedelse, inndeling, utgangsposisjon, kronologi, regler, variasjoner, instruktoernotat ),
      medier ( id, type, storage_sti, bunny_video_id, alt_tekst, alt_tekst_kilde, rekkefolge ),
      ressurs_fag ( fag ( id, navn ) ),
      ressurs_kompetansemaal ( kompetansemaal ( id, kode, tekst ) )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    id: data.id,
    ressurstype: data.ressurstype,
    status: data.status,
    endretAt: data.endret_at,
    sted: data.sted,
    antallMin: data.antall_min,
    antallMaks: data.antall_maks,
    innholdPerSprak: data.ressurs_innhold || [],
    medier: (data.medier || []).slice().sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0)),
    fag: (data.ressurs_fag || []).map((x) => x.fag).filter(Boolean),
    kompetansemaal: (data.ressurs_kompetansemaal || []).map((x) => x.kompetansemaal).filter(Boolean),
  }
}

// D3 utkast-inngang: interne finner ikke utkastene sine i biblioteket (sok_leker har et HARDT
// publisert-filter — bevisst, 089s SIKKERHET-seksjon, fordi DEFINER omgår RLS). Vi går derfor
// DIREKTE mot ressurser: RLS-policyen (status='publisert' OR fase3_intern()) slipper interne til
// utkast/arkivert, andre ser ingenting. Ingen ny RPC, intet rørt publisert-filter.
export async function hentUtkast() {
  const { data, error } = await supabase
    .from('ressurser')
    .select('id, status, ressurstype, endret_at, ressurs_innhold ( sprak, tittel )')
    .neq('status', 'publisert')
    .order('endret_at', { ascending: false })
  if (error) throw error
  return (data || []).map((r) => {
    const inn = r.ressurs_innhold || []
    return {
      id: r.id, status: r.status, ressurstype: r.ressurstype, endretAt: r.endret_at,
      tittel: (inn.find((x) => x.sprak === 'nb') || inn[0] || {}).tittel || '(uten tittel)',
    }
  })
}

// D3 publiser/avpubliser — hurtighandling via samme RPC (én statusendring, optimistisk lås).
export async function settStatus(lek, status) {
  return lagreRessurs({ id: lek.id, endret_at: lek.endretAt, ressurs: { status } })
}

export async function lagreLekMeta(ressursId, felter) {
  const { error } = await supabase.from('ressurser').update(felter).eq('id', ressursId)
  if (error) throw error
}

// Oppdaterer (eller oppretter) innholdsraden for ett språk. Endringslogg- og
// ferskhet-triggere i basen håndterer historikk + «utdatert»-merking automatisk.
export async function lagreInnhold(ressursId, sprak, felter) {
  const { error } = await supabase
    .from('ressurs_innhold')
    .upsert({ ressurs_id: ressursId, sprak, ...felter }, { onConflict: 'ressurs_id,sprak' })
  if (error) throw error
}

export async function loggBrukHendelse(hendelse, { ressursId = null, sokTekst = null, treffAntall = null } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // treff_antall settes KUN for søk, og aldri negativt. Basen håndhever begge
    // reglene (migr 088: CHECK treff_antall >= 0, og treff_antall IS NULL eller
    // hendelse='sok') — her speiler vi dem så en insert aldri avvises:
    //   0    = null-treff (viktig signal: hva mangler innholdet vårt),
    //   NULL = ikke et søk (alle andre hendelser).
    const treff = hendelse === 'sok' && Number.isFinite(treffAntall)
      ? Math.max(0, Math.trunc(treffAntall))
      : null
    await supabase.from('bruk_hendelse').insert({
      bruker_id: user.id,
      ressurs_id: ressursId,
      hendelse,
      sok_tekst: sokTekst,
      treff_antall: treff,
    })
  } catch {
    /* logging skal aldri velte siden */
  }
}
