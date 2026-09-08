-- ============================================================================
-- 103_dokument_koblinger_fagseed.sql
-- ============================================================================
-- Bygger paa claude_103-SPESIFIKASJON-4sep.md (autoritativ). Tre ting:
--   DEL A: dokument_dokumenttype (m2m dokument <-> dokument_type)   [ny tabell]
--   DEL B: dokument_sprak       (dokument <-> sprakkode nb/nn)      [ny tabell]
--   DEL C: fag-seed — alle 12 husfag (idempotent; absorberer 031s 2 testrader)
-- Punkt D (rydding av 031s dokument_fag-testrad) hoerer til testdata-sporet, IKKE hit.
--
-- Hvorfor 103 finnes: dokument-passet (skrivelagets steg 9) er bygget, men kan ikke skrive
-- fordi disse to koblingstabellene mangler (aapent spoersmaal AA2 fra 100-spec, tvunget naa).
-- Nummer: laereplankode->fag skyves til 104 (103 reserverer IKKE 104 — hull stopper porten).
--
-- Moenstre (lest/bygd): 101_samling_dokument.sql + dokument_fag (026/030/032) + fag (023).
-- Revoke-formen ordrett fra claude_ANON-DEFAULT-PRIVILEGES-4sep.md rev 3.
-- Beslutninger (Kjartan 4. sep, laast): INGEN import_kjoring_id paa de to m2m-tabellene
-- (barn med cascade — provenans arves fra dokumenter); fag seedes med ALLE 12; 031-rad ryddes ikke her.
--
-- Additiv, idempotent, EN transaksjon. Ingen sekvens paa de to nye tabellene (komposit-PK).
-- Kvittering nederst.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- DEL A — dokument_dokumenttype (speiler ressurs_kategori/dokument_fag/samling_dokument)
-- ----------------------------------------------------------------------------
create table if not exists dokument_dokumenttype (
  dokument_id      uuid    not null references dokumenter(id)    on delete cascade,
  dokument_type_id integer not null references dokument_type(id) on delete cascade,
  primary key (dokument_id, dokument_type_id)
);

-- Indeks paa "den andre" kolonnen (PK dekker dokument_id som foerste kolonne).
create index if not exists idx_dokument_dokumenttype_type
  on dokument_dokumenttype (dokument_type_id);

alter table dokument_dokumenttype enable row level security;

grant select, insert, update, delete on dokument_dokumenttype to authenticated, service_role;
-- Obligatorisk: anon har Dxtm fra Supabase-defaults foer migrasjonen — "ikke grant" fjerner det ikke.
revoke all on public.dokument_dokumenttype from anon;

-- Ingen sekvens (komposit uuid+int-PK, ingen identity) -> ingen sekvens-revoke.

drop policy if exists p_les on dokument_dokumenttype;
create policy p_les on dokument_dokumenttype for select to authenticated
  using (exists (select 1 from dokumenter d
                 where d.id = dokument_dokumenttype.dokument_id
                   and (d.status = 'publisert' or fase3_intern())));

drop policy if exists p_skriv on dokument_dokumenttype;
create policy p_skriv on dokument_dokumenttype for all to authenticated
  using (fase3_intern()) with check (fase3_intern());

-- ----------------------------------------------------------------------------
-- DEL B — dokument_sprak (dokument <-> sprakkode). Ingen sprak-tabell -> CHECK vokter kodene.
-- ----------------------------------------------------------------------------
create table if not exists dokument_sprak (
  dokument_id uuid not null references dokumenter(id) on delete cascade,
  sprak       text not null,
  primary key (dokument_id, sprak),
  constraint dokument_sprak_sprak_check check (sprak in ('nb','nn'))
);
-- Merk (AA-B1): de 701 resolverte koblingene er nb/nn. Finner importen andre koder, MAA CHECK-en
-- utvides i SAMME operasjon — ellers stopper importen paa CHECK (oensket: ukjent sprak skal ikke skli inn stille).

-- Ingen egen indeks: PK (dokument_id, sprak) dekker oppslagene; 'sprak' alene har for lav
-- selektivitet (to verdier) til aa forsvare en indeks. Bevisst avvik fra A/101.

alter table dokument_sprak enable row level security;

grant select, insert, update, delete on dokument_sprak to authenticated, service_role;
revoke all on public.dokument_sprak from anon;

-- Ingen sekvens (komposit uuid+text-PK).

drop policy if exists p_les on dokument_sprak;
create policy p_les on dokument_sprak for select to authenticated
  using (exists (select 1 from dokumenter d
                 where d.id = dokument_sprak.dokument_id
                   and (d.status = 'publisert' or fase3_intern())));

drop policy if exists p_skriv on dokument_sprak;
create policy p_skriv on dokument_sprak for all to authenticated
  using (fase3_intern()) with check (fase3_intern());

-- ----------------------------------------------------------------------------
-- DEL C — FAG-SEED: alle 12 husfag, ordrett fra frontend (SkoleAktivLaering.jsx).
-- Idempotent per fag (where not exists paa lower(navn)); absorberer 031s 2 testrader
-- (Matematikk, Norsk) uten dublett. Ingen ny tabell/rettighet — fag finnes fra 023.
-- ----------------------------------------------------------------------------
insert into fag (navn) select 'Norsk'                          where not exists (select 1 from fag where lower(navn)=lower('Norsk'));
insert into fag (navn) select 'Matematikk'                     where not exists (select 1 from fag where lower(navn)=lower('Matematikk'));
insert into fag (navn) select 'Engelsk'                        where not exists (select 1 from fag where lower(navn)=lower('Engelsk'));
insert into fag (navn) select 'Naturfag'                       where not exists (select 1 from fag where lower(navn)=lower('Naturfag'));
insert into fag (navn) select 'Samfunnsfag'                    where not exists (select 1 from fag where lower(navn)=lower('Samfunnsfag'));
insert into fag (navn) select 'KRLE'                           where not exists (select 1 from fag where lower(navn)=lower('KRLE'));
insert into fag (navn) select 'Kroppsøving'                    where not exists (select 1 from fag where lower(navn)=lower('Kroppsøving'));
insert into fag (navn) select 'Musikk'                         where not exists (select 1 from fag where lower(navn)=lower('Musikk'));
insert into fag (navn) select 'Kunst og håndverk'              where not exists (select 1 from fag where lower(navn)=lower('Kunst og håndverk'));
insert into fag (navn) select 'Mat og helse'                   where not exists (select 1 from fag where lower(navn)=lower('Mat og helse'));
insert into fag (navn) select 'Bevegelse og kroppslig læring'  where not exists (select 1 from fag where lower(navn)=lower('Bevegelse og kroppslig læring'));
insert into fag (navn) select 'Deltakelse og samspill'         where not exists (select 1 from fag where lower(navn)=lower('Deltakelse og samspill'));

commit;

-- ============================================================================
-- KVITTERING (Kjartan, Supabase SQL-editor, kun lesing, eget kjoer etter 103)
-- Forventet: begge tabeller finnes · 0 rader · 2 policyer · RLS paa · anon select false ·
--   dokument_dokumenttype 2 indekser · dokument_sprak CHECK finnes · fag = 12
-- ============================================================================
-- DEL A
select to_regclass('public.dokument_dokumenttype')                                                        as a_tabell_finnes;
select count(*)                                                                                            as a_rader from dokument_dokumenttype;
select (select count(*) from pg_policies where schemaname='public' and tablename='dokument_dokumenttype')  as a_policyer,
       (select rowsecurity from pg_tables  where schemaname='public' and tablename='dokument_dokumenttype') as a_rls,
       (select count(*) from pg_indexes    where schemaname='public' and tablename='dokument_dokumenttype') as a_indekser,
       has_table_privilege('anon','public.dokument_dokumenttype','select')                                  as a_anon_select;

-- DEL B
select to_regclass('public.dokument_sprak')                                                    as b_tabell_finnes;
select count(*)                                                                                as b_rader from dokument_sprak;
select (select count(*) from pg_policies where schemaname='public' and tablename='dokument_sprak')  as b_policyer,
       (select rowsecurity from pg_tables  where schemaname='public' and tablename='dokument_sprak') as b_rls,
       (select count(*) from pg_constraint where conname='dokument_sprak_sprak_check')               as b_check,
       has_table_privilege('anon','public.dokument_sprak','select')                                  as b_anon_select;

-- DEL C
select count(*) as fag_antall from fag;                          -- forventet 12
select navn from fag order by navn;                             -- skal matche frontend-lista (skrivemaate/case)
