// Enhetstest for avgjørelsen «hvilken skole_id skal stemples på et brukssignal»
// (src/lib/stempling.js → velgStemplingsSkole). Ren logikk, ingen base/nettverk
// (samme mønster som test-manedenslek.mjs / test-samlinger.mjs).
// Kjør: node scripts/test-stempling.mjs
import assert from 'node:assert/strict'
import { velgStemplingsSkole } from '../src/lib/stempling.js'

let n = 0
const ok = (msg, cond) => { assert.ok(cond, msg); n++; console.log('  ✓', msg) }

const SKOLE = '33333333-3333-3333-3333-333333333333'

console.log('velgStemplingsSkole — skolebruker stemples, interne aldri:')
// Skolebruker med skole → stemples med sin egen skole.
ok('skoleadmin med skole → skole_id', velgStemplingsSkole('skoleadmin', SKOLE) === SKOLE)
ok('skoleansatt med skole → skole_id', velgStemplingsSkole('skoleansatt', SKOLE) === SKOLE)
ok('feide-bruker med skole → skole_id', velgStemplingsSkole('feide', SKOLE) === SKOLE)

console.log('\ninterne roller stemples ALDRI (test/simulering skal ikke telle):')
ok('superadmin med skole → null', velgStemplingsSkole('superadmin', SKOLE) === null)
ok('ansatt med skole → null', velgStemplingsSkole('ansatt', SKOLE) === null)

console.log('\nuten skole → null (uansett rolle):')
ok('skoleansatt uten skole (null) → null', velgStemplingsSkole('skoleansatt', null) === null)
ok('skoleansatt uten skole (undefined) → null', velgStemplingsSkole('skoleansatt', undefined) === null)
ok('ukjent/tom rolle uten skole → null', velgStemplingsSkole(null, null) === null)
ok('ukjent rolle med skole → skole_id (kun superadmin/ansatt er intern)', velgStemplingsSkole(undefined, SKOLE) === SKOLE)

console.log(`\nALLE ${n} ASSERTS PASSERTE ✓`)
