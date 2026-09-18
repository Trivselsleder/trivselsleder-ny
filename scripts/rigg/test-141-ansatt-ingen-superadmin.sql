-- Lokal test for migrasjon 141 (F7: ansatt kan ikke eskalere til superadmin).
-- Kjøres mot en base der 001–140 er kjørt, med auth-stubben (stub_auth.sql). ALDRI prod.
--
-- Simulerer en ANSATT (profiles.rolle='ansatt') som via profiles-policyen prøver å (a) opprette
-- en superadmin, (b) endre en eksisterende superadmin-rad, og (c) forfremme en skoleadmin til
-- superadmin — alt skal blokkeres. Positiv: ansatt kan opprette/endre en skoleadmin-profil.
-- Profiles-grantene finnes ikke i migrasjonene (settes av Supabase), så vi GRANTer dem eksplisitt
-- i fixturen — da er RLS det ENESTE som avgjør (ikke manglende tabell-privilegium).
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FIXTUR (som eier/postgres, committes)
-- ============================================================================
begin;
grant select, insert, update, delete on public.profiles to authenticated;
-- auth.users-rader for alle id-er vi rører (så FK ikke skygger for RLS-avvisningen).
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000a0f01'),  -- ansatt (den som handler)
  ('00000000-0000-0000-0000-000000050f01'),  -- eksisterende superadmin (mål for endring)
  ('00000000-0000-0000-0000-00000000ad01'),  -- ny skoleadmin (positiv)
  ('00000000-0000-0000-0000-000000005f01')  -- forsøk på ny superadmin (negativ)
  on conflict (id) do nothing;
insert into public.profiles (id, navn, rolle, epost, aktiv) values
  ('00000000-0000-0000-0000-0000000a0f01', 'Test Ansatt', 'ansatt', 'ansatt@test141.no', true),
  ('00000000-0000-0000-0000-000000050f01', 'Test Super', 'superadmin', 'super@test141.no', true)
  on conflict (id) do update set rolle=excluded.rolle;
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/141_f7_ansatt_ingen_superadmin.sql

-- ============================================================================
-- ASSERTIONS (som authenticated, med ansattens uid i jwt-claim)
-- ============================================================================
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000a0f01', true);

\echo '===== T1 (positiv): ansatt kan opprette en skoleadmin-profil ====='
do $$
begin
  insert into public.profiles (id, navn, rolle, epost, aktiv)
    values ('00000000-0000-0000-0000-00000000ad01', 'Ny Skoleadmin', 'skoleadmin', 'nyadmin@test141.no', true);
  raise notice 'T1 OK: skoleadmin-profil opprettet av ansatt.';
end $$;

\echo '===== T2 (negativ): ansatt kan IKKE opprette en superadmin ====='
do $$
declare v_avvist boolean := false;
begin
  begin
    insert into public.profiles (id, navn, rolle, epost, aktiv)
      values ('00000000-0000-0000-0000-000000005f01', 'Smug Super', 'superadmin', 'smug@test141.no', true);
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'T2 FEILET: ansatt fikk opprette en superadmin-profil.'; end if;
  raise notice 'T2 OK: superadmin-opprettelse avvist.';
end $$;

\echo '===== T3 (negativ): ansatt kan IKKE forfremme en skoleadmin til superadmin ====='
do $$
declare v_avvist boolean := false;
begin
  begin
    update public.profiles set rolle='superadmin' where id='00000000-0000-0000-0000-00000000ad01';
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'T3 FEILET: ansatt fikk forfremme til superadmin.'; end if;
  raise notice 'T3 OK: forfremmelse avvist.';
end $$;

\echo '===== T4 (negativ): ansatt ser ikke / endrer ikke en superadmin-rad (0 rader truffet) ====='
do $$
declare v_n int;
begin
  update public.profiles set navn='Endret av ansatt' where id='00000000-0000-0000-0000-000000050f01';
  get diagnostics v_n = row_count;
  if v_n <> 0 then raise exception 'T4 FEILET: ansatt endret % superadmin-rad(er) (forventet 0).', v_n; end if;
  raise notice 'T4 OK: superadmin-raden er usynlig for ansatt (0 rader).';
end $$;

rollback;

-- ============================================================================
-- OPPRYDDING
-- ============================================================================
delete from public.profiles where id in (
  '00000000-0000-0000-0000-0000000a0f01','00000000-0000-0000-0000-000000050f01');
delete from auth.users where id in (
  '00000000-0000-0000-0000-0000000a0f01','00000000-0000-0000-0000-000000050f01',
  '00000000-0000-0000-0000-00000000ad01','00000000-0000-0000-0000-000000005f01');
\echo '===== ALLE 141-TESTER BESTÅTT ====='
