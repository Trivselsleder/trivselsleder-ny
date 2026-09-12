// Enhetstest for dokumentsidenes filtreringslogikk (src/lib/dokumentTre.js).
// Kjør: node scripts/test-dokumentsider.mjs
// Ren logikk, ingen base/nettverk. Fixtur speiler prod-treets tre nivåer (kilde_tid), inkl.
// «Tilleggsmateriale til leker» (910/924), Aktiv læring (2) og et barnebarn (Plakater under
// Tips og plakater under Drift av TL 901). Kategorier identifiseres ALLTID på kilde_tid.
import assert from 'node:assert/strict'
import {
  lagKlassifikator, malerOgMateriell, hovedkategorier, underkategorier, iValgtKategori,
  grupperUnderRot, ROT_DRIFT_AV_TL, ROT_AKTIV_LAERING,
} from '../src/lib/dokumentTre.js'

// --- Fixtur: dokument_type (id, navn, forelder_id, rekkefolge, kilde_tid) ---
const typer = [
  { id: 100, navn: 'Lek og aktivitet',            forelder_id: null, rekkefolge: 2, kilde_tid: 917 },
  { id: 101, navn: 'Tilleggsmateriale til leker', forelder_id: 100,  rekkefolge: 1, kilde_tid: 910 },
  { id: 200, navn: 'Trivselspatruljen',           forelder_id: null, rekkefolge: 3, kilde_tid: 904 },
  { id: 201, navn: 'Tilleggsmateriale til leker', forelder_id: 200,  rekkefolge: 1, kilde_tid: 924 },
  { id: 300, navn: 'Drift av TL',                 forelder_id: null, rekkefolge: 1, kilde_tid: 901 },
  { id: 301, navn: 'Presentasjoner',              forelder_id: 300,  rekkefolge: 1, kilde_tid: 27  },
  { id: 310, navn: 'Tips og plakater',            forelder_id: 300,  rekkefolge: 2, kilde_tid: 940 },
  { id: 311, navn: 'Plakater',                    forelder_id: 310,  rekkefolge: 1, kilde_tid: 941 }, // barnebarn
  { id: 400, navn: 'Aktiv læring',                forelder_id: null, rekkefolge: 4, kilde_tid: 2   },
  { id: 401, navn: 'Kurshefter',                  forelder_id: 400,  rekkefolge: 1, kilde_tid: 900 },
  { id: 402, navn: 'Informasjon',                 forelder_id: 400,  rekkefolge: 2, kilde_tid: 902 },
]

// --- Fixtur: dokumenter (typeIds = dokument_type-id-er) ---
const docA = { id: 'A', tittel: 'Tillegg m/ lek',     typeIds: [101], lek: true  }  // 910, lek
const docB = { id: 'B', tittel: 'Tillegg u/ lek',     typeIds: [101], lek: false }  // 910, ingen lek
const docC = { id: 'C', tittel: 'Lek-koblet i Drift', typeIds: [301], lek: true  }  // Presentasjoner, lek
const docD = { id: 'D', tittel: 'AL + Drift',         typeIds: [401, 301] }         // Kurshefter + Presentasjoner
const docE = { id: 'E', tittel: 'Plakat',             typeIds: [311] }              // barnebarn Plakater
const docF = { id: 'F', tittel: 'Kun Aktiv læring',   typeIds: [401] }              // kun Kurshefter
const docG = { id: 'G', tittel: 'Tillegg 924',        typeIds: [201] }              // 924
const dokumenter = [docA, docB, docC, docD, docE, docF, docG]

const k = lagKlassifikator(typer)
let n = 0
const ok = (msg, cond) => { assert.ok(cond, msg); n++; console.log('  ✓', msg) }

console.log('erTillegg (910/924 → kun under leken):')
ok('docA (910) er tillegg',            k.erTillegg(docA) === true)
ok('docB (910 uten lek) er tillegg',   k.erTillegg(docB) === true)
ok('docG (924) er tillegg',            k.erTillegg(docG) === true)
ok('docC (Presentasjoner) er IKKE tillegg', k.erTillegg(docC) === false)
ok('docE (Plakater barnebarn) er IKKE tillegg', k.erTillegg(docE) === false)

console.log('iAktivLaering (subtre 2):')
ok('docD (Kurshefter+Presentasjoner) er i Aktiv læring', k.iAktivLaering(docD) === true)
ok('docF (kun Kurshefter) er i Aktiv læring',            k.iAktivLaering(docF) === true)
ok('docC er IKKE i Aktiv læring',                        k.iAktivLaering(docC) === false)

console.log('Maler & materiell (ikke tillegg + kategori utenfor Aktiv læring):')
const maler = malerOgMateriell(k, dokumenter).map((d) => d.id).sort()
ok('maler = [C, D, E] (A/B/G tillegg ute, F kun-AL ute)', JSON.stringify(maler) === JSON.stringify(['C', 'D', 'E']))

console.log('Hovedkategorier i Maler (uten Aktiv læring, uten tomme):')
const hoved = hovedkategorier(k, malerOgMateriell(k, dokumenter)).map((h) => h.kilde_tid)
ok('hoved inkluderer Drift av TL (901)', hoved.includes(901))
ok('hoved utelater Aktiv læring (2)',    !hoved.includes(2))
ok('hoved utelater tom Lek og aktivitet (917 hadde bare tillegg)', !hoved.includes(917))

console.log('Underkategorier under Drift av TL (kun ikke-tomme):')
const under = underkategorier(k, malerOgMateriell(k, dokumenter), 901).map((u) => u.kilde_tid).sort()
ok('under = [27, 940] (Presentasjoner + Tips og plakater)', JSON.stringify(under) === JSON.stringify([27, 940]))

console.log('iValgtKategori viser valgt node + alle etterkommere:')
const iDrift = iValgtKategori(k, dokumenter, ROT_DRIFT_AV_TL).map((d) => d.id).sort()
ok('valgt Drift (901) = [C, D, E]', JSON.stringify(iDrift) === JSON.stringify(['C', 'D', 'E']))
const iPlakater = iValgtKategori(k, dokumenter, 941).map((d) => d.id).sort()
ok('valgt barnebarn Plakater (941) = [E]', JSON.stringify(iPlakater) === JSON.stringify(['E']))
const iTips = iValgtKategori(k, dokumenter, 940).map((d) => d.id).sort()
ok('valgt Tips og plakater (940) fanger barnebarnet E', JSON.stringify(iTips) === JSON.stringify(['E']))

console.log('grupperUnderRot — Drift av TL:')
const gDrift = grupperUnderRot(k, malerOgMateriell(k, dokumenter).filter((d) => k.iSubtre(d, 901)), 901)
const gMap = Object.fromEntries(gDrift.map((g) => [g.node ? g.node.kilde_tid : 'ovrig', g.dokumenter.map((d) => d.id).sort()]))
ok('Presentasjoner (27) = [C, D]', JSON.stringify(gMap[27]) === JSON.stringify(['C', 'D']))
ok('Tips og plakater (940) = [E] (barnebarn foldet inn)', JSON.stringify(gMap[940]) === JSON.stringify(['E']))
ok('ingen «øvrig»-gruppe (alt plassert)', !('ovrig' in gMap))

console.log('grupperUnderRot — Aktiv læring:')
const alDocs = dokumenter.filter((d) => k.iAktivLaering(d))
const gAL = grupperUnderRot(k, alDocs, ROT_AKTIV_LAERING)
const gALMap = Object.fromEntries(gAL.map((g) => [g.node ? g.node.kilde_tid : 'ovrig', g.dokumenter.map((d) => d.id).sort()]))
ok('Kurshefter (900) = [D, F]', JSON.stringify(gALMap[900]) === JSON.stringify(['D', 'F']))

console.log(`\nALLE ${n} ASSERTS PASSERTE ✓`)
