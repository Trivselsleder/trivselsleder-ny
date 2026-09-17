// Datalag for skolens «Min side» (design runde 7, migr 130–135).
// Skoler LESER; TL-ansatte (get_min_rolle in ('ansatt','superadmin')) SKRIVER.
// RLS/rettigheter styres i basen — her gjør vi kun trygge kall og degraderer stille.
import { supabase } from './supabase'

// ── Seksjonsrekkefølge (minside_seksjon, migr 130) ────────────────────────────
// Radene 3–8 kan TL-ansatte flytte opp/ned og skjule. Innstillingen er GLOBAL.
// Skoler leser kun synlige; ansatte ser alt (for redigeringspanelet, param aleAlle=true).
export async function hentMinsideSeksjoner(taMedSkjulte = false) {
  let q = supabase.from('minside_seksjon').select('seksjon, tittel, rekkefolge, synlig')
  if (!taMedSkjulte) q = q.eq('synlig', true)
  const { data, error } = await q.order('rekkefolge', { ascending: true })
  if (error) throw error
  return data || []
}

// Skjul/vis én seksjon (kun ansatt/superadmin — RLS avviser andre).
export async function settSeksjonSynlig(seksjon, synlig) {
  const { error } = await supabase
    .from('minside_seksjon').update({ synlig }).eq('seksjon', seksjon)
  if (error) throw error
}

// Bytt rekkefølge på TO seksjoner. Unik-constrainten på rekkefolge er DEFERRABLE
// INITIALLY DEFERRED (migr 130 K4), så et midlertidig duplikat er greit SÅ LENGE
// begge radene skrives i ÉN transaksjon. En PostgREST bulk-upsert av et array er én
// setning = én transaksjon → constrainten sjekkes først ved commit. To separate
// update-kall ville derimot vært to transaksjoner og brutt unikheten. onConflict er
// primærnøkkelen (seksjon), som er et TOTALT unikt constraint (upsert-kravet).
export async function byttSeksjonRekkefolge(a, b) {
  // a, b = fulle rader { seksjon, tittel, rekkefolge, synlig }
  const rader = [
    { seksjon: a.seksjon, tittel: a.tittel, synlig: a.synlig, rekkefolge: b.rekkefolge },
    { seksjon: b.seksjon, tittel: b.tittel, synlig: b.synlig, rekkefolge: a.rekkefolge },
  ]
  const { error } = await supabase
    .from('minside_seksjon').upsert(rader, { onConflict: 'seksjon' })
  if (error) throw error
}

// ── Aktuelt (minside_aktuelt, migr 131) ───────────────────────────────────────
// Skolerettet: kun synlige, sortert. Storage-bilder ligger i bøtta 'importfiler'
// under prefiks 'minside-aktuelt/'. bilde_url beregnes fra bilde_sti (public URL).
const BUCKET = 'importfiler'

function bildeUrl(sti) {
  if (!sti) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(sti)
  return data?.publicUrl ?? null
}

function medBildeUrl(rad) {
  return rad ? { ...rad, bilde_url: bildeUrl(rad.bilde_sti) } : rad
}

// Skoler: synlige blokker (RLS gir kun synlige til skoleroller uansett, men vi
// filtrerer eksplisitt så en ansatt som tester ikke får skjulte med).
export async function hentAktuelt() {
  const { data, error } = await supabase
    .from('minside_aktuelt')
    .select('id, overskrift, tekst, bilde_sti, bilde_beskrivelse, knapp_tekst, knapp_lenke, rekkefolge')
    .eq('synlig', true)
    .order('rekkefolge', { ascending: true })
    .order('oppdatert_at', { ascending: false })
  if (error) throw error
  return (data || []).map(medBildeUrl)
}

// Ansatt: alle blokker (også skjulte) for redigeringsflaten.
export async function hentAlleAktuelt() {
  const { data, error } = await supabase
    .from('minside_aktuelt')
    .select('*')
    .order('rekkefolge', { ascending: true })
    .order('oppdatert_at', { ascending: false })
  if (error) throw error
  return (data || []).map(medBildeUrl)
}

// Lagre (insert eller update). WCAG: base-CHECK avviser bilde uten beskrivelse — vi
// speiler det i UI, men constrainten er siste skanse.
export async function lagreAktuelt(rad) {
  const { data: { user } } = await supabase.auth.getUser()
  const payload = {
    overskrift: rad.overskrift,
    tekst: rad.tekst || null,
    bilde_sti: rad.bilde_sti || null,
    bilde_beskrivelse: rad.bilde_beskrivelse || null,
    knapp_tekst: rad.knapp_tekst || null,
    knapp_lenke: rad.knapp_lenke || null,
    synlig: rad.synlig ?? true,
    rekkefolge: rad.rekkefolge ?? 0,
    oppdatert_av: user?.id ?? null,
    oppdatert_at: new Date().toISOString(),
  }
  if (rad.id) {
    const { error } = await supabase.from('minside_aktuelt').update(payload).eq('id', rad.id)
    if (error) throw error
    return rad.id
  }
  const { data, error } = await supabase.from('minside_aktuelt').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}

export async function slettAktuelt(id) {
  const { error } = await supabase.from('minside_aktuelt').delete().eq('id', id)
  if (error) throw error
}

// Last opp et Aktuelt-bilde til importfiler/minside-aktuelt/. Returnerer objektstien
// (bilde_sti) — bilde_url beregnes ved lesing. Ansatt-only (Storage-policy migr 131).
export async function lastOppAktueltBilde(fil) {
  const ext = (fil.name.split('.').pop() || 'jpg').toLowerCase()
  const sti = `minside-aktuelt/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(sti, fil, { upsert: false, contentType: fil.type })
  if (error) throw error
  return sti
}

// ── Mest kjøpte leker (minside_mest_kjopt, migr 133) ──────────────────────────
// «YYYY-MM» per måned, rekkefolge 1–5. Skoler ser synlige; vi viser den nyeste
// måneden som har synlige rader (fallback bakover i tid), maks 5.
export function innevaerendeMaaned(dato = new Date()) {
  const aar = dato.getFullYear()
  const mnd = String(dato.getMonth() + 1).padStart(2, '0')
  return `${aar}-${mnd}`
}

// Skolerettet: nyeste måned med synlige rader (<= inneværende), sortert 1–5.
export async function hentMestKjopt() {
  const naa = innevaerendeMaaned()
  const { data, error } = await supabase
    .from('minside_mest_kjopt')
    .select('id, maaned, navn, pris, forpris, bilde_sti, lenke, rekkefolge')
    .eq('synlig', true)
    .lte('maaned', naa)
    .order('maaned', { ascending: false })
    .order('rekkefolge', { ascending: true })
  if (error) throw error
  const rader = data || []
  if (!rader.length) return { maaned: null, leker: [] }
  const maaned = rader[0].maaned
  return {
    maaned,
    leker: rader.filter((r) => r.maaned === maaned).map((r) => ({ ...r, bilde_url: bildeUrl(r.bilde_sti) })),
  }
}

// Ansatt: alle rader for en gitt måned (også skjulte), sortert 1–5.
export async function hentMestKjoptForMaaned(maaned) {
  const { data, error } = await supabase
    .from('minside_mest_kjopt').select('*').eq('maaned', maaned)
    .order('rekkefolge', { ascending: true })
  if (error) throw error
  return (data || []).map((r) => ({ ...r, bilde_url: bildeUrl(r.bilde_sti) }))
}

// Hvilke måneder finnes (for månedsvelgeren i admin).
export async function hentMestKjoptMaaneder() {
  const { data, error } = await supabase
    .from('minside_mest_kjopt').select('maaned').order('maaned', { ascending: false })
  if (error) throw error
  return [...new Set((data || []).map((r) => r.maaned))]
}

export async function lagreMestKjopt(rad) {
  const { data: { user } } = await supabase.auth.getUser()
  const payload = {
    maaned: rad.maaned,
    navn: rad.navn,
    pris: rad.pris,
    forpris: rad.forpris === '' || rad.forpris == null ? null : rad.forpris,
    bilde_sti: rad.bilde_sti || null,
    lenke: rad.lenke,
    rekkefolge: rad.rekkefolge,
    synlig: rad.synlig ?? true,
    oppdatert_av: user?.id ?? null,
    oppdatert_at: new Date().toISOString(),
  }
  if (rad.id) {
    const { error } = await supabase.from('minside_mest_kjopt').update(payload).eq('id', rad.id)
    if (error) throw error
    return rad.id
  }
  const { data, error } = await supabase.from('minside_mest_kjopt').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}

export async function slettMestKjopt(id) {
  const { error } = await supabase.from('minside_mest_kjopt').delete().eq('id', id)
  if (error) throw error
}

// Bytt rekkefølge på to leker i samme måned. Samme deferrable-mekanikk som seksjoner:
// unik (maaned, rekkefolge) er DEFERRABLE (migr 133 K2) → bulk-upsert i én transaksjon.
export async function byttMestKjoptRekkefolge(a, b) {
  const rader = [
    { id: a.id, maaned: a.maaned, navn: a.navn, pris: a.pris, forpris: a.forpris,
      bilde_sti: a.bilde_sti, lenke: a.lenke, synlig: a.synlig, rekkefolge: b.rekkefolge },
    { id: b.id, maaned: b.maaned, navn: b.navn, pris: b.pris, forpris: b.forpris,
      bilde_sti: b.bilde_sti, lenke: b.lenke, synlig: b.synlig, rekkefolge: a.rekkefolge },
  ]
  const { error } = await supabase.from('minside_mest_kjopt').upsert(rader, { onConflict: 'id' })
  if (error) throw error
}

export async function lastOppMestKjoptBilde(fil) {
  const ext = (fil.name.split('.').pop() || 'jpg').toLowerCase()
  const sti = `minside-mest-kjopt/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(sti, fil, { upsert: false, contentType: fil.type })
  if (error) throw error
  return sti
}

// ── Tipslister (samlinger med nøkkel-prefiks 'tips-') ─────────────────────────
// Låses opp av nøkkelmigrasjonen (byggegrunnlag §2.2). Returnerer [] så lenge ingen
// samling har fått en 'tips-'-nøkkel — da viser Tipslister-kortet «Kommer snart».
// Feiler stille ([]) hvis nokkel-kolonnen ikke finnes ennå.
export async function hentTipslister(sprak = 'nb') {
  try {
    const { data, error } = await supabase
      .from('samlinger')
      .select('id, nokkel, synlig, samling_innhold ( sprak, tittel )')
      .like('nokkel', 'tips-%')
      .eq('synlig', true)
    if (error) throw error
    return (data || []).map((s) => {
      const innhold = (s.samling_innhold || []).find((i) => i.sprak === sprak)
        || (s.samling_innhold || []).find((i) => i.sprak === 'nb')
        || (s.samling_innhold || [])[0]
      return { id: s.id, nokkel: s.nokkel, tittel: innhold?.tittel ?? null }
    }).filter((s) => s.tittel)
  } catch {
    return []
  }
}

// ── Regionansvarlig (hent_regionansvarlig, migr 135) ──────────────────────────
// Trygt oppslag (SECURITY DEFINER med skolegrense). Returnerer { navn, epost } eller
// null når skolen mangler nettverk/RA, eller kalleren ikke har tilgang til skolen.
export async function hentRegionansvarlig(skoleId) {
  if (!skoleId) return null
  try {
    const { data, error } = await supabase.rpc('hent_regionansvarlig', { p_skole_id: skoleId })
    if (error) return null
    const rad = Array.isArray(data) ? data[0] : data
    return rad && rad.navn ? { navn: rad.navn, epost: rad.epost || null } : null
  } catch {
    return null
  }
}
