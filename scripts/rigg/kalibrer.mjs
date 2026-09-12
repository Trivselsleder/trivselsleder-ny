#!/usr/bin/env node
// ============================================================================
// kalibrer.mjs — bevis at fingeravtrykket FAKTISK oppdager avvik (testverktøy).
// ============================================================================
// For HVER kategori: klон trivsel_prodmal_116, endre ÉN ting i den kategorien,
// ta fingeravtrykket på nytt, og verifiser at NØYAKTIG den kategorien (og ingen
// annen) endrer seg. Klonene droppes etterpå.
//
// Perturbasjonene oppdages dynamisk mot basen (robuste mot navnendringer). For
// privT/privS/privF velges et (objekt, rolle)-par der rettigheten i dag er USANN,
// og den gis — da er flippen garantert synlig.
//
// BRUK:
//   PORT_ADMIN_URL="postgresql://kjartaneide@localhost:5432/postgres" \
//     node scripts/rigg/kalibrer.mjs
// ============================================================================

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import pg from 'pg';
import { ADMIN_URL, baseUrl, sjekkTrygg, PROSJEKTROT } from './lib-rigg.mjs';

const MAL = 'trivsel_prodmal_116';
const PSQL = '/Applications/Postgres.app/Contents/Versions/17/bin/psql';
const FA_SQL = join(PROSJEKTROT, 'scripts', 'rigg', 'skjema-fingeravtrykk.sql');

function fingeravtrykk(dbnavn) {
  const url = baseUrl(dbnavn);
  const ut = execFileSync(PSQL, ['-qtAX', '-d', url, '-f', FA_SQL], { encoding: 'utf8' });
  const linje = ut.split('\n').map((s) => s.trim()).filter(Boolean).at(-1) || '';
  const kart = new Map();
  for (const b of linje.split('|').map((s) => s.trim()).filter(Boolean)) {
    const m = b.match(/^(\w+)=(\d+):([0-9a-f]+)$/);
    if (m) kart.set(m[1], `${m[2]}:${m[3]}`);
  }
  return kart;
}

function endredeKategorier(basis, ny) {
  const endret = [];
  for (const k of new Set([...basis.keys(), ...ny.keys()])) {
    if (basis.get(k) !== ny.get(k)) endret.push(k);
  }
  return endret.sort();
}

async function q1(klient, sql) { return (await klient.query(sql)).rows[0]; }

async function main() {
  sjekkTrygg(ADMIN_URL, 'PORT_ADMIN_URL');
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const mal = new pg.Client({ connectionString: baseUrl(MAL) });
  await mal.connect();

  // --- Oppdag reelle mål (deterministisk: order by ... limit 1) --------------
  const tabCol = await q1(mal, `
    select c.relname as t, a.attname as c
    from pg_class c join pg_attribute a on a.attrelid=c.oid and a.attnum>0
      and not a.attisdropped and a.atttypid='text'::regtype
    where c.relnamespace='public'::regnamespace and c.relkind='r'
    order by c.relname, a.attnum limit 1;`);
  const tabRls = (await q1(mal, `
    select relname from pg_class where relnamespace='public'::regnamespace
      and relkind='r' and relrowsecurity order by relname limit 1;`)).relname;
  const trigFn = (await q1(mal, `
    select proname from pg_proc where pronamespace='public'::regnamespace
      and prorettype='trigger'::regtype order by proname limit 1;`)).proname;
  const normFn = (await q1(mal, `
    select proname||'('||pg_get_function_identity_arguments(oid)||')' as sig
    from pg_proc where pronamespace='public'::regnamespace and prokind='f'
      and prorettype<>'trigger'::regtype order by proname limit 1;`)).sig;
  const seq = (await q1(mal, `
    select relname from pg_class where relnamespace='public'::regnamespace
      and relkind='S' order by relname limit 1;`)).relname;
  // privT: en tabell der anon IKKE har select i dag (gis → flipp).
  const privTtab = (await q1(mal, `
    select c.relname from pg_class c where c.relnamespace='public'::regnamespace
      and c.relkind='r' and not has_table_privilege('anon', c.oid, 'SELECT')
    order by c.relname limit 1;`)).relname;
  // privF: en funksjon der anon IKKE har execute i dag (gis → flipp).
  const privFrow = await q1(mal, `
    select proname||'('||pg_get_function_identity_arguments(oid)||')' as sig
    from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind in ('f','p')
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
    order by proname limit 1;`);
  const privFsig = privFrow ? privFrow.sig : null;
  await mal.end();

  const perturb = {
    kol:    `alter table ${tabCol.t} alter column ${tabCol.c} set default 'kal_kalibrering';`,
    con:    `alter table ${tabCol.t} add constraint _kal_con check (true);`,
    idx:    `create index _kal_idx on ${tabCol.t} (${tabCol.c});`,
    rls:    `alter table ${tabRls} disable row level security;`,
    pol:    `create policy _kal_pol on ${tabCol.t} for select to anon using (true);`,
    trg:    `create trigger _kal_trg before insert on ${tabCol.t} for each row execute function ${trigFn}();`,
    fn:     `alter function ${normFn} set search_path = pg_catalog, public, pg_temp, extensions;`,
    privT:  `grant select on ${privTtab} to anon;`,
    privS:  `grant usage on sequence ${seq} to anon;`,
    privF:  privFsig ? `grant execute on function ${privFsig} to anon;` : null,
    defacl: `alter default privileges for role postgres in schema public grant select on tables to anon;`,
  };

  const basis = fingeravtrykk(MAL);
  console.log('Kalibrering — én endring per kategori mot en klon av ' + MAL + ':\n');
  console.log('kategori  endring                                                    endrede kategorier   dom');
  console.log('────────  ──────────────────────────────────────────────────────    ──────────────────   ───');

  let alleOk = true;
  for (const [kat, sql] of Object.entries(perturb)) {
    if (!sql) { console.log(`${kat.padEnd(8)}  (hoppet: fant ingen egnet mål)`); continue; }
    const klon = `trivsel_kal_${kat.toLowerCase()}`;
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid();`, [MAL]);
    await admin.query(`DROP DATABASE IF EXISTS "${klon}";`);
    await admin.query(`CREATE DATABASE "${klon}" TEMPLATE "${MAL}";`);
    try {
      const k = new pg.Client({ connectionString: baseUrl(klon) });
      await k.connect();
      try { await k.query('SET ROLE postgres;'); } catch {}
      await k.query(sql);
      await k.end();

      const ny = fingeravtrykk(klon);
      const endret = endredeKategorier(basis, ny);
      const ok = endret.length === 1 && endret[0] === kat;
      if (!ok) alleOk = false;
      console.log(`${kat.padEnd(8)}  ${sql.slice(0, 58).padEnd(58)}  ${endret.join(',').padEnd(19)}  ${ok ? 'OK' : '✗ FEIL'}`);
    } finally {
      await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid();`, [klon]);
      await admin.query(`DROP DATABASE IF EXISTS "${klon}";`);
    }
  }
  await admin.end();
  console.log('\n' + (alleOk
    ? '✓ KALIBRERT: hver perturbasjon slo ut i NØYAKTIG sin egen kategori, ingen andre.'
    : '✗ En eller flere perturbasjoner slo ikke ut som forventet — se linjene over.'));
  process.exit(alleOk ? 0 : 1);
}

main().catch((e) => { console.error('FEILET:', e.message); process.exit(1); });
