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

export async function oppdaterDeltaker(id, felter) {
  const { error } = await supabase.from('tl_deltaker').update(felter).eq('id', id)
  if (error) throw error
}

// «Slett» = deaktiver (skånsomt; navnet kan stå i eksisterende planer som tekst).
export async function fjernDeltaker(id) {
  const { error } = await supabase.from('tl_deltaker').update({ aktiv: false }).eq('id', id)
  if (error) throw error
}
