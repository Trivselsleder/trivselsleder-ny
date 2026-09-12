// Enhetstest for «Månedens lek»-skjuling (src/lib/manedensLekForm.js).
// Kjør: node scripts/test-manedenslek.mjs
// Ren logikk, ingen base/nettverk (samme mønster som test-samlinger.mjs).
import assert from 'node:assert/strict'
import { harManedensLek } from '../src/lib/manedensLekForm.js'

let n = 0
const ok = (msg, cond) => { assert.ok(cond, msg); n++; console.log('  ✓', msg) }

console.log('harManedensLek — kortet skjules stille når det ikke er en lek å vise:')
ok("kilde 'ingen' → skjult", harManedensLek({ kilde: 'ingen', ressurs_id: null }) === false)
ok('null rad (RPC/tabell mangler, 120 ikke kjørt) → skjult', harManedensLek(null) === false)
ok('undefined rad → skjult', harManedensLek(undefined) === false)
ok('mangler ressurs_id → skjult', harManedensLek({ kilde: 'automatisk', ressurs_id: null }) === false)
ok('automatisk med ressurs_id → vises', harManedensLek({ kilde: 'automatisk', ressurs_id: 'r1' }) === true)
ok('reserve med ressurs_id → vises', harManedensLek({ kilde: 'reserve', ressurs_id: 'r2' }) === true)

console.log(`\nALLE ${n} ASSERTS PASSERTE ✓`)
