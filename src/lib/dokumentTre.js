// Ren logikk for dokumentsidene (Maler & materiell, Slik lykkes du med TL, Aktiv læring).
// INGEN import av supabase her — så filen kan enhetstestes direkte med node. Datahentingen
// bor i lib/leker.js (hentDokumentsideData); denne filen tar imot ferdige rader og klassifiserer.
//
// KATEGORIER IDENTIFISERES ALLTID PÅ kilde_tid (Drupal-term-id), aldri på id (generert) eller
// navn (kan endres). Faste kilde_tid-er (målt i prod 11. sep):
//   2   = Aktiv læring (rot).  Barn: 900 Kurshefter, 902 Informasjon, 903 Manualer, 951 Aball.
//   901 = Drift av TL (rot) — «Slik lykkes du med TL».
//   910 = «Tilleggsmateriale til leker» under Lek og aktivitet (917).
//   924 = «Tilleggsmateriale til leker» under Trivselspatruljen (904).
export const ROT_AKTIV_LAERING = 2
export const ROT_DRIFT_AV_TL = 901
export const TILLEGG_KILDE_TID = [910, 924]

// Bygg dokument_type-treet klientside (alle nivåer, rekursivt). Returnerer indeks + røtter.
// Noder får .barn[]; sortering på rekkefolge, deretter navn (norsk collation).
export function byggTypeTre(typer) {
  const byId = new Map()
  for (const t of typer || []) byId.set(t.id, { ...t, barn: [] })
  const roter = []
  for (const node of byId.values()) {
    if (node.forelder_id != null && byId.has(node.forelder_id)) byId.get(node.forelder_id).barn.push(node)
    else roter.push(node)
  }
  const sorter = (liste) => {
    liste.sort((a, b) => (a.rekkefolge ?? 0) - (b.rekkefolge ?? 0) || String(a.navn || '').localeCompare(String(b.navn || ''), 'no'))
    for (const n of liste) sorter(n.barn)
  }
  sorter(roter)
  return { byId, roter }
}

// Alle type-IDer i subtreet/subtrærne under noden(e) med gitt kilde_tid (inkl. selve noden).
// kildeTider kan være ett tall eller en liste.
export function etterkommerIder(byId, kildeTider) {
  const mål = new Set(Array.isArray(kildeTider) ? kildeTider : [kildeTider])
  const ut = new Set()
  const stakk = [...byId.values()].filter((n) => mål.has(n.kilde_tid))
  while (stakk.length) {
    const n = stakk.pop()
    if (ut.has(n.id)) continue
    ut.add(n.id)
    for (const b of n.barn) stakk.push(b)
  }
  return ut
}

// Bygg en klassifikator fra dokument_type-radene. Alle regler under er rene funksjoner av
// dokumentets typeIds (dokument_dokumenttype.dokument_type_id) og treet.
export function lagKlassifikator(typer) {
  const { byId, roter } = byggTypeTre(typer)
  const tilleggIder = etterkommerIder(byId, TILLEGG_KILDE_TID)
  const aktivIder = etterkommerIder(byId, ROT_AKTIV_LAERING)

  const iderFor = (kildeTid) => etterkommerIder(byId, kildeTid)
  const harTypeI = (dok, iderSet) => (dok.typeIds || []).some((id) => iderSet.has(id))

  const erTillegg = (dok) => harTypeI(dok, tilleggIder)
  const iAktivLaering = (dok) => harTypeI(dok, aktivIder)
  // Minst én kategori UTENFOR subtreet med gitt kilde_tid.
  const harKategoriUtenfor = (dok, kildeTid) => {
    const ider = iderFor(kildeTid)
    return (dok.typeIds || []).some((id) => !ider.has(id))
  }
  // Dokumentet har minst én kategori I subtreet med gitt kilde_tid.
  const iSubtre = (dok, kildeTid) => harTypeI(dok, iderFor(kildeTid))

  // Direkte barn av noden med gitt kilde_tid, i tre-rekkefølge.
  const barnAv = (kildeTid) => {
    const rot = [...byId.values()].find((n) => n.kilde_tid === kildeTid)
    return rot ? rot.barn : []
  }
  const nodeMedKildeTid = (kildeTid) => [...byId.values()].find((n) => n.kilde_tid === kildeTid) || null

  return {
    byId, roter, tilleggIder, aktivIder,
    iderFor, iSubtre, erTillegg, iAktivLaering, harKategoriUtenfor, barnAv, nodeMedKildeTid,
  }
}

// «Maler & materiell»: ikke tillegg OG minst én kategori utenfor Aktiv læring-treet.
export function malerOgMateriell(klass, dokumenter) {
  return (dokumenter || []).filter((d) => !klass.erTillegg(d) && klass.harKategoriUtenfor(d, ROT_AKTIV_LAERING))
}

// Hovedkategoriene (røtter) som skal vises i Maler-filteret: alle røtter unntatt Aktiv læring (2)
// og unntatt røtter uten dokumenter i det gitte settet. Rekkefølge = tre-rekkefølge.
export function hovedkategorier(klass, dokumenter) {
  return klass.roter
    .filter((r) => r.kilde_tid !== ROT_AKTIV_LAERING)
    .filter((r) => dokumenter.some((d) => klass.iSubtre(d, r.kilde_tid)))
}

// Underkategoriene (direkte barn) av en hovedkategori som har minst ett dokument i settet.
export function underkategorier(klass, dokumenter, hovedKildeTid) {
  return klass.barnAv(hovedKildeTid).filter((b) => dokumenter.some((d) => klass.iSubtre(d, b.kilde_tid)))
}

// Filtrer et dokumentsett til de som ligger i subtreet under valgt kilde_tid.
export function iValgtKategori(klass, dokumenter, kildeTid) {
  if (kildeTid == null) return dokumenter
  return dokumenter.filter((d) => klass.iSubtre(d, kildeTid))
}

// Grupper et dokumentsett på de direkte barna av en rot (Drift av TL / Aktiv læring).
// Et dokument havner i hver undergruppe det har en kategori i (subtre). Dokumenter som bare
// er merket på selve roten (ingen barn-treff) samles i en «øvrig»-gruppe (node = null) til slutt.
// Returnerer kun ikke-tomme grupper, i tre-rekkefølge.
export function grupperUnderRot(klass, dokumenter, rotKildeTid) {
  const barn = klass.barnAv(rotKildeTid)
  const grupper = []
  const plassert = new Set()
  for (const b of barn) {
    const ider = klass.iderFor(b.kilde_tid)
    const iGruppe = dokumenter.filter((d) => (d.typeIds || []).some((id) => ider.has(id)))
    for (const d of iGruppe) plassert.add(d.id)
    if (iGruppe.length) grupper.push({ node: b, dokumenter: iGruppe })
  }
  const ovrig = dokumenter.filter((d) => !plassert.has(d.id))
  if (ovrig.length) grupper.push({ node: null, dokumenter: ovrig })
  return grupper
}
