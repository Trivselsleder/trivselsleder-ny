#!/usr/bin/env node
// API-BEVIS for Bunny-endepunktene slett-video.js og status.js — mot ETTERLIGNET Bunny og
// Supabase (ingen ekte nøkler, ingen ekte Bunny, ingen prod). Kjøres slik:
//
//   node scripts/import/test-bunny-api.mjs
//
// Hele Supabase- OG Bunny-trafikken fanges av én global.fetch-mock: auth.getUser, oppslag i
// medier/samling_medie, og selve Bunny-kallet. Handlerne importeres uendret fra api/bunny/.
//
// Dekker BÅDE baseline (metode/auth/«i bruk»/404-idempotens) OG rettingen fra 11. sep:
// guid normaliseres (trim + lowercase) og må matche eksakt UUID-format, ellers 400. To
// omgåelser er stengt: STORE bokstaver (traff ikke «i bruk»-sjekken, men slettet ekte video)
// og sti-injeksjon (../collections/<id>). Beviser til slutt at en ny test BITER ved å kjøre
// den samme inputen mot en kopi av den GAMLE koden (uten normalisering/validering).

import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROT = path.resolve(__dirname, '../../')
const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`

// ── Miljø + fetch-mock på plass FØR handlerne lager sin Supabase-klient ──────────────────
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.BUNNY_API_KEY = 'test-bunny-key'
process.env.BUNNY_LIBRARY_ID = '727245'

// Kanoniske guid-er (gyldig UUID-format, små bokstaver). MÅ inneholde hex-BOKSTAVER (a–f), ellers
// er STORE og små versjon identiske og «STORE bokstaver»-testene beviser ingenting.
const I_BRUK = 'abababab-cdcd-efef-abab-cdcdefefcdcd'
const I_BRUK_STORE = I_BRUK.toUpperCase()
const LEDIG = 'dadadada-fefe-baba-cece-fadefadefade'
const LEDIG_STORE = LEDIG.toUpperCase()

let state
function nyState(over = {}) {
  state = {
    user: { id: 'uid-1', aud: 'authenticated' },       // getUser → innlogget
    profile: { rolle: 'ansatt', aktiv: true },          // krevAnsatt → slipper gjennom
    medier: () => [],                                   // (guid) => rader
    samling: () => [],
    bunny: [],                                          // logg over Bunny-kall {method,url}
    bunnyResp: null,                                    // (info) => Response
    ...over,
  }
}

function jsonResp(status, body) {
  return new Response(body == null ? '' : JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
function eqVerdi(url, kol) {
  const q = new URL(url).searchParams.get(kol)   // 'eq.<verdi>' (allerede prosent-dekodet)
  return q ? q.replace(/^eq\./, '') : null
}

globalThis.fetch = async function mockFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
  if (url.includes('/auth/v1/user')) return jsonResp(200, state.user)     // → data.user = caller
  if (url.includes('/rest/v1/profiles')) return jsonResp(200, state.profile) // .single() → objekt
  if (url.includes('/rest/v1/medier')) return jsonResp(200, state.medier(eqVerdi(url, 'bunny_video_id')))
  if (url.includes('/rest/v1/samling_medie')) return jsonResp(200, state.samling(eqVerdi(url, 'bunny_video_id')))
  if (url.includes('video.bunnycdn.com')) {
    state.bunny.push({ method, url })
    return state.bunnyResp ? state.bunnyResp({ method, url }) : jsonResp(200, { guid: 'x', status: 4 })
  }
  throw new Error('Uventet fetch i test: ' + method + ' ' + url)
}

// ── Handlerne (uendret, ekte filer) ─────────────────────────────────────────────────────
const slettVideo = (await import(pathToFileURL(path.join(ROT, 'api/bunny/slett-video.js')).href)).default
const statusVideo = (await import(pathToFileURL(path.join(ROT, 'api/bunny/status.js')).href)).default

// ── Bittesmå req/res ────────────────────────────────────────────────────────────────────
function lagReq({ method = 'POST', auth = true, body, query } = {}) {
  return { method, headers: { authorization: auth ? 'Bearer testtoken' : undefined }, body, query }
}
function lagRes() {
  const r = {}
  r.status = (c) => { r._s = c; return r }
  r.json = (o) => { r._j = o; return r }
  return r
}
async function kjor(handler, reqOpts) {
  const res = lagRes()
  await handler(lagReq(reqOpts), res)
  return { status: res._s, body: res._j, bunny: state.bunny }
}

// ── Testrigg ────────────────────────────────────────────────────────────────────────────
const L = []
const P = (s) => { console.log(s); L.push(s) }
let ok = 0, feil = 0
const krev = (navn, b, d = '') => { P(`  ${b ? 'OK  ' : 'FEIL'} ${navn}${d ? '  — ' + d : ''}`); b ? ok++ : feil++ }
const harDelete = (b) => b.some((c) => c.method === 'DELETE')
const ingenBunny = (b) => b.length === 0

// =========================================================================================
P('# API-bevis: slett-video.js + status.js (etterlignet Bunny og Supabase)')
P('')
P('## slett-video.js')

nyState(); { const r = await kjor(slettVideo, { method: 'GET' }); krev('feil metode (GET) → 405', r.status === 405) }
nyState(); { const r = await kjor(slettVideo, { auth: false, body: { guid: LEDIG } }); krev('mangler auth → 401', r.status === 401 && ingenBunny(r.bunny)) }
nyState(); { const r = await kjor(slettVideo, { body: { guid: '' } }); krev('tom guid → 400 «Mangler guid.»', r.status === 400 && r.body.error === 'Mangler guid.') }
nyState(); { const r = await kjor(slettVideo, { body: { guid: null } }); krev('null guid → 400', r.status === 400 && ingenBunny(r.bunny)) }
nyState(); { const r = await kjor(slettVideo, { body: { guid: 'abc' } }); krev('ikke-UUID «abc» → 400 «Ugyldig guid.»', r.status === 400 && r.body.error === 'Ugyldig guid.') }
nyState(); { const r = await kjor(slettVideo, { body: { guid: 123 } }); krev('tall → 400 «Ugyldig guid.»', r.status === 400 && r.body.error === 'Ugyldig guid.' && ingenBunny(r.bunny)) }
nyState(); { const r = await kjor(slettVideo, { body: { guid: {} } }); krev('objekt → 400 «Ugyldig guid.»', r.status === 400 && r.body.error === 'Ugyldig guid.' && ingenBunny(r.bunny)) }
nyState(); { const r = await kjor(slettVideo, { body: { guid: `../collections/${LEDIG}` } }); krev('sti-injeksjon ../collections/… → 400, INGEN Bunny-kall', r.status === 400 && r.body.error === 'Ugyldig guid.' && ingenBunny(r.bunny)) }
nyState(); { const r = await kjor(slettVideo, { body: { guid: `${LEDIG}/../x` } }); krev('«<uuid>/../x» (manglende $-anker) → 400, INGEN Bunny-kall', r.status === 400 && r.body.error === 'Ugyldig guid.' && ingenBunny(r.bunny)) }

nyState(); {
  const r = await kjor(slettVideo, { body: { guid: LEDIG } })
  const del = r.bunny.find((c) => c.method === 'DELETE')
  krev('gyldig ubrukt guid → 200 + DELETE med små bokstaver i URL', r.status === 200 && r.body.ok === true && !!del && del.url.includes(LEDIG), del ? del.url : 'ingen DELETE')
}
nyState(); {
  const r = await kjor(slettVideo, { body: { guid: LEDIG_STORE } })
  const del = r.bunny.find((c) => c.method === 'DELETE')
  krev('gyldig UBRUKT guid i STORE bokstaver → normaliseres, DELETE-URL er små bokstaver', r.status === 200 && !!del && del.url.includes(LEDIG) && !del.url.includes(LEDIG_STORE), del ? del.url : 'ingen DELETE')
}
nyState({ medier: (g) => (g === I_BRUK ? [{ id: 'm1' }] : []) }); {
  const r = await kjor(slettVideo, { body: { guid: I_BRUK } })
  krev('guid i bruk (medier) → 409, INGEN DELETE', r.status === 409 && !harDelete(r.bunny))
}
nyState({ samling: (g) => (g === I_BRUK ? [{ id: 's1' }] : []) }); {
  const r = await kjor(slettVideo, { body: { guid: I_BRUK } })
  krev('guid i bruk (samling_medie) → 409, INGEN DELETE', r.status === 409 && !harDelete(r.bunny))
}
nyState({ medier: (g) => (g === I_BRUK ? [{ id: 'm1' }] : []) }); {
  const r = await kjor(slettVideo, { body: { guid: I_BRUK_STORE } })
  krev('STORE bokstaver av guid I BRUK → normaliseres → 409, INGEN DELETE', r.status === 409 && !harDelete(r.bunny))
}
nyState({ bunnyResp: () => jsonResp(404, { error: 'not found' }) }); {
  const r = await kjor(slettVideo, { body: { guid: LEDIG } })
  krev('Bunny svarer 404 (alt borte) → 200 (idempotent)', r.status === 200 && r.body.ok === true)
}

P('')
P('## status.js')
nyState(); { const r = await kjor(statusVideo, { method: 'POST', query: { guid: LEDIG } }); krev('feil metode (POST) → 405', r.status === 405) }
nyState(); { const r = await kjor(statusVideo, { method: 'GET', auth: false, query: { guid: LEDIG } }); krev('mangler auth → 401', r.status === 401 && ingenBunny(r.bunny)) }
nyState(); { const r = await kjor(statusVideo, { method: 'GET', query: { guid: '' } }); krev('tom guid → 400 «Mangler guid.»', r.status === 400 && r.body.error === 'Mangler guid.') }
nyState(); { const r = await kjor(statusVideo, { method: 'GET', query: { guid: `../collections/${LEDIG}` } }); krev('sti-injeksjon → 400, INGEN Bunny-kall', r.status === 400 && r.body.error === 'Ugyldig guid.' && ingenBunny(r.bunny)) }
// Gyldig UUID FULGT AV «/../x». Uten $-ankeret i regexen ville prefikset matchet og sluppet
// gjennom; med ankeret avvises hele strengen. Beviser at $-ankeret faktisk gjør en forskjell.
nyState(); { const r = await kjor(statusVideo, { method: 'GET', query: { guid: `${LEDIG}/../x` } }); krev('«<uuid>/../x» (manglende $-anker) → 400, INGEN Bunny-kall', r.status === 400 && r.body.error === 'Ugyldig guid.' && ingenBunny(r.bunny)) }
nyState({ bunnyResp: () => jsonResp(200, { guid: 'x', status: 4 }) }); {
  const r = await kjor(statusVideo, { method: 'GET', query: { guid: LEDIG_STORE } })
  const get = r.bunny.find((c) => c.method === 'GET')
  krev('STORE bokstaver → normaliseres, Bunny-GET med små bokstaver, klar=true', r.status === 200 && !!get && get.url.includes(LEDIG) && r.body.klar === true && r.body.guid === LEDIG, get ? get.url : 'ingen GET')
}
nyState({ bunnyResp: () => jsonResp(200, { guid: 'x', status: 2 }) }); {
  const r = await kjor(statusVideo, { method: 'GET', query: { guid: LEDIG } })
  krev('gyldig guid, status 2 → 200 {status:2, klar:false, feil:false}', r.status === 200 && r.body.status === 2 && r.body.klar === false && r.body.feil === false)
}
nyState({ bunnyResp: () => jsonResp(200, { guid: 'x', status: 8 }) }); {
  const r = await kjor(statusVideo, { method: 'GET', query: { guid: LEDIG } })
  krev('status 8 (JIT playlists created) → klar=true (JIT-bibliotek henger ikke)', r.status === 200 && r.body.status === 8 && r.body.klar === true && r.body.feil === false)
}
nyState({ bunnyResp: () => jsonResp(200, { guid: 'x', status: 7 }) }); {
  const r = await kjor(statusVideo, { method: 'GET', query: { guid: LEDIG } })
  krev('status 7 (JIT segmenting, underveis) → klar=false', r.status === 200 && r.body.status === 7 && r.body.klar === false && r.body.feil === false)
}
nyState({ bunnyResp: () => jsonResp(200, { guid: 'x', status: 5 }) }); {
  const r = await kjor(statusVideo, { method: 'GET', query: { guid: LEDIG } })
  krev('status 5 (error) → feil=true, klar=false', r.status === 200 && r.body.status === 5 && r.body.feil === true && r.body.klar === false)
}
nyState({ bunnyResp: () => jsonResp(200, { guid: 'x', status: 6 }) }); {
  const r = await kjor(statusVideo, { method: 'GET', query: { guid: LEDIG } })
  krev('status 6 (upload failed) → feil=true, klar=false', r.status === 200 && r.body.status === 6 && r.body.feil === true && r.body.klar === false)
}

// =========================================================================================
// BEVIS AT EN NY TEST BITER: kjør «STORE bokstaver av guid I BRUK» og «../collections» mot en
// KOPI av den GAMLE koden (uten normalisering/validering). Den ville sendt DELETE der den nye
// nekter — altså feiler den nye testens forventning mot gammel kode.
P('')
P('## Beviser at rettingen biter (mot en kopi av GAMMEL slett-video.js)')

const GAMMEL_KILDE = `
import { createClient } from '@supabase/supabase-js'
import { krevAnsatt } from '${pathToFileURL(path.join(ROT, 'api/_vakt.js')).href}'
import { lesBunnyKonfig, BUNNY_BASE } from '${pathToFileURL(path.join(ROT, 'api/bunny/_bunny.js')).href}'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const nekt = await krevAnsatt(req, supabase)
  if (nekt) return res.status(nekt.status).json({ error: nekt.error })
  const konfig = lesBunnyKonfig()
  if (konfig.feil) return res.status(500).json({ error: konfig.feil })
  const { apiKey, libraryId } = konfig
  const guid = (req.body?.guid ?? '').toString().trim()
  if (!guid) return res.status(400).json({ error: 'Mangler guid.' })
  const iMedier = await supabase.from('medier').select('id').eq('bunny_video_id', guid).limit(1)
  const iSamling = await supabase.from('samling_medie').select('id').eq('bunny_video_id', guid).limit(1)
  if (iMedier.error || iSamling.error) return res.status(500).json({ error: 'Kunne ikke verifisere om videoen er i bruk.' })
  if ((iMedier.data?.length || 0) > 0 || (iSamling.data?.length || 0) > 0) return res.status(409).json({ error: 'Videoen er fortsatt i bruk og ble ikke slettet.' })
  let slett
  try {
    slett = await fetch(\`\${BUNNY_BASE}/library/\${libraryId}/videos/\${guid}\`, { method: 'DELETE', headers: { AccessKey: apiKey, accept: 'application/json' } })
  } catch { return res.status(502).json({ error: 'Fikk ikke kontakt med Bunny.' }) }
  if (!slett.ok && slett.status !== 404) return res.status(502).json({ error: \`Bunny avviste slettingen (\${slett.status}).\` })
  return res.status(200).json({ ok: true })
}
`
// Temp-kopien av gammel kode legges i _kontroll-import/ (gitignorert), IKKE i scripts/import/
// der den ville dukket opp i git-status og speilingen. Ryddes uansett i finally.
const KONTROLL_DIR = path.join(ROT, '_kontroll-import')
const GAMMEL_STI = path.join(KONTROLL_DIR, '_gammel-slett-video-TEMP.mjs')
let gammelBiter1 = false, gammelBiter2 = false
try {
  mkdirSync(KONTROLL_DIR, { recursive: true })
  writeFileSync(GAMMEL_STI, GAMMEL_KILDE)
  const gammel = (await import(pathToFileURL(GAMMEL_STI).href)).default

  nyState({ medier: (g) => (g === I_BRUK ? [{ id: 'm1' }] : []) })
  let r = await kjor(gammel, { body: { guid: I_BRUK_STORE } })
  gammelBiter1 = harDelete(r.bunny) && r.status === 200
  P(`  GAMMEL kode, STORE bokstaver av guid I BRUK → status ${r.status}, DELETE sendt: ${harDelete(r.bunny)} (sårbarheten: sletter ekte video)`)

  nyState()
  r = await kjor(gammel, { body: { guid: `../collections/${LEDIG}` } })
  const sti = r.bunny.find((c) => c.url.includes('/collections/'))
  gammelBiter2 = !!sti
  P(`  GAMMEL kode, ../collections/… → Bunny-kall mot injisert sti: ${!!sti} ${sti ? '(' + sti.url + ')' : ''}`)
} finally {
  try { unlinkSync(GAMMEL_STI) } catch { /* ok */ }
}
krev('NY test biter: gammel kode SENDER DELETE for STORE-bokstaver-i-bruk (ny nekter)', gammelBiter1)
krev('NY test biter: gammel kode kaller injisert ../collections-sti (ny nekter)', gammelBiter2)

P('')
P(feil === 0 ? `RESULTAT: ${ok} OK, 0 FEIL.` : `RESULTAT: ${ok} OK, ${feil} FEIL — se over.`)

try { writeFileSync(`${UT}/RESULTAT-bunny-api-11sep.txt`, L.join('\n') + '\n'); console.log('\nResultatfil:', `${UT}/RESULTAT-bunny-api-11sep.txt`) } catch { /* ok */ }
if (feil !== 0) process.exit(1)
