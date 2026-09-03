// BEVIS-TEST for Oslo-tidsvakten i de tre cron-jobbene.
// Leser den FAKTISKE kildekoden fra de endrede filene, trekker ut
// MAAL_TIME_OSLO + osloTimeNaa(), og kjører dem med en fryst klokke —
// både sommertid (juli, UTC+2) og vintertid (januar, UTC+1).
// Tester også erCronKall() fra _vakt.js og selve vaktbeslutningen
// (cron tidsstyres, ansatt gjør det ikke).

import { readFileSync } from 'node:fs'
// Kjøres fra hvor som helst: stier løses relativt til repo-rota (én opp fra scripts/).
const ROT = new URL('..', import.meta.url)

let feil = 0
function sjekk(navn, faktisk, forventet) {
  const ok = faktisk === forventet
  if (!ok) feil++
  console.log(`${ok ? '  OK ' : 'FEIL '} ${navn}  (fikk: ${faktisk}, forventet: ${forventet})`)
}

// ---- Trekk ut vakt-koden fra en cron-fil ----
function lastVakt(sti) {
  const kilde = readFileSync(new URL(sti, ROT), 'utf8')
  const maal = kilde.match(/const MAAL_TIME_OSLO = (\d+)/)
  const fn = kilde.match(/function osloTimeNaa\(\) \{[\s\S]*?\n\}/)
  if (!maal || !fn) throw new Error('Fant ikke vaktkoden i ' + sti)
  // Kjør funksjonen med en Date som kan fryses (osloTimeNaa kaller new Date()).
  const fabrikk = new Function('Date', `
    const MAAL_TIME_OSLO = ${maal[1]}
    ${fn[0]}
    return { MAAL_TIME_OSLO, osloTimeNaa }
  `)
  return (frystIso) => {
    class FrystDate extends Date {
      constructor(...args) { args.length === 0 ? super(frystIso) : super(...args) }
    }
    return fabrikk(FrystDate)
  }
}

// ---- Beslutningen slik den står i handlerne ----
function beslutning(vakt, erCron) {
  if (erCron && vakt.osloTimeNaa() !== vakt.MAAL_TIME_OSLO) return 'hoppet_over'
  return 'kjorer'
}

const filer = {
  'cron-auto-purring': './api/kurs/cron-auto-purring.js',
  'cron-eval-purring': './api/kurs/cron-eval-purring.js',
  'cron-ra-varsel': './api/kurs/cron-ra-varsel.js',
}

for (const [navn, sti] of Object.entries(filer)) {
  const lag = lastVakt(sti)
  console.log(`\n=== ${navn} (mål: time 7 Oslo) ===`)

  console.log('-- SOMMER (juli, Norge = UTC+2) --')
  sjekk('05:00 UTC = 07 Oslo → cron KJØRER', beslutning(lag('2026-07-15T05:00:00Z'), true), 'kjorer')
  sjekk('04:00 UTC = 06 Oslo → cron hopper over', beslutning(lag('2026-07-15T04:00:00Z'), true), 'hoppet_over')
  sjekk('06:00 UTC = 08 Oslo → cron hopper over', beslutning(lag('2026-07-15T06:00:00Z'), true), 'hoppet_over')
  sjekk('07:00 UTC = 09 Oslo → cron hopper over', beslutning(lag('2026-07-15T07:00:00Z'), true), 'hoppet_over')
  sjekk('08:00 UTC = 10 Oslo → cron hopper over', beslutning(lag('2026-07-15T08:00:00Z'), true), 'hoppet_over')

  console.log('-- VINTER (januar, Norge = UTC+1) --')
  sjekk('06:00 UTC = 07 Oslo → cron KJØRER', beslutning(lag('2026-01-15T06:00:00Z'), true), 'kjorer')
  sjekk('05:00 UTC = 06 Oslo → cron hopper over', beslutning(lag('2026-01-15T05:00:00Z'), true), 'hoppet_over')
  sjekk('07:00 UTC = 08 Oslo → cron hopper over', beslutning(lag('2026-01-15T07:00:00Z'), true), 'hoppet_over')
  sjekk('08:00 UTC = 09 Oslo → cron hopper over', beslutning(lag('2026-01-15T08:00:00Z'), true), 'hoppet_over')

  console.log('-- ANSATT (manuelt kall, aldri tidsblokkert) --')
  sjekk('midt på natta (23:00 UTC) → ansatt KJØRER', beslutning(lag('2026-07-15T23:00:00Z'), false), 'kjorer')
  sjekk('midt på dagen (12:00 UTC vinter) → ansatt KJØRER', beslutning(lag('2026-01-15T12:00:00Z'), false), 'kjorer')
}

// Minutt-presisjon for eval-purring: skjemaet "30 5-8 * * *" fyrer :30 —
// vis at fyringen som slipper gjennom faktisk ER 07:30 norsk tid.
console.log('\n=== eval-purring: minuttet kommer fra skjemaet ===')
{
  const lag = lastVakt(filer['cron-eval-purring'])
  const oslo = (iso) => new Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  sjekk('sommer: 05:30 UTC slipper gjennom og er 07:30 Oslo',
    beslutning(lag('2026-07-15T05:30:00Z'), true) + '@' + oslo('2026-07-15T05:30:00Z'), 'kjorer@07:30')
  sjekk('vinter: 06:30 UTC slipper gjennom og er 07:30 Oslo',
    beslutning(lag('2026-01-15T06:30:00Z'), true) + '@' + oslo('2026-01-15T06:30:00Z'), 'kjorer@07:30')
}

// ---- erCronKall fra _vakt.js ----
console.log('\n=== erCronKall (_vakt.js) ===')
{
  const kilde = readFileSync(new URL('./api/_vakt.js', ROT), 'utf8')
  const fn = kilde.match(/export function erCronKall\(req\) \{[\s\S]*?\n\}/)
  if (!fn) throw new Error('Fant ikke erCronKall i _vakt.js')
  const erCronKall = new Function('process', `${fn[0].replace('export function', 'function')}; return erCronKall`)({ env: { CRON_SECRET: 'test-hemmelighet' } })
  sjekk('Bearer CRON_SECRET → cron (true)', erCronKall({ headers: { authorization: 'Bearer test-hemmelighet' } }), true)
  sjekk('ansatt-JWT → ikke cron (false)', erCronKall({ headers: { authorization: 'Bearer eyJhbGciOi...' } }), false)
  sjekk('ingen header → ikke cron (false)', erCronKall({ headers: {} }), false)
  const utenSecret = new Function('process', `${fn[0].replace('export function', 'function')}; return erCronKall`)({ env: {} })
  sjekk('CRON_SECRET ikke satt → false (fail-closed)', utenSecret({ headers: { authorization: 'Bearer whatever' } }), false)
}

// ---- Dekker UTC-vinduet 5–8 målet hele året? (alle dager i 2026) ----
console.log('\n=== Vindusdekning: finnes alltid nøyaktig ÉN treffer i 5–8 UTC? ===')
{
  const lag = lastVakt(filer['cron-auto-purring'])
  let dagerMedEnTreffer = 0, dagerTotalt = 0, verste = null
  for (let d = new Date('2026-01-01T00:00:00Z'); d < new Date('2027-01-01T00:00:00Z'); d = new Date(d.getTime() + 86400000)) {
    dagerTotalt++
    let treff = 0
    for (const h of [5, 6, 7, 8]) {
      const iso = d.toISOString().slice(0, 10) + `T${String(h).padStart(2, '0')}:00:00Z`
      if (beslutning(lag(iso), true) === 'kjorer') treff++
    }
    if (treff === 1) dagerMedEnTreffer++
    else verste = { dag: d.toISOString().slice(0, 10), treff }
  }
  sjekk(`alle ${dagerTotalt} dager i 2026 har nøyaktig én treffer`, dagerMedEnTreffer, dagerTotalt)
  if (verste) console.log('  Avvik:', JSON.stringify(verste))
}

console.log(feil === 0 ? '\nALLE TESTER OK' : `\n${feil} TEST(ER) FEILET`)
process.exit(feil === 0 ? 0 : 1)
