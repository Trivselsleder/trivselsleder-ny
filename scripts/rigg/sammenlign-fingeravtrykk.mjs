#!/usr/bin/env node
// ============================================================================
// sammenlign-fingeravtrykk.mjs — sammenlign to fingeravtrykk-linjer (testverktøy).
// ============================================================================
// Tar to resultatlinjer fra skjema-fingeravtrykk.sql (lokal og prod) og viser
// hvilke KATEGORIER som avviker (antall og/eller md5). En kategori som avviker
// graves i med scripts/rigg/skjema-detaljer.sql (bytt kategori-navnet der).
//
// BRUK (hvert argument er ENTEN en filsti ELLER selve linja i anførselstegn):
//   node scripts/rigg/sammenlign-fingeravtrykk.mjs _kontroll-import/rigg/lokal-116.txt prod-116.txt
//   node scripts/rigg/sammenlign-fingeravtrykk.mjs "kol=728:ab… | con=…" "kol=728:ab… | …"
// Uten to argumenter: leser to linjer fra stdin (én per linje).
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';

function hentLinje(arg) {
  if (arg && existsSync(arg)) return readFileSync(arg, 'utf8').trim();
  return (arg || '').trim();
}

function parse(linje, merkelapp) {
  const kart = new Map();
  const biter = linje.split('|').map((s) => s.trim()).filter(Boolean);
  if (!biter.length) throw new Error(`Fant ingen kategorier i ${merkelapp}. Er linja tom?`);
  for (const b of biter) {
    const m = b.match(/^(\w+)=(\d+):([0-9a-f]+)$/);
    if (!m) throw new Error(`Ugyldig token i ${merkelapp}: «${b}» (forventet kategori=antall:md5).`);
    kart.set(m[1], { antall: Number(m[2]), md5: m[3] });
  }
  return kart;
}

function main() {
  let a = process.argv[2];
  let b = process.argv[3];
  if (!a || !b) {
    const stdin = readFileSync(0, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
    if (stdin.length < 2) {
      console.error('Trenger to linjer (som argumenter, filstier, eller to linjer på stdin).');
      process.exit(2);
    }
    [a, b] = stdin;
  }
  const ka = parse(hentLinje(a), 'linje A (lokal)');
  const kb = parse(hentLinje(b), 'linje B (prod)');

  const alle = [...new Set([...ka.keys(), ...kb.keys()])].sort();
  const avvik = [];
  console.log('kategori   status   A(lokal)            B(prod)');
  console.log('────────   ──────   ───────────────     ───────────────');
  for (const k of alle) {
    const va = ka.get(k);
    const vb = kb.get(k);
    let status;
    if (!va) { status = 'MANGLER-A'; avvik.push(k); }
    else if (!vb) { status = 'MANGLER-B'; avvik.push(k); }
    else if (va.antall !== vb.antall) { status = 'ULIK-ANTALL'; avvik.push(k); }
    else if (va.md5 !== vb.md5) { status = 'ULIK-MD5'; avvik.push(k); }
    else status = 'LIK';
    const av = va ? `${va.antall}:${va.md5.slice(0, 8)}` : '—';
    const bv = vb ? `${vb.antall}:${vb.md5.slice(0, 8)}` : '—';
    console.log(`${k.padEnd(9)}  ${status.padEnd(11)} ${av.padEnd(19)} ${bv}`);
  }
  console.log('');
  if (avvik.length === 0) {
    console.log('✓ IDENTISK: alle kategorier er like. Skjemaet i A og B er byte-likt (i det målte omfanget).');
    process.exit(0);
  }
  console.log(`✗ AVVIK i ${avvik.length} kategori(er): ${avvik.join(', ')}`);
  console.log('  Grav i hver med scripts/rigg/skjema-detaljer.sql (sett kategori-navnet der,');
  console.log('  kjør mot begge basene, og diff radlistene).');
  process.exit(1);
}

main();
