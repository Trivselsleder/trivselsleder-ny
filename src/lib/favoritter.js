import { supabase } from './supabase'
import { loggBrukHendelse } from './leker'

export async function hentMineFavoritter() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data } = await supabase.from('favoritter').select('ressurs_id').eq('bruker_id', user.id)
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
