import { supabase } from './supabase'
import { formLek } from './leker'
import {
  velgInnhold, sorterSamlinger, synligeLeker, synligeDokumenter,
  formSamlingDokument, sorterMedier,
} from './samlingForm'

// Samlingsvisning for lærere (visning, ikke redigering — D6 kommer senere). All synlighet
// styres av RLS: samlinger p_les = synlig OR intern (030), og barn-tabellene arver samme gate
// (032/095/101). En innlogget skolebruker (authenticated) har select på alle fem tabellene
// (093B for samlinger/-innhold/-ressurs; 101 for -dokument; 095 for -medie).

// Slank ressurs-select til LekeKort (delmengde av VELG i leker.js): kun feltene kortet viser,
// slik at samlingssiden ikke drar de sju lange tekstfeltene. formLek fyller resten trygt (|| []).
const LEK_VELG = `
  id, sted, antall_min, antall_maks, redaksjonell_rating, ressurstype, status,
  ressurs_innhold ( sprak, tittel, formaal, antall_raatekst ),
  ressurs_egnet ( egnet_kategori ( navn ) ),
  ressurs_trinn ( trinn ( kode, navn ) ),
  ressurs_utstyr ( utstyr ( navn ) ),
  ressurs_sesong ( sesong ( navn ) ),
  medier ( type, bunny_video_id ),
  vurderinger ( stjerner )
`

// Alle synlige samlinger, som liste (id, tittel, nokkel). Bruker IKKE nokkel-kolonnen i
// select-en — den finnes først etter migr 117, og «Finn en lek» skal ikke feile hvis 117
// henger etter. Lenkene bygges på id uansett.
export async function hentSamlinger(sprak = 'nb') {
  const { data, error } = await supabase
    .from('samlinger')
    // Eksplisitt synlig=true: RLS alene (synlig OR intern, migr 030/032) lekker skjulte
    // samlinger til interne (superadmin/ansatt) som blar i lærer-flaten. Denne LISTA skal
    // vise kun synlige for ALLE roller — jf. migr 124 som skjulte «Tipslister» (19697).
    // MERK: .eq() må stå ETTER .select() — .from() gir en QueryBuilder uten .eq(); filter-
    // metodene finnes først på FilterBuilder fra .select(). (Regresjon 41e25de: .eq før
    // .select kastet TypeError som kallstedets .catch(()=>{}) svelget → tom liste.)
    .select('id, rekkefolge, samling_innhold ( sprak, tittel )')
    .eq('synlig', true)
    .order('rekkefolge')
  if (error) throw error
  return sorterSamlinger(data || [], sprak)
}

// Én samling med tittel, beskrivelse (kan være null), samle-medier, publiserte leker (LekeKort-
// form) og publiserte dokumenter (DokumentKort-form). Ukjent/usynlig id → null (RLS gir tom).
export async function hentSamling(id, sprak = 'nb') {
  const { data, error } = await supabase
    .from('samlinger')
    .select(`
      id,
      samling_innhold ( sprak, tittel, beskrivelse ),
      samling_medie ( id, type, bunny_video_id, storage_sti, alt_tekst, rekkefolge ),
      samling_ressurs ( rekkefolge, ressurser ( ${LEK_VELG} ) ),
      samling_dokument ( rekkefolge, dokumenter ( id, tittel, type, status, storage_sti, dokument_sprak ( sprak ) ) )
    `)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const innhold = velgInnhold(data.samling_innhold, sprak)
  return {
    id: data.id,
    tittel: innhold.tittel ?? null,
    beskrivelse: innhold.beskrivelse ?? null,
    medier: sorterMedier(data.samling_medie),
    leker: synligeLeker(data.samling_ressurs).map(formLek),
    dokumenter: synligeDokumenter(data.samling_dokument).map(formSamlingDokument),
    plasseringer: await hentPlasseringer(id),
  }
}

// Gruppe-plasseringer for en samling (migr 119). SEPARAT, resilient spørring: finnes ikke
// tabellen ennå (119 ikke kjørt), gir PostgREST error → vi returnerer [] og samlingen vises
// FLAT (som før 119). RLS på samling_ressurs_plassering speiler samling_ressurs, så en
// skolebruker får kun plasseringer for synlige samlinger. Én lek kan ha flere rader (flere seksjoner).
async function hentPlasseringer(samlingId) {
  const { data, error } = await supabase
    .from('samling_ressurs_plassering')
    .select('ressurs_id, seksjon, seksjon_rekkefolge, rekkefolge')
    .eq('samling_id', samlingId)
  if (error) return [] // 119 ikke i prod ennå, eller ingen tilgang → flat visning
  return data || []
}

// Slå opp en samling på nøkkel (f.eks. 'tl-dans', satt av migr 117). Returnerer {id, tittel,
// nokkel} eller null. Feiler stille (null) hvis nokkel-kolonnen ikke finnes ennå (117 ikke kjørt)
// eller ingen match — kalleren (TL-dans-boksen på Min side) skjuler seg da uten feil/død lenke.
export async function hentSamlingPaaNokkel(nokkel, sprak = 'nb') {
  try {
    const { data, error } = await supabase
      .from('samlinger')
      .select('id, nokkel, samling_innhold ( sprak, tittel )')
      .eq('nokkel', nokkel)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const innhold = velgInnhold(data.samling_innhold, sprak)
    return { id: data.id, nokkel: data.nokkel, tittel: innhold.tittel ?? null }
  } catch {
    return null
  }
}
