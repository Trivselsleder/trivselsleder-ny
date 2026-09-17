-- Lokal test for migrasjon 137 (koble «Oversikt over antall TL-verv» til nominasjon).
-- Kjøres mot en base der 001–136 er kjørt og UTEN importert samlings-/dokumentdata
-- (schema-mal), så fixturene ikke kolliderer med ekte kilde_nid. Aldri prod/øvingskopi.
--
-- Fixturen bygger nominasjon-samlingen slik 136 etterlater den (nokkel 'nominasjon' + fire
-- dokument-koblinger rk 0–3) og dokument 71, så 137 kjøres mot et prod-tro utgangspunkt.
-- Fixtur ≠ migrasjonens egne antakelser (husregel 11. sep).
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FIXTUR (committes, så \i-migrasjonens egen begin/commit ikke ruller den tilbake)
-- ============================================================================
begin;
-- Nominasjon-samlingen (som 136 lager den) + de fem dokumentene den bruker + 71.
insert into public.samlinger (nokkel, type, synlig, rekkefolge) values ('nominasjon','redaksjonell',true,0);
insert into public.dokumenter (kilde_nid, tittel, status) values
  ('17740','Nominasjon av trivselsledere - informasjon','publisert'),
  ('15970','Nominasjonslapp','publisert'),
  ('57','Nominasjonslapp - nynorsk','publisert'),
  ('933','Nomination form - English','publisert'),
  ('71','Oversikt over antall TL-verv','publisert');
-- Koble de fire første som 136 gjør (rk 0–3). 71 er IKKE koblet ennå — det er 137s jobb.
insert into public.samling_dokument (samling_id, dokument_id, rekkefolge)
select (select id from public.samlinger where nokkel='nominasjon'), d.id, x.rk
  from (values ('17740',0),('15970',1),('57',2),('933',3)) as x(knid, rk)
  join public.dokumenter d on d.kilde_nid = x.knid;
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA (ikke en kopi av logikken)
-- ============================================================================
\i supabase/migrations/137_nominasjon_oversikt_tl_verv.sql

-- ============================================================================
-- ASSERTIONS
-- ============================================================================
\echo '===== T1: 71 koblet til nominasjon på rekkefolge 4 ====='
do $$
declare v int;
begin
  select count(*) into v from public.samling_dokument sd
    join public.samlinger s on s.id = sd.samling_id
    join public.dokumenter d on d.id = sd.dokument_id
   where s.nokkel='nominasjon' and d.kilde_nid='71' and sd.rekkefolge=4;
  if v <> 1 then raise exception 'T1 FEILET: 71 koblet % ganger på rk 4 (forventet 1).', v; end if;
  raise notice 'T1 OK: 71 koblet på rekkefolge 4.';
end $$;

\echo '===== T2: nominasjon har nå 5 dokument, rekkefolge 0–4 uten hull ====='
do $$
declare v int; v_rk text;
begin
  select count(*) into v from public.samling_dokument sd
    join public.samlinger s on s.id=sd.samling_id where s.nokkel='nominasjon';
  if v <> 5 then raise exception 'T2 FEILET: nominasjon har % dokument (forventet 5).', v; end if;
  select string_agg(sd.rekkefolge::text, ',' order by sd.rekkefolge) into v_rk
    from public.samling_dokument sd join public.samlinger s on s.id=sd.samling_id
   where s.nokkel='nominasjon';
  if v_rk <> '0,1,2,3,4' then raise exception 'T2 FEILET: rekkefolge=% (forventet 0,1,2,3,4).', v_rk; end if;
  raise notice 'T2 OK: 5 dokument, rekkefolge 0–4.';
end $$;

\echo '===== T3: idempotens — allerede-kjørt-predikatet er nå sant (ville stoppet re-kjøring) ====='
-- Filens «allerede kjørt»-sperre stopper når 71 ALLEREDE er koblet. Her verifiserer vi at
-- predikatet er sant etter kjøring — altså at en re-kjøring ville raise-t, ikke doblet raden.
do $$
declare v int;
begin
  select count(*) into v from public.samling_dokument sd
    join public.samlinger s on s.id=sd.samling_id
    join public.dokumenter d on d.id=sd.dokument_id
   where s.nokkel='nominasjon' and d.kilde_nid='71';
  if v = 0 then raise exception 'T3 FEILET: 71 ikke koblet — re-kjøringssperra ville ikke stoppet.'; end if;
  raise notice 'T3 OK: 71 er koblet (%), re-kjøring ville stoppet rent.', v;
end $$;

-- ============================================================================
-- OPPRYDDING (fjern fixtur + det 137 laget)
-- ============================================================================
delete from public.samling_dokument where samling_id in (select id from public.samlinger where nokkel='nominasjon');
delete from public.samlinger where nokkel='nominasjon';
delete from public.dokumenter where kilde_nid in ('17740','15970','57','933','71');
\echo '===== ALLE 137-TESTER BESTÅTT ====='
