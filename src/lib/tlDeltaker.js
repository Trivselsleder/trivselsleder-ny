import { supabase } from './supabase'
import { hentMinSkole } from './skole'

// Skolens egen TL-liste (ansvarlige / grupper). Skoleadmin redigerer; alle på
// skolen kan lese og velge fra den i periodeplanen.

export async function hentDeltakere() {
  const skoleId = await hentMinSkole()
  if (!skoleId) return []
  const { data, error } = await supabase
    .from('tl_deltaker')
    .select('id, navn, gruppe, aktiv')
    .eq('skole_id', skoleId)
    .eq('aktiv', true)
    .order('navn')
  if (error) throw error
  return data || []
}

export async function leggTilDeltaker({ navn, gruppe = null }) {
  const skoleId = await hentMinSkole()
  if (!skoleId) throw new Error('Ingen skole knyttet til brukeren.')
  const { data, error } = await supabase
    .from('tl_deltaker')
    .insert({ skole_id: skoleId, navn, gruppe })
    .select('id, navn, gruppe, aktiv')
    .single()
  if (error) throw error
  return data
}

// Bulk-innlegging fra CSV/innliming. Hopper over navn+gruppe som allerede finnes
// AKTIVE (samme skole), og REAKTIVERER myk-slettede treff i stedet for å lage
// nye rader — så gjentatt import verken dupliserer eller hoper opp inaktive rader.
export async function leggTilDeltakereBulk(rader) {
  const skoleId = await hentMinSkole()
  if (!skoleId) throw new Error('Ingen skole knyttet til brukeren.')

  const nokkelAv = (navn, gruppe) => `${navn.toLowerCase()}|${(gruppe || '').toLowerCase()}`

  const rene = []
  const settInnbatch = new Set()
  for (const r of rader || []) {
    const navn = (r.navn || '').trim()
    if (!navn) continue
    const gruppe = (r.gruppe || '').trim() || null
    const nokkel = nokkelAv(navn, gruppe)
    if (settInnbatch.has(nokkel)) continue // dublett i selve fila
    settInnbatch.add(nokkel)
    rene.push({ navn, gruppe, nokkel })
  }
  if (rene.length === 0) return { lagtTil: [], reaktivert: 0, hoppetOver: 0 }

  const { data: fins, error: lesFeil } = await supabase
    .from('tl_deltaker')
    .select('id, navn, gruppe, aktiv')
    .eq('skole_id', skoleId)
  if (lesFeil) throw lesFeil

  const aktive = new Set()
  const inaktive = new Map() // nøkkel -> id (reaktiverbar)
  for (const d of fins || []) {
    const k = nokkelAv(d.navn || '', d.gruppe)
    if (d.aktiv) aktive.add(k)
    else if (!inaktive.has(k)) inaktive.set(k, d.id)
  }

  let hoppetOver = 0
  const reaktiverIds = []
  const nyeInsert = []
  for (const r of rene) {
    if (aktive.has(r.nokkel)) { hoppetOver++; continue }
    if (inaktive.has(r.nokkel)) { reaktiverIds.push(inaktive.get(r.nokkel)); continue }
    nyeInsert.push({ skole_id: skoleId, navn: r.navn, gruppe: r.gruppe })
  }

  if (reaktiverIds.length > 0) {
    const { error } = await supabase.from('tl_deltaker').update({ aktiv: true }).in('id', reaktiverIds)
    if (error) throw error
  }

  let lagtTil = []
  if (nyeInsert.length > 0) {
    const { data, error } = await supabase
      .from('tl_deltaker')
      .insert(nyeInsert)
      .select('id, navn, gruppe, aktiv')
    if (error) throw error
    lagtTil = data || []
  }

  return { lagtTil, reaktivert: reaktiverIds.length, hoppetOver }
}

export async function oppdaterDeltaker(id, felter) {
  const { error } = await supabase.from('tl_deltaker').update(felter).eq('id', id)
  if (error) throw error
}

// «Slett» = deaktiver (skånsomt; navnet kan stå i eksisterende planer som tekst).
export async function fjernDeltaker(id) {
  const { error } = await supabase.from('tl_deltaker').update({ aktiv: false }).eq('id', id)
  if (error) throw error
}
