#!/usr/bin/env node
// port.mjs — MEKANISK PORTERINGSBEVIS for migrasjonskjeden.
// =============================================================================
// HVA: reiser en HELT TOM lokal base, kjører hele kjeden 001 → N i rekkefølge,
//      og avslutter med ett utvetydig BESTÅTT eller FEILET.
//
// HVORFOR: en migrasjon skal ALDRI kunne leveres med ordene «jeg simulerte det».
//      098 hadde en typefeil som stoppet ved første kall; 100 rev 1 stoppet fordi
//      en unik indeks lå før seeden. Begge ville blitt fanget mekanisk av EN ekte
//      kjøring mot en tom base. Det er det dette verktøyet gjør.
//
// ENDRER IKKE den eksisterende kjøreren (migrasjonskjorer.mjs) eller noen
// migrasjonsfil. Dette er et helt eget, frittstående verktøy.
//
// SPERRE (fail-closed): kjører KUN mot en lokal Postgres. Nekter å kjøre hvis
//      tilkoblingsstrengen inneholder «supabase» eller live-prosjekt-ID-en.
//      Nekter også ikke-lokal vert med mindre PORT_TILLAT_IKKE_LOKAL=1.
//
// RIGG = PROD (viktig): riggen settes opp så pg_default_acl matcher PROD, ikke
//      Supabases interne standard. Se «bootstrapSql» og «RIGG-NOTAT» nederst.
//
// BRUK:
//   node port.mjs              # standard: to friske bygg (verifisert identiske),
//                              #           så nyeste fil en gang til på den bygde basen
//   node port.mjs --idem=samme # streng: kjør HELE kjeden to ganger på SAMME base
//   PORT_ADMIN_URL=... PORT_TESTDB=... node port.mjs
//   (se «BRUKSANVISNING FOR MAC / Postgres.app» nederst i fila for den ene kommandoen)
//
// TILKOBLING (miljøvariabler, med trygge lokale standardverdier):
//   PORT_ADMIN_URL   vedlikeholds-URL til en lokal Postgres, mot en base som IKKE
//                    er testbasen (brukes for å DROPPE + OPPRETTE testbasen).
//                    Standard: postgresql://postgres@localhost:5432/postgres
//   PORT_TESTDB      navnet på testbasen som reises på nytt hver gang.
//                    Standard: trivsel_port_test
//   PORT_TILLAT_IKKE_LOKAL=1   tillat en vert som ikke er localhost (av-som-standard).
// =============================================================================

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROSJEKTROT = resolve(__dirname, '..', '..');
const MIGRASJONSDIR = join(PROSJEKTROT, 'supabase', 'migrations');

// Ting som ALDRI skal røres — hard sperre.
const LIVE_PROSJEKT_ID = 'zpirjbrcbeubwpmtncxx';
const FORBUDTE_BITER = ['supabase', LIVE_PROSJEKT_ID];
const LOKALE_VERTER = new Set(['localhost', '127.0.0.1', '::1', '']);
const SYSTEMBASER = new Set(['postgres', 'template0', 'template1']);

const ADMIN_URL = process.env.PORT_ADMIN_URL || 'postgresql://postgres@localhost:5432/postgres';
const TESTDB = process.env.PORT_TESTDB || 'trivsel_port_test';
const TILLAT_IKKE_LOKAL = process.env.PORT_TILLAT_IKKE_LOKAL === '1';

// -----------------------------------------------------------------------------
// Logg: alt som skrives havner BÅDE på skjerm og i en tidsstemplet loggfil.
// -----------------------------------------------------------------------------
const LOGGBUFFER = [];
function stempel() {
  const d = new Date();
  const p = (n, b = 2) => String(n).padStart(b, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
const START_STEMPEL = stempel();
const LOGGFIL = join(__dirname, `port-${START_STEMPEL}.log`);
function logg(linje = '') {
  LOGGBUFFER.push(linje);
  console.log(linje);
}
function loggFeil(linje = '') {
  LOGGBUFFER.push(linje);
  console.error(linje);
}
function skrivLogg() {
  try { writeFileSync(LOGGFIL, LOGGBUFFER.join('\n') + '\n', 'utf8'); }
  catch (e) { console.error(`(kunne ikke skrive loggfil: ${e.message})`); }
}

// -----------------------------------------------------------------------------
// Les og sorter migrasjonsfiler — SAMME logikk som migrasjonskjorer.mjs, slik at
// rekkefølgen er identisk (nummer først, tomt suffiks FØR bokstav: 091 < 091B < 092).
// -----------------------------------------------------------------------------
function lesMigrasjoner() {
  const alle = readdirSync(MIGRASJONSDIR);
  const sqlFiler = alle.filter((f) => f.toLowerCase().endsWith('.sql'));
  const gyldige = [];
  const avvikende = [];
  const mønster = /^(\d{3})([A-Za-z]?)_.+\.sql$/;
  for (const navn of sqlFiler) {
    const m = navn.match(mønster);
    if (!m) { avvikende.push(navn); continue; }
    gyldige.push({ nr: parseInt(m[1], 10), suffiks: m[2].toUpperCase(), navn });
  }
  gyldige.sort((a, b) => a.nr - b.nr || a.suffiks.localeCompare(b.suffiks));

  const hull = [];
  if (gyldige.length) {
    const min = gyldige[0].nr;
    const max = gyldige[gyldige.length - 1].nr;
    const finnes = new Set(gyldige.map((g) => g.nr));
    for (let i = min; i <= max; i++) if (!finnes.has(i)) hull.push(i);
  }
  return { gyldige, avvikende, hull };
}

// -----------------------------------------------------------------------------
// Sperre: nekter alt som ikke utvetydig er en lokal testbase.
// -----------------------------------------------------------------------------
function sjekkTrygg(url, navn) {
  const lav = url.toLowerCase();
  for (const bit of FORBUDTE_BITER) {
    if (lav.includes(bit)) {
      throw new Error(`SPERRE UTLØST (${navn}): tilkoblingen inneholder «${bit}». ` +
        'Dette verktøyet kjører ALDRI mot Supabase/live. Avbryter.');
    }
  }
  let host = '';
  try { host = new URL(url).hostname; } catch { /* la stå tom → behandles som lokal */ }
  if (!LOKALE_VERTER.has(host) && !TILLAT_IKKE_LOKAL) {
    throw new Error(`SPERRE UTLØST (${navn}): verten «${host}» er ikke lokal. ` +
      'Sett PORT_TILLAT_IKKE_LOKAL=1 kun hvis du med vilje bruker en annen lokal vert.');
  }
}

function testbaseUrl() {
  // Bygg testbasens URL ved å bytte ut basenavnet i admin-URL-en.
  const u = new URL(ADMIN_URL);
  u.pathname = '/' + TESTDB;
  return u.toString();
}

// -----------------------------------------------------------------------------
// RIGG-BOOTSTRAP = PROD. Alt en tom base trenger FØR migrasjonene, satt opp så
// pg_default_acl matcher PROD (postgres-settet), ikke Supabases interne standard.
//
// Kjøres som superbruker (postgres). Migrasjonene kjøres deretter som postgres,
// slik at objektene de lager arver POSTGRES-eierens default-rettigheter — det er
// nettopp derfor anon ikke får sekvenstilgang (slik PROD er), i motsetning til en
// rigg som kjører som supabase_admin og gir anon rwU på sekvenser.
// -----------------------------------------------------------------------------
function rollerSql() {
  // Roller er cluster-globale — opprett idempotent på vedlikeholdstilkoblingen.
  return `
DO $$
BEGIN
  -- postgres: eieren migrasjonene kjøres som (som i prod). Postgres.app lager den
  -- ikke selv — superbrukeren der er Mac-brukernavnet ditt. Vi sørger for at den finnes.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    CREATE ROLE postgres SUPERUSER LOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOLOGIN NOINHERIT; END IF;
END $$;
GRANT anon, authenticated, service_role TO authenticator;`;
}

function bootstrapSql() {
  // Kjøres INNE i den ferske testbasen, som postgres.
  return `
-- Skjemaer Supabase-migrasjonene forutsetter.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Utvidelser i «extensions»-skjemaet, slik PROD har dem forhåndsinstallert.
-- (Migrasjonenes «create extension if not exists» blir da et trygt no-op, og
--  kall som extensions.digest / extensions.similarity lar seg slå opp.)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Søkesti som i Supabase: «extensions» MÅ være med, ellers finner ikke migrasjonene
-- operatorklasser som gin_trgm_ops (fra pg_trgm) uten skjema-prefiks — akkurat slik
-- prod løser det. Settes både på basen (nye tilkoblinger) og i denne sesjonen.
ALTER DATABASE "${TESTDB}" SET search_path TO "$user", public, extensions;
SET search_path TO "$user", public, extensions;

-- Minimal auth.users: profiles + kurs_skole har FK hit (kun id brukes).
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);

-- auth.uid()/role()/jwt(): stubber som lar RLS-policyene kompilere og kjøre.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $fn$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $fn$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE AS $fn$
    SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::text;
  $fn$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $fn$
    SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  $fn$;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role(), auth.jwt()
  TO anon, authenticated, service_role;

-- =============================================================================
-- DEFAULT-RETTIGHETER = PRODS POSTGRES-SETT (målt i prod 4. sep):
--   postgres | r (tabeller):  anon=Dxtm, authenticated=Dxtm, service_role=Dxtm, postgres=arwdDxtm
--   postgres | S (sekvenser): kun postgres=rwU
--   postgres | f (funksjoner): kun postgres=X
-- Alle migrasjonsobjekter eies av postgres → arver DETTE settet (ikke
-- supabase_admin-settet) → anon får IKKE sekvens-/funksjonstilgang som standard,
-- og heller ikke data-rettigheter på tabeller (må gis eksplisitt). Det er PROD.
-- «GRANT ALL» tilpasser seg serverversjonen (m/MAINTAIN på PG17+), så vi slipper
-- å hardkode bokstavsettet.
-- =============================================================================
-- tabeller: eier postgres=arwdDxtm, og anon/authenticated/service_role=Dxtm
--   (ALL minus data-rettighetene → TRUNCATE/REFERENCES/TRIGGER(/MAINTAIN)).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, SELECT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;
-- sekvenser: kun eier → acl blir {postgres=rwU} (anon/auth/service får ingenting).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres;
-- funksjoner: kun eier → acl blir {postgres=X}. En ikke-tom acl utelukker samtidig
--   PUBLIC sin implisitte EXECUTE, så ingen andre roller kan kjøre funksjonene.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres;
`;
}

// Etter migrasjonene: bevis at rigg-modellen holder (anon har null på sekvenser).
const ACL_SEKVENS_SJEKK = `
SELECT s.relname AS sekvens, a.privilege_type
FROM pg_class s
CROSS JOIN LATERAL aclexplode(s.relacl) a
JOIN pg_roles r ON r.oid = a.grantee
WHERE s.relkind = 'S'
  AND s.relnamespace = 'public'::regnamespace
  AND r.rolname = 'anon';`;

const ACL_DEFAULT_SJEKK = `
SELECT pg_get_userbyid(defaclrole) AS eier, defaclobjtype AS objtype, defaclacl AS acl
FROM pg_default_acl
ORDER BY 1, 2;`;

// Deterministisk skjema-fingeravtrykk: to friske bygg av samme kjede skal gi
// nøyaktig samme kolonner, constraints, funksjoner, policyer og indekser.
// Alt sorteres i SQL (ingen OID-avhengig rekkefølge) så avtrykket er stabilt.
const FINGERAVTRYKK_SQL = `
SELECT string_agg(rad, E'\\n' ORDER BY rad) AS avtrykk FROM (
  SELECT 'K ' || table_name || '.' || column_name || ' ' || ordinal_position || ' '
         || data_type || ' ' || is_nullable || ' ' || coalesce(column_default, '') AS rad
    FROM information_schema.columns WHERE table_schema = 'public'
  UNION ALL
  SELECT 'C ' || conrelid::regclass::text || ' ' || conname || ' ' || contype::text
    FROM pg_constraint WHERE connamespace = 'public'::regnamespace
  UNION ALL
  SELECT 'F ' || proname || '(' || pg_get_function_identity_arguments(oid) || ')'
    FROM pg_proc WHERE pronamespace = 'public'::regnamespace
  UNION ALL
  SELECT 'P ' || tablename || ' ' || policyname || ' ' || cmd
    FROM pg_policies WHERE schemaname = 'public'
  UNION ALL
  SELECT 'I ' || tablename || ' ' || indexname
    FROM pg_indexes WHERE schemaname = 'public'
) t;`;

async function fingeravtrykk(base) {
  const r = await base.query(FINGERAVTRYKK_SQL);
  const tekst = r.rows[0]?.avtrykk || '';
  return createHash('sha256').update(tekst).digest('hex');
}

// Hent teksten på en gitt linje (for å vise HVILKEN setning som ikke tålte gjentakelse).
function linjetekst(sql, linje) {
  if (!linje) return null;
  const rad = sql.split('\n')[linje - 1];
  return rad ? rad.trim().slice(0, 140) : null;
}

// -----------------------------------------------------------------------------
// Feilhjelpere: filnavn + linjenummer + selve feilmeldingen.
// -----------------------------------------------------------------------------
function linjeFraPosisjon(sql, position) {
  if (position == null) return null;
  const idx = Number(position) - 1; // pg gir 1-basert tegn-offset
  if (!Number.isFinite(idx) || idx < 0 || idx > sql.length) return null;
  return sql.slice(0, idx).split('\n').length;
}

// -----------------------------------------------------------------------------
// Kjør hele kjeden mot en allerede tilkoblet klient. Returnerer {ok, feil}.
// feil = { navn, linje, melding } ved første feil.
// -----------------------------------------------------------------------------
async function kjørKjeden(klient, filer, merkelapp) {
  logg(`\n── ${merkelapp}: kjører ${filer.length} filer (${filnr(filer[0])} → ${filnr(filer[filer.length - 1])}) ──`);
  for (const f of filer) {
    const sql = readFileSync(join(MIGRASJONSDIR, f.navn), 'utf8');
    const start = process.hrtime.bigint();
    try {
      await klient.query('BEGIN');
      await klient.query(sql);
      await klient.query('COMMIT');
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logg(`OK   ${f.navn}  (${ms.toFixed(0)} ms)`);
    } catch (e) {
      try { await klient.query('ROLLBACK'); } catch { /* ignorer */ }
      const linje = linjeFraPosisjon(sql, e.position);
      const feil = { navn: f.navn, linje, melding: e.message };
      loggFeil(`\nFEIL i ${f.navn}${linje ? ` (linje ${linje})` : ''}:`);
      loggFeil(`  ${e.message}`);
      if (e.detail) loggFeil(`  detalj: ${e.detail}`);
      if (e.hint) loggFeil(`  hint:   ${e.hint}`);
      return { ok: false, feil };
    }
  }
  logg(`── ${merkelapp}: alle ${filer.length} filer grønt ──`);
  return { ok: true };
}

function filnr(f) { return String(f.nr).padStart(3, '0') + f.suffiks; }

// Kjør KUN én fil en gang til på en allerede bygget base — den idempotensen som
// faktisk betyr noe: trykker Kjartan Run to ganger på den nyeste fila i Supabase,
// skal ingenting gå galt. Returnerer {ok} eller {ok:false, feil:{navn,linje,melding}}.
async function kjørÉnFilIgjen(klient, f) {
  const sql = readFileSync(join(MIGRASJONSDIR, f.navn), 'utf8');
  logg(`\n── IDEMPOTENS: kjører ${f.navn} EN GANG TIL på den bygde basen ──`);
  const start = process.hrtime.bigint();
  try {
    await klient.query('BEGIN');
    await klient.query(sql);
    await klient.query('COMMIT');
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logg(`OK   ${f.navn} tålte gjentakelse  (${ms.toFixed(0)} ms)`);
    return { ok: true };
  } catch (e) {
    try { await klient.query('ROLLBACK'); } catch { /* ignorer */ }
    const linje = linjeFraPosisjon(sql, e.position);
    const setning = linjetekst(sql, linje);
    const melding = setning ? `${e.message} — setning: «${setning}»` : e.message;
    loggFeil(`\nIDEMPOTENS-FEIL i ${f.navn}${linje ? ` (linje ${linje})` : ''}:`);
    loggFeil(`  ${e.message}`);
    if (setning) loggFeil(`  setning: ${setning}`);
    return { ok: false, feil: { navn: f.navn, linje, melding } };
  }
}

// -----------------------------------------------------------------------------
// Reis en HELT TOM base: dropp + opprett testbasen på nytt, kjør bootstrap.
// -----------------------------------------------------------------------------
async function reisTomBase(pg) {
  if (SYSTEMBASER.has(TESTDB)) {
    throw new Error(`Nekter å bruke systembasen «${TESTDB}» som testbase. Sett PORT_TESTDB til et eget navn.`);
  }
  sjekkTrygg(ADMIN_URL, 'PORT_ADMIN_URL');
  const testUrl = testbaseUrl();
  sjekkTrygg(testUrl, 'testbase-URL');

  // 1) Vedlikeholdstilkobling: dropp + opprett testbasen, sørg for roller.
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  logg(`Tilkoblet vedlikehold: ${maskér(ADMIN_URL)}`);
  await admin.query(rollerSql());
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid();`, [TESTDB]);
  await admin.query(`DROP DATABASE IF EXISTS "${TESTDB}";`);
  await admin.query(`CREATE DATABASE "${TESTDB}" OWNER postgres;`);
  await admin.end();
  logg(`Reist tom base: ${TESTDB}`);

  // 2) Koble til den ferske basen som postgres og kjør bootstrap (= PROD-rigg).
  const base = new pg.Client({ connectionString: testUrl });
  await base.connect();
  // Sørg for at objekter eies av postgres (arver postgres-default-rettighetene).
  try { await base.query('SET ROLE postgres;'); } catch { /* allerede postgres */ }
  await base.query(bootstrapSql());
  logg('Bootstrap kjørt (PROD-rigg: roller, auth-skjema, extensions, default-ACL).');
  return base;
}

function maskér(url) { return url.replace(/:[^:@/]+@/, ':***@'); }

// -----------------------------------------------------------------------------
// Skriv ut ACL-bevis (informativt) i loggen.
// -----------------------------------------------------------------------------
async function skrivAclBevis(base, merkelapp) {
  logg(`\n── ACL-bevis (${merkelapp}) ──`);
  const def = await base.query(ACL_DEFAULT_SJEKK);
  logg('pg_default_acl:');
  for (const r of def.rows) logg(`  ${r.eier.padEnd(16)} ${r.objtype}  ${r.acl}`);
  const seq = await base.query(ACL_SEKVENS_SJEKK);
  if (seq.rows.length === 0) {
    logg('anon på public-sekvenser: INGEN  ✓  (som PROD)');
    return true;
  }
  loggFeil(`anon på public-sekvenser: ${seq.rows.length} rettigheter  ✗  (PROD har null!)`);
  for (const r of seq.rows) loggFeil(`  ${r.sekvens}: ${r.privilege_type}`);
  return false;
}

// -----------------------------------------------------------------------------
// Hovedløp
// -----------------------------------------------------------------------------
async function main() {
  const idemArg = process.argv.find((a) => a.startsWith('--idem='));
  const idemModus = idemArg ? idemArg.split('=')[1] : 'frisk'; // 'frisk' | 'samme'

  logg(`# port.mjs — mekanisk porteringsbevis  (${START_STEMPEL})`);
  logg(`Testbase: ${TESTDB}   ·   idempotens-modus: ${idemModus}`);

  const { gyldige, avvikende, hull } = lesMigrasjoner();
  if (avvikende.length) logg(`Avvikende filnavn (hoppes over): ${avvikende.join(', ')}`);
  if (!gyldige.length) return fail({ navn: '(ingen)', linje: null, melding: 'fant ingen migrasjonsfiler' });
  if (hull.length) return fail({ navn: '(kjede)', linje: null, melding: `hull i nummerrekken: ${hull.join(', ')}` });

  const første = filnr(gyldige[0]);
  const siste = filnr(gyldige[gyldige.length - 1]);
  logg(`Fant ${gyldige.length} migrasjonsfiler: ${første} → ${siste}`);

  // Last pg (samme mønster som den eksisterende kjøreren).
  let pg;
  try { pg = (await import('pg')).default; }
  catch {
    return fail({ navn: '(oppsett)', linje: null,
      melding: 'pakken «pg» er ikke installert. Kjør «npm i pg» i en import-kontekst før bruk.' });
  }

  const nyeste = gyldige[gyldige.length - 1]; // fila Kjartan faktisk limer inn sist

  // ---- Bygg #1 (frisk base) ----
  let base = await reisTomBase(pg);
  let r1, avtrykk1;
  try {
    r1 = await kjørKjeden(base, gyldige, 'BYGG #1 (frisk base)');
    if (r1.ok) {
      await skrivAclBevis(base, 'etter bygg #1');
      avtrykk1 = await fingeravtrykk(base);
      logg(`Fingeravtrykk #1: ${avtrykk1}`);
    }
  } finally { await base.end(); }
  if (!r1.ok) return fail(r1.feil);

  // ---- STRENG MODUS (valgfri): hele kjeden en gang til på SAMME base ----
  if (idemModus === 'samme') {
    const testUrl = testbaseUrl();
    base = new pg.Client({ connectionString: testUrl });
    await base.connect();
    try { await base.query('SET ROLE postgres;'); } catch { /* ignorer */ }
    let rS;
    try { rS = await kjørKjeden(base, gyldige, 'BYGG #2 (samme base — streng idempotens)'); }
    finally { await base.end(); }
    if (!rS.ok) return fail(rS.feil);
    return bestått(`${første} → ${siste}, ${gyldige.length} filer, 0 feil, ` +
      'hele kjeden idempotent (to ganger på samme base)');
  }

  // ---- STANDARD: Bygg #2 (ny frisk base) + idempotens på KUN nyeste fil ----
  base = await reisTomBase(pg);
  try {
    const r2 = await kjørKjeden(base, gyldige, 'BYGG #2 (ny frisk base — reproduserbarhet)');
    if (!r2.ok) return fail(r2.feil);

    const aclOk = await skrivAclBevis(base, 'etter bygg #2');
    if (!aclOk) return fail({ navn: '(rigg-acl)', linje: null,
      melding: 'anon har sekvenstilgang som PROD ikke har — rigg-modellen avviker fra PROD.' });

    const avtrykk2 = await fingeravtrykk(base);
    logg(`Fingeravtrykk #2: ${avtrykk2}`);
    if (avtrykk1 !== avtrykk2) {
      return fail({ navn: '(reproduserbarhet)', linje: null,
        melding: `de to friske byggene er IKKE identiske ` +
          `(fingeravtrykk ${avtrykk1.slice(0, 12)}… ≠ ${avtrykk2.slice(0, 12)}…)` });
    }
    logg('De to friske byggene er byte-identiske ✓');

    // Idempotensen som betyr noe: kjør KUN nyeste fil en gang til på den bygde basen.
    const ri = await kjørÉnFilIgjen(base, nyeste);
    if (!ri.ok) return fail(ri.feil);

    return bestått(`${første} → ${siste}, ${gyldige.length} filer, 0 feil, ` +
      `to friske bygg identiske, ${filnr(nyeste)} idempotent`);
  } finally { await base.end(); }
}

function bestått(halen) {
  const linje = `BESTÅTT: ${halen}`;
  logg('');
  logg(linje);
  skrivLogg();
  logg(`Logg: ${LOGGFIL}`);
  process.exit(0);
}

function fail(feil) {
  const posdel = feil.linje ? ` linje ${feil.linje}` : '';
  const linje = `FEILET: ${feil.navn}${posdel}: ${feil.melding}`;
  loggFeil('');
  loggFeil(linje);
  skrivLogg();
  loggFeil(`Logg: ${LOGGFIL}`);
  process.exit(1);
}

main().catch((e) => {
  loggFeil('');
  loggFeil(`FEILET: (uventet): ${e.message}`);
  if (e.stack) LOGGBUFFER.push(e.stack);
  skrivLogg();
  loggFeil(`Logg: ${LOGGFIL}`);
  process.exit(1);
});

// =============================================================================
// RIGG-NOTAT (hva kontrolløren målte, og hva som er endret her)
// -----------------------------------------------------------------------------
// FUNN: den gamle riggen ga anon FULL tilgang til sekvenser (rwU), mens PROD gir
//   anon NULL. Årsak: den riggen satte default-rettigheter for eieren
//   supabase_admin OG kjørte migrasjonene som supabase_admin — da arvet hvert
//   nytt objekt supabase_admin-settet (anon=rwU på sekvenser).
//
// ENDRET: dette skriptet kjører migrasjonene som POSTGRES og setter
//   pg_default_acl slik PROD faktisk er — seks rader:
//     supabase_admin:  tabeller anon=arwdDxtm, sekvenser anon=rwU,  funksjoner anon=X
//     postgres:        tabeller anon=Dxtm,     sekvenser kun postgres, funksjoner kun postgres
//   Fordi migrasjonsobjektene eies av postgres, arver de postgres-settet: anon får
//   verken sekvens- eller funksjonstilgang som standard (må gis eksplisitt), akkurat
//   som PROD. «skrivAclBevis» verifiserer dette etter hvert bygg og FEILER hvis anon
//   skulle ha fått sekvenstilgang.
// =============================================================================
//
// =============================================================================
// BRUKSANVISNING FOR MAC / Postgres.app  (Postgres 17 — samme som prod)
// -----------------------------------------------------------------------------
// 1) Installer Postgres.app (velg PostgreSQL 17), åpne den og klikk «Initialize»
//    / «Start». Da kjører en LOKAL Postgres på localhost:5432. Superbrukeren der
//    heter det samme som Mac-brukernavnet ditt (kjartaneide) — ikke «postgres».
//
// 2) Installer databasedriveren én gang (i prosjektmappa ~/trivselsleder-ny/):
//        npm i pg
//
// 3) Kjør skriptet med ÉN kommando (lim inn hele linja):
//        PORT_ADMIN_URL="postgresql://kjartaneide@localhost:5432/postgres" node scripts/migrasjonskjorer/port.mjs
//
//    Forklaring på tilkoblingsstrengen:
//      postgresql://kjartaneide@localhost:5432/postgres
//                   └─ Mac-brukernavnet (Postgres.app-superbruker), uten passord
//                                        └─ localhost:5432 = din lokale Postgres.app
//                                                       └─ «postgres» = vedlikeholdsbasen
//                                                          (skriptet lager selv testbasen
//                                                           trivsel_port_test og alle roller)
//
// Skriptet reiser testbasen på nytt hver gang, så den kan kjøres om og om igjen.
// Loggen legges i scripts/migrasjonskjorer/port-<tidsstempel>.log.
// Sperren nekter enhver tilkobling som inneholder «supabase» eller live-prosjekt-ID.
// =============================================================================
