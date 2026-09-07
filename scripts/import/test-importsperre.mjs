#!/usr/bin/env node
// IMPORTSPERRE-BEVIS (claude_IMPORTSPERRE-SPEC + DOM 1, 5. sep). RENE enhetstester mot sperre-
// funksjonene i lib/db.mjs. Måler under en EKTE NETTVAKT: net.connect/tls.connect/dns.lookup er
// patchet til å kaste, så en test som forsøker nettverk feiler HØYLYTT (erstatter den gamle,
// verdiløse moduleLoadList-selvkontrollen som aldri ser npm-pakker).
//
//   node scripts/import/test-importsperre.mjs
//
// A-retting bevist: sperren tar referansen fra VERTEN pg faktisk kobler til (strukturell URL-parsing),
// ikke fra hele strengen. Fire omgåelses-URL-er + to egne stoppes.

import { writeFileSync } from 'node:fs'
import net from 'node:net'
import tls from 'node:tls'
import dns from 'node:dns'

// ── EKTE NETTVAKT: patch alt som kan nå nettet til å kaste. Settes FØR db.mjs importeres/kalles. ──
let nettForsøkt = null
net.Socket.prototype.connect = function () { nettForsøkt = 'net.Socket.connect'; throw new Error('NETTVAKT: net.Socket.connect forsøkt') }
net.connect = net.createConnection = function () { nettForsøkt = 'net.connect'; throw new Error('NETTVAKT: net.connect forsøkt') }
tls.connect = function () { nettForsøkt = 'tls.connect'; throw new Error('NETTVAKT: tls.connect forsøkt') }
dns.lookup = function (...a) { nettForsøkt = 'dns.lookup'; const cb = a[a.length - 1]; if (typeof cb === 'function') return cb(new Error('NETTVAKT: dns.lookup forsøkt')); throw new Error('NETTVAKT: dns.lookup forsøkt') }

const { sjekkAllowlist, hentProsjektRef, sjekkKonfigIkkeForgiftet, PROD_REFERANSE } = await import('./lib/db.mjs')

const UT = process.env.KONTROLL_UT || `${process.env.HOME}/trivselsleder-ny/_kontroll-import`
const OVING = 'bnbrbgvywdnczxajpaoj'
const ALLOWLIST = [OVING]           // kun øvingskopien — prod står ALDRI her
const L = []
const P = (s) => { console.log(s); L.push(s) }
const kaster = (fn) => { try { fn(); return null } catch (e) { return e.message } }

let ok = 0, feil = 0
const krev = (navn, betingelse, detalj = '') => { P(`  ${betingelse ? 'OK  ' : 'FEIL'} ${navn}${detalj ? '  — ' + detalj : ''}`); betingelse ? ok++ : feil++ }

P('# Importsperre-bevis — under EKTE nettvakt (net/tls/dns kaster ved forsøk)')
P(`PROD_REFERANSE = ${PROD_REFERANSE}   ·   allowlist = [${ALLOWLIST.join(', ')}]`)
P('')

// ── (a) Tillatt referanse slipper gjennom — begge former ──
P('## (a) Tillatt referanse (øvingskopien) slipper gjennom')
const direkteOving = `postgresql://postgres:pass@db.${OVING}.supabase.co:5432/postgres`
const poolerOving = `postgresql://postgres.${OVING}:hemmelig@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`
krev('direkte-form kaster IKKE', kaster(() => sjekkAllowlist(direkteOving, ALLOWLIST)) === null, `ref=${hentProsjektRef(direkteOving)}`)
krev('pooler-form kaster IKKE', kaster(() => sjekkAllowlist(poolerOving, ALLOWLIST)) === null, `ref=${hentProsjektRef(poolerOving)}`)
P('')

// ── (b) Prod-referanse stoppes hardt ──
P('## (b) Prod-referanse stoppes hardt')
const prodUrl = `postgresql://postgres:pass@db.${PROD_REFERANSE}.supabase.co:5432/postgres`
const bM = kaster(() => sjekkAllowlist(prodUrl, ALLOWLIST))
krev('kaster + navngir prod-ref ordrett', bM != null && bM.includes(PROD_REFERANSE))
P(`  «${bM}»`)
P('')

// ── (c) Ukjent referanse ──
P('## (c) Ukjent referanse stoppes hardt')
const ukjent = 'abcdefghij0123456789'
const cM = kaster(() => sjekkAllowlist(`postgresql://postgres.${ukjent}:x@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`, ALLOWLIST))
krev('kaster + navngir funnet + tillatt', cM != null && cM.includes(ukjent) && cM.includes(OVING))
P('')

// ── (d) Uleselig streng ──
P('## (d) Uleselig/ukjent-form streng stoppes hardt')
for (const [navn, s] of [['lokal', 'postgresql://kjartaneide@localhost:5432/db'], ['tom', ''], ['tull', 'dette-er-ikke-en-url']])
  krev(`kaster på ${navn}`, kaster(() => sjekkAllowlist(s, ALLOWLIST)) != null && hentProsjektRef(s) === null)
P('')

// ── (e) Forgiftet konfig: prod-ref utkommentert, OG store bokstaver (A-retting §4) ──
P('## (e) Forgiftet konfig — utkommentert + STORE bokstaver')
krev('liten skrift → stopp', kaster(() => sjekkKonfigIkkeForgiftet(`# aldri ${PROD_REFERANSE}`)) != null)
krev('STORE bokstaver → stopp (toLowerCase)', kaster(() => sjekkKonfigIkkeForgiftet(`# ALDRI ${PROD_REFERANSE.toUpperCase()}`)) != null)
krev('ren konfig → kaster IKKE', kaster(() => sjekkKonfigIkkeForgiftet(`IMPORT_TILLATTE_REF=${OVING}`)) === null)
P('')

// ── (A) De fire omgåelses-URL-ene fra DOM 1 + to egne ── (alle allowlist=[øving]) ──
P('## (A) Omgåelses-URL-er — pg ville koblet til en ANNEN vert; sperren må stoppe HVER')
const angrep = [
  ['1 lokkedue i application_name (query)', `postgresql://postgres:x@127.0.0.1:1/postgres?application_name=db.${OVING}.supabase.co`],
  ['2 lokkedue i passord', `postgresql://postgres:db.${OVING}.supabase.co@127.0.0.1:1/postgres`],
  ['3 ?host= overstyrer tillatt vert', `postgresql://postgres:x@db.${OVING}.supabase.co:5432/postgres?host=127.0.0.1&port=1`],
  ['4 pooler-bruker tillatt, vert er IP', `postgresql://postgres.${OVING}:x@127.0.0.1:1/postgres`],
  ['5 (egen) subdomene-triks .supabase.co.evil.com', `postgresql://postgres:x@db.${OVING}.supabase.co.evil.com:5432/postgres`],
  ['6 (egen) ?hostaddr= bak prod-vert', `postgresql://postgres:x@db.${PROD_REFERANSE}.supabase.co:5432/postgres?hostaddr=1.2.3.4`],
  // rev 2-omgåelsene (Fable): ?user= prosent-kodet prod, NUL-trunkering
  ['NY-2 ?user= prosent-kodet prod (%7a)', `postgresql://postgres.${OVING}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?user=postgres.%7apirjbrcbeubwpmtncxx`],
  ['NY-3 NUL-trunkering i pooler-vert', `postgresql://postgres.${OVING}@127.0.0.1%00.pooler.supabase.com:1/postgres`],
  ['NY-13 ?user= ukjent ref', `postgresql://postgres.${OVING}@aws-0-eu-north-1.pooler.supabase.com:5432/postgres?user=postgres.abcdefghij0123456789`],
  ['NY-14 NUL bak prod-vert', `postgresql://postgres@db.${PROD_REFERANSE}.supabase.co%00.pooler.supabase.com:1/postgres?user=postgres`],
]
for (const [navn, url] of angrep) {
  const m = kaster(() => sjekkAllowlist(url, ALLOWLIST))
  krev(navn, m != null, `ref=${JSON.stringify(hentProsjektRef(url))}`)
}
// Ekstra: prod som vert, øving i passord → skal gi PROD-ref (fra hostname), ikke øving (fra passord)
const prodVertØvingPass = `postgresql://postgres:db.${OVING}.supabase.co@db.${PROD_REFERANSE}.supabase.co:5432/postgres`
const pvM = kaster(() => sjekkAllowlist(prodVertØvingPass, ALLOWLIST))
krev('prod-vert + øving-i-passord → prod-melding (ref fra vert)', pvM != null && pvM.includes(PROD_REFERANSE), `ref=${hentProsjektRef(prodVertØvingPass)}`)
P('')

// ── Nettvakt-status: ingen av testene skal ha rørt nettet ──
P(`## Nettvakt: forsøkte noen test å nå nettet? ${nettForsøkt ? 'JA (' + nettForsøkt + ') — FEIL' : 'NEI — ingen socket/DNS forsøkt'}`)
krev('nettvakt urørt', nettForsøkt === null)
P('')
P((feil === 0) ? `RESULTAT: ${ok} OK, 0 FEIL. Sperren nekter målt, uten nettverk.` : `RESULTAT: ${feil} FEIL — se over.`)

writeFileSync(`${UT}/RESULTAT-importsperre-5sep.txt`, L.join('\n') + '\n')
console.log('\nResultatfil:', `${UT}/RESULTAT-importsperre-5sep.txt`)
if (feil !== 0) process.exit(1)
