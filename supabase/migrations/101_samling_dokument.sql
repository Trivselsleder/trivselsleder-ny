-- 101_samling_dokument.sql
-- ============================================================================
-- STRUKTUR: koblingstabell samling_dokument (samling <-> dokument), m2m.
-- ============================================================================
-- Bygger paa claude_101-102-SPESIFIKASJON-4sep.md DEL 101 (autoritativ).
-- Speiler samling_ressurs (029/030/032) og ressurs_dokument (091B):
--   komposit-PK, begge FK on delete cascade, indeks paa "den andre" kolonnen,
--   RLS + p_les (synlig-gate) / p_skriv (fase3_intern), grant authenticated/service_role.
-- REN struktur: INGEN seed, INGEN data-flytting (importens steg 11 fyller rader senere).
-- Additiv, idempotent, EN transaksjon. Ingen sekvens (noeklene er uuid fra eierne).
-- Kvittering nederst: tabellen finnes, 0 rader, 2 policyer, 1 indeks.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) TABELL (som samling_ressurs 029 / ressurs_dokument 091B)
-- ----------------------------------------------------------------------------
create table if not exists samling_dokument (
  samling_id  uuid     not null references samlinger(id)  on delete cascade,
  dokument_id uuid     not null references dokumenter(id) on delete cascade,
  rekkefolge  smallint not null default 0,
  primary key (samling_id, dokument_id)
);

-- ----------------------------------------------------------------------------
-- 2) INDEKS paa "den andre" kolonnen (samling_id er dekket av PK som foerste kolonne)
--    Speiler idx_samling_ressurs / idx_ressurs_dokument_dokument.
-- ----------------------------------------------------------------------------
create index if not exists idx_samling_dokument_dokument
  on samling_dokument (dokument_id);

-- ----------------------------------------------------------------------------
-- 3) RLS + GRANT (speiler samling_ressurs: RLS 032, GRANT 030)
--    Ingen sekvens aa revoke -- uuid-noekler, ingen identity/_id_seq.
-- ----------------------------------------------------------------------------
alter table samling_dokument enable row level security;

grant select, insert, update, delete on samling_dokument to authenticated, service_role;
-- Supabase default privileges gir anon Dxtm (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) paa enhver
-- ny tabell FOER migrasjonen -- "ikke grant til anon" fjerner det IKKE. revoke er linja som
-- stenger det (formen fra 063/077/095/100; feilen som felte 100 rev 1). IKKE fjern denne.
revoke all on public.samling_dokument from anon;

-- Policyer -- speil samling_ressurs (p_les synlig-gate 032; p_skriv fase3_intern 030):
drop policy if exists p_les on samling_dokument;
create policy p_les on samling_dokument for select to authenticated
  using (exists (select 1 from samlinger s
                 where s.id = samling_dokument.samling_id
                   and (s.synlig or fase3_intern())));

drop policy if exists p_skriv on samling_dokument;
create policy p_skriv on samling_dokument for all to authenticated
  using (fase3_intern()) with check (fase3_intern());

commit;

-- ============================================================================
-- KVITTERING (Kjartan, Supabase SQL-editor, kun lesing, eget kjoer etter 101)
-- Forventet: tabell finnes · 0 rader · 2 policyer · rowsecurity=true · 1 indeks
-- ============================================================================
-- 1) Tabellen finnes -> ikke NULL
select to_regclass('public.samling_dokument') as tabell_finnes;

-- 2) Ingen rader ennaa (fylles ved import) -> 0
select count(*) as rader from samling_dokument;

-- 3) RLS paa + antall policyer -> 2, rowsecurity=true
select
  (select count(*) from pg_policies where schemaname='public' and tablename='samling_dokument') as antall_policyer,
  (select rowsecurity from pg_tables where schemaname='public' and tablename='samling_dokument') as rls_paa;

-- 4) Indeksen finnes -> 1 rad (idx_samling_dokument_dokument)
select indexname from pg_indexes
  where schemaname='public' and tablename='samling_dokument'
  order by indexname;
