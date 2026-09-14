import { supabase } from './supabase'
import { hentMinSkole, lekTittel } from './skole'
import { hentLeker } from './leker'

// ---- Periodeplan v2: ukerutenett (dager × leker, TL-klasse i cellene) ----

const PLAN_VELG = `
  id, navn, beskrivelse, status, aar, uker, dager, ansvarlige, orientering, delingstoken, opprettet_at,
  periodeplan_rad (
    id, ressurs_id, rekkefolge, celler,
    ressurser (
      id,
      ressurs_innhold ( sprak, tittel ),
      ressurs_egnet ( egnet_kategori ( navn ) ),
      ressurs_utstyr ( utstyr ( navn ) ),
      medier ( type, alt_tekst )
    )
  )
`

function formRad(r) {
  const res = r.ressurser
  return {
    id: r.id,
    ressursId: r.ressurs_id,
    rekkefolge: r.rekkefolge,
    celler: r.celler || {},
    lek: res
      ? {
          id: res.id,
          tittel: lekTittel(res),
          egnet: (res.ressurs_egnet || []).map((x) => x.egnet_kategori?.navn).filter(Boolean),
          utstyr: (res.ressurs_utstyr || []).map((x) => x.utstyr?.navn).filter(Boolean),
          medier: res.medier || [],
        }
      : { id: null, tittel: 'Slettet lek', egnet: [], utstyr: [], medier: [] },
  }
}

export function formPlan(rad) {
  return {
    id: rad.id,
    navn: rad.navn,
    beskrivelse: rad.beskrivelse,
    status: rad.status,
    aar: rad.aar,
    uker: rad.uker || [],
    dager: rad.dager || [],
    ansvarlige: rad.ansvarlige || {},
    orientering: rad.orientering || 'landscape',
    delingstoken: rad.delingstoken,
    rader: (rad.periodeplan_rad || []).map(formRad).sort((a, b) => a.rekkefolge - b.rekkefolge),
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

const STD_DAGER = ['MANDAG', 'TIRSDAG', 'ONSDAG', 'TORSDAG', 'FREDAG']

// Nivå = hvem planen gjelder for (velges på forhånd). Lagres i et hjørne av
// `ansvarlige`-jsonb-en (`_nivaa`) for å slippe schema-endring — PDF/rutenett
// leser bare ansvarlige[dag], så nøkkelen er usynlig der.
export const NIVAA = [
  { v: 'barne', l: 'Barneskole' },
  { v: 'ungdom', l: 'Ungdomsskole' },
  { v: 'hele', l: 'Hele skolen' },
]
export function planNivaa(plan) { return plan?.ansvarlige?._nivaa || null }
export function nivaaLabel(v) { return NIVAA.find((n) => n.v === v)?.l || null }

export async function opprettPlan({ navn, aar = null, uker = [], dager = STD_DAGER, orientering = 'landscape', nivaa = null }) {
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('periodeplan')
    .insert({ navn, aar, uker, dager, orientering, skole_id: skoleId, ansvarlige: nivaa ? { _nivaa: nivaa } : {} })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function oppdaterPlan(id, felter) {
  const { error } = await supabase.from('periodeplan').update(felter).eq('id', id)
  if (error) throw error
}

export async function leggTilRad(planId, ressursId, rekkefolge = 0) {
  const { data, error } = await supabase
    .from('periodeplan_rad')
    .insert({ plan_id: planId, ressurs_id: ressursId, rekkefolge, celler: {} })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// Klienten sender hele celler-objektet ({dag: tekst}) for raden.
export async function settRadCeller(radId, celler) {
  const { error } = await supabase.from('periodeplan_rad').update({ celler }).eq('id', radId)
  if (error) throw error
}

export async function slettRad(radId) {
  const { error } = await supabase.from('periodeplan_rad').delete().eq('id', radId)
  if (error) throw error
}

// Oppdater rekkefolge på flere rader (etter dra/sorter).
export async function settRekkefolge(rader) {
  await Promise.all(
    rader.map((r, i) => supabase.from('periodeplan_rad').update({ rekkefolge: i }).eq('id', r.id))
  )
}

// ---- Papirkurv (erstatter «arkiver»): slett med 30 dagers angrefrist ----
// Flytt en plan til papirkurven (status='arkivert'). Trigger i basen (migr 115)
// setter arkivert_at = now(); nattjobben sletter den for godt etter 30 dager.
export async function flyttTilPapirkurv(id) {
  const { error } = await supabase.from('periodeplan').update({ status: 'arkivert' }).eq('id', id)
  if (error) throw error
}
// Bakoverkompatibelt alias (gammelt navn).
export const arkiverPlan = flyttTilPapirkurv

// Planene som ligger i papirkurven, nyeste slettet først.
export async function hentPapirkurv() {
  const { data, error } = await supabase
    .from('periodeplan')
    .select('id, navn, aar, arkivert_at')
    .eq('status', 'arkivert')
    .order('arkivert_at', { ascending: false })
  if (error) throw error
  return data || []
}

// Ut av papirkurven igjen (status='aktiv'). Trigger nullstiller arkivert_at.
export async function gjenopprett(id) {
  const { error } = await supabase.from('periodeplan').update({ status: 'aktiv' }).eq('id', id)
  if (error) throw error
}

// Slett for godt nå (uten å vente på nattjobben). Barna forsvinner via CASCADE.
// Herding (Fable 10. sep): slett KUN en rad som ligger i papirkurven (status='arkivert'),
// aldri en aktiv plan eller en feil id. .select() gir de slettede radene tilbake — 0 rader
// betyr at ingenting matchet, og vi kaster en tydelig feil i stedet for en stille no-op.
export async function slettForGodt(id) {
  const { data, error } = await supabase
    .from('periodeplan').delete().eq('id', id).eq('status', 'arkivert').select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Fant ingen plan i papirkurven å slette — den er kanskje alt slettet eller gjenopprettet.')
  }
}

// Kopier plan (til nytt semester/skoleår). Dupliserer oppsett + rader.
export async function kopierPlan(planId, nyNavn) {
  const kilde = await hentPlanEn(planId)
  const skoleId = await hentMinSkole()
  const { data, error } = await supabase
    .from('periodeplan')
    .insert({
      navn: nyNavn || `${kilde.navn} (kopi)`,
      aar: kilde.aar,
      uker: kilde.uker,
      dager: kilde.dager,
      ansvarlige: kilde.ansvarlige,
      orientering: kilde.orientering,
      skole_id: skoleId,
    })
    .select('id')
    .single()
  if (error) throw error
  const nyId = data.id
  if (kilde.rader.length) {
    const rader = kilde.rader.map((r) => ({
      plan_id: nyId,
      ressurs_id: r.ressursId,
      rekkefolge: r.rekkefolge,
      celler: r.celler,
    }))
    const { error: e2 } = await supabase.from('periodeplan_rad').insert(rader)
    if (e2) throw e2
  }
  return nyId
}

// «Generer hele skoleåret»: lag én plan per valgt uke, med samme rutenett som malen.
// (Ferieuker velges bort av brukeren i UI før dette kalles. Rotasjon/variasjon
//  per uke er en senere forbedring — v1 gjentar malen.)
export async function genererForUker(malPlanId, ukeliste) {
  const kilde = await hentPlanEn(malPlanId)
  const skoleId = await hentMinSkole()
  let laget = 0
  for (const uke of ukeliste) {
    const { data, error } = await supabase
      .from('periodeplan')
      .insert({
        navn: `${kilde.navn} – uke ${uke}`,
        aar: kilde.aar,
        uker: [uke],
        dager: kilde.dager,
        ansvarlige: kilde.ansvarlige,
        orientering: kilde.orientering,
        skole_id: skoleId,
      })
      .select('id')
      .single()
    if (error) throw error
    if (kilde.rader.length) {
      const rader = kilde.rader.map((r) => ({
        plan_id: data.id,
        ressurs_id: r.ressursId,
        rekkefolge: r.rekkefolge,
        celler: {},
      }))
      await supabase.from('periodeplan_rad').insert(rader)
    }
    laget++
  }
  return laget
}

// ---- Deling ----
export function delingsUrl(plan) {
  return `${window.location.origin}/plan/${plan.delingstoken}`
}

export async function hentDeltPlan(token) {
  const { data, error } = await supabase.rpc('hent_delt_periodeplan', { token })
  if (error) throw error
  return data // jsonb eller null
}

// Roter delingstoken → den FORRIGE delte lenken slutter å virke umiddelbart (RPC-en matcher på
// nøyaktig token). Dette er «slå av deling» uten basendring: delingstoken er NOT NULL, så vi kan
// ikke fjerne den helt, men en rotasjon dreper en lekket/overdelt lenke. En EKTE av/på-bryter og
// utløpsdato krever en migrasjon (egen kolonne + RPC-sjekk) — se rapport.
export async function roterDelingstoken(planId) {
  const ny = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const { data, error } = await supabase
    .from('periodeplan')
    .update({ delingstoken: ny })
    .eq('id', planId)
    .select('delingstoken')
    .single()
  if (error) throw error
  return data.delingstoken
}

// ---- Smarte lek-forslag ----
// Basert på sesong (måned), sted, trinn og «ikke allerede på planen».
// (Vær er utelatt – ingen værkilde koblet ennå. Dokumentert valg.)
function sesongNaa() {
  const m = new Date().getMonth() + 1 // 1..12  (Date brukes i nettleser, ikke i workflow)
  if ([12, 1, 2].includes(m)) return 'Vinter'
  if ([3, 4, 5].includes(m)) return 'Vår'
  if ([6, 7, 8].includes(m)) return 'Sommer'
  return 'Høst'
}

export async function smarteForslag({ sted = '', trinn = '', ekskluder = [] } = {}) {
  const alle = await hentLeker()
  const sesong = sesongNaa()
  const ekset = new Set(ekskluder)
  const scored = alle
    .filter((l) => !ekset.has(l.id))
    .map((l) => {
      let poeng = 0
      if (l.sesong?.includes(sesong)) poeng += 3
      if (sted && (l.sted === sted || l.sted === 'begge')) poeng += 2
      if (trinn && l.trinn?.some((t) => t.kode === trinn)) poeng += 2
      if (l.rating) poeng += Math.min(2, l.rating / 2.5)
      return { lek: l, poeng }
    })
    .sort((a, b) => b.poeng - a.poeng)
  return scored.slice(0, 8).map((x) => x.lek)
}
