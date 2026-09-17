// Enhetstest for lib/minsideKort.js (rene funksjoner, ingen supabase).
// Kjør:  node scripts/rigg/test-minsidekort.mjs
import { grupperNominasjonDok, stripTipslistePrefiks, lekekursTittel, nominasjonEtikettNokkel, dansNummer, sorterDanser } from '../../src/lib/minsideKort.js'

let feil = 0
function eq(navn, faktisk, forventet) {
  const a = JSON.stringify(faktisk)
  const b = JSON.stringify(forventet)
  if (a !== b) { feil++; console.error(`FEIL ${navn}:\n  fikk      ${a}\n  forventet ${b}`) }
  else console.log(`OK   ${navn}`)
}

// ── grupperNominasjonDok ──────────────────────────────────────────────────────
// Prod-tro: informasjon(17740), Nominasjonslapp bm(15970)/nn(57)/en(933), Oversikt(71).
const doks = [
  { id: 'a', kilde_nid: '17740', tittel: 'Nominasjon av trivselsledere - informasjon', url: 'u17740', sprak: ['nb'] },
  { id: 'b', kilde_nid: '15970', tittel: 'Nominasjonslapp', url: 'u15970', sprak: ['nb'] },
  { id: 'c', kilde_nid: '57', tittel: 'Nominasjonslapp - nynorsk', url: 'u57', sprak: ['nn'] },
  { id: 'd', kilde_nid: '933', tittel: 'Nomination form - English', url: 'u933', sprak: ['en'] },
  { id: 'e', kilde_nid: '71', tittel: 'Oversikt over antall TL-verv', url: 'u71', sprak: ['nb'] },
]
const g = grupperNominasjonDok(doks)
eq('nominasjon: fire elementer (info, språkgruppe, oversikt)', g.length, 3)
eq('nominasjon: første er info-dok', g[0], { type: 'dok', id: 'a', tittel: 'Nominasjon av trivselsledere - informasjon', url: 'u17740', kilde_nid: '17740' })
eq('nominasjon: andre er språkgruppe med bm,nn,en', g[1], {
  type: 'sprakgruppe',
  varianter: [
    { sprak: 'nb', url: 'u15970', tittel: 'Nominasjonslapp' },
    { sprak: 'nn', url: 'u57', tittel: 'Nominasjonslapp - nynorsk' },
    { sprak: 'en', url: 'u933', tittel: 'Nomination form - English' },
  ],
})
eq('nominasjon: tredje er oversikt-dok', g[2], { type: 'dok', id: 'e', tittel: 'Oversikt over antall TL-verv', url: 'u71', kilde_nid: '71' })

// Visningsetikett: 17740 → «nominasjonsregler»-nøkkel, øvrige → null (bruk egen tittel).
eq('etikett: 17740 → nominasjonsregler', nominasjonEtikettNokkel('17740'), 'nominasjonsregler')
eq('etikett: 17740 som tall → nominasjonsregler', nominasjonEtikettNokkel(17740), 'nominasjonsregler')
eq('etikett: 71 → null', nominasjonEtikettNokkel('71'), null)
eq('etikett: null → null', nominasjonEtikettNokkel(null), null)

// Språkgruppa plasseres der FØRSTE variant står, uansett hvor variantene ligger i lista.
const doks2 = [
  { id: 'c', kilde_nid: '57', tittel: 'nn', url: 'u57', sprak: ['nn'] },
  { id: 'a', kilde_nid: '17740', tittel: 'info', url: 'u17740', sprak: ['nb'] },
  { id: 'b', kilde_nid: '15970', tittel: 'bm', url: 'u15970', sprak: ['nb'] },
]
const g2 = grupperNominasjonDok(doks2)
eq('nominasjon: gruppe først (der nn stod), så info', g2.map((x) => x.type), ['sprakgruppe', 'dok'])
eq('nominasjon: varianter sortert bm→nn (én uten en)', g2[0].varianter.map((v) => v.sprak), ['nb', 'nn'])

// Variant uten url slippes; tom gruppe forsvinner helt.
eq('nominasjon: variant uten url slippes', grupperNominasjonDok([
  { id: 'b', kilde_nid: '15970', tittel: 'bm', url: null, sprak: ['nb'] },
]), [])

// ── stripTipslistePrefiks ─────────────────────────────────────────────────────
eq('tips: «Tipsliste favorittleker»', stripTipslistePrefiks('Tipsliste favorittleker'), 'Favorittleker')
eq('tips: «Tipsliste leker for 100+ elever»', stripTipslistePrefiks('Tipsliste leker for 100+ elever'), 'Leker for 100+ elever')
eq('tips: «Tipsliste sosial kompetanse»', stripTipslistePrefiks('Tipsliste sosial kompetanse'), 'Sosial kompetanse')
eq('tips: «Tipsliste til FYSAK»', stripTipslistePrefiks('Tipsliste til FYSAK'), 'FYSAK')
eq('tips: «Tipsliste til SFO/AKS»', stripTipslistePrefiks('Tipsliste til SFO/AKS'), 'SFO/AKS')
eq('tips: «Tipsliste TL-Mester»', stripTipslistePrefiks('Tipsliste TL-Mester'), 'TL-Mester')
eq('tips: uten prefiks er uendret', stripTipslistePrefiks('Favorittleker'), 'Favorittleker')

// ── lekekursTittel ────────────────────────────────────────────────────────────
eq('lekekurs: høst 2026', lekekursTittel('Lekekurs', 'Kursmodul høst 2026'), 'Lekekurs høst 2026')
eq('lekekurs: vinter 2026', lekekursTittel('Lekekurs', 'Kursmodul vinter 2026'), 'Lekekurs vinter 2026')
eq('lekekurs: sv ledeord', lekekursTittel('Lekkurs', 'Kursmodul høst 2026'), 'Lekkurs høst 2026')
eq('lekekurs: uten Kursmodul-prefiks → bare ledeord', lekekursTittel('Lekekurs', 'Noe annet'), 'Lekekurs')

// ── dansNummer ────────────────────────────────────────────────────────────────
eq('dansNummer: «TL-dans 34» → 34', dansNummer('TL-dans 34'), 34)
eq('dansNummer: «TL-dans 1» → 1', dansNummer('TL-dans 1'), 1)
eq('dansNummer: uten tall → null', dansNummer('TL-dansen'), null)
eq('dansNummer: ikke-streng → null', dansNummer(null), null)

// ── sorterDanser ──────────────────────────────────────────────────────────────
// Prod-rot: rekkefolge er ubrukelig (mange 0), «TL-dans 1» ligger først. Sortering skal
// IGNORERE rekkefølgen i lista og gå på tallet i tittelen, høyeste (nyeste) først.
const danserRot = [
  { id: 'x1', tittel: 'TL-dans 1' },
  { id: 'x34', tittel: 'TL-dans 34' },
  { id: 'x12', tittel: 'TL-dans 12' },
  { id: 'x2', tittel: 'TL-dans 2' },
]
eq('sorterDanser: høyeste tall først (34,12,2,1)',
  sorterDanser(danserRot).map((d) => d.id), ['x34', 'x12', 'x2', 'x1'])
eq('sorterDanser: nyeste = TL-dans 34', sorterDanser(danserRot)[0].tittel, 'TL-dans 34')

// Titler uten tall legges sist, i opprinnelig rekkefølge; tallene sorteres synkende foran dem.
const medUtenTall = [
  { id: 'a', tittel: 'TL-dansen (uten nummer)' },
  { id: 'b', tittel: 'TL-dans 5' },
  { id: 'c', tittel: 'Spesialdans' },
  { id: 'd', tittel: 'TL-dans 9' },
]
eq('sorterDanser: uten tall sist, i opprinnelig rekkefølge',
  sorterDanser(medUtenTall).map((d) => d.id), ['d', 'b', 'a', 'c'])

eq('sorterDanser: tom liste', sorterDanser([]), [])
eq('sorterDanser: null', sorterDanser(null), [])

if (feil) { console.error(`\n${feil} test(er) FEILET`); process.exit(1) }
console.log('\nALLE minsideKort-TESTER BESTÅTT')
