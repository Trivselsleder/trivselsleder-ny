// Enhetstest for samlingsvisningens rene logikk (src/lib/samlingForm.js).
// Kjør: node scripts/test-samlinger.mjs
// Ren logikk, ingen base/nettverk (samme mønster som test-dokumentsider.mjs). Dekker:
//   språkfallback, sortering (rekkefolge → tittel), filtrering av upubliserte leker/dokumenter,
//   og at TL-dans-boksen skjules når nøkkelen mangler (samling = null).
import assert from 'node:assert/strict'
import {
  velgInnhold, sorterSamlinger, synligeLeker, synligeDokumenter,
  formSamlingDokument, dokumentUrl, sorterMedier, harSamling,
  grupperLeker, erGruppert,
} from '../src/lib/samlingForm.js'

let n = 0
const ok = (msg, cond) => { assert.ok(cond, msg); n++; console.log('  ✓', msg) }
const like = (msg, a, b) => { assert.deepEqual(a, b, msg + ` (fikk ${JSON.stringify(a)})`); n++; console.log('  ✓', msg) }

console.log('velgInnhold — språkfallback (ønsket → nb → nn → første):')
like('ønsket sv velges når den finnes',
  velgInnhold([{ sprak: 'nb', tittel: 'NB' }, { sprak: 'sv', tittel: 'SV' }], 'sv').tittel, 'SV')
like('faller til nb når ønsket språk mangler',
  velgInnhold([{ sprak: 'nb', tittel: 'NB' }, { sprak: 'nn', tittel: 'NN' }], 'sv').tittel, 'NB')
like('faller til nn når verken ønsket eller nb finnes',
  velgInnhold([{ sprak: 'nn', tittel: 'NN' }, { sprak: 'en', tittel: 'EN' }], 'sv').tittel, 'NN')
like('faller til første når ingen av nb/nn finnes',
  velgInnhold([{ sprak: 'en', tittel: 'EN' }], 'sv').tittel, 'EN')
like('tom liste → tomt objekt', velgInnhold([], 'nb'), {})
like('null → tomt objekt', velgInnhold(null), {})

console.log('sorterSamlinger — rekkefolge, så tittel; nokkel med:')
const raa = [
  { id: 'c', rekkefolge: 2, nokkel: null, samling_innhold: [{ sprak: 'nb', tittel: 'Å, sist' }] },
  { id: 'a', rekkefolge: 1, nokkel: 'tl-dans', samling_innhold: [{ sprak: 'nb', tittel: 'Bravo' }] },
  { id: 'b', rekkefolge: 1, samling_innhold: [{ sprak: 'nb', tittel: 'Alfa' }] }, // nokkel mangler → null
]
const sortert = sorterSamlinger(raa, 'nb')
like('rekkefolge 1 før 2, og innen 1: Alfa før Bravo',
  sortert.map((s) => s.id), ['b', 'a', 'c'])
like('nokkel følger med (a=tl-dans, b=null)',
  [sortert[0].nokkel, sortert[1].nokkel], [null, 'tl-dans'])
like('form = {id, nokkel, tittel} (ingen _rekkefolge lekker ut)',
  Object.keys(sortert[0]).sort(), ['id', 'nokkel', 'tittel'])

console.log('synligeLeker — kun publiserte, i rekkefolge:')
const sr = [
  { rekkefolge: 2, ressurser: { id: 'L2', status: 'publisert' } },
  { rekkefolge: 0, ressurser: { id: 'L0', status: 'utkast' } },      // upublisert → ut
  { rekkefolge: 1, ressurser: { id: 'L1', status: 'publisert' } },
  { rekkefolge: 3, ressurser: null },                                 // RLS skjulte raden → ut
]
like('kun publiserte, sortert på rekkefolge',
  synligeLeker(sr).map((r) => r.id), ['L1', 'L2'])

console.log('synligeDokumenter — kun publiserte, i rekkefolge:')
const sd = [
  { rekkefolge: 1, dokumenter: { id: 'D1', status: 'publisert', tittel: 'B', type: 'pdf', storage_sti: 'https://x/b.pdf' } },
  { rekkefolge: 0, dokumenter: { id: 'D0', status: 'arkivert', tittel: 'A' } },  // ut
  { rekkefolge: 2, dokumenter: null },                                            // ut
]
like('kun publiserte dokumenter', synligeDokumenter(sd).map((d) => d.id), ['D1'])

console.log('formSamlingDokument + dokumentUrl:')
like('form til DokumentKort',
  formSamlingDokument({ id: 'D1', tittel: 'B', type: 'pdf', storage_sti: 'https://x/b.pdf', dokument_sprak: [{ sprak: 'nb' }] }),
  { id: 'D1', tittel: 'B', filtype: 'pdf', sprak: ['nb'], url: 'https://x/b.pdf' })
ok('storage_sti uten http → url null', dokumentUrl('redaksjon/b.pdf') === null)
ok('http(s)-URL beholdes', dokumentUrl('https://x/b.pdf') === 'https://x/b.pdf')

console.log('sorterMedier:')
like('medier sorteres på rekkefolge',
  sorterMedier([{ id: 'm2', rekkefolge: 2 }, { id: 'm1', rekkefolge: 1 }]).map((m) => m.id), ['m1', 'm2'])

console.log('harSamling — TL-dans-boksen skjules når nøkkelen mangler:')
ok('null (117 ikke kjørt) → boks skjult', harSamling(null) === false)
ok('uten id → boks skjult', harSamling({}) === false)
ok('med id → boks vises', harSamling({ id: 'x', tittel: 'TL-dans' }) === true)

console.log('grupperLeker + erGruppert — grupper (seksjoner) i samlinger (migr 119):')
const leker = [{ id: 'A' }, { id: 'B' }, { id: 'C' }] // ferdig-formede leker (kun id trengs her)

// 1) Flat: ingen plasseringer → én seksjonsløs gruppe, i lekenes rekkefolge.
const flat = grupperLeker(leker, [])
like('flat: én gruppe uten seksjon', [flat.length, flat[0].seksjon, flat[0].flere ?? false], [1, null, false])
like('flat: leker i uendret rekkefolge', flat[0].leker.map((l) => l.id), ['A', 'B', 'C'])
ok('flat: erGruppert = false', erGruppert(flat) === false)

// 2) Gruppert: seksjoner sortert på seksjon_rekkefolge, leker på rekkefolge.
const plas = [
  { ressurs_id: 'B', seksjon: 'Inne', seksjon_rekkefolge: 1, rekkefolge: 0 },
  { ressurs_id: 'A', seksjon: 'Ute', seksjon_rekkefolge: 0, rekkefolge: 1 },
  { ressurs_id: 'B', seksjon: 'Ute', seksjon_rekkefolge: 0, rekkefolge: 0 }, // B også i Ute
]
const gr = grupperLeker(leker, plas)
ok('gruppert: erGruppert = true', erGruppert(gr) === true)
like('gruppert: seksjoner i rekkefolge (Ute, Inne, Flere)',
  gr.map((g) => g.flere ? 'FLERE' : g.seksjon), ['Ute', 'Inne', 'FLERE'])
like('gruppert: Ute har B(0) før A(1)', gr[0].leker.map((l) => l.id), ['B', 'A'])
like('gruppert: B står i to grupper (Ute + Inne)',
  [gr[0].leker.some((l) => l.id === 'B'), gr[1].leker.some((l) => l.id === 'B')], [true, true])

// 3) Lek uten plassering (C) → siste «Flere leker»-gruppe (flere:true).
const flere = gr.find((g) => g.flere)
like('flere-gruppe: kun C, flagget flere', [flere.leker.map((l) => l.id), flere.flere], [['C'], true])

// 4) Ingen tom gruppe + plassering mot ukjent lek hoppes over.
const gr2 = grupperLeker([{ id: 'A' }], [
  { ressurs_id: 'A', seksjon: 'Ute', seksjon_rekkefolge: 0, rekkefolge: 0 },
  { ressurs_id: 'X', seksjon: 'Tom', seksjon_rekkefolge: 1, rekkefolge: 0 }, // X finnes ikke → hoppes over
])
like('ukjent lek hoppes over → ingen «Tom»-gruppe, ingen «Flere»',
  gr2.map((g) => g.seksjon), ['Ute'])

// 5) Tom/blank seksjon i plassering behandles som ingen plassering (defensivt).
const gr3 = grupperLeker([{ id: 'A' }], [{ ressurs_id: 'A', seksjon: '   ', seksjon_rekkefolge: 0, rekkefolge: 0 }])
like('blank seksjon → flat', [gr3.length, gr3[0].seksjon], [1, null])

console.log(`\nALLE ${n} ASSERTS PASSERTE ✓`)
