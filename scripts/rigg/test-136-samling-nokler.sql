-- Lokal test for migrasjon 136 (nøkkel- og navnemigrasjon for Min side).
-- Kjøres mot en base der 001–135 er kjørt og UTEN importert samlings-/ressursdata
-- (schema-mal), så fixturene under ikke kolliderer med ekte kilde_nid. Aldri prod/øvingskopi.
--
-- Testdataen er bygget PROD-TRO fra uttrekket 17. sep (12 samlinger på kilde_nid som skal
-- nøkles, «.»-tittel på 18822, ni tipslister, tre kursmoduler), pluss den skjulte beholderen
-- 19697, de 4 laginndelings-lekene og de 5 dokumentene 136 kobler. Fixtur ≠ migrasjonens egne
-- antakelser (husregel 11. sep). MERK: 18885 (Månedens leker 2026) er IKKE med — 136 nøkler den
-- ikke, fordi migr 126 fjernet reserve-veien som leste nokkel='manedens-lek'.
\set ON_ERROR_STOP on
\pset pager off

-- ============================================================================
-- FIXTUR (committes, så \i-migrasjonens egen begin/commit ikke ruller den tilbake)
-- ============================================================================
begin;
-- 12 samlinger som 136 skal nøkle + skjult beholder (19697) + 18885 (som IKKE skal nøkles).
insert into public.samlinger (kilde_nid, synlig) values
  ('20030', true), ('18822', true), ('16190', true), ('18885', true),
  ('19389', true), ('19696', true), ('19390', true), ('15510', true),
  ('16072', true), ('16073', true), ('16074', true), ('15468', true),
  ('16291', true), ('19697', false);
-- nb-titler: 18822 får ledende punktum (navneryddingen skal fjerne det).
insert into public.samling_innhold (samling_id, sprak, tittel)
select s.id, 'nb', (case when s.kilde_nid = '18822' then '.' else '' end) || 'Samling ' || s.kilde_nid
  from public.samlinger s
 where s.kilde_nid in ('20030','18822','16190','18885','19389','19696','19390',
                       '15510','16072','16073','16074','15468','16291','19697');
-- 4 laginndelings-leker + 5 dokumenter 136 kobler (på kilde_nid).
insert into public.ressurser (kilde_nid, status) values
  ('2819','publisert'), ('2820','publisert'), ('2821','publisert'), ('6086','publisert');
insert into public.dokumenter (kilde_nid, tittel, status) values
  ('4052','Tips til laginndeling','publisert'),
  ('17740','Nominasjon – informasjon','publisert'),
  ('15970','Nominasjonslapp bm','publisert'),
  ('57','Nominasjonslapp nn','publisert'),
  ('933','Nominasjonslapp en','publisert');
commit;

-- ============================================================================
-- KJØR DEN EKTE MIGRASJONSFILA (ikke en kopi av logikken)
-- ============================================================================
\i supabase/migrations/136_minside_samling_nokler_navnerydding.sql

-- ============================================================================
-- ASSERTIONS
-- ============================================================================
\echo '===== T1: de 12 nøklene satt på riktig kilde_nid; 18885 + 19697 urørt ====='
do $$
declare v_feil int;
begin
  select count(*) into v_feil from (values
    ('20030','kursmodul-host-2026'), ('18822','kursmodul-vinter-2026'),
    ('16190','kursmodul-vinter-2025'),
    ('19389','tips-favorittleker'), ('19696','tips-100-elever'),
    ('19390','tips-sosial-kompetanse'), ('15510','tips-fysak'),
    ('16072','tips-kro-1-2'), ('16073','tips-kro-3-4'), ('16074','tips-kro-5-7'),
    ('15468','tips-sfo-aks'), ('16291','tips-tl-mester')
  ) as f(knid, nokkel)
  where not exists (select 1 from public.samlinger s where s.kilde_nid=f.knid and s.nokkel=f.nokkel);
  if v_feil <> 0 then raise exception 'T1 FEILET: % nøkler mangler/feil.', v_feil; end if;
  -- 18885 (manedens-lek, 126 fjernet reserve) og 19697 (skjult beholder) skal IKKE ha nøkkel.
  if exists (select 1 from public.samlinger where kilde_nid in ('18885','19697') and nokkel is not null) then
    raise exception 'T1 FEILET: 18885 eller 19697 fikk en nøkkel (skal være urørt).';
  end if;
  raise notice 'T1 OK: 12 nøkler satt; 18885 og 19697 urørt.';
end $$;

\echo '===== T2: navnerydding fjernet ledende punktum ====='
do $$
declare v int;
begin
  select count(*) into v from public.samling_innhold where tittel ~ '^\.\s*';
  if v <> 0 then raise exception 'T2 FEILET: % titler har fortsatt ledende punktum.', v; end if;
  if not exists (select 1 from public.samling_innhold si join public.samlinger s on s.id=si.samling_id
                 where s.kilde_nid='18822' and si.tittel='Samling 18822') then
    raise exception 'T2 FEILET: 18822-tittelen ble ikke «Samling 18822».';
  end if;
  raise notice 'T2 OK: ingen ledende punktum igjen; 18822 ryddet.';
end $$;

\echo '===== T3: laginndeling opprettet med 4 leker + 1 PDF ====='
do $$
declare v_lek int; v_dok int;
begin
  if not exists (select 1 from public.samlinger where nokkel='laginndeling' and synlig) then
    raise exception 'T3 FEILET: laginndeling-samlingen mangler/skjult.';
  end if;
  select count(*) into v_lek from public.samling_ressurs sr join public.samlinger s on s.id=sr.samling_id where s.nokkel='laginndeling';
  select count(*) into v_dok from public.samling_dokument sd join public.samlinger s on s.id=sd.samling_id where s.nokkel='laginndeling';
  if v_lek <> 4 or v_dok <> 1 then raise exception 'T3 FEILET: laginndeling leker=%, dok=% (forventet 4/1).', v_lek, v_dok; end if;
  raise notice 'T3 OK: laginndeling har 4 leker + 1 PDF.';
end $$;

\echo '===== T4: nominasjon opprettet med 4 dokumenter (uten video) ====='
do $$
declare v_dok int; v_medie int;
begin
  if not exists (select 1 from public.samlinger where nokkel='nominasjon' and synlig) then
    raise exception 'T4 FEILET: nominasjon-samlingen mangler/skjult.';
  end if;
  select count(*) into v_dok from public.samling_dokument sd join public.samlinger s on s.id=sd.samling_id where s.nokkel='nominasjon';
  if v_dok <> 4 then raise exception 'T4 FEILET: nominasjon har % dokument (forventet 4).', v_dok; end if;
  -- §4.4: uten video → ingen samling_medie-rad.
  select count(*) into v_medie from public.samling_medie sm join public.samlinger s on s.id=sm.samling_id where s.nokkel='nominasjon';
  if v_medie <> 0 then raise exception 'T4 FEILET: nominasjon har % video-rad, skal være 0 (§4.4).', v_medie; end if;
  raise notice 'T4 OK: nominasjon har 4 dok, ingen video.';
end $$;

\echo '===== T5: idempotens — sperre-predikatet ville stoppet en re-kjøring ====='
do $$
declare v_med_nokkel int; v_nye int;
begin
  -- Nøyaktig samme predikater som filens «allerede kjørt»-sperrer.
  select count(*) into v_med_nokkel from public.samlinger s
    where s.kilde_nid in ('20030','18822','16190','19389','19696','19390',
                          '15510','16072','16073','16074','15468','16291')
      and s.nokkel is not null;
  select count(*) into v_nye from public.samlinger where nokkel in ('laginndeling','nominasjon');
  if v_med_nokkel = 0 or v_nye = 0 then
    raise exception 'T5 FEILET: idempotens-predikatet er ikke sant (nøklet=%, nye=%).', v_med_nokkel, v_nye;
  end if;
  raise notice 'T5 OK: re-kjøring ville stoppet rent (nøklet=%, nye=%).', v_med_nokkel, v_nye;
end $$;

\echo '===== T6: unik nøkkel — duplikat avvises ====='
do $$
declare v_avvist boolean := false;
begin
  begin
    update public.samlinger set nokkel='tips-fysak' where kilde_nid='20030';  -- allerede brukt av 15510
  exception when unique_violation then v_avvist := true;
  end;
  if not v_avvist then raise exception 'T6 FEILET: duplikat nøkkel ble tillatt.'; end if;
  raise notice 'T6 OK: unik-indeksen (117) avviser duplikat nøkkel.';
end $$;

-- ============================================================================
-- OPPRYDDING (fjern det 136 laget + fixturene)
-- ============================================================================
delete from public.samling_dokument where samling_id in (select id from public.samlinger where nokkel in ('laginndeling','nominasjon'));
delete from public.samling_ressurs  where samling_id in (select id from public.samlinger where nokkel in ('laginndeling','nominasjon'));
delete from public.samling_innhold  where samling_id in (select id from public.samlinger where nokkel in ('laginndeling','nominasjon'));
delete from public.samlinger        where nokkel in ('laginndeling','nominasjon');
delete from public.samling_innhold  where samling_id in
  (select id from public.samlinger where kilde_nid in
    ('20030','18822','16190','18885','19389','19696','19390','15510','16072','16073','16074','15468','16291','19697'));
delete from public.samlinger where kilde_nid in
  ('20030','18822','16190','18885','19389','19696','19390','15510','16072','16073','16074','15468','16291','19697');
delete from public.dokumenter where kilde_nid in ('4052','17740','15970','57','933');
delete from public.ressurser  where kilde_nid in ('2819','2820','2821','6086');
\echo '===== ALLE 136-TESTER BESTÅTT ====='
