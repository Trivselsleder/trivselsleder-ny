#!/usr/bin/env node
// ============================================================================
// bygg-prodmal.mjs — bygger prod-tro lokale SKJEMA-maler (testverktøy).
// ============================================================================
// Bygger to navngitte, persistente lokale baser:
//   trivsel_prodmal_116 = SKJEMAET slik prod har det etter 001–116.
//   trivsel_prodmal_118 = 116 + 117 + 118.
//
// Endrer ALDRI migrasjonsfiler. Alt tilpasset ligger i scripts/rigg/. Kjører KUN
// mot lokal Postgres (sperre i lib-rigg.mjs). Migrasjonene kjøres som postgres, med
// prods pg_default_acl-sett (se lib-rigg.mjs / port.mjs RIGG-NOTAT).
//
// KLASSIFISERING per fil (rapporteres på én linje hver):
//   KJØRT                  hele fila kjørt uendret.
//   KJØRT MED BOOTSTRAP-DATA minste data lagt inn før sperren, fjernet etter (ingen brukt her;
//                          storage-stillaset 109 trenger er rigg-skjema, ikke data).
//   SKJEMADEL UTDRATT      kun DDL-linjene kjørt (fra scripts/rigg/skjemadel-NNN.sql),
//                          fordi resten er DML bak datasperrer. Verifisert mot fila.
//   HOPPET                 ren datamigrasjon uten skjemaeffekt (0 DDL/grant/policy/funksjon).
//
// BRUK:
//   PORT_ADMIN_URL="postgresql://kjartaneide@localhost:5432/postgres" \
//     node scripts/rigg/bygg-prodmal.mjs [116|118|begge] [--suffiks=_b] [--nofinger]
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import {
  lesMigrasjoner, reisBase, filnr, MIGRASJONSDIR, PROSJEKTROT,
  ADMIN_URL, baseUrl, linjeFraPosisjon,
} from './lib-rigg.mjs';

const RIGGDIR = join(PROSJEKTROT, 'scripts', 'rigg');
const RESULTATDIR = join(PROSJEKTROT, '_kontroll-import', 'rigg');
const PSQL = '/Applications/Postgres.app/Contents/Versions/17/bin/psql';

// --- Per-fil-plan. Nøkkel = filnr (f.eks. '114'). Uten oppføring: KJØRT. --------
const HOPPET_GRUNN =
  'ren datamigrasjon — 0 DDL/grant/policy/funksjon (kun temp-tabeller + DML). Ingen skjemaeffekt.';
const PLAN = {
  '108': { type: 'HOPPET', grunn: HOPPET_GRUNN + ' Sperren «forventer 20 031-ressurser» gjelder kun sletting av testdata.' },
  '110': { type: 'HOPPET', grunn: HOPPET_GRUNN + ' Kobler Bunny-video til medier (data).' },
  '111': { type: 'HOPPET', grunn: HOPPET_GRUNN + ' Setter «Move it/egnet»-flagg på ressurser (data).' },
  '113': { type: 'HOPPET', grunn: HOPPET_GRUNN + ' Fyller redaksjonskø fra samlinger/lenker (data).' },
  '116': { type: 'HOPPET', grunn: HOPPET_GRUNN + ' Alt-tekster + sjekksaker (data); dette var fila rev 1-fixturen bommet på.' },
  '114': {
    type: 'SKJEMADEL', fil: 'skjemadel-114.sql',
    grunn: 'kun CHECK-endringen på dokument_sprak (linje 108–109) er skjema; resten er DML bak storage-/fag-/kø-sperrer.',
    assert: [
      'alter table dokument_sprak drop constraint dokument_sprak_sprak_check;',
      "alter table dokument_sprak add  constraint dokument_sprak_sprak_check check (sprak in ('nb','nn','en'));",
    ],
  },
  '117': {
    type: 'SKJEMADEL', fil: 'skjemadel-117.sql',
    grunn: 'kun kolonne + unik indeks på samlinger (linje 54–55) er skjema; resten er DML bak TL-dans-sperren.',
    assert: [
      'alter table samlinger add column if not exists nokkel text;',
      'create unique index if not exists idx_samlinger_nokkel on samlinger (nokkel) where nokkel is not null;',
    ],
  },
};
// Informative merknader på enkelte KJØRT-filer (påvirker ikke klassifiseringen).
const MERKNAD = {
  '031': 'seeder testleker (data) — slettes senere / påvirker ikke skjema-fingeravtrykket.',
  '034': 'seeder testimport 20 leker (data) — 102 sletter dem igjen.',
  '038': 'seed «egnet» (data).',
  '097': 'seed churn/signalord (data).',
  '097B': 'seed innstillinger (data).',
  '109': 'storage.objects + «pakkebilder»-policyene ALTER POLICY-en treffer leveres av riggen (Supabase-forvaltet skjema, ikke i migrasjonene).',
};

function normaliser(s) { return s.replace(/\s+/g, ' ').trim().toLowerCase(); }

function assertLinjerFinnes(navn, linjer) {
  const kilde = normaliser(readFileSync(join(MIGRASJONSDIR, navn), 'utf8'));
  for (const l of linjer) {
    if (!kilde.includes(normaliser(l))) {
      throw new Error(
        `SKJEMADEL-DRIFT: linjen «${l.slice(0, 70)}…» finnes ikke lenger ordrett i ${navn}. ` +
        'Uttrekket i scripts/rigg/ må oppdateres mot migrasjonen før bruk.');
    }
  }
}

async function byggEn(pg, maalNr, dbnavn) {
  const rapport = [];
  const { gyldige, hull } = lesMigrasjoner(maalNr);
  if (hull.length) throw new Error(`Hull i nummerrekken: ${hull.join(', ')}`);
  console.log(`\n=== Bygger ${dbnavn} (001 → ${filnr(gyldige.at(-1))}, ${gyldige.length} filer) ===`);

  const base = await reisBase(pg, dbnavn);
  try {
    for (const f of gyldige) {
      const nr = filnr(f);
      const plan = PLAN[nr];
      const merk = MERKNAD[nr] ? `  [${MERKNAD[nr]}]` : '';
      const start = process.hrtime.bigint();

      if (plan?.type === 'HOPPET') {
        rapport.push({ nr, navn: f.navn, klasse: 'HOPPET', detalj: plan.grunn });
        console.log(`HOPPET          ${f.navn}`);
        continue;
      }

      let sql, kilde;
      if (plan?.type === 'SKJEMADEL') {
        assertLinjerFinnes(f.navn, plan.assert);
        sql = readFileSync(join(RIGGDIR, plan.fil), 'utf8');
        kilde = plan.fil;
      } else {
        sql = readFileSync(join(MIGRASJONSDIR, f.navn), 'utf8');
        kilde = f.navn;
      }

      try {
        await base.query('BEGIN');
        await base.query(sql);
        await base.query('COMMIT');
      } catch (e) {
        try { await base.query('ROLLBACK'); } catch {}
        const linje = linjeFraPosisjon(sql, e.position);
        throw new Error(`FEIL i ${kilde}${linje ? ` (linje ${linje})` : ''}: ${e.message}`);
      }
      const ms = (Number(process.hrtime.bigint() - start) / 1e6).toFixed(0);

      if (plan?.type === 'SKJEMADEL') {
        rapport.push({ nr, navn: f.navn, klasse: 'SKJEMADEL UTDRATT', detalj: `via ${plan.fil}: ${plan.grunn}` });
        console.log(`SKJEMADEL UTDR. ${f.navn}  (${ms} ms, via ${plan.fil})`);
      } else {
        rapport.push({ nr, navn: f.navn, klasse: 'KJØRT', detalj: MERKNAD[nr] || '' });
        console.log(`KJØRT           ${f.navn}  (${ms} ms)${merk}`);
      }
    }

    // Importmarkøren MÅ være fraværende (prod har den ikke; CLAUDE.md-regel).
    const mark = await base.query(
      `select to_regclass('public.import_kopi_identitet') is not null as finnes;`);
    if (mark.rows[0].finnes) {
      throw new Error('import_kopi_identitet FINNES i malen — skal være fraværende (som prod).');
    }
    console.log('✓ import_kopi_identitet fraværende (som prod)');
  } finally {
    await base.end();
  }
  return rapport;
}

function fingeravtrykk(dbnavn) {
  const url = baseUrl(dbnavn);
  const ut = execFileSync(
    PSQL, ['-qtAX', '-d', url, '-f', join(RIGGDIR, 'skjema-fingeravtrykk.sql')],
    { encoding: 'utf8' },
  );
  // Ta siste ikke-tomme linje (robust mot et evt. «SET»-tag på egen linje).
  const linjer = ut.split('\n').map((s) => s.trim()).filter(Boolean);
  return linjer.at(-1) || '';
}

async function main() {
  const which = (process.argv[2] || 'begge').replace(/^--/, '');
  const suffiksArg = process.argv.find((a) => a.startsWith('--suffiks='));
  const suffiks = suffiksArg ? suffiksArg.split('=')[1] : '';
  const nofinger = process.argv.includes('--nofinger');

  const jobber = [];
  if (which === '116' || which === 'begge') jobber.push({ maal: 116, navn: `trivsel_prodmal_116${suffiks}` });
  if (which === '118' || which === 'begge') jobber.push({ maal: 118, navn: `trivsel_prodmal_118${suffiks}` });
  if (!jobber.length) { console.error('Bruk: bygg-prodmal.mjs [116|118|begge]'); process.exit(1); }

  const oppsummering = [];
  for (const j of jobber) {
    const rapport = await byggEn(pg, j.maal, j.navn);
    const tell = rapport.reduce((a, r) => { a[r.klasse] = (a[r.klasse] || 0) + 1; return a; }, {});
    console.log(`\n-- Klassifisering ${j.navn}: ` +
      Object.entries(tell).map(([k, v]) => `${k}=${v}`).join(', '));

    let fa = null;
    if (!nofinger) {
      fa = fingeravtrykk(j.navn);
      const fil = join(RESULTATDIR, suffiks
        ? `tmp/lokal-${j.maal}${suffiks}.txt`
        : `lokal-${j.maal}.txt`);
      writeFileSync(fil, fa + '\n', 'utf8');
      console.log(`Fingeravtrykk skrevet: ${fil}`);
      console.log(fa);
    }
    oppsummering.push({ navn: j.navn, tell, rapport, fa });
  }

  // Klassifiseringstabell (full) skrives til stdout til slutt.
  console.log('\n======== KLASSIFISERINGSTABELL ========');
  for (const o of oppsummering) {
    console.log(`\n### ${o.navn}`);
    for (const r of o.rapport) {
      console.log(`${r.nr.padEnd(5)} ${r.klasse.padEnd(18)} ${r.navn}${r.detalj ? '  — ' + r.detalj : ''}`);
    }
  }
}

main().catch((e) => { console.error('\nFEILET:', e.message); process.exit(1); });
