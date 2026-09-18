-- Lokal test for migrasjon 143 (F2: ingen kan gi SEG SELV superadmin).
-- Kjøres mot en base der 001–141 er kjørt, med auth-stubben. ALDRI prod.
--
-- Fixtur: én skoleansatt, én ansatt (TL AS) og én feide-bruker — de tre klassene
--   Fable beviste hullet for. Kjerne-assertions:
--   N (negativ): hver av dem prøver `update profiles set rolle='superadmin'` på EGEN
--       rad → skal AVVISES (permission denied, kolonnenivå — før RLS).
--   P (positiv): hver av dem oppdaterer `navn` på EGEN rad → skal fortsatt VIRKE.
--   S (positiv): service_role kan fortsatt sette rolle (superadmin-veien via
--       api/admin/sett-bruker-rolle.js går hit).
\set ON_ERROR_STOP on
\pset pager off

-- ans_uid = skoleansatt · emp_uid = ansatt (TL AS) · fei_uid = feide
\set ans_uid  '00000000-0000-0000-0000-0000000a4300'
\set emp_uid  '00000000-0000-0000-0000-0000000e4300'
\set fei_uid  '00000000-0000-0000-0000-0000000f4300'

-- ============================================================================
-- FIXTUR (som eier/postgres, committes)
-- ============================================================================
begin;
insert into auth.users (id) values (:'ans_uid'), (:'emp_uid'), (:'fei_uid') on conflict (id) do nothing;
insert into public.profiles (id, navn, rolle, epost, aktiv) values
  (:'ans_uid', 'Test Skoleansatt 143', 'skoleansatt', 'ans@test143.no', true),
  (:'emp_uid', 'Test Ansatt 143',      'ansatt',      'emp@test143.no', true),
  (:'fei_uid', 'Test Feide 143',       'feide',       'fei@test143.no', true)
  on conflict (id) do update set rolle=excluded.rolle, navn=excluded.navn;
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/143_f2_profiles_ingen_selv_superadmin.sql

-- ============================================================================
-- A — rettigheter: anon skal ikke ha TRUNCATE (né TRIGGER/REFERENCES) på profiles
-- ============================================================================
\echo '===== A (rettigheter): anon uten TRUNCATE på profiles ====='
do $$
begin
  if has_table_privilege('anon','public.profiles','TRUNCATE') then
    raise exception 'A FEILET: anon har fortsatt TRUNCATE på profiles.';
  end if;
  if has_table_privilege('anon','public.profiles','TRIGGER') then
    raise exception 'A FEILET: anon har fortsatt TRIGGER på profiles.';
  end if;
  raise notice 'A OK: anon mangler TRUNCATE og TRIGGER på profiles.';
end $$;

-- ============================================================================
-- N + P — som hver av de tre innloggede brukerne (authenticated)
-- ============================================================================
\echo '===== skoleansatt ====='
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'ans_uid', true);
do $$
declare v_avvist boolean := false; v_rad int;
begin
  begin
    update public.profiles set rolle='superadmin' where id='00000000-0000-0000-0000-0000000a4300';
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'N FEILET (skoleansatt): fikk sette rolle=superadmin på egen rad.'; end if;
  raise notice 'N OK (skoleansatt): rolle-eskalering avvist (permission denied).';
  update public.profiles set navn='Skoleansatt endret navn' where id='00000000-0000-0000-0000-0000000a4300';
  get diagnostics v_rad = row_count;
  if v_rad <> 1 then raise exception 'P FEILET (skoleansatt): navn-oppdatering traff % rader (forventet 1).', v_rad; end if;
  raise notice 'P OK (skoleansatt): navn oppdatert på egen rad.';
end $$;
rollback;

\echo '===== ansatt (TL AS) ====='
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'emp_uid', true);
do $$
declare v_avvist boolean := false; v_rad int;
begin
  begin
    update public.profiles set rolle='superadmin' where id='00000000-0000-0000-0000-0000000e4300';
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'N FEILET (ansatt): fikk sette rolle=superadmin på egen rad.'; end if;
  raise notice 'N OK (ansatt): rolle-eskalering avvist (permission denied).';
  update public.profiles set navn='Ansatt endret navn' where id='00000000-0000-0000-0000-0000000e4300';
  get diagnostics v_rad = row_count;
  if v_rad <> 1 then raise exception 'P FEILET (ansatt): navn-oppdatering traff % rader (forventet 1).', v_rad; end if;
  raise notice 'P OK (ansatt): navn oppdatert på egen rad.';
end $$;
rollback;

\echo '===== feide ====='
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'fei_uid', true);
do $$
declare v_avvist boolean := false; v_rad int;
begin
  begin
    update public.profiles set rolle='superadmin' where id='00000000-0000-0000-0000-0000000f4300';
  exception when insufficient_privilege then v_avvist := true;
  end;
  if not v_avvist then raise exception 'N FEILET (feide): fikk sette rolle=superadmin på egen rad.'; end if;
  raise notice 'N OK (feide): rolle-eskalering avvist (permission denied).';
  update public.profiles set navn='Feide endret navn' where id='00000000-0000-0000-0000-0000000f4300';
  get diagnostics v_rad = row_count;
  if v_rad <> 1 then raise exception 'P FEILET (feide): navn-oppdatering traff % rader (forventet 1).', v_rad; end if;
  raise notice 'P OK (feide): navn oppdatert på egen rad.';
end $$;
rollback;

-- ============================================================================
-- S — service_role kan fortsatt sette rolle (admin-endepunktets vei)
-- ============================================================================
\echo '===== service_role (positiv) ====='
begin;
set local role service_role;
do $$
declare v_rad int;
begin
  update public.profiles set rolle='superadmin' where id='00000000-0000-0000-0000-0000000a4300';
  get diagnostics v_rad = row_count;
  if v_rad <> 1 then raise exception 'S FEILET: service_role fikk ikke sette rolle (traff % rader).', v_rad; end if;
  raise notice 'S OK: service_role kan fortsatt sette rolle.';
end $$;
rollback;

-- ============================================================================
-- OPPRYDDING
-- ============================================================================
delete from public.profiles where id in (:'ans_uid', :'emp_uid', :'fei_uid');
delete from auth.users        where id in (:'ans_uid', :'emp_uid', :'fei_uid');
\echo '===== ALLE 143-TESTER BESTÅTT ====='
