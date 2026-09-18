-- Lokal test for migrasjon 144 (rydd rettigheter: TRUNCATE/TRIGGER/REFERENCES/MAINTAIN +
--   anon-skriv på skoler/kurs_skole_mottaker). Kjøres mot en base der 001–143 er bygd
--   (scripts/rigg/tmp/bygg-143.mjs). ALDRI prod.
--
-- Kjerne-assertions:
--   FØR (bevis hullet):  authenticated KAN `truncate profiles cascade`  → skal LYKKES.
--   ETTER (144 kjørt):
--     N1: authenticated `truncate profiles cascade`  → skal NEKTES (insufficient_privilege).
--     N2: anon `truncate skoler`                       → skal NEKTES.
--     N3: anon INSERT/UPDATE/DELETE på skoler          → borte (has_table_privilege = false).
--     N4: anon UPDATE på kurs_skole_mottaker           → borte.
--     P1: anon leser kurs/haller/skoler                → skal VIRKE (offentlige sider).
--     P2: authenticated beholder S/I/U/D på favoritter + periodeplan (vanlig innlogget bruker).
--     P3: service_role uberørt (beholder TRUNCATE).
--     IDEM: 144 kjørt en gang til → «hopper over», fortsatt PASS.
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FØR — bevis at hullet finnes: authenticated kan tømme profiles (rulles tilbake).
-- ============================================================================
\echo '===== FØR: authenticated truncate profiles cascade (skal LYKKES = hullet finnes) ====='
begin;
set role authenticated;
truncate public.profiles cascade;   -- ON_ERROR_STOP: en feil her ville stoppet skriptet
reset role;
rollback;                            -- angre tømmingen — vi vil bare bevise at den var mulig
\echo 'FØR bekreftet: authenticated FIKK TRUNCATE profiles (hullet er reelt).'

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/144_ryddig_rettigheter_truncate_skoler.sql

-- ============================================================================
-- ETTER — negative tester (skal NEKTES)
-- ============================================================================
\echo '===== N1: authenticated truncate profiles cascade (skal NEKTES) ====='
do $$
begin
  set role authenticated;
  begin
    truncate public.profiles cascade;
    reset role;
    raise exception 'N1 FEILET: authenticated fikk fortsatt TRUNCATE på profiles etter 144.';
  exception when insufficient_privilege then
    reset role;
    raise notice 'N1 OK: authenticated ble NEKTET TRUNCATE profiles.';
  end;
end $$;

\echo '===== N2: anon truncate skoler (skal NEKTES) ====='
do $$
begin
  set role anon;
  begin
    truncate public.skoler cascade;
    reset role;
    raise exception 'N2 FEILET: anon fikk fortsatt TRUNCATE på skoler etter 144.';
  exception when insufficient_privilege then
    reset role;
    raise notice 'N2 OK: anon ble NEKTET TRUNCATE skoler.';
  end;
end $$;

\echo '===== N3/N4: anon mistet skriv på skoler + kurs_skole_mottaker ====='
do $$
begin
  if has_table_privilege('anon','public.skoler','INSERT')
     or has_table_privilege('anon','public.skoler','UPDATE')
     or has_table_privilege('anon','public.skoler','DELETE') then
    raise exception 'N3 FEILET: anon har fortsatt INSERT/UPDATE/DELETE på skoler.';
  end if;
  if has_table_privilege('anon','public.kurs_skole_mottaker','UPDATE') then
    raise exception 'N4 FEILET: anon har fortsatt UPDATE på kurs_skole_mottaker.';
  end if;
  raise notice 'N3/N4 OK: anon uten skriv på skoler og uten UPDATE på kurs_skole_mottaker.';
end $$;

-- ============================================================================
-- ETTER — positive tester (skal VIRKE)
-- ============================================================================
\echo '===== P1a: anon beholder SELECT-grant på alle 9 offentlige tabeller (144 rørte ikke SELECT) ====='
do $$
declare t text;
  tabeller text[] := array['bruker_skole','haller','kulturkort_partnere','kurs','kurs_skole',
                           'kurs_skole_mottaker','kursholdere','skoler','tl_hjul_kategori'];
begin
  foreach t in array tabeller loop
    if not has_table_privilege('anon', 'public.'||t, 'SELECT') then
      raise exception 'P1a FEILET: anon mistet SELECT på %.', t;
    end if;
  end loop;
  raise notice 'P1a OK: anon beholder SELECT på alle 9 offentlige tabeller.';
end $$;

-- P1b: live-lesning som anon på tabeller hvis RLS-policy IKKE leser profiles direkte
-- (kurs/haller bruker get_min_rolle() = SECURITY DEFINER → trygg for anon). skoler
-- utelates bevisst her: dens policy «Superadmin administrerer skoler» (definert i
-- 001/019, ALDRI rørt av 144) leser profiles direkte, så en direkte anon-select på
-- skoler treffer profiles uansett — ingen logget-ut kodevei gjør det (offentlige
-- sider leser skoler via SECURITY DEFINER-RPC). Uendret av 144.
\echo '===== P1b: anon live-leser kurs + haller (skal VIRKE) ====='
do $$
declare n1 int; n2 int;
begin
  set role anon;
  select count(*) into n1 from public.kurs;
  select count(*) into n2 from public.haller;
  reset role;
  raise notice 'P1b OK: anon leste kurs(%)/haller(%) uten feil.', n1, n2;
exception when insufficient_privilege then
  reset role;
  raise exception 'P1b FEILET: anon ble nektet SELECT på kurs/haller (%).', sqlerrm;
end $$;

\echo '===== P2: authenticated beholder S/I/U/D på favoritter + periodeplan ====='
do $$
begin
  if not (has_table_privilege('authenticated','public.favoritter','SELECT')
      and has_table_privilege('authenticated','public.favoritter','INSERT')
      and has_table_privilege('authenticated','public.favoritter','UPDATE')
      and has_table_privilege('authenticated','public.favoritter','DELETE')) then
    raise exception 'P2 FEILET: authenticated mistet S/I/U/D på favoritter.';
  end if;
  if not (has_table_privilege('authenticated','public.periodeplan','SELECT')
      and has_table_privilege('authenticated','public.periodeplan','INSERT')
      and has_table_privilege('authenticated','public.periodeplan','UPDATE')
      and has_table_privilege('authenticated','public.periodeplan','DELETE')) then
    raise exception 'P2 FEILET: authenticated mistet S/I/U/D på periodeplan.';
  end if;
  raise notice 'P2 OK: authenticated beholder favoritter + periodeplan (favoritt/periodeplan-flyten virker).';
end $$;

\echo '===== P3: service_role uberørt (beholder TRUNCATE på minst én tabell) ====='
do $$
declare n int;
begin
  select count(*) into n from pg_class c join pg_namespace nn on nn.oid=c.relnamespace
   where nn.nspname='public' and c.relkind in ('r','p')
     and has_table_privilege('service_role', c.oid, 'TRUNCATE');
  if n = 0 then raise exception 'P3 FEILET: service_role mistet TRUNCATE på alt.'; end if;
  raise notice 'P3 OK: service_role beholder TRUNCATE på % tabell(er).', n;
end $$;

-- ============================================================================
-- IDEMPOTENS — 144 kjørt en gang til skal hoppe over og fortsatt gi PASS.
-- ============================================================================
\echo '===== IDEM: 144 kjørt to ganger (skal si «hopper over») ====='
\i supabase/migrations/144_ryddig_rettigheter_truncate_skoler.sql

\echo ''
\echo '===== ALLE 144-TESTER BESTÅTT ====='
