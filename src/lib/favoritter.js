import { supabase } from './supabase'
import { loggBrukHendelse } from './leker'

export async function hentMineFavoritter() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  // Etter migr 132 kan en favorittrad peke på ENTEN ressurs ELLER dokument. Uten filteret
  // ville dokumentfavoritter (ressurs_id = null) gitt et null-element i mengden, og «Mine valg»
  // -telleren vist for høyt (F3). Vi henter kun leke-favorittene her.
  const { data } = await supabase
    .from('favoritter').select('ressurs_id').eq('bruker_id', user.id).not('ressurs_id', 'is', null)
  return new Set((data || []).map((r) => r.ressurs_id))
}

export async function erFavoritt(ressursId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase
    .from('favoritter')
    .select('ressurs_id')
    .eq('bruker_id', user.id)
    .eq('ressurs_id', ressursId)
    .maybeSingle()
  return !!data
}

// paa=true → legg til, paa=false → fjern. Dobbel-innsetting (23505) ignoreres.
export async function settFavoritt(ressursId, paa) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  if (paa) {
    const { error } = await supabase.from('favoritter').insert({ bruker_id: user.id, ressurs_id: ressursId })
    if (error && error.code !== '23505') throw error
    loggBrukHendelse('favoritt', { ressursId })
  } else {
    const { error } = await supabase
      .from('favoritter')
      .delete()
      .eq('bruker_id', user.id)
      .eq('ressurs_id', ressursId)
    if (error) throw error
  }
}

// ── Dokumentfavoritter (migr 132: favoritter kan peke på ENTEN ressurs ELLER dokument) ──
// Samme hjerte/mønster som favorittleker, men raden peker på dokument_id.
export async function hentMineDokumentFavoritter() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data, error } = await supabase
    .from('favoritter').select('dokument_id').eq('bruker_id', user.id).not('dokument_id', 'is', null)
  if (error) throw error
  return new Set((data || []).map((r) => r.dokument_id))
}

// paa=true → legg til, paa=false → fjern. Dobbel-innsetting (23505) ignoreres.
// Merk: vi logger IKKE 'favoritt' i bruk_hendelse for dokumenter — den hendelsen har
// ingen dokument-peker (peker-CHECK i migr 125 tillater dokument_id kun på 'dokument_apnet'),
// så en logglinje uten peker ville vært verdiløs. Selve favoritten lagres uansett.
export async function settDokumentFavoritt(dokumentId, paa) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  if (paa) {
    const { error } = await supabase.from('favoritter').insert({ bruker_id: user.id, dokument_id: dokumentId })
    if (error && error.code !== '23505') throw error
  } else {
    const { error } = await supabase
      .from('favoritter')
      .delete()
      .eq('bruker_id', user.id)
      .eq('dokument_id', dokumentId)
    if (error) throw error
  }
}
