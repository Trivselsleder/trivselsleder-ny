-- Lokal test for migrasjon 140 (F6: skriv til bucket «pakkebilder» krever ansatt/superadmin).
-- Kjøres mot en base der 001–139 er kjørt, med auth-stubben (stub_auth.sql). ALDRI prod.
--
-- MERK OM DEKNING: storage.objects er en Supabase-forvaltet tabell som IKKE finnes i den
-- rene public-skjema-testbasen (og et ekte insert ville krevd bøtte-rad + triggere). Testen
-- dekker derfor gaten i TO ledd, som til sammen viser den effektive kontrollen:
--   (T1) policy-DEFINISJONENE: de tre skrive-policyene krever get_min_rolle in (ansatt,superadmin),
--        og les-policyen er urørt (avlest fra pg_policies etter migrasjonen).
--   (T2/T3) rolle-GATEN: get_min_rolle() = any(array['ansatt','superadmin']) er SANN for en ansatt
--        og USANN for en skoleansatt — nøyaktig predikatet policyene bruker.
-- Kjøres storage.objects å finnes i basen, kan et ekte insert-forsøk legges til senere.
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FIXTUR
-- ============================================================================
begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000a0f40'),  -- ansatt
  ('00000000-0000-0000-0000-0000005a0f40')   -- skoleansatt
  on conflict (id) do nothing;
insert into public.profiles (id, navn, rolle, epost, aktiv) values
  ('00000000-0000-0000-0000-0000000a0f40', 'Test Ansatt 140', 'ansatt', 'ansatt@test140.no', true),
  ('00000000-0000-0000-0000-0000005a0f40', 'Test Skoleansatt 140', 'skoleansatt', 'sa@test140.no', true)
  on conflict (id) do update set rolle=excluded.rolle;
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/140_f6_pakkebilder_storage.sql

-- ============================================================================
-- T1: policy-definisjonene (kjører kun hvis storage.objects finnes i basen)
-- ============================================================================
\echo '===== T1: skrive-policyene krever ansatt/superadmin; les-policyen urørt ====='
do $$
declare v_skriv int; v_les int;
begin
  if to_regclass('storage.objects') is null then
    raise notice 'T1 HOPPET OVER: storage.objects finnes ikke i denne basen (migr-egen sperre dekket definisjonene ved kjøring).';
    return;
  end if;
  select count(*) into v_skriv from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname in ('Last opp pakkebilder','Oppdater pakkebilder','Slett pakkebilder')
     and coalesce(with_check, qual) like '%get_min_rolle%';
  if v_skriv <> 3 then raise exception 'T1 FEILET: % av 3 skrive-policyer har rollegaten.', v_skriv; end if;
  select count(*) into v_les from pg_policies
   where schemaname='storage' and tablename='objects' and policyname='Les pakkebilder'
     and cmd='SELECT' and coalesce(with_check, qual) not like '%get_min_rolle%';
  if v_les <> 1 then raise exception 'T1 FEILET: les-policyen mangler eller ble endret.'; end if;
  raise notice 'T1 OK: 3 skrive-policyer gated, les-policy urørt.';
end $$;

-- ============================================================================
-- T2/T3: rolle-gaten (predikatet policyene bruker), som authenticated
-- ============================================================================
\echo '===== T2 (positiv): en ansatt passerer rollegaten ====='
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000a0f40', true);
do $$
begin
  if not (public.get_min_rolle() = any (array['ansatt','superadmin'])) then
    raise exception 'T2 FEILET: ansatt passerer ikke rollegaten (get_min_rolle=%).', public.get_min_rolle();
  end if;
  raise notice 'T2 OK: ansatt passerer.';
end $$;
rollback;

\echo '===== T3 (negativ): en skoleansatt passerer IKKE rollegaten ====='
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000005a0f40', true);
do $$
begin
  if (public.get_min_rolle() = any (array['ansatt','superadmin'])) then
    raise exception 'T3 FEILET: skoleansatt passerte rollegaten (skulle vært blokkert).';
  end if;
  raise notice 'T3 OK: skoleansatt blokkert.';
end $$;
rollback;

-- ============================================================================
-- OPPRYDDING
-- ============================================================================
delete from public.profiles where id in (
  '00000000-0000-0000-0000-0000000a0f40','00000000-0000-0000-0000-0000005a0f40');
delete from auth.users where id in (
  '00000000-0000-0000-0000-0000000a0f40','00000000-0000-0000-0000-0000005a0f40');
\echo '===== ALLE 140-TESTER BESTÅTT ====='
