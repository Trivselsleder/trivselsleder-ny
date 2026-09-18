-- Lokal test for migrasjon 138 (skolestatus: komma + «Nedlagt»).
-- Kjøres mot en base der 001–137 er kjørt (så den GAMLE skoler_status_check med
-- «Aktiv sagt opp» uten komma finnes). ALDRI prod/øvingskopi.
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FIXTUR (committes separat, så migrasjonens egen begin/commit ikke rører den):
-- én skole med den GAMLE komma-løse verdien «Aktiv sagt opp».
-- ============================================================================
begin;
insert into public.skoler (navn, org_nr, status)
values ('TEST138 Sagtopp skole', 'TEST138-001', 'Aktiv sagt opp');
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/138_skolestatus_komma_nedlagt.sql

-- ============================================================================
-- ASSERTIONS
-- ============================================================================
\echo '===== T1: «Aktiv sagt opp» ble migrert til «Aktiv, sagt opp» ====='
do $$
begin
  if not exists (select 1 from public.skoler where org_nr='TEST138-001' and status='Aktiv, sagt opp') then
    raise exception 'T1 FEILET: fixturen har ikke status «Aktiv, sagt opp».';
  end if;
  if exists (select 1 from public.skoler where status='Aktiv sagt opp') then
    raise exception 'T1 FEILET: en rad har fortsatt den komma-løse «Aktiv sagt opp».';
  end if;
  raise notice 'T1 OK.';
end $$;

\echo '===== T2 (positiv): «Nedlagt» er nå en lovlig verdi ====='
do $$
begin
  insert into public.skoler (navn, org_nr, status) values ('TEST138 Nedlagt', 'TEST138-002', 'Nedlagt');
  raise notice 'T2 OK: «Nedlagt» godtatt.';
end $$;

\echo '===== T3 (negativ): den gamle komma-løse «Aktiv sagt opp» avvises nå ====='
do $$
declare v_avvist boolean := false;
begin
  begin
    insert into public.skoler (navn, org_nr, status) values ('TEST138 Gammel', 'TEST138-003', 'Aktiv sagt opp');
  exception when check_violation then v_avvist := true;
  end;
  if not v_avvist then raise exception 'T3 FEILET: gammel «Aktiv sagt opp» (uten komma) ble tillatt.'; end if;
  raise notice 'T3 OK: gammel verdi avvist av ny CHECK.';
end $$;

-- ============================================================================
-- OPPRYDDING
-- ============================================================================
delete from public.skoler where org_nr in ('TEST138-001','TEST138-002','TEST138-003');
\echo '===== ALLE 138-TESTER BESTÅTT ====='
