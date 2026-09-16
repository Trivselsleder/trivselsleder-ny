-- ============================================================================
-- test-129-slett-skole.sql — LOKAL test av slett_skole (migr 129, rettet 16. sep
-- etter Fables REKONTROLL: R1, R2, K10, K11, K12, K6, forutsetningssperre).
-- Markører AAAX (skole A) / BBBX (skole B) / FELLES (delt). Aldri mot prod/øvingskopi.
-- Alle assert-er RAISER EXCEPTION ved feil.
-- ============================================================================
\set ON_ERROR_STOP on
\pset pager off

-- U1 A+B skoleadmin (behold) · U2 A, eier plan+hjul på B = F1/E1 (behold)
-- U3 B (urørt) · U4 A feide, intet annet innhold (foreldreløs → slettes)
-- U5 A feide, eier vurdering+hjul med skole_id NULL = K10 (foreldreløs → slettes)
-- U9 A feide, har bruk_hendelse/brukslogg/skoleus_svar = K11 (foreldreløs, SET NULL)
-- UI ansatt på A (behold) · US superadmin på A (behold)
-- (U7 R1, U8 R2 legges inn i egne rollback-blokker.)
\set A  '''11111111-1111-1111-1111-111111111111'''
\set B  '''22222222-2222-2222-2222-222222222222'''
\set U1 '''00000000-0000-0000-0000-000000000001'''
\set U2 '''00000000-0000-0000-0000-000000000002'''
\set U3 '''00000000-0000-0000-0000-000000000003'''
\set U4 '''00000000-0000-0000-0000-000000000004'''
\set U5 '''00000000-0000-0000-0000-000000000005'''
\set U9 '''00000000-0000-0000-0000-000000000006'''
\set UI '''00000000-0000-0000-0000-000000000009'''
\set US '''00000000-0000-0000-0000-000000000008'''
\set R1 '''aaaaaaaa-0000-0000-0000-000000000001'''

-- ============================================================================
-- SEED
-- ============================================================================
begin;
insert into auth.users (id) values (:U1),(:U2),(:U3),(:U4),(:U5),(:U9),(:UI),(:US);
insert into public.profiles (id, navn, rolle, epost) values
  (:U1, 'U1 Delt AAAX',    'skoleadmin',  'u1.AAAX@a-og-b.no'),
  (:U2, 'U2 KunA AAAX',    'skoleansatt', 'u2.AAAX@kun-a.no'),
  (:U3, 'U3 KunB BBBX',    'skoleadmin',  'u3.BBBX@kun-b.no'),
  (:U4, 'U4 Feide AAAX',   'feide',       'u4.AAAX@kun-a.no'),
  (:U5, 'U5 NullEier AAAX','feide',       'u5.AAAX@kun-a.no'),
  (:U9, 'U9 Logg AAAX',    'feide',       'u9.AAAX@kun-a.no'),
  (:UI, 'UI Intern',       'ansatt',      'intern@trivselsleder.no'),
  (:US, 'US Superadmin',   'superadmin',  'super@trivselsleder.no');

insert into public.skoler (id, navn, org_nr, status, rektor_navn, rektor_epost, htla_navn, htla_epost) values
  (:A, 'Skole A AAAX', '111111111', 'Aktiv', 'Rektor AAAX', 'rektor.AAAX@a.no', 'HTLA AAAX', 'htla.AAAX@a.no'),
  (:B, 'Skole B BBBX', '222222222', 'Aktiv', 'Rektor BBBX', 'rektor.BBBX@b.no', null, null);

insert into public.bruker_skole (bruker_id, skole_id, rolle) values
  (:U1, :A, 'skoleadmin'), (:U1, :B, 'skoleadmin'),
  (:U2, :A, 'skoleansatt'),
  (:U3, :B, 'skoleadmin'),
  (:U4, :A, 'skoleansatt'),
  (:U5, :A, 'skoleansatt'),
  (:U9, :A, 'skoleansatt'),
  (:UI, :A, 'skoleadmin'),
  (:US, :A, 'skoleadmin');

insert into public.ressurser (id) values (:R1);

-- ===== SLETTES (skole A) =====
insert into public.tu_runder (id, skole_id, trinn, skoleaar, opprettet_av) values
  ('f0000000-0000-0000-0000-00000000000a', :A, 7, '2025/2026', :UI),
  ('f0000000-0000-0000-0000-00000000000b', :B, 7, '2025/2026', :UI);
insert into public.tu_koder (runde_id, kode_hmac) values
  ('f0000000-0000-0000-0000-00000000000a','hmacA1'),('f0000000-0000-0000-0000-00000000000a','hmacA2'),
  ('f0000000-0000-0000-0000-00000000000b','hmacB1');
insert into public.tu_svar (runde_id, svar, trinn, kjonn) values
  ('f0000000-0000-0000-0000-00000000000a','{"q1":3}',7,'jente'),
  ('f0000000-0000-0000-0000-00000000000a','{"q1":4}',7,'gutt'),
  ('f0000000-0000-0000-0000-00000000000b','{"q1":2}',7,'annet');
insert into public.tu_arkiv (skole_id, trinn, skoleaar, resultat) values
  (:A, 7, '2025/2026', '{"snitt":3.5}'), (:B, 7, '2025/2026', '{"snitt":2.0}');

-- Periodeplaner (A eid av U4). E1: plan på B eid av U2.
insert into public.periodeplan (id, navn, skole_id, bruker_id) values
  ('cccc0000-0000-0000-0000-0000000000a4', 'Plan A AAAX', :A, :U4),
  ('cccc0000-0000-0000-0000-0000000000b3', 'Plan B BBBX', :B, :U3),
  ('cccc0000-0000-0000-0000-0000000000b2', 'Plan B (U2 E1)', :B, :U2);  -- E1
insert into public.periodeplan_rad (plan_id, ressurs_id) values
  ('cccc0000-0000-0000-0000-0000000000a4', :R1),('cccc0000-0000-0000-0000-0000000000b3', :R1),('cccc0000-0000-0000-0000-0000000000b2', :R1);

-- TL-hjul-kategorier: Kat A1 (blir brukt av B-hjul = K12, skal HOPPES OVER), Kat A2
-- (ubrukt, skal SLETTES), Kat B, Kat FELLES (skole_id null, skal ALDRI røres).
insert into public.tl_hjul_kategori (id, navn, skole_id) values
  ('dddd0000-0000-0000-0000-0000000000a1', 'Kat A1 AAAX', :A),
  ('dddd0000-0000-0000-0000-0000000000a2', 'Kat A2 AAAX', :A),
  ('dddd0000-0000-0000-0000-0000000000b0', 'Kat B BBBX', :B),
  ('dddd0000-0000-0000-0000-0000000000f0', 'Kat FELLES', null);
insert into public.tl_hjul (id, navn, skole_id, bruker_id, kategori_id) values
  ('eeee0000-0000-0000-0000-0000000000a4', 'Hjul A AAAX', :A, :U4, 'dddd0000-0000-0000-0000-0000000000f0'), -- A-hjul → FELLES
  ('eeee0000-0000-0000-0000-0000000000b3', 'Hjul B BBBX', :B, :U3, 'dddd0000-0000-0000-0000-0000000000b0'),
  ('eeee0000-0000-0000-0000-0000000000b2', 'Hjul B (U2 E1)', :B, :U2, 'dddd0000-0000-0000-0000-0000000000b0'), -- E1
  ('eeee0000-0000-0000-0000-0000000000bA', 'Hjul B→KatA1 (K12)', :B, :U3, 'dddd0000-0000-0000-0000-0000000000a1'), -- K12
  ('eeee0000-0000-0000-0000-000000000059', 'Hjul U5 NULL-skole (K10)', null, :U5, null);                  -- K10
insert into public.tl_hjul_lek (hjul_id, ressurs_id) values
  ('eeee0000-0000-0000-0000-0000000000a4', :R1),('eeee0000-0000-0000-0000-0000000000b3', :R1),('eeee0000-0000-0000-0000-0000000000b2', :R1);

insert into public.tl_deltaker (skole_id, navn, gruppe) values
  (:A, 'Ole AAAX', '4B'), (:A, 'Kari AAAX', '5A'), (:B, 'Per BBBX', '6C');

-- ===== BEHOLDES (skole A) — skal være urørt (unntatt SET NULL for foreldreløse, K11) =====
insert into public.kurs (id, navn) values ('b1000000-0000-0000-0000-000000000001','Kurs 1');
insert into public.kurs_skole (id, kurs_id, skole_id, kommentar) values
  ('b2000000-0000-0000-0000-00000000000a','b1000000-0000-0000-0000-000000000001',:A,'komm AAAX'),
  ('b2000000-0000-0000-0000-00000000000b','b1000000-0000-0000-0000-000000000001',:B,'komm BBBX');
insert into public.kurs_skole_mottaker (id, kurs_skole_id, rolle, epost, navn) values
  ('b3000000-0000-0000-0000-00000000000a','b2000000-0000-0000-0000-00000000000a','htla','htla.AAAX@a.no','HTLA AAAX'),
  ('b3000000-0000-0000-0000-00000000000b','b2000000-0000-0000-0000-00000000000b','htla','htla.BBBX@b.no','HTLA BBBX');
insert into public.evalueringer (kurs_skole_id) values
  ('b2000000-0000-0000-0000-00000000000a'), ('b2000000-0000-0000-0000-00000000000b');
insert into public.skoleus_undersokelse (id, navn) values ('a1000000-0000-0000-0000-000000000001','Skoleus mal');
insert into public.skoleus_sporsmal (id, blokk, type, sporsmaltekst, undersokelse_id, skala_min, skala_max) values
  ('a2000000-0000-0000-0000-000000000001','rolle','enkeltvalg','Fungerer?','a1000000-0000-0000-0000-000000000001',1,5);
insert into public.skoleus_runder (id, navn, undersokelse_id) values
  ('a3000000-0000-0000-0000-000000000001','Runde','a1000000-0000-0000-0000-000000000001');
insert into public.skoleus_mottaker (id, runde_id, skole_id, epost, navn) values
  ('a4000000-0000-0000-0000-00000000000a','a3000000-0000-0000-0000-000000000001',:A,'rektor.AAAX@a.no','Rektor AAAX'),
  ('a4000000-0000-0000-0000-00000000000b','a3000000-0000-0000-0000-000000000001',:B,'rektor.BBBX@b.no','Rektor BBBX');
-- skoleus_svar: én mottaker-basert (uten bruker_id, urørt) + én med bruker_id=U9 (K11 SET NULL)
insert into public.skoleus_svar (runde_id, skole_id, sporsmal_id, mottaker_id, verdi_tall) values
  ('a3000000-0000-0000-0000-000000000001',:A,'a2000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-00000000000a',4),
  ('a3000000-0000-0000-0000-000000000001',:B,'a2000000-0000-0000-0000-000000000001','a4000000-0000-0000-0000-00000000000b',3);
insert into public.skoleus_svar (runde_id, skole_id, sporsmal_id, bruker_id, verdi_tall) values
  ('a3000000-0000-0000-0000-000000000001',:A,'a2000000-0000-0000-0000-000000000001',:U9,5);   -- K11
insert into public.epost_logg (type, status, kurs_skole_id, mottaker_navn, mottaker_epost) values
  ('kurs_invitasjon','sendt','b2000000-0000-0000-0000-00000000000a','HTLA AAAX','htla.AAAX@a.no'),
  ('aktivering','sendt',null,'U2 KunA AAAX','u2.AAAX@kun-a.no'),
  ('kurs_invitasjon','sendt','b2000000-0000-0000-0000-00000000000b','HTLA BBBX','htla.BBBX@b.no');
insert into public.popularitet_snapshot (periode_type, periode, skole_id, ressurs_id) values
  ('maaned','2026-01',:A,:R1), ('maaned','2026-01',:B,:R1), ('maaned','2026-01',null,:R1);
-- bruk_hendelse/brukslogg: U1 (behold), U4 (foreldreløs), U9 (foreldreløs) — skole_id=A beholdes
insert into public.bruk_hendelse (hendelse, skole_id, bruker_id) values
  ('visning',:A,:U1), ('visning',:A,:U4), ('visning',:A,:U9), ('visning',:B,:U3);
insert into public.brukslogg (hendelse_type, skole_id, bruker_id) values
  ('innlogging',:A,:U1), ('innlogging',:A,:U9), ('innlogging',:B,:U3);
-- vurderinger: U1(A,behold), U2(A,behold), U4(A,foreldreløs→cascade), U5(NULL,foreldreløs→cascade), U3(B)
insert into public.vurderinger (ressurs_id, bruker_id, stjerner, skole_id) values
  (:R1,:U1,5,:A), (:R1,:U2,4,:A), (:R1,:U4,3,:A), (:R1,:U5,3,null), (:R1,:U3,2,:B);
insert into public.favoritter (bruker_id, ressurs_id) values (:U1,:R1),(:U4,:R1),(:U3,:R1);
insert into public.nyhetsbrev_mottakere (epost, skole_id, skole_navn) values ('nb.AAAX@a.no',:A,'Skole A AAAX');
insert into public.webinarer (id, tittel, starter_at) values ('c1000000-0000-0000-0000-000000000001','Webinar', now());
insert into public.webinar_invitasjon (webinar_id, epost, skole_id) values
  ('c1000000-0000-0000-0000-000000000001','wi.AAAX@a.no',:A),('c1000000-0000-0000-0000-000000000001','wi.BBBX@b.no',:B);
insert into public.webinar_pameldinger (webinar_id, navn, epost, skole_id) values
  ('c1000000-0000-0000-0000-000000000001','WP AAAX','wp.AAAX@a.no',:A);
insert into public.paameldinger (skolenavn, type, gateadresse, postnummer, poststed, kommune, fylke, organisasjonsnummer, rektor_navn, rektor_epost) values
  ('Skole A AAAX','barnetrinn','Gata 1','0001','Oslo','Oslo','Oslo','111111111','Rektor AAAX','rektor.AAAX@a.no');
insert into public.kulturkort_bestillinger (skolenavn, antall_kort, kontaktperson, epost) values
  ('Skole A AAAX', 10, 'Rektor AAAX', 'rektor.AAAX@a.no');
commit;
\echo '================ SEED FERDIG ================'

-- F1 + K10: foreldreløse = U4, U5, U9 (U2 eier på B → behold; U1 delt; UI/US interne).
do $$
declare v int; v_ok boolean;
begin
  select count(*),
         bool_and(uid in ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006'))
    into v, v_ok
  from public.slett_skole_foreldrelose_uid('11111111-1111-1111-1111-111111111111') as t(uid);
  if v <> 3 or not v_ok then raise exception 'F1/K10 FEILET: foreldreløse skal være U4,U5,U9 (antall=%, ok=%)', v, v_ok; end if;
  raise notice 'F1/K10 OK: foreldreløse = U4, U5, U9 (U5 med kun NULL-skole-innhold telles nå med; U2 beholdes).';
end $$;

-- ============================================================================
-- PROOF 1 — TØRRKJØRING ENDRER 0 RADER
-- ============================================================================
\echo '================ PROOF 1: TØRRKJØRING ================'
create temp table _snap_for as
  select c.relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I', c.relname), false, true, '')))[1]::text::bigint as n
  from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace where nsp.nspname='public' and c.relkind='r';
select count(*) from public.slett_skole(:A, true);
select count(*) from public.slett_skole(:A, null);
create temp table _snap_etter as
  select c.relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) c from public.%I', c.relname), false, true, '')))[1]::text::bigint as n
  from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace where nsp.nspname='public' and c.relkind='r';
do $$
declare v_diff int; v_status text;
begin
  select count(*) into v_diff from _snap_for f join _snap_etter e on e.relname=f.relname where f.n<>e.n;
  select status into v_status from public.skoler where id='11111111-1111-1111-1111-111111111111';
  if v_diff<>0 then raise exception 'PROOF 1 FEILET: tørrkjøring endret % tabell(er)', v_diff; end if;
  if v_status<>'Aktiv' then raise exception 'PROOF 1 FEILET: status endret av tørrkjøring (%)', v_status; end if;
  raise notice 'PROOF 1 OK: tørrkjøring (og null-param) endret 0 rader i alle % tabeller; status urørt.', (select count(*) from _snap_for);
end $$;

-- ============================================================================
-- PROOF R1 — kurs_skole.svar_registrert_av stopper med klartekst
-- ============================================================================
\echo '================ PROOF R1: svar_registrert_av ================'
begin;
  insert into auth.users (id) values ('00000000-0000-0000-0000-000000000007');
  insert into public.profiles (id, navn, rolle, epost) values ('00000000-0000-0000-0000-000000000007','U7 Vegne AAAX','feide','u7.AAAX@kun-a.no');
  insert into public.bruker_skole (bruker_id, skole_id, rolle) values ('00000000-0000-0000-0000-000000000007','11111111-1111-1111-1111-111111111111','skoleansatt');
  update public.kurs_skole set svar_registrert_av='00000000-0000-0000-0000-000000000007' where id='b2000000-0000-0000-0000-00000000000b'; -- skole B sitt kurs
  do $$
  declare v_stopp boolean := false; v_m text;
  begin
    begin perform public.slett_skole('11111111-1111-1111-1111-111111111111', false);
    exception when others then v_stopp := true; v_m := sqlerrm; end;
    if not v_stopp then raise exception 'PROOF R1 FEILET: svar_registrert_av ble ikke fanget'; end if;
    if v_m not like '%kurs_skole%' or v_m not like '%U7%' then raise exception 'PROOF R1 FEILET: melding uten kurs_skole/U7: %', v_m; end if;
    -- 0 endring: skolen står fortsatt som Aktiv, tu_svar for A urørt
    if (select status from public.skoler where id='11111111-1111-1111-1111-111111111111') <> 'Aktiv' then
      raise exception 'PROOF R1 FEILET: noe ble endret før stoppet';
    end if;
    raise notice 'PROOF R1 OK: kurs_skole.svar_registrert_av stoppet med klartekst → %', v_m;
  end $$;
rollback;

-- ============================================================================
-- PROOF R2 — blokkert bruker med navn=NULL gir klartekst, ikke rå FK-feil
-- ============================================================================
\echo '================ PROOF R2: navn = NULL ================'
begin;
  insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a');
  insert into public.profiles (id, navn, rolle, epost) values ('00000000-0000-0000-0000-00000000000a', null, 'feide','u8.AAAX@kun-a.no');  -- navn NULL
  insert into public.bruker_skole (bruker_id, skole_id, rolle) values ('00000000-0000-0000-0000-00000000000a','11111111-1111-1111-1111-111111111111','skoleansatt');
  insert into public.dokumenter (id, tittel, opprettet_av) values ('d0000000-0000-0000-0000-0000000000a8','Dok av U8','00000000-0000-0000-0000-00000000000a');
  do $$
  declare v_stopp boolean := false; v_m text;
  begin
    begin perform public.slett_skole('11111111-1111-1111-1111-111111111111', false);
    exception when others then v_stopp := true; v_m := sqlerrm; end;
    if not v_stopp then raise exception 'PROOF R2 FEILET: blokkering ikke fanget'; end if;
    if v_m not like '%(uten navn)%' or v_m not like '%dokumenter%' then
      raise exception 'PROOF R2 FEILET: forventet klartekst med (uten navn)+dokumenter, fikk rå/annen feil: %', v_m;
    end if;
    raise notice 'PROOF R2 OK: navn=NULL gir klartekst → %', v_m;
  end $$;
rollback;

-- ============================================================================
-- PROOF F3 — NULL-CLAIM AVVISES
-- ============================================================================
\echo '================ PROOF F3: NULL-CLAIM ================'
begin;
  grant execute on function public.slett_skole(uuid, boolean) to authenticated;
  set session authorization authenticated;   -- ingen jwt-claim → auth.role() NULL
  do $$
  declare v_avvist boolean := false; v_m text;
  begin
    begin perform public.slett_skole('11111111-1111-1111-1111-111111111111', true);
    exception when others then v_avvist := true; v_m := sqlerrm; end;
    if not v_avvist then raise exception 'PROOF F3 FEILET: NULL-claim slapp gjennom'; end if;
    raise notice 'PROOF F3 OK: NULL-claim avvist → %', v_m;
  end $$;
  reset session authorization;
rollback;

-- ============================================================================
-- PROOF ATOMISITET — feil midtveis ruller tilbake alt
-- ============================================================================
\echo '================ PROOF ATOMISITET ================'
begin;
  create function public._test_blokk() returns trigger language plpgsql as $t$ begin raise exception 'test-atomisitet-blokk'; end $t$;
  create trigger _tb before delete on public.tl_deltaker for each row execute function public._test_blokk();
  do $$
  declare v_feilet boolean := false; v_tu int; v_pp int;
  begin
    begin perform public.slett_skole('11111111-1111-1111-1111-111111111111', false);
    exception when others then v_feilet := true; end;
    if not v_feilet then raise exception 'PROOF ATOMISITET FEILET: skulle ha feilet'; end if;
    select count(*) into v_tu from public.tu_svar sv join public.tu_runder r on r.id=sv.runde_id where r.skole_id='11111111-1111-1111-1111-111111111111';
    select count(*) into v_pp from public.periodeplan where skole_id='11111111-1111-1111-1111-111111111111';
    if v_tu<>2 or v_pp<>1 then raise exception 'PROOF ATOMISITET FEILET: steg 1-3 ikke rullet tilbake (tu_svar=%, plan=%)', v_tu, v_pp; end if;
    raise notice 'PROOF ATOMISITET OK: feil i steg 4 rullet tilbake steg 1-3.';
  end $$;
rollback;

-- ============================================================================
-- PROOF 2+3 — SKARP KJØRING (destruktiv, sist)
-- ============================================================================
\echo '================ PROOF 2+3: SKARP KJØRING ================'
create temp table _orphans as select uid from public.slett_skole_foreldrelose_uid(:A) as t(uid);
\echo '---- resultat av skarp kjøring: ----'
select * from public.slett_skole(:A, false);
delete from auth.users where id in (select uid from _orphans);   -- simuler endepunktets auth-sletting

-- ---- PROOF 2: SLETTES-tabellene tomme for A; ingen elevnavn igjen ----
do $$
declare v int;
begin
  select
    (select count(*) from public.tu_runder where skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.tu_arkiv where skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.tu_svar sv join public.tu_runder r on r.id=sv.runde_id where r.skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.tu_koder k join public.tu_runder r on r.id=k.runde_id where r.skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.periodeplan where skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.tl_hjul where skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.tl_deltaker where skole_id='11111111-1111-1111-1111-111111111111')
  + (select count(*) from public.bruker_skole where skole_id='11111111-1111-1111-1111-111111111111')
  into v;
  if v<>0 then raise exception 'PROOF 2 FEILET: % rader igjen i slettes-tabellene for A', v; end if;
  if exists (select 1 from public.tl_deltaker where navn like '%AAAX%') then raise exception 'PROOF 2 FEILET: elevnavn står igjen'; end if;
  raise notice 'PROOF 2 OK: slettes-tabellene tomme for A; ingen elevnavn igjen.';
end $$;

-- ---- K12: Kat A1 hoppet over (brukt av B-hjul), Kat A2 slettet, B-hjul beholdt kategori ----
do $$
declare v_a1 int; v_a2 int; v_bkat text;
begin
  select count(*) into v_a1 from public.tl_hjul_kategori where id='dddd0000-0000-0000-0000-0000000000a1';
  select count(*) into v_a2 from public.tl_hjul_kategori where id='dddd0000-0000-0000-0000-0000000000a2';
  select kategori_id::text into v_bkat from public.tl_hjul where id='eeee0000-0000-0000-0000-0000000000bA';
  if v_a1<>1 then raise exception 'PROOF K12 FEILET: Kat A1 (brukt av B-hjul) ble slettet'; end if;
  if v_a2<>0 then raise exception 'PROOF K12 FEILET: Kat A2 (ubrukt) ble ikke slettet'; end if;
  if v_bkat is distinct from 'dddd0000-0000-0000-0000-0000000000a1' then raise exception 'PROOF K12 FEILET: B-hjul mistet kategori-pekeren'; end if;
  raise notice 'PROOF K12 OK: Kat A1 hoppet over (beholdt), Kat A2 slettet, B-hjul beholdt kategorien.';
end $$;

-- ---- Skolen beholdes, status Tidligere, kontaktfelt intakt ----
do $$
declare v_status text; v_rektor text;
begin
  select status, rektor_navn into v_status, v_rektor from public.skoler where id='11111111-1111-1111-1111-111111111111';
  if v_status is null then raise exception 'PROOF FEILET: skoleraden ble slettet'; end if;
  if v_status<>'Tidligere' then raise exception 'PROOF FEILET: status ikke Tidligere (%)', v_status; end if;
  if v_rektor<>'Rektor AAAX' then raise exception 'PROOF FEILET: kontaktfelt endret'; end if;
  raise notice 'PROOF OK: skoleraden beholdt, status=Tidligere, kontaktfelt intakt.';
end $$;

-- ---- K11: SET NULL for foreldreløse — radene BEHOLDES, bruker_id nullet ----
do $$
declare v_bh_rows int; v_bh_u9null int; v_bl_u9 int; v_ss_rows int; v_ss_u9null int;
begin
  -- bruk_hendelse for A beholdt (3 rader: U1,U4,U9), men U4+U9 sin bruker_id er null
  select count(*) into v_bh_rows from public.bruk_hendelse where skole_id='11111111-1111-1111-1111-111111111111';
  select count(*) into v_bh_u9null from public.bruk_hendelse where skole_id='11111111-1111-1111-1111-111111111111' and bruker_id is null;
  select count(*) into v_bl_u9 from public.brukslogg where skole_id='11111111-1111-1111-1111-111111111111' and bruker_id is null;
  select count(*) into v_ss_rows from public.skoleus_svar where skole_id='11111111-1111-1111-1111-111111111111';
  -- U9 sin rad identifiseres på verdi_tall=5 (bruker_id kan ikke lenger brukes — den er nettopp nullet)
  select count(*) into v_ss_u9null from public.skoleus_svar where skole_id='11111111-1111-1111-1111-111111111111' and verdi_tall=5 and bruker_id is null;
  if v_bh_rows<>3 then raise exception 'PROOF K11 FEILET: bruk_hendelse for A ble slettet (rows=%, forventet 3)', v_bh_rows; end if;
  if v_bh_u9null<>2 then raise exception 'PROOF K11 FEILET: bruker_id ikke nullet for foreldreløse i bruk_hendelse (%, forventet 2 = U4+U9)', v_bh_u9null; end if;
  if v_bl_u9<>1 then raise exception 'PROOF K11 FEILET: brukslogg bruker_id ikke nullet (%, forventet 1)', v_bl_u9; end if;
  if v_ss_rows<>2 then raise exception 'PROOF K11 FEILET: skoleus_svar for A ble slettet (rows=%, forventet 2)', v_ss_rows; end if;
  if v_ss_u9null<>1 then raise exception 'PROOF K11 FEILET: U9 sin skoleus_svar-rad ble ikke beholdt m/ bruker_id nullet (%, forventet 1)', v_ss_u9null; end if;
  raise notice 'PROOF K11 OK: bruk_hendelse/brukslogg/skoleus_svar beholdt, bruker_id nullet for foreldreløse.';
end $$;

-- ---- K10 + PROOF 2: U4/U5/U9 fullstendig slettet; U5 sitt NULL-skole-innhold borte ----
do $$
declare v int; v_u5hjul int; v_u5vurd int;
begin
  select count(*) into v from public.profiles where id in ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006');
  if v<>0 then raise exception 'PROOF 2 FEILET: en foreldreløs profil står igjen (%)', v; end if;
  select count(*) into v from auth.users where id in ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006');
  if v<>0 then raise exception 'PROOF 2 FEILET: en foreldreløs auth-bruker står igjen (%)', v; end if;
  select count(*) into v_u5hjul from public.tl_hjul where id='eeee0000-0000-0000-0000-000000000059';   -- U5 NULL-skole
  select count(*) into v_u5vurd from public.vurderinger where bruker_id='00000000-0000-0000-0000-000000000005';
  if v_u5hjul<>0 or v_u5vurd<>0 then raise exception 'PROOF K10 FEILET: U5 sitt NULL-skole-innhold ble ikke kaskadert bort (hjul=%, vurd=%)', v_u5hjul, v_u5vurd; end if;
  raise notice 'PROOF 2/K10 OK: U4/U5/U9 slettet i profiles+auth; U5 sitt NULL-skole-hjul+vurdering kaskadert bort.';
end $$;

-- ---- BEHOLDES-tabellene urørt (bortsett fra SET NULL) — AAAX står ----
do $$
declare v int;
begin
  select
    (select count(*) from public.kurs_skole where skole_id='11111111-1111-1111-1111-111111111111')                 -- 1
  + (select count(*) from public.kurs_skole_mottaker where navn='HTLA AAAX')      -- 1
  + (select count(*) from public.evalueringer e join public.kurs_skole ks on ks.id=e.kurs_skole_id where ks.skole_id='11111111-1111-1111-1111-111111111111') -- 1
  + (select count(*) from public.skoleus_mottaker where skole_id='11111111-1111-1111-1111-111111111111')            -- 1
  + (select count(*) from public.epost_logg where mottaker_navn like '%AAAX%')    -- 2
  + (select count(*) from public.popularitet_snapshot where skole_id='11111111-1111-1111-1111-111111111111')        -- 1
  + (select count(*) from public.webinar_invitasjon where skole_id='11111111-1111-1111-1111-111111111111')          -- 1
  + (select count(*) from public.webinar_pameldinger where skole_id='11111111-1111-1111-1111-111111111111')         -- 1
  + (select count(*) from public.nyhetsbrev_mottakere where skole_id='11111111-1111-1111-1111-111111111111')        -- 1
  + (select count(*) from public.paameldinger where organisasjonsnummer='111111111') -- 1
  + (select count(*) from public.kulturkort_bestillinger where skolenavn='Skole A AAAX') -- 1
  + (select count(*) from public.vurderinger where skole_id='11111111-1111-1111-1111-111111111111')                 -- U1,U2 = 2
  into v;
  if v<>14 then raise exception 'PROOF FEILET: beholdes-tabeller berørt (sum=%, forventet 14)', v; end if;
  raise notice 'PROOF OK: beholdes-tabeller for A urørt (sum=14); epost_logg IKKE anonymisert; U1/U2 sine vurderinger står.';
end $$;

-- ---- F1/E1 + andre beholdte brukere + skole B urørt ----
do $$
declare v_u2 int; v_u2bs int; v_planB int; v_hjulB int; v_u1 int; v_ui int; v_us int; v_felles int; v_globpop int; v_bsum int;
begin
  select count(*) into v_u2 from public.profiles where id='00000000-0000-0000-0000-000000000002';
  select count(*) into v_u2bs from public.bruker_skole where bruker_id='00000000-0000-0000-0000-000000000002';
  select count(*) into v_planB from public.periodeplan where bruker_id='00000000-0000-0000-0000-000000000002' and skole_id='22222222-2222-2222-2222-222222222222';
  select count(*) into v_hjulB from public.tl_hjul where bruker_id='00000000-0000-0000-0000-000000000002' and skole_id='22222222-2222-2222-2222-222222222222';
  select count(*) into v_u1 from public.profiles where id='00000000-0000-0000-0000-000000000001';
  select count(*) into v_ui from public.profiles where id='00000000-0000-0000-0000-000000000009';
  select count(*) into v_us from public.profiles where id='00000000-0000-0000-0000-000000000008';
  select count(*) into v_felles from public.tl_hjul_kategori where skole_id is null and navn='Kat FELLES';
  select count(*) into v_globpop from public.popularitet_snapshot where skole_id is null;
  select
    (select count(*) from public.skoler where id='22222222-2222-2222-2222-222222222222')
  + (select count(*) from public.bruker_skole where skole_id='22222222-2222-2222-2222-222222222222')       -- U1,U3 = 2
  + (select count(*) from public.periodeplan where skole_id='22222222-2222-2222-2222-222222222222')        -- U3,U2 = 2
  + (select count(*) from public.tl_hjul where skole_id='22222222-2222-2222-2222-222222222222')            -- U3,U2,B→KatA1 = 3
  + (select count(*) from public.tl_deltaker where skole_id='22222222-2222-2222-2222-222222222222')        -- 1
  + (select count(*) from public.tu_runder where skole_id='22222222-2222-2222-2222-222222222222')          -- 1
  + (select count(*) from public.skoleus_mottaker where skole_id='22222222-2222-2222-2222-222222222222')   -- 1
  + (select count(*) from public.kurs_skole where skole_id='22222222-2222-2222-2222-222222222222')         -- 1
  into v_bsum;
  if v_u2<>1 or v_u2bs<>0 or v_planB<>1 or v_hjulB<>1 then raise exception 'PROOF E1 FEILET: U2/plan/hjul (u2=%, bs=%, plan=%, hjul=%)', v_u2,v_u2bs,v_planB,v_hjulB; end if;
  if v_u1<>1 or v_ui<>1 or v_us<>1 then raise exception 'PROOF 3 FEILET: U1/UI/US ble slettet'; end if;
  if v_felles<>1 then raise exception 'PROOF 3 FEILET: felles kategori slettet'; end if;
  if v_globpop<>1 then raise exception 'PROOF 3 FEILET: global popularitet berørt'; end if;
  if v_bsum<>12 then raise exception 'PROOF 3 FEILET: skole B ikke intakt (sum=%, forventet 12)', v_bsum; end if;
  raise notice 'PROOF E1/3 OK: U2 beholdt (A-kobling fjernet, plan+hjul på B overlevde); U1/UI/US beholdt; felles+global urørt; skole B intakt (sum=12).';
end $$;

\echo '================ ALLE PROOFS BESTÅTT ================'
