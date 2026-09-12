-- ============================================================================
-- skjema-fingeravtrykk.sql — prod-tro SKJEMA-fingeravtrykk (testverktøy)
-- ============================================================================
-- KJØRES BÅDE LOKALT (psql mot trivsel_prodmal_116/118) OG I PROD (Supabase SQL-
-- editor). KUN SELECT — endrer ingenting. Gir ÉN resultatrad, én kolonne
-- «fingeravtrykk», med ett token «kategori=antall:md5» per kategori (sortert).
-- Lim resultatlinja inn i scripts/rigg/sammenlign-fingeravtrykk.mjs for å se
-- nøyaktig hvilken kategori som avviker; grav i den med skjema-detaljer.sql.
--
-- OMFANG: schema public (+ de migrasjonsstyrte «Redaksjon*»-policyene på
--   storage.objects, som 109 lager). Alt annet i storage/auth/extensions er
--   Supabase-/dashboard-forvaltet og speiles ikke — se EKSKLUDERINGER nederst.
--
-- KATEGORIER (md5 = md5 av linjer sortert + normalisert, antall = antall linjer):
--   kol    tabellkolonner: tabell.kolonne, eksakt type, nullable, default
--   con    constraints (pg_get_constraintdef)
--   idx    indekser (pg_get_indexdef)
--   rls    RLS på/av (relrowsecurity, relforcerowsecurity) per public-tabell
--   pol    policyer: schema.tabell, navn, cmd, roller, qual, with_check
--   trg    triggere (pg_get_triggerdef, ikke-interne)
--   fn     funksjoner: navn(signatur), security definer, proconfig, md5(def)
--   privT  has_table_privilege for anon/authenticated/service_role (8 rettigheter)
--   privS  has_sequence_privilege (SELECT/USAGE/UPDATE)
--   privF  has_function_privilege (EXECUTE)
--   defacl pg_default_acl for rolle postgres
--
-- NORMALISERING: all whitespace kollapses til ett mellomrom og trimmes, slik at
--   ulik innrykk/linjeskift i funksjons-/policy-tekst ikke gir falske avvik.
-- ============================================================================

-- FAST SØKESTI: pg_get_indexdef/constraintdef kvalifiserer operatorklasser (f.eks.
-- gin_trgm_ops fra extensions) ULIKT avhengig av søkestien. En template-klon arver
-- IKKE databasens ALTER DATABASE-søkesti, og prod kan ha en annen. Vi fester derfor
-- søkestien her, slik at rendringen er identisk lokalt og i prod. (SET gir ingen rad.)
set search_path = public, extensions, pg_catalog;

with
-- Public-tabeller (ordinære + partisjonerte), én gang.
pub_tab as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  where c.relnamespace = 'public'::regnamespace
    and c.relkind in ('r','p')
),
pub_seq as (
  select c.oid, c.relname
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
),
pub_fn as (
  select p.oid, p.proname
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prokind in ('f','p')            -- normal + procedure (ikke aggregat/vindu)
),
roller(r) as (values ('anon'),('authenticated'),('service_role')),
tab_priv(p) as (values
  ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
  ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')),
seq_priv(p) as (values ('SELECT'),('USAGE'),('UPDATE')),

-- === kol: kolonner (navn, eksakt type, nullable, default) ===================
kol as (
  select t.relname || '.' || a.attname
      || ' | ' || format_type(a.atttypid, a.atttypmod)
      || ' | ' || (case when a.attnotnull then 'NOT NULL' else 'NULL' end)
      || ' | ' || coalesce(btrim(regexp_replace(pg_get_expr(d.adbin, d.adrelid), '\s+', ' ', 'g')), '') as rad
  from pub_tab t
  join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
),
-- === con: constraints =======================================================
con as (
  select t.relname || ' | ' || c.conname || ' | ' || c.contype::text
      || ' | ' || btrim(regexp_replace(pg_get_constraintdef(c.oid), '\s+', ' ', 'g')) as rad
  from pg_constraint c
  join pub_tab t on t.oid = c.conrelid
),
-- === idx: indekser ==========================================================
idx as (
  select i.tablename || ' | ' || i.indexname
      || ' | ' || btrim(regexp_replace(i.indexdef, '\s+', ' ', 'g')) as rad
  from pg_indexes i
  where i.schemaname = 'public'
),
-- === rls: RLS på/av per tabell =============================================
rls as (
  select t.relname || ' | rls=' || t.relrowsecurity::text
      || ' | force=' || t.relforcerowsecurity::text as rad
  from pub_tab t
),
-- === pol: policyer (public + migrasjonsstyrte storage.objects) =============
pol as (
  select p.schemaname || '.' || p.tablename || ' | ' || p.policyname
      || ' | ' || p.cmd
      || ' | ' || coalesce(array_to_string(p.roles, ','), '')
      || ' | ' || coalesce(btrim(regexp_replace(p.qual, '\s+', ' ', 'g')), '')
      || ' | ' || coalesce(btrim(regexp_replace(p.with_check, '\s+', ' ', 'g')), '') as rad
  from pg_policies p
  where p.schemaname = 'public'
     or (p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname like 'Redaksjon%')
),
-- === trg: triggere (ikke-interne) på public-tabeller =======================
trg as (
  select t.relname || ' | ' || g.tgname
      || ' | ' || btrim(regexp_replace(pg_get_triggerdef(g.oid), '\s+', ' ', 'g')) as rad
  from pg_trigger g
  join pub_tab t on t.oid = g.tgrelid
  where not g.tgisinternal
),
-- === fn: funksjoner =========================================================
fn as (
  select f.proname || '(' || pg_get_function_identity_arguments(f.oid) || ')'
      || ' | secdef=' || p.prosecdef::text
      || ' | config=' || coalesce(array_to_string(p.proconfig, ','), '')
      || ' | ' || md5(btrim(regexp_replace(pg_get_functiondef(f.oid), '\s+', ' ', 'g'))) as rad
  from pub_fn f
  join pg_proc p on p.oid = f.oid
),
-- === privT: tabell-rettigheter for anon/authenticated/service_role ==========
privt as (
  select r.r || ' | ' || t.relname || ' | ' || tp.p
      || '=' || has_table_privilege(r.r, t.oid, tp.p)::text as rad
  from pub_tab t cross join roller r cross join tab_priv tp
),
-- === privS: sekvens-rettigheter =============================================
privs as (
  select r.r || ' | ' || s.relname || ' | ' || sp.p
      || '=' || has_sequence_privilege(r.r, s.oid, sp.p)::text as rad
  from pub_seq s cross join roller r cross join seq_priv sp
),
-- === privF: funksjons-EXECUTE ===============================================
privf as (
  select r.r || ' | ' || f.proname || '(' || pg_get_function_identity_arguments(f.oid) || ')'
      || ' | EXECUTE=' || has_function_privilege(r.r, f.oid, 'EXECUTE')::text as rad
  from pub_fn f cross join roller r
),
-- === defacl: pg_default_acl for postgres ====================================
defacl as (
  select da.defaclobjtype::text || ' | ' || coalesce(da.defaclacl::text, '') as rad
  from pg_default_acl da
  where pg_get_userbyid(da.defaclrole) = 'postgres'
),
-- === samle alle kategorier ==================================================
cats(kategori, antall, avtrykk) as (
  select 'kol',    count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from kol
  union all select 'con',    count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from con
  union all select 'idx',    count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from idx
  union all select 'rls',    count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from rls
  union all select 'pol',    count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from pol
  union all select 'trg',    count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from trg
  union all select 'fn',     count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from fn
  union all select 'privT',  count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from privt
  union all select 'privS',  count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from privs
  union all select 'privF',  count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from privf
  union all select 'defacl', count(*), md5(coalesce(string_agg(rad, E'\n' order by rad), '')) from defacl
)
select string_agg(kategori || '=' || antall || ':' || avtrykk, ' | ' order by kategori) as fingeravtrykk
from cats;

-- ============================================================================
-- EKSKLUDERINGER (bevisst utelatt — begrunnelse):
--  * Supabase-interne skjemaer (auth, storage utenom Redaksjon-policyene,
--    extensions, graphql, realtime, vault, pgbouncer, supabase_*): forvaltes av
--    Supabase, finnes ikke identisk lokalt. Ville alltid gitt «avvik».
--  * Sekvensverdier (last_value): data, endrer seg ved hver insert. Ikke skjema.
--  * OID-er: interne, ulike per bygg. Vi bruker navn/definisjonstekst i stedet.
--  * Eiere (relowner/proowner): lokalt alt = postgres; i Supabase kan enkelte
--    objekter eies av supabase_admin. Rettighetsbildet (privT/S/F, defacl) fanger
--    det som betyr noe for tilgang; eier-OID gir bare støy.
--  * «pakkebilder»-policyene på storage.objects: opprettet i Supabase-dashboardet,
--    finnes i INGEN migrasjon → kan ikke reproduseres fra repoet. Kjør denne i prod
--    for å inspisere dem manuelt:
--      select policyname, cmd, roles, qual, with_check from pg_policies
--      where schemaname='storage' and tablename='objects' order by policyname;
-- ============================================================================
