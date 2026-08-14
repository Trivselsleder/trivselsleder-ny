import { supabase } from './supabase'
import { hentMinSkole, lekTittel } from './skole'

// Kakestykke kan være LEK (peker) eller FRI TEKST (klasseliste, utfordring ...).
const HJUL_VELG = `
  id, navn, beskrivelse, status, rotasjoner, skriftstorrelse, sortering, kategori_id, opprettet_at,
  tl_hjul_kategori ( navn ),
  tl_hjul_lek ( id, rekkefolge, ressurs_id, tekst, type,
    ressurser (
      id,
      ressurs_innhold ( sprak, tittel ),
      ressurs_egnet ( egnet_kategori ( navn ) ),
      ressurs_utstyr ( utstyr ( navn ) ),
      medier ( type, bunny_video_id, alt_tekst )
    ) )
`

function formSegment(k) {
  // Fri tekst
  if (k.type === 'fri' || (!k.ressurs_id && k.tekst)) {
    return {
      koblingId: k.id,
      fri: true,
      type: 'fri',
      ressursId: null,
      tekst: k.tekst || '',
      tittel: k.tekst || '(tom)',
      egnet: [],
      utstyr: [],
      video: null,
      harVideo: false,
    }
  }
  // Lek-peker
  const res = k.ressurser
  const video = (res?.medier || []).find((m) => m.type === 'video' && m.bunny_video_id) || null
  return {
    koblingId: k.id,
    fri: false,
    type: 'lek',
    ressursId: k.ressurs_id,
    tekst: null,
    tittel: res ? lekTittel(res) : 'Slettet lek',
    egnet: (res?.ressurs_egnet || []).map((x) => x.egnet_kategori?.navn).filter(Boolean),
    utstyr: (res?.ressurs_utstyr || []).map((x) => x.utstyr?.navn).filter(Boolean),
    video,
    harVideo: !!video,
  }
}

export function formHjul(rad) {
  const leker = (rad.tl_hjul_lek || [])
    .slice()
    .sort((a, b) => a.rekkefolge - b.rekkefolge)
    .map(formSegment)
  return {
    id: rad.id,
    navn: rad.navn,
    beskrivelse: rad.beskrivelse,
    status: rad.status,
    rotasjoner: rad.rotasjoner ?? 6,
    skriftstorrelse: rad.skriftstorrelse ?? 20,
    sortering: rad.sortering ?? 0,
    kategoriId: rad.kategori_id ?? null,
    kategoriNavn: rad.tl_hjul_kategori?.navn ?? null,
    leker,
  }
}

// Normaliser et «valgt segment» fra byggeren til en insert-rad.
// Godtar: streng (fri tekst), {fri:true, tekst}, {ressursId|id} (lek).
function segmentTilRad(hjulId, seg, i) {
  if (typeof seg === 'string') {
    return { hjul_id: hjulId, type: 'fri', tekst: seg, ressurs_id: null, rekkefolge: i }
  }
  if (seg && (seg.fri || (!seg.ressursId && !seg.id && seg.tekst))) {
    return { hjul_id: hjulId, type: 'fri', tekst: seg.tekst ?? seg.tittel ?? '', ressurs_id: null, rekkefolge: i }
  }
  const ressursId = seg.ressursId ?? seg.id
  return { hjul_id: hjulId, type: 'lek', ressurs_id: ressursId, tekst: null, rekkefolge: i }
}

export async function hentHjul() {
  const { data, error } = await supabase
    .from('tl_hjul')
    .select(HJUL_VELG)
    .eq('status', 'aktiv')
    .order('sortering', { ascending: true })
    .order('opprettet_at', { ascending: false })
  if (error) throw error
  return (data || []).map(formHjul)
}

export async function hentHjulEn(id) {
  const { data, error } = await supabase.from('tl_hjul').select(HJUL_VELG).eq('id', id).single()
  if (error) throw error
  return formHjul(data)
}

export async function opprettHjul({
  navn,
  beskrivelse = null,
  segmenter = [],
  leker = [], // bakoverkompat: liste med ressurs-id-er
  rotasjoner = 6,
  skriftstorrelse = 20,
  kategoriId = null,
}) {
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('tl_hjul')
    .insert({ navn, beskrivelse, skole_id: skoleId, rotasjoner, skriftstorrelse, kategori_id: kategoriId })
    .select('id')
    .single()
  if (error) throw error
  const hjulId = data.id
  const kilde = segmenter.length ? segmenter : leker
  if (kilde.length) {
    const rader = kilde.map((s, i) => segmentTilRad(hjulId, s, i))
    const { error: e2 } = await supabase.from('tl_hjul_lek').insert(rader)
    if (e2) throw e2
  }
  return hjulId
}

// Erstatt kakestykkene på et hjul med en ny liste (lek-pekere OG/ELLER fri tekst).
export async function settHjulSegmenter(hjulId, segmenter) {
  const { error: eDel } = await supabase.from('tl_hjul_lek').delete().eq('hjul_id', hjulId)
  if (eDel) throw eDel
  if (segmenter.length) {
    const rader = segmenter.map((s, i) => segmentTilRad(hjulId, s, i))
    const { error } = await supabase.from('tl_hjul_lek').insert(rader)
    if (error) throw error
  }
}

// Bakoverkompatibelt alias (liste med ressurs-id-er).
export async function settHjulLeker(hjulId, ressursIder) {
  return settHjulSegmenter(hjulId, ressursIder.map((id) => ({ ressursId: id })))
}

// Legg én lek til på et hjul (til slutt). 'lagt' | 'fantes' (unique-brudd 23505).
export async function leggLekTilHjul(hjulId, ressursId) {
  const { data } = await supabase
    .from('tl_hjul_lek')
    .select('rekkefolge')
    .eq('hjul_id', hjulId)
    .order('rekkefolge', { ascending: false })
    .limit(1)
    .maybeSingle()
  const neste = (data?.rekkefolge ?? -1) + 1
  const { error } = await supabase
    .from('tl_hjul_lek')
    .insert({ hjul_id: hjulId, ressurs_id: ressursId, type: 'lek', rekkefolge: neste })
  if (error && error.code !== '23505') throw error
  return error?.code === '23505' ? 'fantes' : 'lagt'
}

export async function oppdaterHjul(hjulId, felter) {
  const { error } = await supabase.from('tl_hjul').update(felter).eq('id', hjulId)
  if (error) throw error
}

// bakoverkompatibelt alias
export async function giHjulNavn(hjulId, navn) {
  return oppdaterHjul(hjulId, { navn })
}

export async function arkiverHjul(hjulId) {
  return oppdaterHjul(hjulId, { status: 'arkivert' })
}

// Kopier hjul (til nytt semester). Dupliserer oppsett + kakestykker (lek + fri).
export async function kopierHjul(hjulId, nyNavn) {
  const kilde = await hentHjulEn(hjulId)
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('tl_hjul')
    .insert({
      navn: nyNavn || `${kilde.navn} (kopi)`,
      beskrivelse: kilde.beskrivelse,
      skole_id: skoleId,
      rotasjoner: kilde.rotasjoner,
      skriftstorrelse: kilde.skriftstorrelse,
      kategori_id: kilde.kategoriId,
    })
    .select('id')
    .single()
  if (error) throw error
  const nyId = data.id
  const segmenter = kilde.leker.map((l) =>
    l.fri ? { fri: true, tekst: l.tekst } : { ressursId: l.ressursId }
  )
  if (segmenter.length) await settHjulSegmenter(nyId, segmenter)
  return nyId
}

// -------- Min side: flytt hjul først/sist (sortering) --------
// Bytter sortering med naboen i retning -1 (opp) / +1 (ned).
export async function flyttHjul(hjulListe, hjulId, retning) {
  const rekke = [...hjulListe]
  const idx = rekke.findIndex((h) => h.id === hjulId)
  const nyIdx = idx + retning
  if (idx < 0 || nyIdx < 0 || nyIdx >= rekke.length) return
  const a = rekke[idx]
  const b = rekke[nyIdx]
  // normaliser om sorteringene er like (alt 0 fra før)
  const sortA = a.sortering ?? 0
  const sortB = b.sortering ?? 0
  const nyA = sortB === sortA ? sortA + retning : sortB
  const nyB = sortB === sortA ? sortA : sortA
  await oppdaterHjul(a.id, { sortering: nyA })
  await oppdaterHjul(b.id, { sortering: nyB })
}

// Sett eksplisitt rekkefølge (0..n) på en hel liste hjul-id-er.
export async function settHjulRekkefolge(idRekke) {
  for (let i = 0; i < idRekke.length; i++) {
    await oppdaterHjul(idRekke[i], { sortering: i })
  }
}

// -------- Redigerbar hjultype / kategori --------
export async function hentKategorier() {
  const { data, error } = await supabase
    .from('tl_hjul_kategori')
    .select('id, navn, skole_id, sortering')
    .order('sortering', { ascending: true })
    .order('navn', { ascending: true })
  if (error) throw error
  return (data || []).map((k) => ({ id: k.id, navn: k.navn, global: k.skole_id == null }))
}

export async function opprettKategori(navn) {
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('tl_hjul_kategori')
    .insert({ navn: navn.trim(), skole_id: skoleId, sortering: 100 })
    .select('id, navn, skole_id')
    .single()
  if (error) throw error
  return { id: data.id, navn: data.navn, global: data.skole_id == null }
}

export async function endreKategori(id, navn) {
  const { error } = await supabase.from('tl_hjul_kategori').update({ navn: navn.trim() }).eq('id', id)
  if (error) throw error
}

export async function slettKategori(id) {
  const { error } = await supabase.from('tl_hjul_kategori').delete().eq('id', id)
  if (error) throw error
}
