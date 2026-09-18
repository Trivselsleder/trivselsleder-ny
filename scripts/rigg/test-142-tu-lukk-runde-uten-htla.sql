-- Lokal test for migrasjon 142 (F8: HTLA kan ikke lukke en TU-runde).
-- Kjøres mot en base der 001–141 er kjørt, med auth-stubben (stub_auth.sql). ALDRI prod.
--
-- Fixtur: én skole, én åpen tu_runde, en HTLA (aktiv tl_rolle='htla', profiles.rolle='skoleansatt')
-- og en skoleadmin (profiles.rolle='skoleadmin', medlem av skolen). Kjerne-assertion (F8):
--   T2 (korroborerende): HTLA-en ER en gyldig aktiv htla (tu_er_htla_paa_skole=true) — så
--       avvisningen i T1 skyldes F8, ikke en ødelagt fixtur (jf. «tomt resultat ≠ bevis»).
--   T1 (negativ): HTLA-kall på tu_lukk_runde gir «Ingen tilgang».
--   T3/T4 (positiv): skoleadmin passerer tilgangsgaten (tu_har_tilgang_skole=true), og et ekte
--       tu_lukk_runde-kall stopper IKKE på «Ingen tilgang» (nedstrøms-detaljer er ikke poenget her).
\set ON_ERROR_STOP on
\pset pager off

\set htla_uid '00000000-0000-0000-0000-000000000a42'
\set adm_uid  '00000000-0000-0000-0000-0000000ad042'
\set skole    '00000000-0000-0000-0000-0000000c0042'
\set runde    '00000000-0000-0000-0000-0000000d0042'

-- ============================================================================
-- FIXTUR (som eier/postgres, committes)
-- ============================================================================
begin;
insert into auth.users (id) values (:'htla_uid'), (:'adm_uid') on conflict (id) do nothing;
insert into public.profiles (id, navn, rolle, epost, aktiv) values
  (:'htla_uid', 'Test HTLA 142', 'skoleansatt', 'htla@test142.no', true),
  (:'adm_uid',  'Test Skoleadmin 142', 'skoleadmin', 'adm@test142.no', true)
  on conflict (id) do update set rolle=excluded.rolle;
insert into public.skoler (id, navn, org_nr, status)
  values (:'skole', 'TEST142 Skole', 'TEST142', 'Aktiv') on conflict (id) do nothing;
-- HTLA: aktiv htla-kobling. Skoleadmin: aktiv skoleadmin-kobling på samme skole.
insert into public.bruker_skole (bruker_id, skole_id, rolle, aktiv, tl_rolle) values
  (:'htla_uid', :'skole', 'skoleansatt', true, 'htla'),
  (:'adm_uid',  :'skole', 'skoleadmin',  true, null);
-- Én åpen runde å lukke.
insert into public.tu_runder (id, skole_id, trinn, skoleaar, semester, status)
  values (:'runde', :'skole', 5, '2025/2026', 'host', 'apen');
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA
-- ============================================================================
\i supabase/migrations/142_f8_tu_lukk_runde_uten_htla.sql

-- ============================================================================
-- T1 + T2 — som HTLA
-- ============================================================================
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'htla_uid', true);

\echo '===== T2 (korroborerende): HTLA-en er en gyldig aktiv htla på skolen ====='
do $$
begin
  if not public.tu_er_htla_paa_skole('00000000-0000-0000-0000-0000000c0042') then
    raise exception 'T2 FEILET: fixturen er ikke en gyldig htla — T1 ville vært et falskt bevis.';
  end if;
  raise notice 'T2 OK: HTLA er gyldig.';
end $$;

\echo '===== T1 (negativ): HTLA får «Ingen tilgang» ved tu_lukk_runde ====='
do $$
declare v_ingen_tilgang boolean := false;
begin
  begin
    perform public.tu_lukk_runde('00000000-0000-0000-0000-0000000d0042');
  exception when others then
    if sqlerrm ilike '%ingen tilgang%' then v_ingen_tilgang := true; else raise; end if;
  end;
  if not v_ingen_tilgang then raise exception 'T1 FEILET: HTLA fikk lukke runden (F8 ikke i kraft).'; end if;
  raise notice 'T1 OK: HTLA avvist med «Ingen tilgang».';
end $$;
rollback;

-- ============================================================================
-- T3 + T4 — som skoleadmin
-- ============================================================================
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'adm_uid', true);

\echo '===== T3 (positiv, gate): skoleadmin har tilgang til skolen ====='
do $$
begin
  if not public.tu_har_tilgang_skole('00000000-0000-0000-0000-0000000c0042') then
    raise exception 'T3 FEILET: skoleadmin har ikke tilgang (fixtur-feil).';
  end if;
  raise notice 'T3 OK: skoleadmin passerer tilgangsgaten.';
end $$;

\echo '===== T4 (positiv): skoleadmin stoppes IKKE på «Ingen tilgang» ved ekte kall ====='
do $$
begin
  begin
    perform public.tu_lukk_runde('00000000-0000-0000-0000-0000000d0042');
    raise notice 'T4 OK: tu_lukk_runde gikk gjennom for skoleadmin.';
  exception when others then
    if sqlerrm ilike '%ingen tilgang%' then
      raise exception 'T4 FEILET: skoleadmin fikk «Ingen tilgang» (skulle passert gaten).';
    end if;
    raise notice 'T4 OK: gaten passert (nedstrøms-melding: %).', sqlerrm;
  end;
end $$;
rollback;

-- ============================================================================
-- OPPRYDDING
-- ============================================================================
delete from public.tu_runder    where id = :'runde';
delete from public.bruker_skole where skole_id = :'skole';
delete from public.skoler       where org_nr = 'TEST142';
delete from public.profiles     where id in (:'htla_uid', :'adm_uid');
delete from auth.users          where id in (:'htla_uid', :'adm_uid');
\echo '===== ALLE 142-TESTER BESTÅTT ====='
