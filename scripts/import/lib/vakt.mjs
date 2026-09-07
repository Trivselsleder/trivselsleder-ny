// DELTE VAKTER for skrivelagets fem pass (N3/N4/OPPGAVE C, 5. sep).
// Hver kaster en NAVNGITT hard stopp — ALDRI en tilfeldig TypeError, og ALDRI et stille hopp.
// Bakgrunn: Fable målte at fire av fem pass kun «kastet» fordi dagens data traff koden
// (TypeError på undefined.get/has), og at samlingspasset (N3) hoppet STILLE på tomt lekNids.
// En TypeError er ikke en vakt. Disse funksjonene gjør hver påkrevd parameter til en eksplisitt
// forutsetning med en melding som navngir passet, parameteren og konsekvensen.

export function krevKjoringId(v, pass) {
  if (typeof v !== 'string' || !v) {
    throw new Error(`HARD STOPP (${pass}): kjoringId mangler eller er ikke en tekststreng — radene ville fått import_kjoring_id = NULL og blitt USPORBARE (kan ikke rulles tilbake, bryter stoppregelen). Importen stoppes.`)
  }
}

export function krevSet(v, navn, pass, { ikkeTom = false, strengElementer = false } = {}) {
  if (!(v instanceof Set)) {
    throw new Error(`HARD STOPP (${pass}): ${navn} må være et Set — mangler eller feil type. Uten den ville en hel tabell blitt skrevet feil eller stille tom. Importen stoppes.`)
  }
  if (ikkeTom && v.size === 0) {
    throw new Error(`HARD STOPP (${pass}): ${navn} er TOMT — passet ville hoppet stille over alle rader (samme feilklasse som N1/N3). Importen stoppes.`)
  }
  // N3-igjen (5. sep): et Set med feil ELEMENTTYPE (tall i stedet for streng) gir `.has(String(nid))`
  // aldri treff → stille 0 uten kø. Passene sammenligner alltid mot String(nid), så elementene MÅ
  // være strenger uten ledende/etterfølgende blank. Sjekk ALLE elementer (settet er ≤ ~2000, gratis).
  if (strengElementer) {
    for (const e of v) {
      if (typeof e !== 'string' || e !== e.trim()) {
        throw new Error(`HARD STOPP (${pass}): ${navn} inneholder et element «${String(e)}» (${typeof e}) som ikke er en ren streng. Elementene MÅ være nid-er som strenger uten blank — feil type/form gir stille 0 (samme feilklasse som N3). Importen stoppes.`)
      }
    }
  }
}

// RELASJONSVAKT (rev 2): to mengder som skal være DISJUNKTE. Overlapp = kaller-kontekst-feil (en node
// kan ikke være både lek og samling) → hard stopp som navngir antall og eksempler. Typesjekker fanger
// ikke dette (riktig type, galt innhold) — den femte omgåelsen.
export function krevDisjunkte(a, aNavn, b, bNavn, pass) {
  if (!(a instanceof Set) || !(b instanceof Set)) return   // type sjekkes av krevSet separat
  const felles = []
  for (const x of a) { if (b.has(x)) { felles.push(x); if (felles.length >= 5) break } }
  if (felles.length) {
    const antall = [...a].filter(x => b.has(x)).length
    throw new Error(`HARD STOPP (${pass}): ${antall} nid-er står i BÅDE ${aNavn} og ${bNavn} (skal være disjunkte — en node er enten lek eller samling, aldri begge). Eksempler: ${felles.join(', ')}. Kaller-kontekst-feil; importen stoppes.`)
  }
}

// Skriv-plan for skriv-funksjonene: må være et objekt (ellers TypeError «reading 'ressurser'»).
export function krevPlan(v, pass) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error(`HARD STOPP (${pass}): planen mangler eller er ikke et objekt. Importen stoppes.`)
  }
}

export function krevMap(v, navn, pass, { ikkeTom = false } = {}) {
  if (!(v instanceof Map)) {
    throw new Error(`HARD STOPP (${pass}): ${navn} må være et Map — mangler eller feil type. Uten den ville koblingene ikke latt seg løse. Importen stoppes.`)
  }
  if (ikkeTom && v.size === 0) {
    throw new Error(`HARD STOPP (${pass}): ${navn} er TOMT — passet ville hoppet stille over alle rader. Importen stoppes.`)
  }
}

export function krevFunksjon(v, navn, pass) {
  if (typeof v !== 'function') {
    throw new Error(`HARD STOPP (${pass}): ${navn} må være en funksjon — mangler eller feil type. Importen stoppes.`)
  }
}

export function krevArray(v, navn, pass) {
  if (!Array.isArray(v)) {
    throw new Error(`HARD STOPP (${pass}): ${navn} må være en liste (array) — mangler eller feil type. Importen stoppes.`)
  }
}

// oppslag/Oppslag-instans: sjekk at den finnes OG har den metoden passet faktisk bruker
// (fanger både undefined og et tomt {} — begge ga TypeError hos Fable).
export function krevOppslag(v, navn, pass, metode) {
  if (!v || typeof v[metode] !== 'function') {
    throw new Error(`HARD STOPP (${pass}): ${navn} (oppslagslaget) mangler eller er ufullstendig — .${metode}() finnes ikke. Bygg oppslaget (o.lesFaste()/opprettEllerGjenbruk()) før passet. Importen stoppes.`)
  }
}

// pg-klient: må ha .query().
export function krevKlient(v, pass) {
  if (!v || typeof v.query !== 'function') {
    throw new Error(`HARD STOPP (${pass}): databaseklienten (k) mangler eller er ikke en pg-klient (.query() finnes ikke). Importen stoppes.`)
  }
}

// Objekt med påkrevde felter (f.eks. K={catName,eqName} eller fagmap).
export function krevObjekt(v, navn, pass, ...felter) {
  if (!v || typeof v !== 'object') {
    throw new Error(`HARD STOPP (${pass}): ${navn} mangler eller er ikke et objekt. Importen stoppes.`)
  }
  for (const f of felter) {
    if (v[f] == null) {
      throw new Error(`HARD STOPP (${pass}): ${navn}.${f} mangler. Importen stoppes.`)
    }
  }
}
