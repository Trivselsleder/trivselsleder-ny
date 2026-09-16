-- Lokal RLS/oppførsel-test for Min side-migrasjonene 130–135.
-- Kjøres mot en base der 121,125,130–135 er kjørt (prod-tro mal 001–129). Aldri prod/øvingskopi.
-- Utvidet 16. sep etter kontroll-funn: F1 (skolegrense), F2 (PK-navn), K2 (bytte plass),
-- K3 (skjult rad), K4 (unik rekkefølge + omrokering), K5 (on delete set null), K6 (https-lenke).
\set ON_ERROR_STOP on
\pset pager off

-- SA = skoleadmin (koblet til SK) · AN = ansatt (TL AS, RA) · SK/SK2 = skoler · KP = kastbar profil (K5)
\set SA  '''00000000-0000-0000-0000-0000000000aa'''
\set AN  '''00000000-0000-0000-0000-0000000000bb'''
\set KP  '''00000000-0000-0000-0000-0000000000cc'''
\set SK  '''11111111-1111-1111-1111-1111111111aa'''
\set SK2 '''11111111-1111-1111-1111-1111111111bb'''

begin;
insert into auth.users (id) values (:SA),(:AN),(:KP);
insert into public.profiles (id, navn, rolle, epost) values
  (:SA, 'Skoleadmin Test', 'skoleadmin', 'sa@skole.no'),
  (:AN, 'Ansatt Test',     'ansatt',     'an@trivselsleder.no'),
  (:KP, 'Kastbar Ansatt',  'ansatt',     'kp@trivselsleder.no');
insert into public.skoler (id, navn, nettverk) values
  (:SK,  'Testskole Vest', 'Nettverk Vest'),
  (:SK2, 'Testskole Ost',  'Nettverk Ost');
-- SA er koblet KUN til SK (ikke SK2). aktiv defaulter til true.
insert into public.bruker_skole (bruker_id, skole_id, rolle) values (:SA, :SK, 'skoleadmin');
-- AN er RA for begge nettverk (én RA kan eie flere; nettverk er PK).
insert into public.nettverk_ansvarlig (nettverk, bruker_id) values
  ('Nettverk Vest', :AN),
  ('Nettverk Ost',  :AN);
-- Ett testdokument så T4 kan teste dokumentfavoritt (favoritter.dokument_id → dokumenter).
insert into public.dokumenter (tittel, status) values ('Testdokument Min side', 'publisert');
commit;

\echo '===== T1: skoleadmin kan IKKE endre global konfig (RLS with_check) ====='
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  declare v_blokk int := 0;
  begin
    begin insert into public.minside_seksjon (seksjon,tittel,rekkefolge) values ('hack','x',99);
    exception when insufficient_privilege then v_blokk := v_blokk+1; end;
    begin update public.minside_seksjon set synlig=false where seksjon='aktuelt';
      if not found then v_blokk := v_blokk+1; end if;   -- RLS skjuler raden for skriving → 0 rader
    exception when insufficient_privilege then v_blokk := v_blokk+1; end;
    begin insert into public.minside_aktuelt (overskrift) values ('hack');
    exception when insufficient_privilege then v_blokk := v_blokk+1; end;
    begin insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge) values ('2026-02','x',10,'https://klubben.no',1);
    exception when insufficient_privilege then v_blokk := v_blokk+1; end;
    if v_blokk < 4 then raise exception 'T1 FEILET: skoleadmin fikk endre global konfig (blokk=%/4)', v_blokk; end if;
    raise notice 'T1 OK: skoleadmin ble blokkert på alle fire skrive-forsøk.';
  end $$;
  reset role;
rollback;

\echo '===== T2: ansatt KAN endre global konfig ====='
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000bb';
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  begin
    insert into public.minside_aktuelt (overskrift, tekst) values ('Velkommen', 'Tekst');
    update public.minside_seksjon set synlig = false where seksjon = 'brukt_naa';
    insert into public.minside_mest_kjopt (maaned,navn,pris,forpris,lenke,rekkefolge)
      values ('2026-02','Kjeglesett',199,249,'https://klubben.no/kjegler',1);
    if (select count(*) from public.minside_aktuelt) < 1 then raise exception 'T2 FEILET: aktuelt ikke lagret'; end if;
    raise notice 'T2 OK: ansatt fikk opprette aktuelt, endre rekkefølge/synlighet og legge inn mest kjøpt.';
  end $$;
  reset role;
rollback;

\echo '===== T3: skoler LESER global konfig (synlige seksjoner) ====='
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  declare v int;
  begin
    select count(*) into v from public.minside_seksjon;   -- skal se alle 6
    if v <> 6 then raise exception 'T3 FEILET: skole ser ikke seksjonene (%/6)', v; end if;
    raise notice 'T3 OK: skole leser % seksjoner.', v;
  end $$;
  reset role;
rollback;

\echo '===== T4: favoritt på DOKUMENT virker under RLS; ENTEN/ELLER biter ====='
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  declare v_dok uuid; v_bit boolean := false;
  begin
    select id into v_dok from public.dokumenter limit 1;
    if v_dok is null then raise notice 'T4 HOPPET: ingen dokumenter i basen'; return; end if;
    insert into public.favoritter (bruker_id, dokument_id) values ('00000000-0000-0000-0000-0000000000aa', v_dok);
    if not exists (select 1 from public.favoritter where dokument_id = v_dok) then
      raise exception 'T4 FEILET: dokumentfavoritt ble ikke lagret';
    end if;
    begin
      insert into public.favoritter (bruker_id, ressurs_id, dokument_id)
      values ('00000000-0000-0000-0000-0000000000aa', (select id from public.ressurser limit 1), v_dok);
    exception when check_violation then v_bit := true; end;
    if not v_bit then raise exception 'T4 FEILET: ENTEN/ELLER-CHECK bet ikke'; end if;
    raise notice 'T4 OK: dokumentfavoritt lagret; ENTEN/ELLER-CHECK biter.';
  end $$;
  reset role;
rollback;

\echo '===== T5 (F1): hent_regionansvarlig respekterer skolegrensen ====='
-- T5a egen skole → RA · T5b annen skole (som HAR RA) → 0 rader · T5c ansatt → ser alle
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';   -- SA
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  declare v_navn text; v_epost text; v_n int;
  begin
    -- T5a: SA slår opp EGEN skole (SK) → skal få RA (navn + innloggings-e-post, K1).
    select navn, epost into v_navn, v_epost
      from public.hent_regionansvarlig('11111111-1111-1111-1111-1111111111aa');
    if v_navn is distinct from 'Ansatt Test' or v_epost is distinct from 'an@trivselsleder.no' then
      raise exception 'T5a FEILET: egen skole ga (%/%)', v_navn, v_epost;
    end if;
    raise notice 'T5a OK: egen skole gir RA % <%>.', v_navn, v_epost;

    -- T5b: SA slår opp ANNEN skole (SK2), som HAR en RA → skal få 0 rader (skolegrensen).
    select count(*) into v_n from public.hent_regionansvarlig('11111111-1111-1111-1111-1111111111bb');
    if v_n <> 0 then raise exception 'T5b FEILET: SA fikk RA for en skole hen ikke er koblet til (% rader)', v_n; end if;
    raise notice 'T5b OK: annen skole gir 0 rader selv om den har RA.';
  end $$;
  reset role;

  -- T5c: ansatt (AN) slår opp SK2 → skal få RA (TL-ansatt ser alle skoler).
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000bb';   -- AN
  set local role authenticated;
  do $$
  declare v_navn text;
  begin
    select navn into v_navn from public.hent_regionansvarlig('11111111-1111-1111-1111-1111111111bb');
    if v_navn is distinct from 'Ansatt Test' then raise exception 'T5c FEILET: ansatt fikk ikke RA for SK2 (%)', v_navn; end if;
    raise notice 'T5c OK: ansatt ser RA for alle skoler.';
  end $$;
  reset role;
rollback;

\echo '===== T6 (F2): 132-sperren stopper med klartekst når PK mangler ====='
-- Fila leser PK-navnet fra pg_constraint og reiser unntak hvis det er NULL. Vi beviser at
-- oppslaget gir NULL for en tabell uten PK (da ville forutsetningssperren stoppet med klartekst).
begin;
  create temp table _f2_ingen_pk (a int);
  do $$
  declare v_pk text;
  begin
    select conname into v_pk from pg_constraint
      where conrelid = '_f2_ingen_pk'::regclass and contype = 'p';
    if v_pk is not null then raise exception 'T6 FEILET: fant en PK der ingen finnes (%)', v_pk; end if;
    raise notice 'T6 OK: PK-oppslag gir NULL uten PK → 132-sperren ville stoppet med klartekst.';
  end $$;
rollback;

\echo '===== T7 (K2): bytte plass på to Mest kjøpt-rader i ÉN transaksjon ====='
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000bb';   -- AN (ansatt skriver)
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  declare a uuid; b uuid;
  begin
    insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge)
      values ('2026-05','Lek A',10,'https://klubben.no/a',1) returning id into a;
    insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge)
      values ('2026-05','Lek B',10,'https://klubben.no/b',2) returning id into b;
    -- Bytt 1↔2. Constraint er DEFERRABLE INITIALLY DEFERRED → transient kollisjon er tillatt.
    update public.minside_mest_kjopt set rekkefolge = 2 where id = a;
    update public.minside_mest_kjopt set rekkefolge = 1 where id = b;
    -- Tving den utsatte unik-sjekken nå (uten commit) — konsistent slutt-tilstand skal passere.
    set constraints minside_mest_kjopt_maaned_rekkefolge_uniq immediate;
    if (select rekkefolge from public.minside_mest_kjopt where id = a) <> 2
       or (select rekkefolge from public.minside_mest_kjopt where id = b) <> 1 then
      raise exception 'T7 FEILET: byttet ga feil slutt-tilstand';
    end if;
    raise notice 'T7 OK: bytte rad 1↔2 i én transaksjon gikk.';
  end $$;
  reset role;
rollback;

\echo '===== T8 (K3): skole ser ikke SKJULT Mest kjøpt-rad; ansatt ser den ====='
begin;
  -- Legg inn én synlig + én skjult rad som ansatt.
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000bb';   -- AN
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge,synlig) values
    ('2026-06','Synlig lek', 10,'https://klubben.no/s',1,true),
    ('2026-06','Skjult lek', 10,'https://klubben.no/h',2,false);
  do $$
  declare v_ansatt int;
  begin
    select count(*) into v_ansatt from public.minside_mest_kjopt where maaned='2026-06';
    if v_ansatt <> 2 then raise exception 'T8 FEILET: ansatt ser ikke begge radene (%/2)', v_ansatt; end if;
  end $$;
  reset role;
  -- Skoleadmin skal KUN se den synlige.
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000aa';   -- SA
  set local role authenticated;
  do $$
  declare v_skole int; v_skjult int;
  begin
    select count(*) into v_skole  from public.minside_mest_kjopt where maaned='2026-06';
    select count(*) into v_skjult from public.minside_mest_kjopt where maaned='2026-06' and synlig=false;
    if v_skole <> 1 or v_skjult <> 0 then
      raise exception 'T8 FEILET: skole ser skjult rad (synlige=%, skjulte=%)', v_skole, v_skjult;
    end if;
    raise notice 'T8 OK: skole ser kun synlig rad; ansatt ser begge.';
  end $$;
  reset role;
rollback;

\echo '===== T9 (K4): to like rekkefølgetall avvises; omrokering i én transaksjon går ====='
begin;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000bb';   -- AN
  set local request.jwt.claim.role = 'authenticated';
  set local role authenticated;
  do $$
  declare v_avvist boolean := false; v_a int; v_n int;
  begin
    -- Duplikat: sett 'nominasjon'(4) til 3 → kolliderer med 'aktuelt'(3). Immediate → avvises nå.
    begin
      set constraints minside_seksjon_rekkefolge_uniq immediate;
      update public.minside_seksjon set rekkefolge = 3 where seksjon = 'nominasjon';
    exception when unique_violation then v_avvist := true;
    end;
    if not v_avvist then raise exception 'T9 FEILET: duplikat rekkefølge ble ikke avvist'; end if;

    -- Omrokering i én transaksjon: bytt 'aktuelt'(3) ↔ 'nominasjon'(4). Deferred → tillatt.
    set constraints minside_seksjon_rekkefolge_uniq deferred;
    update public.minside_seksjon set rekkefolge = 4 where seksjon = 'aktuelt';
    update public.minside_seksjon set rekkefolge = 3 where seksjon = 'nominasjon';
    set constraints minside_seksjon_rekkefolge_uniq immediate;   -- tving sjekken
    select rekkefolge into v_a from public.minside_seksjon where seksjon = 'aktuelt';
    select rekkefolge into v_n from public.minside_seksjon where seksjon = 'nominasjon';
    if v_a <> 4 or v_n <> 3 then raise exception 'T9 FEILET: omrokering ga (aktuelt=%, nominasjon=%)', v_a, v_n; end if;
    raise notice 'T9 OK: duplikat avvist; omrokering i én transaksjon gikk.';
  end $$;
  reset role;
rollback;

\echo '===== T10 (K5): sletting av profil nuller oppdatert_av (on delete set null) ====='
begin;
  -- Kjøres som eier (superbruker) — vi tester FK-adferden, ikke RLS. KP er kastbar profil.
  insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge,oppdatert_av)
    values ('2026-07','KP-lek',10,'https://klubben.no/kp',1,'00000000-0000-0000-0000-0000000000cc');
  delete from public.profiles where id = '00000000-0000-0000-0000-0000000000cc';
  do $$
  declare v_av uuid; v_finnes boolean;
  begin
    select oppdatert_av into v_av from public.minside_mest_kjopt where maaned='2026-07' and navn='KP-lek';
    if v_av is not null then raise exception 'T10 FEILET: oppdatert_av ble ikke nullet (%)', v_av; end if;
    if not exists (select 1 from public.minside_mest_kjopt where maaned='2026-07' and navn='KP-lek') then
      raise exception 'T10 FEILET: raden forsvant (skulle beholdes med null-stempel)';
    end if;
    raise notice 'T10 OK: sletting av profil nullet oppdatert_av, raden består.';
  end $$;
rollback;

\echo '===== T11 (K6): Mest kjøpt-lenke må starte med https:// ====='
begin;
  do $$
  declare v_avvist boolean := false;
  begin
    begin
      insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge)
        values ('2026-08','Usikker',10,'http://klubben.no/x',1);
    exception when check_violation then v_avvist := true;
    end;
    if not v_avvist then raise exception 'T11 FEILET: http-lenke ble tillatt'; end if;
    -- https skal fortsatt gå.
    insert into public.minside_mest_kjopt (maaned,navn,pris,lenke,rekkefolge)
      values ('2026-08','Trygg',10,'https://klubben.no/x',1);
    raise notice 'T11 OK: http avvist, https tillatt.';
  end $$;
rollback;

-- opprydding av testbrukere/-skoler/-dokument
delete from public.favoritter where bruker_id in (:SA, :AN, :KP);
delete from public.dokumenter where tittel = 'Testdokument Min side';
delete from public.nettverk_ansvarlig where nettverk in ('Nettverk Vest', 'Nettverk Ost');
delete from public.bruker_skole where skole_id in (:SK, :SK2);
delete from public.skoler where id in (:SK, :SK2);
delete from public.profiles where id in (:SA, :AN, :KP);
delete from auth.users where id in (:SA, :AN, :KP);
\echo '===== ALLE MIN SIDE-TESTER BESTÅTT ====='
