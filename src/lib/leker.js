import { supabase } from './supabase'

// Kanoniske lister (vises alltid i nedtrekk, uansett hva testdataene inneholder).
export const TRINN_NO = [
  ['bhg', 'Barnehage'], ['1', '1. trinn'], ['2', '2. trinn'], ['3', '3. trinn'], ['4', '4. trinn'],
  ['5', '5. trinn'], ['6', '6. trinn'], ['7', '7. trinn'], ['8', '8. trinn'], ['9', '9. trinn'], ['10', '10. trinn'],
]
export const SESONGER = ['Vinter', 'Vår', 'Sommer', 'Høst']

const VELG = `
  id, sted, antall_min, antall_maks, kan_ledes_av_elever, redaksjonell_rating, ressurstype, status,
  ressurs_innhold ( sprak, tittel, formaal, forberedelse, inndeling, utgangsposisjon, kronologi, regler, variasjoner, instruktoernotat ),
  ressurs_egnet ( egnet_kategori ( navn ) ),
  ressurs_trinn ( trinn ( kode, navn, land ) ),
  ressurs_utstyr ( utstyr ( navn ) ),
  ressurs_sesong ( sesong ( navn ) ),
  medier ( type, bunny_video_id, alt_tekst ),
  vurderinger ( stjerner )
`

function tekst(rad) {
  const inn = rad.ressurs_innhold || []
  return inn.find((i) => i.sprak === 'nb') || inn.find((i) => i.sprak === 'nn') || inn[0] || {}
}

export function formLek(rad) {
  const t = tekst(rad)
  const utstyr = (rad.ressurs_utstyr || []).map((x) => x.utstyr?.navn).filter(Boolean)
  const video = (rad.medier || []).find((m) => m.type === 'video') || null
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
    kanLedesAvElever: rad.kan_ledes_av_elever,
    ressurstype: rad.ressurstype,
    egnet: (rad.ressurs_egnet || []).map((x) => x.egnet_kategori?.navn).filter(Boolean),
    trinn: (rad.ressurs_trinn || []).map((x) => x.trinn).filter(Boolean),
    utstyr,
    sesong: (rad.ressurs_sesong || []).map((x) => x.sesong?.navn).filter(Boolean),
    video,
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

export async function hentLeker() {
  const { data, error } = await supabase
    .from('ressurser')
    .select(VELG)
    .eq('status', 'publisert')
    .neq('ressurstype', 'aktiv_laering') // aktiv læring er egen side (Fag + Trinn)
  if (error) throw error
  return (data || []).map(formLek)
}

export async function hentLek(id) {
  const { data, error } = await supabase.from('ressurser').select(VELG).eq('id', id).single()
  if (error) throw error
  return formLek(data)
}

export async function hentDokumenter(ressursId) {
  const { data } = await supabase
    .from('dokumenter')
    .select('id, tittel, type')
    .eq('ressurs_id', ressursId)
    .eq('status', 'publisert')
  return data || []
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

export async function loggBruk(hendelse, { ressursId = null, sokTekst = null, treffAntall = null } = {}) {
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
