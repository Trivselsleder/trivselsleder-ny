import { supabase } from './supabase'
import { hentMinSkole, lekTittel } from './skole'

const PLAN_VELG = `
  id, navn, beskrivelse, status, opprettet_at,
  periodeplan_oppforing ( id, ressurs_id, dato, uke, sted, ansvarlige, notat, rekkefolge,
    ressurser ( id, ressurs_innhold ( sprak, tittel ) ) )
`

export function formPlan(rad) {
  const oppforinger = (rad.periodeplan_oppforing || [])
    .slice()
    .sort((a, b) => a.rekkefolge - b.rekkefolge)
    .map((o) => ({
      id: o.id,
      ressursId: o.ressurs_id,
      tittel: o.ressurs_id ? lekTittel(o.ressurser) : null,
      dato: o.dato,
      uke: o.uke,
      sted: o.sted,
      ansvarlige: o.ansvarlige,
      notat: o.notat,
      rekkefolge: o.rekkefolge,
    }))
  return {
    id: rad.id,
    navn: rad.navn,
    beskrivelse: rad.beskrivelse,
    status: rad.status,
    oppforinger,
  }
}

export async function hentPlaner() {
  const { data, error } = await supabase
    .from('periodeplan')
    .select(PLAN_VELG)
    .eq('status', 'aktiv')
    .order('opprettet_at', { ascending: false })
  if (error) throw error
  return (data || []).map(formPlan)
}

export async function hentPlanEn(id) {
  const { data, error } = await supabase.from('periodeplan').select(PLAN_VELG).eq('id', id).single()
  if (error) throw error
  return formPlan(data)
}

export async function opprettPlan({ navn, beskrivelse = null }) {
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('periodeplan')
    .insert({ navn, beskrivelse, skole_id: skoleId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function giPlanNavn(planId, navn) {
  const { error } = await supabase.from('periodeplan').update({ navn }).eq('id', planId)
  if (error) throw error
}

export async function arkiverPlan(planId) {
  const { error } = await supabase.from('periodeplan').update({ status: 'arkivert' }).eq('id', planId)
  if (error) throw error
}

// Legg til en oppføring. ressursId kan være null (fri linje).
export async function leggTilOppforing(planId, { ressursId = null, rekkefolge = 0 } = {}) {
  const { data, error } = await supabase
    .from('periodeplan_oppforing')
    .insert({ plan_id: planId, ressurs_id: ressursId, rekkefolge })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function oppdaterOppforing(oppforingId, felter) {
  const { error } = await supabase.from('periodeplan_oppforing').update(felter).eq('id', oppforingId)
  if (error) throw error
}

export async function slettOppforing(oppforingId) {
  const { error } = await supabase.from('periodeplan_oppforing').delete().eq('id', oppforingId)
  if (error) throw error
}
