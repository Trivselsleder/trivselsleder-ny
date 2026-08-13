import { supabase } from './supabase'

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

export async function hentLeker() {
  const { data, error } = await supabase
    .from('ressurser')
    .select(VELG)
    .eq('status', 'publisert')
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

export async function loggBruk(hendelse, { ressursId = null, sokTekst = null } = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('bruk_hendelse').insert({
      bruker_id: user.id,
      ressurs_id: ressursId,
      hendelse,
      sok_tekst: sokTekst,
    })
  } catch {
    /* logging skal aldri velte siden */
  }
}
