// Ren logikk for kortinnholdet på skolens «Min side» (design runde 7 + retterunde 2, 17. sep).
// INGEN import av supabase her — så filen kan enhetstestes direkte med node (samme grunn som
// lib/samlingForm.js). Datahentingen bor i lib/samlinger.js (hentSamlingKort); denne filen
// former/grupperer ferdige rader.

// ── Nominasjon: språkgruppering av «Nominasjonslapp» ──────────────────────────
// Nominasjonslappen finnes som TRE separate dokumentnoder (bm/nn/en) i samlingen. På kortet
// skal de vises som ÉN knapp «Nominasjonslapp» med språkvalg — ikke tre knapper (retterunde 2,
// punkt 1). Identifiseres på kilde_nid (aldri tittel — den engelske heter «Nomination form -
// English» og deler ikke prefiks med de norske). Kilde: document-nodes.json, målt 17. sep.
export const NOMINASJONSLAPP_SPRAK = {
  '15970': 'nb', // Nominasjonslapp (bokmål)
  '57': 'nn',    // Nominasjonslapp - nynorsk
  '933': 'en',   // Nomination form - English
}

// Rekkefølge språkvariantene vises i (bokmål, nynorsk, engelsk).
const SPRAK_REKKE = { nb: 0, nn: 1, en: 2 }

// ── Nominasjon: kort visningsetikett per dokument ─────────────────────────────
// Informasjonsdokumentet (kilde_nid 17740) heter i basen «Nominasjon av trivselsledere -
// informasjon», men skal på kortet vises som «Nominasjonsregler» (retterunde 3, punkt 1).
// Verdien er en i18n-undernøkkel under minSide.hjem — selve teksten bor i no/sv-filene, og
// tittelen i basen røres IKKE (samme prinsipp som tips-prefiks-strippingen). Komponenten slår
// opp via t(); mangler kilde_nid i mappen, brukes dokumentets egen tittel.
export const NOMINASJON_ETIKETT = {
  '17740': 'nominasjonsregler',
}
export function nominasjonEtikettNokkel(kilde_nid) {
  return NOMINASJON_ETIKETT[String(kilde_nid)] || null
}

// Tar ferdig-formede, PUBLISERTE dokumenter i samlingens rekkefolge (hver med
// { id, tittel, url, kilde_nid, sprak }) og returnerer visnings-elementene i rekkefølge:
//   { type:'dok', id, tittel, url }                         — vanlig dokumentknapp
//   { type:'sprakgruppe', varianter:[{ sprak, url, tittel }] } — Nominasjonslapp, én knapp
// Språkgruppa plasseres der den FØRSTE nominasjonslapp-varianten står i rekkefølgen; de øvrige
// variantene hoppes over som selvstendige elementer. Varianter uten url slippes (unngår død lenke).
export function grupperNominasjonDok(dokumenter) {
  const ut = []
  const varianter = []
  let gruppePlassert = false
  for (const d of dokumenter || []) {
    const sprak = NOMINASJONSLAPP_SPRAK[String(d.kilde_nid)]
    if (sprak) {
      if (d.url) varianter.push({ sprak, url: d.url, tittel: d.tittel })
      if (!gruppePlassert) {
        ut.push({ type: 'sprakgruppe', varianter }) // referanse — fylles ferdig under
        gruppePlassert = true
      }
      continue
    }
    ut.push({ type: 'dok', id: d.id, tittel: d.tittel, url: d.url || null, kilde_nid: d.kilde_nid != null ? String(d.kilde_nid) : null })
  }
  // Sorter variantene bm→nn→en (rekkefølgen i samlingen er allerede bm,nn,en, men vi låser den).
  varianter.sort((a, b) => (SPRAK_REKKE[a.sprak] ?? 9) - (SPRAK_REKKE[b.sprak] ?? 9))
  // Fjern en tom språkgruppe (ingen variant hadde url).
  return ut.filter((x) => x.type !== 'sprakgruppe' || x.varianter.length > 0)
}

// ── Tipslister: kort visningsnavn (strip «Tipsliste»/«Tipsliste til»-prefiks) ──
// Titlene i basen røres IKKE (retterunde 2, punkt 6) — vi bare korter dem i visningen:
//   «Tipsliste favorittleker»          → «Favorittleker»
//   «Tipsliste leker for 100+ elever»  → «Leker for 100+ elever»
//   «Tipsliste sosial kompetanse»      → «Sosial kompetanse»
//   «Tipsliste til FYSAK»              → «FYSAK»
//   «Tipsliste til SFO/AKS»            → «SFO/AKS»
//   «Tipsliste TL-Mester»             → «TL-Mester»
// «Tipsliste til» sjekkes FØR «Tipsliste» (lengst prefiks først). Ingen match → uendret.
export function stripTipslistePrefiks(tittel) {
  if (typeof tittel !== 'string') return tittel
  const t = tittel.trim()
  const m = t.match(/^Tipsliste(?:r)?(?:\s+til)?\s+(.+)$/i)
  if (!m) return t
  const rest = m[1].trim()
  if (!rest) return t
  // Stor forbokstav på resten (originaltittelen har liten: «Tipsliste favorittleker»).
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

// ── Lekekurs: bygg korttittel «Lekekurs <periode>» fra samlingstittelen ────────
// Samlingens tittel er «Kursmodul høst 2026»/«Kursmodul vinter 2026» (etter navnerydding 136).
// Kortet skal hete «Lekekurs høst 2026» (retterunde 2, punkt 3, «etter nøkkelregelen»): vi bytter
// ledeordet «Kursmodul» med i18n-ledeordet «Lekekurs»/«Lekkurs» og beholder perioden. Har
// samlingen ingen «Kursmodul»-prefiks, faller vi tilbake til bare ledeordet.
export function lekekursTittel(ledeord, samlingTittel) {
  const t = typeof samlingTittel === 'string' ? samlingTittel.trim() : ''
  const m = t.match(/^Kursmodul\s+(.+)$/i)
  if (m && m[1].trim()) return `${ledeord} ${m[1].trim()}`
  return ledeord
}

// ── TL-dans: sortér på tallet i tittelen, høyeste (nyeste) først ───────────────
// Samlingens rekkefolge er ubrukelig i prod (retterunde 3, punkt 2): 19 danser har rekkefolge 0,
// og «TL-dans 1» ligger først. Vi kan derfor ikke stole på rekkefolge for å finne nyeste dans.
// I stedet leser vi tallet i tittelen («TL-dans N») og sorterer synkende — nyeste = høyeste tall
// (i dag «TL-dans 34»). Titler uten tall legges sist, i sin opprinnelige rekkefølge.
export function dansNummer(tittel) {
  if (typeof tittel !== 'string') return null
  const m = tittel.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

// Tar leker fra samlingen ([{ id, tittel, ... }]) og returnerer en NY liste sortert nyeste-først.
// Stabil: like tall og de uten tall beholder innbyrdes rekkefølge fra kilden.
export function sorterDanser(leker) {
  const arr = (leker || []).map((d, i) => ({ d, i, n: dansNummer(d && d.tittel) }))
  arr.sort((a, b) => {
    if (a.n == null && b.n == null) return a.i - b.i // begge uten tall: behold rekkefølge
    if (a.n == null) return 1                         // uten tall sist
    if (b.n == null) return -1
    if (a.n !== b.n) return b.n - a.n                 // høyeste tall (nyeste) først
    return a.i - b.i                                  // likt tall: behold rekkefølge
  })
  return arr.map((x) => x.d)
}
