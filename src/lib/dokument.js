import { supabase } from './supabase'

// Datalag for dokumentflaten (D5). Lettere variant enn lek-redigeringen: direkte skriving beskyttet
// av RLS (fase3_intern), INGEN transaksjons-RPC (planen D5). dokumenter + dokument_dokumenttype +
// dokument_sprak redigeres; ressurs_dokument (leker) vises kun (redigeres på lek-siden).

const VELG = `
  id, tittel, type, status, endret_at,
  dokument_dokumenttype ( dokument_type_id ),
  dokument_sprak ( sprak ),
  ressurs_dokument ( ressurs_id, ressurser ( id, ressurs_innhold ( sprak, tittel ) ) ),
  redaksjonell_ko ( type, beskrivelse, status )
`

function lekTittel(r) {
  const inn = r?.ressurs_innhold || []
  return (inn.find((x) => x.sprak === 'nb') || inn[0] || {}).tittel || null
}

function formDok(d) {
  return {
    id: d.id,
    tittel: d.tittel,
    filtype: d.type,                 // filformat (pdf/pptx …) — vises, redigeres ikke
    status: d.status,
    endretAt: d.endret_at,
    typeIds: (d.dokument_dokumenttype || []).map((x) => x.dokument_type_id),
    sprak: (d.dokument_sprak || []).map((x) => x.sprak),
    leker: (d.ressurs_dokument || []).map((x) => ({ id: x.ressurs_id, tittel: lekTittel(x.ressurser) })).filter((l) => l.id),
    koApne: (d.redaksjonell_ko || []).filter((k) => k.status === 'ny'),
  }
}

// Alle dokumenter i ett kall (538, near-tomt i prod). Filtrering/søk/tellere gjøres klientside for
// levende, øyeblikkelig respons — samme mønster som lekebiblioteket/køen tåler denne størrelsen.
export async function hentAlleDokumenter() {
  const { data, error } = await supabase.from('dokumenter').select(VELG).order('tittel')
  if (error) throw error
  return (data || []).map(formDok)
}

// Dokumenttype-taksonomien (51, to nivåer). Kun LES for skjemaet (selve taksonomien redigeres av
// superadmin andre steder). Brukes til å krysse av typer på et dokument (dokument_dokumenttype).
export async function hentDokumenttyper() {
  const { data, error } = await supabase.from('dokument_type').select('id, navn, forelder_id, rekkefolge').order('rekkefolge')
  if (error) throw error
  return data || []
}

// Synk en koblingstabell til ønsket sett: slett de som ikke skal være der, sett inn de nye.
async function synkJoin(tabell, kol, dokId, verdier) {
  let delQ = supabase.from(tabell).delete().eq('dokument_id', dokId)
  if (verdier.length) {
    const liste = verdier.map((v) => (typeof v === 'string' ? `"${v}"` : v)).join(',')
    delQ = delQ.not(kol, 'in', `(${liste})`)
  }
  const { error: eDel } = await delQ
  if (eDel) throw eDel
  if (verdier.length) {
    const rader = verdier.map((v) => ({ dokument_id: dokId, [kol]: v }))
    const { error: eIns } = await supabase.from(tabell).upsert(rader, { onConflict: `dokument_id,${kol}`, ignoreDuplicates: true })
    if (eIns) throw eIns
  }
}

// Lagre ett dokument. Tre skriv (ikke transaksjon — lav sensitivitet, planen D5): dokumenter-raden,
// så dokumenttyper, så språk. endret_at/endret_av settes eksplisitt (ingen trigger gjør det).
export async function lagreDokument(id, felt, brukerId) {
  const { tittel, status, typeIds, sprak } = felt
  const { error } = await supabase
    .from('dokumenter')
    .update({ tittel, status, endret_at: new Date().toISOString(), endret_av: brukerId || null })
    .eq('id', id)
  if (error) throw error
  await synkJoin('dokument_dokumenttype', 'dokument_type_id', id, typeIds)
  await synkJoin('dokument_sprak', 'sprak', id, sprak)
}
