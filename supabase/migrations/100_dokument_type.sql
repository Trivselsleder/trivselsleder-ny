-- 100_dokument_type.sql
-- ============================================================================
-- STRUKTUR: ny oppslagstabell dokument_type (mappe-hierarki), speiler kategorier.
-- ============================================================================
-- Bygger paa claude_100-DOKUMENTTYPE-SPESIFIKASJON-4sep.md (autoritativ).
-- Mønstre: tabell som kategorier (023), kilde_tid som 091, RLS/GRANT som 030.
-- 51 rader seedes med fast kilde_tid (Drupal term-id) i TO PASS:
--   Pass 1: alle 51 rader med forelder_id = NULL (ingen FK-referanser -> rekkefolge likegyldig).
--   Pass 2: sett forelder_id per barn ved oppslag paa forelderens kilde_tid.
-- Forelder loest paa papir fra CSV (entydige navn); de to tvetydige 'Informasjon'-
-- barna 911 og 1231 -> forelder-kilde_tid 905 (Kjartans beslutning 4. sep).
-- Additiv, idempotent (insert..where not exists / update med is distinct from). EN transaksjon.
-- Kvittering nederst: 51 / 8 / 2 / 0 / 0.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) TABELL (som kategorier: id identity, navn, forelder_id self-FK, rekkefolge) + kilde_tid (091)
-- forelder_id: on delete restrict skrevet EKSPLISITT — samme oppfoersel som kategoriers
-- implisitte NO ACTION, men gjort synlig (begrunnet avvik, spec seksjon 2).
-- ----------------------------------------------------------------------------
create table if not exists dokument_type (
  id          integer primary key generated always as identity,
  navn        text    not null,
  forelder_id integer references dokument_type(id) on delete restrict,
  rekkefolge  smallint not null default 0
);

alter table dokument_type add column if not exists kilde_tid integer;

-- ----------------------------------------------------------------------------
-- 2) INDEKSER / VERN
-- ----------------------------------------------------------------------------
-- kilde_tid unikt der satt (091-mønster; alle 51 seedes med tid, men partiell form beholdes).
create unique index if not exists uq_dokument_type_kilde_tid
  on dokument_type (kilde_tid) where kilde_tid is not null;

-- Oppslag: hvilke undermapper har denne mappa + FK-oppslag.
create index if not exists idx_dokument_type_forelder
  on dokument_type (forelder_id);

-- MERK: dublettvernet uq_dokument_type_forelder_lnavn opprettes FOERST ETTER pass 2 (seksjon 6).
-- Grunn (F6): i pass 1 er forelder_id = NULL paa alle 51, og med 'nulls not distinct' ville
-- gjentatte navn (Kurshefter x3, Informasjon x3, Manualer x2, Tilleggsmateriale x2) kollidert
-- allerede ved innsetting. Foerst naar pass 2 har satt forelder_id er (forelder_id, lower(navn)) unik.

-- ----------------------------------------------------------------------------
-- 3) RLS + GRANT (speiler kategorier/utstyr/egnet_kategori fra 030 — huseid taksonomi, IKKE anon)
-- ----------------------------------------------------------------------------
alter table dokument_type enable row level security;

grant select, insert, update, delete on dokument_type to authenticated, service_role;
-- Husregel 5: Supabase default privileges gir anon ALL paa nye tabeller -> revoke raatt (som 063/077/078).
revoke all on public.dokument_type from anon;
-- dokument_type fantes ikke da 030 kjoerte -> identitets-sekvensen trenger grant her.
grant usage, select on all sequences in schema public to authenticated, service_role;
-- Default privileges gir anon ALL ogsaa paa den nye identitets-sekvensen -> revoke den ogsaa.
revoke all on sequence public.dokument_type_id_seq from anon;

drop policy if exists p_les on dokument_type;
create policy p_les on dokument_type for select to authenticated using (true);
drop policy if exists p_skriv on dokument_type;
create policy p_skriv on dokument_type for all to authenticated using (fase3_super()) with check (fase3_super());

-- ----------------------------------------------------------------------------
-- 4) SEED — PASS 1: alle 51 rader, forelder_id = NULL, idempotent paa kilde_tid
-- ----------------------------------------------------------------------------
insert into dokument_type (kilde_tid, navn, rekkefolge) select 2, 'Aktiv læring', 0 where not exists (select 1 from dokument_type where kilde_tid = 2);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 901, 'Drift av TL', 0 where not exists (select 1 from dokument_type where kilde_tid = 901);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 906, 'Kurshefter', 0 where not exists (select 1 from dokument_type where kilde_tid = 906);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 910, 'Tilleggsmateriale til leker', 0 where not exists (select 1 from dokument_type where kilde_tid = 910);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 912, 'Tips og plakater', 0 where not exists (select 1 from dokument_type where kilde_tid = 912);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 908, 'Lekeplakater/A4-beskrivelser', 0 where not exists (select 1 from dokument_type where kilde_tid = 908);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 904, 'Trivselspatruljen', 0 where not exists (select 1 from dokument_type where kilde_tid = 904);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1239, 'Plakater', 0 where not exists (select 1 from dokument_type where kilde_tid = 1239);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 37, 'Valgfag', 0 where not exists (select 1 from dokument_type where kilde_tid = 37);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 38, 'Turneringer og TL-Mester', 0 where not exists (select 1 from dokument_type where kilde_tid = 38);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 913, 'Nominasjon, søknad og advarsel', 0 where not exists (select 1 from dokument_type where kilde_tid = 913);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 914, 'Fysisk aktivitet og helse', 0 where not exists (select 1 from dokument_type where kilde_tid = 914);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1243, 'TL-mester', 0 where not exists (select 1 from dokument_type where kilde_tid = 1243);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 27, 'Presentasjoner', 0 where not exists (select 1 from dokument_type where kilde_tid = 27);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 900, 'Kurshefter', 0 where not exists (select 1 from dokument_type where kilde_tid = 900);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 925, 'Lek med tema', 0 where not exists (select 1 from dokument_type where kilde_tid = 925);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 29, 'Diplom og attester', 0 where not exists (select 1 from dokument_type where kilde_tid = 29);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 535, 'Verdisamlinger', 0 where not exists (select 1 from dokument_type where kilde_tid = 535);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 920, 'Ukeplaner med lek', 0 where not exists (select 1 from dokument_type where kilde_tid = 920);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 905, 'Informasjon', 0 where not exists (select 1 from dokument_type where kilde_tid = 905);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 919, 'Drift av TP', 0 where not exists (select 1 from dokument_type where kilde_tid = 919);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1235, 'Elevpresentasjoner', 0 where not exists (select 1 from dokument_type where kilde_tid = 1235);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 917, 'Lek og aktivitet', 0 where not exists (select 1 from dokument_type where kilde_tid = 917);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1233, 'Søknad', 0 where not exists (select 1 from dokument_type where kilde_tid = 1233);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 911, 'Informasjon til foresatte', 0 where not exists (select 1 from dokument_type where kilde_tid = 911);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 924, 'Tilleggsmateriale til leker', 0 where not exists (select 1 from dokument_type where kilde_tid = 924);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1230, 'TL-logo', 0 where not exists (select 1 from dokument_type where kilde_tid = 1230);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1232, 'Nominasjon', 0 where not exists (select 1 from dokument_type where kilde_tid = 1232);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 926, 'Invitasjoner', 0 where not exists (select 1 from dokument_type where kilde_tid = 926);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1237, 'Periodeplan', 0 where not exists (select 1 from dokument_type where kilde_tid = 1237);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1238, 'Tips', 0 where not exists (select 1 from dokument_type where kilde_tid = 1238);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1240, 'Ungdomsskole', 0 where not exists (select 1 from dokument_type where kilde_tid = 1240);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1113, 'Søknader om tilskudd', 0 where not exists (select 1 from dokument_type where kilde_tid = 1113);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 902, 'Informasjon', 0 where not exists (select 1 from dokument_type where kilde_tid = 902);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 903, 'Manualer', 0 where not exists (select 1 from dokument_type where kilde_tid = 903);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 915, 'Innsats for andre', 0 where not exists (select 1 from dokument_type where kilde_tid = 915);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 918, 'Informasjon', 0 where not exists (select 1 from dokument_type where kilde_tid = 918);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 923, 'Move-it', 0 where not exists (select 1 from dokument_type where kilde_tid = 923);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1236, 'Oppstartsmøte med trivselsledere', 0 where not exists (select 1 from dokument_type where kilde_tid = 1236);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1241, 'Lederutdanning', 0 where not exists (select 1 from dokument_type where kilde_tid = 1241);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1244, 'Turneringer', 0 where not exists (select 1 from dokument_type where kilde_tid = 1244);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 921, 'Velkommen 1. klasse!', 0 where not exists (select 1 from dokument_type where kilde_tid = 921);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 922, 'Seminar', 0 where not exists (select 1 from dokument_type where kilde_tid = 922);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1167, 'Pratekort', 0 where not exists (select 1 from dokument_type where kilde_tid = 1167);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1231, 'Informasjon om kulturkort', 0 where not exists (select 1 from dokument_type where kilde_tid = 1231);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 1234, 'Advarsel', 0 where not exists (select 1 from dokument_type where kilde_tid = 1234);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 201, 'Julekalender', 0 where not exists (select 1 from dokument_type where kilde_tid = 201);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 907, 'Manualer', 0 where not exists (select 1 from dokument_type where kilde_tid = 907);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 909, 'Kurshefter', 0 where not exists (select 1 from dokument_type where kilde_tid = 909);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 951, 'Aball', 0 where not exists (select 1 from dokument_type where kilde_tid = 951);
insert into dokument_type (kilde_tid, navn, rekkefolge) select 916, 'Takk for innsatsen', 0 where not exists (select 1 from dokument_type where kilde_tid = 916);

-- ----------------------------------------------------------------------------
-- 5) SEED — PASS 2: forelder_id per barn (oppslag paa forelderens kilde_tid), idempotent
-- 43 barn; 8 toppnivaa forblir NULL. 911 og 1231 -> 905 (Kjartans beslutning).
-- ----------------------------------------------------------------------------
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 906 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 910 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 912 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 908 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 912) where kilde_tid = 1239 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 912);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 1240) where kilde_tid = 37 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 1240);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 913 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 37) where kilde_tid = 914 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 37);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 38) where kilde_tid = 1243 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 38);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 27 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 2) where kilde_tid = 900 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 2);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 925 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 29 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 904) where kilde_tid = 535 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 904);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 920 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 905 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 904) where kilde_tid = 919 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 904);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 27) where kilde_tid = 1235 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 27);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 913) where kilde_tid = 1233 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 913);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 905) where kilde_tid = 911 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 905);   -- Kjartan: tvetydig 'Informasjon' -> 905
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 904) where kilde_tid = 924 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 904);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 1230 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 913) where kilde_tid = 1232 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 913);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 926 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 912) where kilde_tid = 1237 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 912);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 912) where kilde_tid = 1238 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 912);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 1113 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 2) where kilde_tid = 902 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 2);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 2) where kilde_tid = 903 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 2);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 37) where kilde_tid = 915 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 37);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 904) where kilde_tid = 918 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 904);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 923 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 27) where kilde_tid = 1236 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 27);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 1240) where kilde_tid = 1241 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 1240);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 38) where kilde_tid = 1244 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 38);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 921 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 905) where kilde_tid = 1231 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 905);   -- Kjartan: tvetydig 'Informasjon' -> 905
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 913) where kilde_tid = 1234 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 913);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 201 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 917) where kilde_tid = 907 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 917);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 904) where kilde_tid = 909 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 904);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 2) where kilde_tid = 951 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 2);
update dokument_type set forelder_id = (select id from dokument_type d2 where d2.kilde_tid = 901) where kilde_tid = 916 and forelder_id is distinct from (select id from dokument_type d3 where d3.kilde_tid = 901);

-- ----------------------------------------------------------------------------
-- 6) DUBLETTVERN — opprettes ETTER pass 2 (F6-retting)
-- Naa har alle 43 barn faatt forelder_id; de 8 toppnivaaene er NULL med ulike navn.
-- (forelder_id, lower(navn)) er dermed unik, og indeksen bygger uten kollisjon.
-- Samme navn er lov under FORSKJELLIGE foreldre, blokkert under SAMME. lower() = case-vern
-- (Move It). nulls not distinct verner ogsaa toppnivaa mot to like navn.
-- ----------------------------------------------------------------------------
create unique index if not exists uq_dokument_type_forelder_lnavn
  on dokument_type (forelder_id, lower(navn)) nulls not distinct;

commit;

-- ============================================================================
-- KVITTERING (Kjartan, Supabase SQL-editor, kun lesing, eget kjoer etter 100)
-- Forventet: 51 · 8 · 2 · 0 · 0 rader
-- ============================================================================
-- 1) Totalt antall rader -> 51
select count(*) as totalt_rader from dokument_type;

-- 2) Antall toppnivaaer (forelder_id null) -> 8
select count(*) as toppnivaaer from dokument_type where forelder_id is null;

-- 3) Antall barn av 905 (Informasjon under Drift av TL) -> 2 (kilde_tid 911 og 1231)
select count(*) as barn_av_905 from dokument_type
  where forelder_id = (select id from dokument_type where kilde_tid = 905);

-- 4) Foreldreloese barn med ugyldig peker -> 0
select count(*) as foreldreloese from dokument_type c
  where c.forelder_id is not null
    and not exists (select 1 from dokument_type p where p.id = c.forelder_id);

-- 5) Dublettvern-sjekk -> 0 rader
select forelder_id, lower(navn) as lnavn, count(*)
  from dokument_type group by 1, 2 having count(*) > 1;

