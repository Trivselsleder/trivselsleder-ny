import { supabase } from './supabase'
import { hentMinSkole, lekTittel } from './skole'

const HJUL_VELG = `
  id, navn, beskrivelse, status, opprettet_at,
  tl_hjul_lek ( id, rekkefolge, ressurs_id,
    ressurser ( id, ressurs_innhold ( sprak, tittel ) ) )
`

export function formHjul(rad) {
  const leker = (rad.tl_hjul_lek || [])
    .slice()
    .sort((a, b) => a.rekkefolge - b.rekkefolge)
    .map((k) => ({
      koblingId: k.id,
      ressursId: k.ressurs_id,
      tittel: lekTittel(k.ressurser),
    }))
  return {
    id: rad.id,
    navn: rad.navn,
    beskrivelse: rad.beskrivelse,
    status: rad.status,
    leker,
  }
}

export async function hentHjul() {
  const { data, error } = await supabase
    .from('tl_hjul')
    .select(HJUL_VELG)
    .eq('status', 'aktiv')
    .order('opprettet_at', { ascending: false })
  if (error) throw error
  return (data || []).map(formHjul)
}

export async function hentHjulEn(id) {
  const { data, error } = await supabase.from('tl_hjul').select(HJUL_VELG).eq('id', id).single()
  if (error) throw error
  return formHjul(data)
}

export async function opprettHjul({ navn, beskrivelse = null, leker = [] }) {
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('tl_hjul')
    .insert({ navn, beskrivelse, skole_id: skoleId })
    .select('id')
    .single()
  if (error) throw error
  const hjulId = data.id
  if (leker.length) {
    const rader = leker.map((ressursId, i) => ({ hjul_id: hjulId, ressurs_id: ressursId, rekkefolge: i }))
    const { error: e2 } = await supabase.from('tl_hjul_lek').insert(rader)
    if (e2) throw e2
  }
  return hjulId
}

// Erstatt kakestykkene på et hjul med en ny liste (peker på leker).
export async function settHjulLeker(hjulId, ressursIder) {
  const { error: eDel } = await supabase.from('tl_hjul_lek').delete().eq('hjul_id', hjulId)
  if (eDel) throw eDel
  if (ressursIder.length) {
    const rader = ressursIder.map((ressursId, i) => ({ hjul_id: hjulId, ressurs_id: ressursId, rekkefolge: i }))
    const { error } = await supabase.from('tl_hjul_lek').insert(rader)
    if (error) throw error
  }
}

// Legg én lek til på et hjul (til slutt). Returnerer 'lagt' eller 'fantes'
// hvis leken allerede lå på hjulet (unique-brudd 23505).
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
    .insert({ hjul_id: hjulId, ressurs_id: ressursId, rekkefolge: neste })
  if (error && error.code !== '23505') throw error
  return error?.code === '23505' ? 'fantes' : 'lagt'
}

export async function giHjulNavn(hjulId, navn) {
  const { error } = await supabase.from('tl_hjul').update({ navn }).eq('id', hjulId)
  if (error) throw error
}

export async function arkiverHjul(hjulId) {
  const { error } = await supabase.from('tl_hjul').update({ status: 'arkivert' }).eq('id', hjulId)
  if (error) throw error
}
