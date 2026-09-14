#!/usr/bin/env node
// BEVIS for HubSpot-rettingene ved påmelding. Tester mot en ETTERLIGNET HubSpot (global fetch
// mockes) — ALDRI mot live HubSpot. Kaller den faktiske opprettEllerOppdaterSelskap/oppdaterStatus
// fra api/_hubspot.js.
//   node scripts/test-hubspot-paamelding.mjs
// Beviser duplikatsjekken (finnes → oppdatering · finnes ikke → opprettelse · flere treff →
// ingen skriving) og at feltmappingen (kommune, org__number, school_type, ingen status ennå) er rett.
process.env.HUBSPOT_API_KEY = 'test-key' // headers() krever den satt; verdien brukes ikke mot noe live

let ok = 0, feil = 0
const P = (s) => console.log(s)
const krev = (n, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${n}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }

// ---- Etterlignet HubSpot ----
// selskaper: in-memory liste {id, name, municipality}. Loggen fanger hvert kall.
let hs, kall
function nyHubSpot(selskaper) {
  hs = { selskaper: selskaper.map((s, i) => ({ id: String(100 + i), ...s })), nesteId: 900 }
  kall = { create: [], patch: [], search: [] }
}
function tokeniser(navn) { return String(navn ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean) }

globalThis.fetch = async (url, opts = {}) => {
  const body = opts.body ? JSON.parse(opts.body) : null
  const jsonRes = (obj, okStatus = true) => ({ ok: okStatus, status: okStatus ? 200 : 400, json: async () => obj, text: async () => JSON.stringify(obj) })

  // Søk: CONTAINS_TOKEN på name (emulerer HubSpot-tokenisering på ord).
  if (url.endsWith('/companies/search') && opts.method === 'POST') {
    kall.search.push(body)
    const filter = body.filterGroups?.[0]?.filters?.[0]
    const token = String(filter?.value ?? '').toLowerCase()
    const treff = hs.selskaper.filter(s => tokeniser(s.name).includes(token))
    return jsonRes({ total: treff.length, results: treff.map(s => ({ id: s.id, properties: { name: s.name, municipality: s.municipality } })) })
  }
  // PATCH company (oppdatering)
  let m = url.match(/\/companies\/([^/]+)$/)
  if (m && opts.method === 'PATCH') {
    kall.patch.push({ id: m[1], properties: body.properties })
    return jsonRes({ id: m[1], properties: body.properties })
  }
  // POST company (opprettelse)
  if (url.endsWith('/companies') && opts.method === 'POST') {
    const id = String(hs.nesteId++)
    kall.create.push({ id, properties: body.properties })
    hs.selskaper.push({ id, name: body.properties.name, municipality: body.properties.municipality ?? '' })
    return jsonRes({ id, properties: body.properties })
  }
  throw new Error('Uventet fetch i mock: ' + opts.method + ' ' + url)
}

const { opprettEllerOppdaterSelskap, oppdaterStatus } = await import('../api/_hubspot.js')

// Basis-påmeldingsdata (som req.body fra skjemaet).
const base = (o = {}) => ({
  skolenavn: 'Testskole', gateadresse: 'Vei 1', postnummer: '0001', poststed: 'Sted',
  fylke: 'Oslo', kommune: 'Oslo', organisasjonsnummer: '123456789', type: 'barnetrinn', ...o,
})

async function main() {
  P('# Bevis: HubSpot-retting ved påmelding (etterlignet HubSpot)\n')

  // ---- 1) FINNES ALLEREDE → OPPDATERING (ingen dublett) ----
  P('## Duplikatsjekk')
  nyHubSpot([{ name: 'Bjørnehaugen', municipality: 'Sørum' }]) // finnes uten «skole», og med kommune
  const id1 = await opprettEllerOppdaterSelskap(base({ skolenavn: 'Bjørnehaugen skole', kommune: 'Sørum' }))
  krev('finnes («Bjørnehaugen» ~ «Bjørnehaugen skole», samme kommune) → PATCH på eksisterende id 100, INGEN opprettelse',
    id1 === '100' && kall.patch.length === 1 && kall.patch[0].id === '100' && kall.create.length === 0,
    `id=${id1} patch=${kall.patch.length} create=${kall.create.length}`)

  // ---- 2) FINNES IKKE → OPPRETTELSE ----
  nyHubSpot([{ name: 'Helt annen skole', municipality: 'Bergen' }])
  const id2 = await opprettEllerOppdaterSelskap(base({ skolenavn: 'Vahl skole', kommune: 'Oslo' }))
  krev('finnes ikke → POST opprettelse (ny id), INGEN PATCH',
    kall.create.length === 1 && id2 === kall.create[0].id && kall.patch.length === 0,
    `id=${id2} create=${kall.create.length} patch=${kall.patch.length}`)

  // ---- 3) FLERE TREFF → INGEN SKRIVING ----
  nyHubSpot([
    { name: 'Storhaugen skole', municipality: 'Bergen' },
    { name: 'Storhaugen', municipality: 'Bergen' }, // samme navn+kommune (normalisert) → to treff
  ])
  const id3 = await opprettEllerOppdaterSelskap(base({ skolenavn: 'Storhaugen skole', kommune: 'Bergen' }))
  krev('flere treff → returnerer null, INGEN opprettelse OG INGEN oppdatering',
    id3 === null && kall.create.length === 0 && kall.patch.length === 0, `id=${id3} create=${kall.create.length} patch=${kall.patch.length}`)

  // Kalibrering: samme navn men ULIK kommune skal IKKE regnes som treff (→ opprettelse, ikke flertreff).
  nyHubSpot([
    { name: 'Solvang skole', municipality: 'Oslo' },
    { name: 'Solvang skole', municipality: 'Trondheim' },
  ])
  const id3b = await opprettEllerOppdaterSelskap(base({ skolenavn: 'Solvang skole', kommune: 'Bergen' }))
  krev('kalibrering: to «Solvang skole» i ANDRE kommuner + input kommune Bergen → 0 treff → opprettelse (ikke flertreff)',
    kall.create.length === 1 && id3b === kall.create[0].id && kall.patch.length === 0, `id=${id3b} create=${kall.create.length}`)

  // ---- 4) FELTMAPPING PÅ OPPRETTELSE (RETTING 2/3/4/5) ----
  P('\n## Feltmapping')
  nyHubSpot([])
  await opprettEllerOppdaterSelskap(base({ skolenavn: 'Ny skole', kommune: 'Lillestrøm', organisasjonsnummer: '999888777', type: 'barnetrinn' }))
  const prop = kall.create[0].properties
  krev('RETTING 2: kommune → municipality (d.kommune, ikke d.kommunenavn)', prop.municipality === 'Lillestrøm', JSON.stringify(prop.municipality))
  krev('RETTING 3: org.nr → org__number, og IKKE organisasjonsnummer',
    prop.org__number === '999888777' && !('organisasjonsnummer' in prop), JSON.stringify({ org__number: prop.org__number, gammelt: prop.organisasjonsnummer }))
  krev('RETTING 4: barnetrinn → school_type «Barnetrinn»', prop.school_type === 'Barnetrinn', JSON.stringify(prop.school_type))
  krev('RETTING 5: status ikke sendt ennå — verken kategori eller trivselsleder_status i payload',
    !('kategori' in prop) && !('trivselsleder_status' in prop), JSON.stringify({ kategori: prop.kategori, gammelt: prop.trivselsleder_status }))

  // school_type-mapping og utelatelse
  const skoletypeUt = async (type) => { nyHubSpot([]); await opprettEllerOppdaterSelskap(base({ type })); return kall.create[0].properties }
  krev('RETTING 4: ungdomstrinn → «Ungdomstrinn»', (await skoletypeUt('ungdomstrinn')).school_type === 'Ungdomstrinn')
  krev('RETTING 4: kombinert → «Kombinert»', (await skoletypeUt('kombinert')).school_type === 'Kombinert')
  krev('RETTING 4: barnehage → school_type UTELATT (skolen opprettes uten feltet)', !('school_type' in (await skoletypeUt('barnehage'))))
  krev('RETTING 4: SFO → school_type UTELATT', !('school_type' in (await skoletypeUt('SFO'))))

  // ---- 5) oppdaterStatus skriver til kategori (RETTING 5-relatert), verdi fra kaller ----
  P('\n## Statusoppdatering ved godkjenning')
  nyHubSpot([{ name: 'Skole', municipality: 'Oslo' }])
  await oppdaterStatus('100', 'Aktiv')
  krev('oppdaterStatus → PATCH { kategori: «Aktiv» } (ikke trivselsleder_status)',
    kall.patch.length === 1 && kall.patch[0].properties.kategori === 'Aktiv' && !('trivselsleder_status' in kall.patch[0].properties),
    JSON.stringify(kall.patch[0].properties))

  P('')
  P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL.`)
  if (feil !== 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
