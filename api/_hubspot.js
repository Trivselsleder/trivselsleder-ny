const BASE_URL = 'https://api.hubapi.com'

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
  }
}

// school_type i HubSpot er et avkrysningsboks-felt med nøyaktig disse gyldige
// alternativene (internt navn = label). Skjemaets koder mappes til korrekt bokstavform.
// ENDRING 17. sep (DEL 2b): «Barnehage» og «SFO» sendes nå — Kjartan legger dem til som
// avkrysningsvalg i HubSpot manuelt. En kode uten treff her (skulle det oppstå) utelates,
// slik at skolen fortsatt opprettes/oppdateres uten feltet i stedet for å bli avvist.
const SKOLETYPE_HUBSPOT = {
  barnehage:    'Barnehage',
  barnetrinn:   'Barnetrinn',
  ungdomstrinn: 'Ungdomstrinn',
  kombinert:    'Kombinert',
  SFO:          'SFO',
}
// Deles med api/skole/oppdater-skole.js så redigeringsskjemaet mapper skoletype
// på nøyaktig samme måte som påmeldingen.
export function hubspotSkoletype(kode) {
  return SKOLETYPE_HUBSPOT[kode]
}

// DEL 2a (17. sep) — Fylke skal til det EGENDEFINERTE avkrysningsfeltet `fylke` (det som
// vises på skolekortet og brukes i lister/filtre), IKKE til det innebygde `state`
// («Stat/region», 0 % reell bruk). Fordi `fylke` er en avkrysningsliste, må verdien
// mappes til HubSpots valgnavn (samme mønster som SKOLETYPE_HUBSPOT). Nedenfor er de 15
// norske fylkene (2024-inndelingen) som identitets-mapping.
// ⚠️ MÅ STEMMES AV MOT HUBSPOT: bekreft at valgnavnene i HubSpots «Fylke»-felt staves
// nøyaktig slik. Avvik → juster verdien (høyre side) her. En verdi uten treff utelates.
const FYLKE_HUBSPOT = {
  'Østfold':          'Østfold',
  'Akershus':         'Akershus',
  'Oslo':             'Oslo',
  'Innlandet':        'Innlandet',
  'Buskerud':         'Buskerud',
  'Vestfold':         'Vestfold',
  'Telemark':         'Telemark',
  'Agder':            'Agder',
  'Rogaland':         'Rogaland',
  'Vestland':         'Vestland',
  'Møre og Romsdal':  'Møre og Romsdal',
  'Trøndelag':        'Trøndelag',
  'Nordland':         'Nordland',
  'Troms':            'Troms',
  'Finnmark':         'Finnmark',
}
function hubspotFylke(verdi) {
  return FYLKE_HUBSPOT[String(verdi ?? '').trim()]
}

// DEL 1 (17. sep) — Statusfeltet `kategori` skal følge ALLE statusovergangene på ny side,
// ikke bare Påmeldt/Aktiv. Ny side og HubSpot har samme statusliste (Kjartans beslutning),
// så mappingen er identitet — MED to unntak:
//   * «Inaktiv» er en intern verdi (avviste påmeldinger) → sendes ALDRI til HubSpot (null).
//   * «Tidligere» legges til som valg i HubSpot manuelt av Kjartan; koden oppretter ikke valg.
// En ukjent verdi returnerer null (utelates) i stedet for å bli avvist av HubSpot.
const STATUS_HUBSPOT = {
  'Påmeldt':          'Påmeldt',
  'Aktiv':            'Aktiv',
  'Aktiv, sagt opp':  'Aktiv, sagt opp',
  'Pause':            'Pause',
  'Tidligere':        'Tidligere',
  'Potensielle':      'Potensielle',
  'Nedlagt':          'Nedlagt',
  // 'Inaktiv': bevisst utelatt — intern verdi, synkes ikke.
}
export function hubspotKategori(status) {
  return STATUS_HUBSPOT[String(status ?? '').trim()] ?? null
}

// HubSpots statusfelt heter internt `kategori` (label «Status»), med verdiene Aktiv · Aktiv, sagt
// opp · Potensielle · Pause · Nedlagt. Marielle opprettet «Påmeldt» i HubSpot 15. sep og bekrefter
// at den staves nøyaktig slik (samme mønster som de øvrige). Er verdien null, sendes `kategori`
// IKKE til HubSpot. Skulle verdien likevel være feil, AVVISER HubSpot hele skrivingen — det
// logges tydelig via loggKategoriAvvist() under, så det ikke oppdages stille (jf. den gamle
// trivselsleder_status-feilen som først ble oppdaget etter måneder).
const PAAMELDING_KATEGORI = 'Påmeldt'

// Logg TYDELIG dersom HubSpot avviste selve `kategori`-verdien (statusfeltet), så en feil verdi
// aldri oppdages stille. Vi leser feilteksten kun for å AVGJØRE om det gjaldt kategori — vi
// logger ALDRI feilobjektet (kan inneholde innsendte felt/PII), bare en fast linje med
// kategori-verdien som ble avvist.
function loggKategoriAvvist(feil, verdi) {
  if (verdi != null && /kategori/i.test(JSON.stringify(feil ?? ''))) {
    console.error(
      `[HubSpot] ADVARSEL: statusverdien kategori=«${verdi}» ble AVVIST av HubSpot. ` +
      'Sjekk at verdien finnes og staves nøyaktig slik i HubSpot (Selskap → Status). Status ble IKKE satt.'
    )
  }
}

// Skolenavn-normalisering for duplikatmatching. Det fantes INGEN felles rutine i kodebasen å
// gjenbruke (sjekket), så denne er enkel og selvstendig: små bokstaver, fjern skilletegn,
// kollaps mellomrom, og strip generiske haleord slik at «Bjørnehaugen skole» og «Bjørnehaugen»
// normaliserer likt. Holdt enkel med vilje (HubSpot skal på sikt erstattes av egen CRM).
const GENERISKE_ORD = new Set([
  'skole', 'skule', 'barnehage', 'bhg', 'sfo', 'aks', 'oppvekstsenter', 'oppvekstsenteret',
])
function normNavn(s) {
  const ord = String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const kjerne = ord.filter(o => !GENERISKE_ORD.has(o))
  return (kjerne.length ? kjerne : ord).join(' ')
}
function normKommune(s) {
  return String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').replace(/ kommune$/, '').trim()
}
// Mest distinktive token (lengste ord i det normaliserte kjernenavnet) — brukt som søkeord i
// HubSpot (CONTAINS_TOKEN), så «Bjørnehaugen» finner både «Bjørnehaugen» og «Bjørnehaugen skole».
function soekeToken(navn) {
  const ord = normNavn(navn).split(/\s+/).filter(Boolean)
  return ord.slice().sort((a, b) => b.length - a.length)[0] ?? ''
}

// Bygger egenskaps-objektet for et Company (RETTING 2, 3, 4, 5 + DEL 1/2a 17. sep).
function byggSelskapsEgenskaper(p) {
  const skoletype = SKOLETYPE_HUBSPOT[p.type]        // undefined for ukjent kode → utelates
  const fylke = hubspotFylke(p.fylke)                // DEL 2a: mappet til «Fylke»-valgnavn, ikke state
  // DEL 1: følg statusen som settes. Uten status (ren påmelding) → 'Påmeldt'.
  // 'Inaktiv'/ukjent → null (utelates), håndteres av hubspotKategori.
  const kategori = p.status ? hubspotKategori(p.status) : PAAMELDING_KATEGORI
  return {
    name:    p.skolenavn,
    address: p.gateadresse,
    zip:     p.postnummer,
    city:    p.poststed,
    country: 'Norge',
    ...(fylke           ? { fylke:            fylke }                    : {}), // DEL 2a: egendefinert felt, ikke state
    ...(p.telefon       ? { phone:            p.telefon }                : {}),
    ...(p.kontortelefon ? { phone:            p.kontortelefon }          : {}),
    ...(p.hjemmeside    ? { website:          p.hjemmeside }             : {}),
    ...(p.kommune       ? { municipality:     p.kommune }                : {}), // RETTING 2: d.kommune (ikke d.kommunenavn)
    ...(p.antall_elever ? { number_of_pupils: String(p.antall_elever) }  : {}),
    ...(skoletype       ? { school_type:      skoletype }                : {}), // RETTING 4 (+ barnehage/SFO DEL 2b)
    ...(p.nettverk      ? { nettverk:         p.nettverk }               : {}),
    ...(p.organisasjonsnummer ? { org__number: p.organisasjonsnummer }   : {}), // RETTING 3: org__number (ikke organisasjonsnummer)
    ...(kategori        ? { kategori:         kategori }                 : {}), // DEL 1: følger statusen (Inaktiv utelates)
  }
}

// Søker Companies med navn som inneholder token; returnerer [{id, name, municipality}].
async function soekSelskaper(token) {
  const payload = {
    filterGroups: [{ filters: [{ propertyName: 'name', operator: 'CONTAINS_TOKEN', value: token }] }],
    properties: ['name', 'municipality'],
    limit: 100,
  }
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/search`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
  })
  if (!res.ok) {
    console.error('[HubSpot] soekSelskaper: søk feilet, HTTP', res.status)
    return []
  }
  const data = await res.json()
  return (data.results ?? []).map(r => ({
    id: r.id, name: r.properties?.name ?? '', municipality: r.properties?.municipality ?? '',
  }))
}

// RETTING 1 — DUPLIKATSJEKK. Søker opp skolen i HubSpot på navn + kommune FØR opprettelse:
//   0 treff → opprett nytt Company.  1 treff → OPPDATER den eksisterende (ingen dublett).
//   FLERE treff → ikke gjett: logg og skriv INGENTING (menneske må se på det); returnerer null.
// Matching: normalisert kjernenavn må være likt, OG kommune må være lik (tom kommune på én av
// sidene blokkerer ikke et navnetreff, men når begge er utfylt og ulike, er det ikke samme skole).
// Returnerer HubSpot Company-ID (string), null ved flertreff, eller kaster Error ved API-feil.
export async function opprettEllerOppdaterSelskap(p) {
  const egenskaper = byggSelskapsEgenskaper(p)
  const navn = p.skolenavn
  const token = soekeToken(navn)

  const kandidater = token ? await soekSelskaper(token) : []
  const treff = kandidater.filter(k => {
    if (normNavn(k.name) !== normNavn(navn)) return false
    const ki = normKommune(p.kommune), kk = normKommune(k.municipality)
    return ki === '' || kk === '' || ki === kk
  })

  if (treff.length > 1) {
    // Personvern: logg ID-ene (ikke navn/kommune) — nok til manuell oppfølging uten innhold.
    console.warn(
      `[HubSpot] opprettEllerOppdaterSelskap: ${treff.length} treff (id: ${treff.map(t => t.id).join(', ')}) — skriver INGENTING, må sjekkes manuelt.`
    )
    return null
  }

  if (treff.length === 1) {
    await oppdaterSelskapFelter(treff[0].id, egenskaper)
    return treff[0].id
  }

  // 0 treff → opprett nytt Company.
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ properties: egenskaper }),
  })
  if (!res.ok) {
    const feil = await res.json()
    loggKategoriAvvist(feil, egenskaper.kategori)
    throw new Error(feil.message ?? 'HubSpot-feil ved opprettelse')
  }
  return (await res.json()).id
}

// Oppdaterer statusfeltet (`kategori`) på et eksisterende Company. Kalleren sender ny-side-
// statusen (f.eks. 'Aktiv' ved godkjenning, eller 'Pause'/'Nedlagt' fra admin) — den mappes
// til HubSpots kategori-valgnavn via hubspotKategori. Tidligere skrev denne til det ikke-
// eksisterende feltet `trivselsleder_status` — rettet til `kategori` (label «Status»).
// DEL 1 (17. sep): 'Inaktiv'/ukjent → null → INGEN skriving (intern verdi, synkes ikke).
export async function oppdaterStatus(hubspotId, status) {
  const kategori = hubspotKategori(status)
  if (!kategori) {
    console.log(`[HubSpot] oppdaterStatus: status «${status}» synkes ikke (intern/ukjent) — hopper over.`)
    return
  }
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/${hubspotId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties: { kategori } }),
  })
  if (!res.ok) {
    const feil = await res.json()
    loggKategoriAvvist(feil, kategori)
    throw new Error(feil.message ?? 'HubSpot PATCH-feil')
  }
}

// Søker etter Company på navn, returnerer HubSpot-ID eller null
export async function finnSelskapIdPaaNavn(navn) {
  console.log('[HubSpot] finnSelskapIdPaaNavn: søker på skolenavn')
  const payload = {
    filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: navn }] }],
    properties: ['name'],
    limit: 1,
  }
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  })
  const rawBody = await res.text()
  console.log('[HubSpot] finnSelskapIdPaaNavn: HTTP-status:', res.status)
  if (!res.ok) {
    console.error('[HubSpot] finnSelskapIdPaaNavn: søk feilet')
    return null
  }
  const data = JSON.parse(rawBody)
  console.log('[HubSpot] finnSelskapIdPaaNavn: total:', data.total)
  return data.results?.[0]?.id ?? null
}

// Oppdaterer vilkårlige felter på et Company
export async function oppdaterSelskapFelter(hubspotId, felter) {
  console.log('[HubSpot] oppdaterSelskapFelter: PATCH company', hubspotId)
  const res = await fetch(`${BASE_URL}/crm/v3/objects/companies/${hubspotId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties: felter }),
  })
  console.log('[HubSpot] oppdaterSelskapFelter: HTTP-status:', res.status)
  if (!res.ok) {
    const feil = await res.json()
    console.error('[HubSpot] oppdaterSelskapFelter: feil:', feil.message)
    loggKategoriAvvist(feil, felter?.kategori)
    throw new Error(feil.message ?? 'HubSpot PATCH-feil')
  }
  console.log('[HubSpot] oppdaterSelskapFelter: OK')
}

function splitNavn(navn) {
  const deler = (navn ?? '').trim().split(/\s+/)
  if (deler.length <= 1) return { firstname: deler[0] ?? '', lastname: '' }
  return { firstname: deler.slice(0, -1).join(' '), lastname: deler[deler.length - 1] }
}

// Oppretter eller oppdaterer en Contact basert på e-post, returnerer kontakt-ID
export async function oppdaterEllerOpprettKontakt({ navn, epost, tittel, telefon }) {
  const { firstname, lastname } = splitNavn(navn)
  console.log('[HubSpot] oppdaterEllerOpprettKontakt: søker kontakt, rolle:', tittel)

  const soekRes = await fetch(`${BASE_URL}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: epost }] }],
      properties: ['email'],
      limit: 1,
    }),
  })
  console.log('[HubSpot] oppdaterEllerOpprettKontakt: søk HTTP-status:', soekRes.status)
  const soekData = await soekRes.json()
  const eksisterende = soekData.results?.[0]
  console.log('[HubSpot] oppdaterEllerOpprettKontakt: eksisterende kontakt-ID:', eksisterende?.id ?? 'ingen — oppretter ny')

  const kontaktData = {
    firstname,
    lastname,
    email: epost,
    ...(tittel   ? { jobtitle:    tittel }   : {}),
    ...(telefon  ? { mobilephone: telefon }  : {}),
  }

  if (eksisterende) {
    await fetch(`${BASE_URL}/crm/v3/objects/contacts/${eksisterende.id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ properties: kontaktData }),
    })
    return eksisterende.id
  }

  const opprettRes = await fetch(`${BASE_URL}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ properties: kontaktData }),
  })
  if (!opprettRes.ok) {
    const feil = await opprettRes.json()
    throw new Error(feil.message ?? 'HubSpot kontakt-feil')
  }
  return (await opprettRes.json()).id
}

// Knytter en Contact til et Company (standardtilknytning)
export async function knyttKontaktTilSelskap(selskapId, kontaktId) {
  await fetch(
    `${BASE_URL}/crm/v4/objects/companies/${selskapId}/associations/default/contacts/${kontaktId}`,
    { method: 'PUT', headers: headers() }
  )
}

// Fjerner koblingen til kontakter som bærer et gitt TILKNYTNINGSMERKE (association label:
// «Rektor», «Hovedkontakt TL», «TL ansvarlig») på et Company, unntatt de i nyeKontaktIder.
// DEL 2c (17. sep): avgjør på tilknytningsmerket, IKKE på jobbtittel-tekst. Merket er
// konsekvent i HubSpot; jobbtittel er fri tekst («Rektor ved Asak skole» ≠ «Rektor»), så den
// gamle jobbtittel-sammenligningen traff aldri virkelige titler (feltkart 17. sep).
// Merket leses fra v4-assosiasjonens associationTypes[].label (case-/mellomrom-tolerant).
export async function fjernGamleKoblinger(selskapId, tilknytningsmerke, nyeKontaktIder) {
  const iderABeholde = (Array.isArray(nyeKontaktIder) ? nyeKontaktIder : [nyeKontaktIder])
    .filter(Boolean).map(String)
  const merke = String(tilknytningsmerke ?? '').trim().toLowerCase()

  const assocRes = await fetch(
    `${BASE_URL}/crm/v4/objects/companies/${selskapId}/associations/contacts`,
    { headers: headers() }
  )
  if (!assocRes.ok) {
    console.log(`[HubSpot] fjernGamleKoblinger: klarte ikke hente tilknytninger for selskap ${selskapId}`)
    return
  }
  const assocData = await assocRes.json()

  // Behold kun koblinger som HAR det aktuelle merket og som ikke er blant de nye.
  const gamle = (assocData.results ?? []).filter(r => {
    const harMerke = (r.associationTypes ?? []).some(
      t => String(t.label ?? '').trim().toLowerCase() === merke
    )
    return harMerke && !iderABeholde.includes(String(r.toObjectId))
  })

  for (const rad of gamle) {
    // Personvern: logg kun merke + kontakt-ID, aldri kontaktpersonens navn.
    console.log(`[HubSpot] Fjerner gammel «${tilknytningsmerke}»-kobling (kontakt-ID: ${rad.toObjectId})`)
    await fetch(
      `${BASE_URL}/crm/v4/objects/companies/${selskapId}/associations/contacts/${rad.toObjectId}`,
      { method: 'DELETE', headers: headers() }
    )
  }
}
