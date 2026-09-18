-- Lokal test for migrasjon 139 (F5: skolebinding på egen-leddet i tl_hjul/periodeplan).
-- Kjøres mot en base der 001–138 er kjørt, med auth-stubben (stub_auth.sql): rollen
-- «authenticated» og auth.uid() = current_setting('request.jwt.claim.sub'). ALDRI prod.
--
-- Simulerer en vanlig bruker (rolle 'skoleansatt' → verken intern eller skoleadmin) som er
-- MEDLEM på skole B, men ikke A. Negativ: insert av rad med skole_id=A avvises. Positiv:
-- insert med skole_id=B tillates. Dekker begge tabeller (tl_hjul + periodeplan).
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FIXTUR (committes; opprettes som eier/postgres FØR rollebytte)
-- ============================================================================
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1')
  on conflict (id) do nothing;
insert into public.profiles (id, navn, rolle, epost, aktiv)
  values ('00000000-0000-0000-0000-0000000000b1', 'Test Bruker B', 'skoleansatt', 'b@test139.no', true)
  on conflict (id) do update set rolle=excluded.rolle;
insert into public.skoler (id, navn, org_nr, status)
  values ('00000000-0000-0000-0000-00000000a001', 'TEST139 Skole A', 'TEST139-A', 'Aktiv')
  on conflict (id) do nothing;
insert into public.skoler (id, navn, org_nr, status)
  values ('00000000-0000-0000-0000-00000000b001', 'TEST139 Skole B', 'TEST139-B', 'Aktiv')
  on conflict (id) do nothing;
-- Brukeren er aktiv medlem KUN på skole B.
insert into public.bruker_skole (bruker_id, skole_id, rolle, aktiv)
  values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000b001', 'skoleansatt', true);
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/139_f5_hjul_periodeplan_skolebinding.sql

-- ============================================================================
-- ASSERTIONS (som authenticated, med brukerens uid i jwt-claim)
-- ============================================================================
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);

\echo '===== T1 (positiv): insert på egen skole B tillates (tl_hjul + periodeplan) ====='
do $$
begin
  insert into public.tl_hjul   (skole_id, navn) values ('00000000-0000-0000-0000-00000000b001', 'T139 hjul B');
  insert into public.periodeplan (skole_id, navn) values ('00000000-0000-0000-0000-00000000b001', 'T139 plan B');
  raise notice 'T1 OK: begge insert på egen skole gikk gjennom.';
end $$;

\echo '===== T2 (negativ): insert på fremmed skole A avvises av RLS (tl_hjul) ====='
do $$
declare v_avvist boolean := false;
begin
  begin
    insert into public.tl_hjul (skole_id, navn) values ('00000000-0000-0000-0000-00000000a001', 'T139 hjul A');
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'T2 FEILET: insert av tl_hjul på fremmed skole A ble tillatt.'; end if;
  raise notice 'T2 OK: tl_hjul på fremmed skole avvist.';
end $$;

\echo '===== T3 (negativ): insert på fremmed skole A avvises av RLS (periodeplan) ====='
do $$
declare v_avvist boolean := false;
begin
  begin
    insert into public.periodeplan (skole_id, navn) values ('00000000-0000-0000-0000-00000000a001', 'T139 plan A');
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'T3 FEILET: insert av periodeplan på fremmed skole A ble tillatt.'; end if;
  raise notice 'T3 OK: periodeplan på fremmed skole avvist.';
end $$;

-- Forkast test-radene (positiv-insertene) og rollebyttet.
rollback;

-- ============================================================================
-- OPPRYDDING (fixturene)
-- ============================================================================
delete from public.bruker_skole where bruker_id = '00000000-0000-0000-0000-0000000000b1';
delete from public.skoler   where org_nr in ('TEST139-A','TEST139-B');
delete from public.profiles where id = '00000000-0000-0000-0000-0000000000b1';
delete from auth.users      where id = '00000000-0000-0000-0000-0000000000b1';
\echo '===== ALLE 139-TESTER BESTÅTT ====='
