-- 090_kompetansemaal_identitet.sql  (RETTET etter Fable-kontroll 2. sep 2026)
-- ============================================================================
-- ETAPPE 5, MIGRASJON 1 av 6 (FASE 3): KOMPETANSEMÅL — VERSJONERT IDENTITET
-- ============================================================================
-- HVA: (1) utvider `kompetansemaal` additivt med Udir-identitet (uri),
--      laereplanversjon + laereplan_kode, utgatt, missing_since, tre nullable
--      målform-felt med betinget CHECK, og Udirs relasjoner samme_som/gjenbruk_av;
--      (2) lager koblingstabellen `kompetansemaal_trinn` med RLS som speiler
--      taksonomi-policyene på `kompetansemaal` (030/032).
-- IKKE MED (bevisst): koblingstilstander/forslagstabell → 092 (trenger
--      import_kjoring fra 091); kilde_tid → 091 (sammen med kategorier/utstyr);
--      fag_id for Udir-mål → 097.
-- TALL (talt i data/udir/lk20-kompetansemaal.json, 2. sep): 1 410 mål, 1 410 unike
--      uri; 176 mål på flere trinn; 1 398 med bokmål, 569 nynorsk, 1 410 default;
--      1 191 med gjenbruk-av; ~302 eksisterende rader, alle med tekst, ingen med uri.
-- NAVN: laereplanversjon ('LK20'/'LK06') — IKKE laereplan_versjon, som er en
--      CSV-kolonne med revisjonsnummer ('02'…'08'). Revisjonen ligger i
--      laereplan_kode ('MAT01-06').
-- IMPORTREGEL (må inn i skriptet): Udir-mål = 1 410 NYE rader; de ~302 gamle
--      radene får ALDRI uri — treff kobles via erstattet_av, utgåtte får
--      utgatt=true + laereplanversjon='LK06'. aarstrinnN → trinn.kode 'N';
--      vg1/vg2/vg3/påbygning hoppes over.
-- EGENSKAPER: Additiv · Idempotent · ÉN transaksjon.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) UTVID kompetansemaal (additivt, idempotent)
-- ----------------------------------------------------------------------------

-- Udirs URI — den ekte nøkkelen (ikke koden).
alter table kompetansemaal add column if not exists uri text;

-- Læreplanverk: 'LK20' / 'LK06'. (Svensk Lgr22 senere = utvid CHECK-en under.)
alter table kompetansemaal add column if not exists laereplanversjon text;

-- Udirs versjonerte læreplankode, f.eks. 'MAT01-06'. Grunnlaget for fag-mappingen i 097.
alter table kompetansemaal add column if not exists laereplan_kode text;

-- Mål som ikke lenger finnes i gjeldende læreplan. EGEN kolonne — ikke `ukoblet`.
alter table kompetansemaal add column if not exists utgatt boolean not null default false;

-- Dato da en lagret URI forsvant fra Udir ved en SENERE synk. Fylles ikke nå.
alter table kompetansemaal add column if not exists missing_since date;

-- Målform — alle tre NULLABLE (841 mangler nynorsk, 12 mangler bokmål).
alter table kompetansemaal add column if not exists tekst_nb text;
alter table kompetansemaal add column if not exists tekst_nn text;
alter table kompetansemaal add column if not exists tekst_default text;

-- Udirs relasjoner (full URI, ikke FK — målene de peker på ligger ikke i vår tabell).
alter table kompetansemaal add column if not exists samme_som text;
alter table kompetansemaal add column if not exists gjenbruk_av text;

-- Unik indeks på uri, partiell: de ~302 gamle radene har NULL og berøres ikke.
create unique index if not exists uq_kompetansemaal_uri
  on kompetansemaal (uri)
  where uri is not null;

-- CHECK 1: et Udir-mål (uri satt) må ha tekst i minst én målform.
-- Betinget på `uri is null` så de gamle radene (kun `tekst`) er unntatt.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'km_maalform_minst_ett'
      and conrelid = 'public.kompetansemaal'::regclass
  ) then
    alter table kompetansemaal
      add constraint km_maalform_minst_ett
      check (
        uri is null
        or btrim(coalesce(tekst_nb, '')) <> ''
        or btrim(coalesce(tekst_nn, '')) <> ''
        or btrim(coalesce(tekst_default, '')) <> ''
      );
  end if;
end $$;

-- CHECK 2: laereplanversjon er ett av de kjente verkene (eller tom).
-- Stopper høyt om et importskript skriver CSV-ens '06' hit ved et uhell.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'km_laereplanversjon_gyldig'
      and conrelid = 'public.kompetansemaal'::regclass
  ) then
    alter table kompetansemaal
      add constraint km_laereplanversjon_gyldig
      check (laereplanversjon is null or laereplanversjon in ('LK06', 'LK20'));
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2) KOBLINGSTABELL kompetansemaal_trinn (ett mål → flere årstrinn)
-- ----------------------------------------------------------------------------
-- `kompetansemaal.trinn_id` beholdes urørt, men fylles IKKE av importen.
-- Cascade fra kompetansemaal; ingen cascade fra trinn (stabil taksonomi —
-- sletting av et trinn skal feile, ikke stille fjerne koblinger).
create table if not exists kompetansemaal_trinn (
  kompetansemaal_id integer  not null references kompetansemaal(id) on delete cascade,
  trinn_id          smallint not null references trinn(id),
  primary key (kompetansemaal_id, trinn_id)
);

create index if not exists idx_kmt_trinn on kompetansemaal_trinn (trinn_id);

-- ----------------------------------------------------------------------------
-- 3) RETTIGHETER + RLS (speiler taksonomi-mønsteret i 030 linje 19–36 og 032)
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on kompetansemaal_trinn to authenticated, service_role;

alter table kompetansemaal_trinn enable row level security;

drop policy if exists p_les on kompetansemaal_trinn;
create policy p_les on kompetansemaal_trinn
  for select to authenticated
  using (true);

drop policy if exists p_skriv on kompetansemaal_trinn;
create policy p_skriv on kompetansemaal_trinn
  for all to authenticated
  using (fase3_super())
  with check (fase3_super());

commit;

-- FØR 090: noter dette tallet (forvent ~302). Samme spørring kjøres etter (blokk C, nr 4).
select count(*) as antall_maal_foer from kompetansemaal;

-- C1) Nye kolonner finnes. Forvent i lista: uri, laereplanversjon, laereplan_kode,
--     utgatt, missing_since, tekst_nb, tekst_nn, tekst_default, samme_som, gjenbruk_av.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'kompetansemaal'
order by ordinal_position;

-- C2) Unik indeks finnes, partiell. Forvent: én rad, indexdef slutter med WHERE (uri IS NOT NULL).
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'kompetansemaal'
  and indexname = 'uq_kompetansemaal_uri';

-- C3) Begge CHECK-ene finnes. Forvent: km_laereplanversjon_gyldig og km_maalform_minst_ett.
select conname, pg_get_constraintdef(oid) as definisjon
from pg_constraint
where conrelid = 'public.kompetansemaal'::regclass and contype = 'c'
order by conname;

-- C4) Ingen datatap. Forvent: antall_maal = tallet fra blokk A; med_uri = 0; merket_utgatt = 0.
select count(*) as antall_maal,
       count(*) filter (where uri is not null) as med_uri,
       count(*) filter (where utgatt)          as merket_utgatt
from kompetansemaal;

-- C5) CHECK-en BITER. Forvent: "Success" (ingen rader). Får du en feilmelding som
--     begynner med FEIL:, stopp. Testraden rulles alltid tilbake — ingenting lagres.
do $$
begin
  begin
    insert into kompetansemaal (uri, tekst) values ('urn:test:090:check', 'test');
    raise exception 'FEIL: km_maalform_minst_ett stoppet IKKE en Udir-rad uten målform';
  exception when check_violation then
    null; -- riktig: CHECK-en stoppet raden
  end;
  begin
    insert into kompetansemaal (uri, tekst, tekst_nb, laereplanversjon)
      values ('urn:test:090:versjon', 'test', 'test', '06');
    raise exception 'FEIL: km_laereplanversjon_gyldig stoppet IKKE verdien ''06''';
  exception when check_violation then
    null; -- riktig
  end;
end $$;

-- C6) Den unike indeksen BITER. Forvent: "Success". Testradene rulles alltid tilbake.
do $$
begin
  begin
    insert into kompetansemaal (uri, tekst, tekst_nb)
      values ('urn:test:090:unik', 'test', 'test'), ('urn:test:090:unik', 'test', 'test');
    raise exception 'FEIL: uq_kompetansemaal_uri stoppet IKKE to rader med samme uri';
  exception when unique_violation then
    null; -- riktig
  end;
end $$;

-- C7) kompetansemaal_trinn: struktur. Forvent: kompetansemaal_id integer NO, trinn_id smallint NO.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'kompetansemaal_trinn'
order by ordinal_position;

-- C8) RLS PÅ + begge policyer. Forvent: relrowsecurity = true.
select relname, relrowsecurity
from pg_class
where oid = 'public.kompetansemaal_trinn'::regclass;

-- C9) Policyene. Forvent to rader: p_les (SELECT, qual = true) og
--     p_skriv (ALL, qual = fase3_super(), with_check = fase3_super()).
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'kompetansemaal_trinn'
order by policyname;

-- C10) Koblingstabellen er tom før import. Forvent: 0.
select count(*) as antall_koblinger from kompetansemaal_trinn;
