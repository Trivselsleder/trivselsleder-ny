import { supabase } from './supabase'

// Datalag for redaksjonskøen (D4). redaksjonell_ko (migr 093): 22 typer, 4 statuser, RLS = fase3_intern
// (kun interne). INGEN ny migrasjon — bulk-lukking er én PostgREST-UPDATE med filter.

// KVITTERINGSTYPER: importen har handlet, mennesket bekrefter → trygge å bulk-lukke etter stikkprøver.
// Konservativt sett (lett å utvide): de tre der lukking = ren bekreftelse, ingen arbeid går tapt.
export const KVITTERING_TYPER = ['ikke_et_maal', 'utgatt_fjernet', 'samling_video_ulastet']
// BEKREFTBAR: typer med en egen «Bekreft forslag»-handling (RPC). usikker_maalkobling kobler
// ressursen til det foreslåtte målet via bekreft_kompetansemaal_forslag (migr 118). Tidligere
// «kommer» fordi trigger-funksjonen manglet search_path (42P01) — migr 112 rettet det 10. sep.
export const BEKREFTBAR_TYPER = ['usikker_maalkobling']

const VELG = `
  id, type, status, ressurs_id, dokument_id, medie_id, samling_id, kompetansemaal_id,
  beskrivelse, forslag, ansvarlig, opprettet_at,
  ressurser ( id, ressurs_innhold ( sprak, tittel ) ),
  dokumenter ( id, tittel ),
  kompetansemaal ( kode, tekst )
`

function formKorad(r) {
  const inn = r.ressurser?.ressurs_innhold || []
  const tittel = (inn.find((x) => x.sprak === 'nb') || inn[0] || {}).tittel || null
  return {
    id: r.id, type: r.type, status: r.status, beskrivelse: r.beskrivelse, forslag: r.forslag,
    ansvarlig: r.ansvarlig, opprettetAt: r.opprettet_at,
    ressursId: r.ressurs_id, dokumentId: r.dokument_id, samlingId: r.samling_id,
    kompetansemaalId: r.kompetansemaal_id,
    ressursTittel: tittel, dokumentTittel: r.dokumenter?.tittel || null,
    kompetansemaal: r.kompetansemaal || null,
  }
}

// Tellere per type for en status (kun `type`-kolonnen hentes → lett; grupperes klientside).
export async function hentKotellere(status = 'ny') {
  const { data, error } = await supabase.from('redaksjonell_ko').select('type').eq('status', status)
  if (error) throw error
  const t = {}
  for (const r of data || []) t[r.type] = (t[r.type] || 0) + 1
  return t
}

// Rader for én type + status, eldste først. Største bunke er 409 → godt innenfor.
export async function hentKorader(type, status = 'ny') {
  const { data, error } = await supabase
    .from('redaksjonell_ko')
    .select(VELG)
    .eq('type', type)
    .eq('status', status)
    .order('opprettet_at', { ascending: true })
  if (error) throw error
  return (data || []).map(formKorad)
}

// Lukk / avvis én rad. lost_av + lost_at settes ved lukking; ansvarlig = profil-uuid (ikke fritekst).
export async function lukkRad(id, status, brukerId) {
  const felt = { status }
  if (status === 'lost' || status === 'avvist') { felt.lost_at = new Date().toISOString(); felt.lost_av = brukerId || null }
  const { error } = await supabase.from('redaksjonell_ko').update(felt).eq('id', id)
  if (error) throw error
}

// Tildel en sak: ansvarlig = brukerId (settes fritt til en intern profil; her «meg»), status under_arbeid.
// null = fjern tildeling → tilbake til 'ny'.
export async function tildelRad(id, brukerId) {
  const { error } = await supabase
    .from('redaksjonell_ko')
    .update({ ansvarlig: brukerId, status: brukerId ? 'under_arbeid' : 'ny' })
    .eq('id', id)
  if (error) throw error
}

// BEKREFT et usikkert kompetansemål-forslag (migr 118, RPC): kobler ressursen til det
// foreslåtte målet som MENNESKESATT kobling, markerer forslaget godkjent og lukker kø-raden —
// alt i én atomisk transaksjon serverside. Triggeren stopper utgåtte/erstattede mål. Kaster ved feil.
export async function bekreftKompetansemaalForslag(koId) {
  const { error } = await supabase.rpc('bekreft_kompetansemaal_forslag', { p_ko_id: koId })
  if (error) throw error
}

// BULK-LUKKING — ÉN operasjon (PostgREST UPDATE med filter), ikke N enkeltkall. Kun kvitteringstyper.
// Returnerer antall lukkede rader.
export async function lukkGruppe(type, brukerId) {
  if (!KVITTERING_TYPER.includes(type)) throw new Error('Bulk-lukking er kun for kvitteringstyper.')
  const { error, count } = await supabase
    .from('redaksjonell_ko')
    .update({ status: 'lost', lost_at: new Date().toISOString(), lost_av: brukerId || null }, { count: 'exact' })
    .eq('type', type)
    .eq('status', 'ny')
  if (error) throw error
  return count ?? 0
}
