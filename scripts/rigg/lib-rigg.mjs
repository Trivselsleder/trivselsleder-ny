// lib-rigg.mjs — felles rigg for prod-tro lokal skjemamal.
// =============================================================================
// Testverktøy, IKKE produktkode. Endrer ALDRI migrasjonsfiler.
//
// Gjenbruker den PROD-matchende bootstrappen fra scripts/migrasjonskjorer/port.mjs
// (roller som postgres-eier, auth-stub, extensions, pg_default_acl = prods
// postgres-sett). Se RIGG-NOTAT i port.mjs for hvorfor migrasjonene MÅ kjøres som
// postgres: da arver hvert objekt postgres-settet (anon får ikke sekvens-/
// funksjonstilgang som standard), akkurat som prod.
//
// FORSKJELL fra port.mjs: port.mjs reiser en flyktig base (droppes hver gang) og
// stopper ved første feil. Denne modulen brukes til å bygge NAVNGITTE, persistente
// baser (trivsel_prodmal_116/118) og støtter per-fil forbered/rydd-hekter slik at
// dataspesifikke sperrer slippes gjennom uten å endre migrasjonsfila.
// =============================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROSJEKTROT = resolve(__dirname, '..', '..');
export const MIGRASJONSDIR = join(PROSJEKTROT, 'supabase', 'migrations');

// Hard sperre — samme som port.mjs.
const LIVE_PROSJEKT_ID = 'zpirjbrcbeubwpmtncxx';
const FORBUDTE_BITER = ['supabase', LIVE_PROSJEKT_ID];
const LOKALE_VERTER = new Set(['localhost', '127.0.0.1', '::1', '']);
const SYSTEMBASER = new Set(['postgres', 'template0', 'template1']);

export const ADMIN_URL =
  process.env.PORT_ADMIN_URL || 'postgresql://postgres@localhost:5432/postgres';

export function sjekkTrygg(url, navn) {
  const lav = url.toLowerCase();
  for (const bit of FORBUDTE_BITER) {
    if (lav.includes(bit)) {
      throw new Error(`SPERRE UTLØST (${navn}): tilkoblingen inneholder «${bit}». Avbryter.`);
    }
  }
  let host = '';
  try { host = new URL(url).hostname; } catch { /* tom → lokal */ }
  if (!LOKALE_VERTER.has(host) && process.env.PORT_TILLAT_IKKE_LOKAL !== '1') {
    throw new Error(`SPERRE UTLØST (${navn}): verten «${host}» er ikke lokal.`);
  }
}

export function baseUrl(navn) {
  const u = new URL(ADMIN_URL);
  u.pathname = '/' + navn;
  return u.toString();
}

// -----------------------------------------------------------------------------
// Migrasjonssortering: identisk med port.mjs / migrasjonskjorer.mjs.
// nummer først, tomt suffiks FØR bokstav: 091 < 091B < 092.
// -----------------------------------------------------------------------------
export function lesMigrasjoner(maksNr = Infinity) {
  const alle = readdirSync(MIGRASJONSDIR);
  const sqlFiler = alle.filter((f) => f.toLowerCase().endsWith('.sql'));
  const gyldige = [];
  const avvikende = [];
  const mønster = /^(\d{3})([A-Za-z]?)_.+\.sql$/;
  for (const navn of sqlFiler) {
    const m = navn.match(mønster);
    if (!m) { avvikende.push(navn); continue; }
    const nr = parseInt(m[1], 10);
    if (nr > maksNr) continue;
    gyldige.push({ nr, suffiks: m[2].toUpperCase(), navn });
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

export function filnr(f) { return String(f.nr).padStart(3, '0') + f.suffiks; }

export function rollerSql() {
  return `
DO $$
BEGIN
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

export function bootstrapSql(dbnavn) {
  return `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
ALTER DATABASE "${dbnavn}" SET search_path TO "$user", public, extensions;
SET search_path TO "$user", public, extensions;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text
);
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

-- ── STORAGE-STILLAS (Supabase-forvaltet skjema, ikke i migrasjonene) ─────────
-- 109 lager policyer på storage.objects og gjør ALTER POLICY på de tre dashboard-
-- satte «pakkebilder»-skrivepolicyene; 114 (skjemadel utdras, men fullkjøring
-- forutsetter det) leser storage.objects. Riggen leverer derfor det minimum av
-- Supabase-storage som trengs for at 109 kjører uendret. Disse stub-policyene og
-- selve storage.objects EKSKLUDERES fra fingeravtrykket (kun «Redaksjon*» telles).
CREATE SCHEMA IF NOT EXISTS storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  path_tokens text[],
  version text,
  owner_id text
);
-- storage.foldername: Supabase-funksjonen 109-policyene kaller — trengs bare for at
-- policy-uttrykket kompilerer. Returnerer mappedelen (uten filnavnet).
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
  LANGUAGE sql IMMUTABLE AS $fn$
    SELECT (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
  $fn$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- Dashboard-satte «pakkebilder»-policyer (målt i prod «to anon,authenticated» FØR
-- 109). Stubbet slik at 109s ALTER POLICY treffer noe. qual/with_check er IKKE
-- prods reelle uttrykk — derfor holdes de UTENFOR fingeravtrykket (kun Redaksjon*).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Last opp pakkebilder') THEN
    CREATE POLICY "Last opp pakkebilder" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'pakkebilder');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Oppdater pakkebilder') THEN
    CREATE POLICY "Oppdater pakkebilder" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'pakkebilder');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Slett pakkebilder') THEN
    CREATE POLICY "Slett pakkebilder" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'pakkebilder');
  END IF;
END $$;

-- pg_default_acl = prods postgres-sett (målt 4. sep). Se port.mjs RIGG-NOTAT.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, SELECT, UPDATE, DELETE ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres;
`;
}

export function maskér(url) { return url.replace(/:[^:@/]+@/, ':***@'); }

// Reis en tom, NAVNGITT base og kjør bootstrap. Returnerer en tilkoblet klient.
export async function reisBase(pg, dbnavn) {
  if (SYSTEMBASER.has(dbnavn)) throw new Error(`Nekter systembasen «${dbnavn}».`);
  sjekkTrygg(ADMIN_URL, 'PORT_ADMIN_URL');
  const url = baseUrl(dbnavn);
  sjekkTrygg(url, 'base-URL');

  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(rollerSql());
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid();`, [dbnavn]);
  await admin.query(`DROP DATABASE IF EXISTS "${dbnavn}";`);
  await admin.query(`CREATE DATABASE "${dbnavn}" OWNER postgres;`);
  await admin.end();

  const base = new pg.Client({ connectionString: url });
  await base.connect();
  try { await base.query('SET ROLE postgres;'); } catch { /* allerede postgres */ }
  await base.query(bootstrapSql(dbnavn));
  return base;
}

export function linjeFraPosisjon(sql, position) {
  if (position == null) return null;
  const idx = Number(position) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx > sql.length) return null;
  return sql.slice(0, idx).split('\n').length;
}

export function sha256(tekst) {
  return createHash('sha256').update(tekst || '').digest('hex');
}
