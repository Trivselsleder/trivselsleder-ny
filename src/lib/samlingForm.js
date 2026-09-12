// Ren logikk for samlingsvisningen (språkfallback, sortering, filtrering av upubliserte).
// INGEN import av supabase her — så filen kan enhetstestes direkte med node (samme grunn som
// lib/dokumentTre.js). Datahentingen bor i lib/samlinger.js; denne filen tar imot ferdige
// rader (slik PostgREST leverer dem) og former/filtrerer dem.

// Velg innholdsraden for ønsket språk. Fallback: ønsket språk → nb → nn → første tilgjengelige.
// De 20 importerte samlingene har bare en nb-rad; TL-dans likeså. Returnerer {} om ingen rad.
export function velgInnhold(rader, sprak = 'nb') {
  const arr = rader || []
  return arr.find((x) => x.sprak === sprak)
    || arr.find((x) => x.sprak === 'nb')
    || arr.find((x) => x.sprak === 'nn')
    || arr[0]
    || {}
}

// Liste-form for «Finn en lek»/idle-visning: {id, nokkel, tittel} per synlig samling
// (RLS har allerede filtrert til synlige), sortert på rekkefolge, deretter tittel (norsk
// collation). nokkel kan mangle (kolonnen finnes først etter migr 117) → null.
export function sorterSamlinger(rader, sprak = 'nb') {
  return (rader || [])
    .map((r) => ({
      id: r.id,
      nokkel: r.nokkel ?? null,
      tittel: velgInnhold(r.samling_innhold, sprak).tittel ?? null,
      rekkefolge: r.rekkefolge ?? 0,
    }))
    .sort((a, b) => (a.rekkefolge - b.rekkefolge)
      || String(a.tittel || '').localeCompare(String(b.tittel || ''), 'no'))
    .map(({ id, nokkel, tittel }) => ({ id, nokkel, tittel }))
}

// Kun PUBLISERTE leker, i samlingens rekkefolge. RLS skjuler allerede upubliserte for
// vanlige skolebrukere (ressurser p_les = publisert OR intern), men vi filtrerer eksplisitt
// også — så en intern bruker (som ser utkast) ikke får utkast blandet inn i lærervisningen.
export function synligeLeker(srRader) {
  return (srRader || [])
    .filter((sr) => sr && sr.ressurser && sr.ressurser.status === 'publisert')
    .sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0))
    .map((sr) => sr.ressurser)
}

// Kun PUBLISERTE dokumenter, i rekkefolge. Samme dobbeltsikring som synligeLeker.
export function synligeDokumenter(sdRader) {
  return (sdRader || [])
    .filter((sd) => sd && sd.dokumenter && sd.dokumenter.status === 'publisert')
    .sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0))
    .map((sd) => sd.dokumenter)
}

// Dokument → DokumentKort-form (speiler hentDokumenter i leker.js: url kun ved ekte http(s)-URL).
export function formSamlingDokument(dok) {
  return {
    id: dok.id,
    tittel: dok.tittel || 'Uten tittel',
    filtype: dok.type || null,
    sprak: (dok.dokument_sprak || []).map((x) => x.sprak),
    url: dokumentUrl(dok.storage_sti),
  }
}

// Lenke = storage_sti når den er en ekte http(s)-URL; alt annet gir ingen lenke (unngår 404).
export function dokumentUrl(sti) {
  return typeof sti === 'string' && /^https?:\/\//.test(sti) ? sti : null
}

// Samle-medier (video/bilde for HELE samlingen), i rekkefolge.
export function sorterMedier(medier) {
  return (medier || []).slice().sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0))
}

// TL-dans-boksen på Min side vises KUN når samlingen faktisk finnes (nøkkelen 'tl-dans' er
// satt av migr 117). Er den ikke kjørt ennå, gir hentSamlingPaaNokkel null → boksen skjules stille.
export function harSamling(samling) {
  return !!(samling && samling.id)
}

// Grupper (seksjoner) i en samling (migr 119, samling_ressurs_plassering).
//   leker        = ferdig-formede, PUBLISERTE leker i samling_ressurs.rekkefolge (synligeLeker→formLek).
//   plasseringer = rader { ressurs_id, seksjon, seksjon_rekkefolge, rekkefolge } for denne samlingen.
// Regler (Kjartans beslutning 11. sep):
//   * Ingen plasseringer → én FLAT gruppe (seksjon = null) i samlingens rekkefolge (som før 119).
//   * Med plasseringer → grupper sortert på seksjon_rekkefolge (så seksjonsnavn, norsk collation),
//     leker innen en gruppe på rekkefolge. Samme lek kan stå i FLERE grupper.
//   * Leker i samlingen UTEN plassering → en siste gruppe { flere: true } («Flere leker», i18n i
//     visningen — den rene funksjonen kjenner ikke oversettelser, så den flagger bare).
//   * Ingen tom gruppe. Plasseringer som peker på en lek som ikke er publisert/synlig (ikke i
//     `leker`) hoppes over — RLS/synligeLeker har allerede silt dem bort.
// Retur: array av { seksjon: string|null, flere?: boolean, leker: [lek] }.
export function grupperLeker(leker, plasseringer) {
  const liste = leker || []
  const plas = (plasseringer || []).filter((p) => p && p.ressurs_id && typeof p.seksjon === 'string' && p.seksjon.trim())
  // Flat: ingen plasseringer (rekkefolge er allerede satt av synligeLeker).
  if (plas.length === 0) return [{ seksjon: null, leker: liste }]

  const lekPerId = new Map(liste.map((l) => [l.id, l]))
  const seksjoner = new Map() // seksjon → { sr, rader: [{ lek, rekkefolge }] }
  const plasserte = new Set()
  for (const p of plas) {
    const lek = lekPerId.get(p.ressurs_id)
    if (!lek) continue // plassering peker på en upublisert/skjult lek → hopp over
    plasserte.add(p.ressurs_id)
    if (!seksjoner.has(p.seksjon)) seksjoner.set(p.seksjon, { sr: p.seksjon_rekkefolge ?? 0, rader: [] })
    const g = seksjoner.get(p.seksjon)
    g.sr = Math.min(g.sr, p.seksjon_rekkefolge ?? 0)
    g.rader.push({ lek, rekkefolge: p.rekkefolge ?? 0 })
  }

  const grupper = [...seksjoner.entries()]
    .map(([seksjon, g]) => ({
      seksjon,
      sr: g.sr,
      leker: g.rader.sort((a, b) => a.rekkefolge - b.rekkefolge).map((r) => r.lek),
    }))
    .filter((g) => g.leker.length > 0) // ingen tom gruppe
    .sort((a, b) => (a.sr - b.sr) || String(a.seksjon).localeCompare(String(b.seksjon), 'no'))
    .map(({ seksjon, leker: l }) => ({ seksjon, leker: l }))

  // Leker i samlingen uten plassering → siste gruppe «Flere leker».
  const uplasserte = liste.filter((l) => !plasserte.has(l.id))
  if (uplasserte.length) grupper.push({ seksjon: null, flere: true, leker: uplasserte })
  return grupper
}

// Er visningen gruppert? Flat = én gruppe uten seksjon og uten «flere»-flagg.
export function erGruppert(grupper) {
  return !(grupper.length === 1 && grupper[0].seksjon === null && !grupper[0].flere)
}
