-- 091_importvern.sql
-- ============================================================================
-- ETAPPE 5 (FASE 3): IMPORTVERN — PROVENANS / ANGRE-INFRASTRUKTUR (idé A)
-- ============================================================================
-- HVA: grunnmuren for «angre en hel importkjøring». Rent additivt:
--      (1) ny tabell `import_kjoring` — ett anker per importkjøring;
--      (2) sporingskolonner `kilde_nid` + `import_kjoring_id` på node-tabellene
--          `ressurser`, `dokumenter`, `medier`;
--      (3) samme sporing + `kilde_tid` på `samlinger` (samlinger er også noder);
--      (4) `kilde_tid` på taksonomien importen gjenkjenner node-for-node:
--          `kategorier` og `utstyr`.
--      Ingen leker bygges her — bare hyllene og merkelappene angre henger på.
--
-- KILDE (fasit): claude_091-SPESIFIKASJON-2sep.md, seksjonen
--      «091 — provenans / angre-infrastruktur (idé A, rent additivt)» (de 7 kulepkt).
--
-- IKKE MED (bevisst — annen fil / annen risikoklasse):
--   * 091B (delte dokumenter): `ressurs_dokument`, data-flytting av
--     `dokumenter.ressurs_id`, og cascade→set null. Egen fil, egen kontroll.
--   * valgfri F1-kolonne `import_kjoring_id` på `kategorier`/`utstyr`: spec merker
--     den «valgfri»; oppdraget lister kun `kilde_tid` for disse to. Utelatt her,
--     flagget i byggenotatet (kan ettermonteres som nullable kolonne ved behov).
--   * `kilde_tid` på `kompetansemaal` → 090; på `dokument_type` → 094.
--   * F2 (disable trg_logg) og F3 (fil-opprydding Bunny/Storage) → importskript/drift.
--
-- FORSJEKK (lest i basen i dag, migr 023/024/026/029 — bekreftet):
--   * `ressurser`  : ingen kilde-sporing. + kilde_nid, import_kjoring_id.
--   * `dokumenter` : har `ressurs_id` (rørt IKKE her — 091B), ingen kilde-sporing.
--   * `medier`     : har `ressurs_id NOT NULL`, ingen kilde-sporing.
--   * `samlinger`  : id, type, synlig, rekkefolge, opprettet/endret_av/at — ingen sporing.
--   * `kategorier` : id, navn, forelder_id, rekkefolge — ingen kilde_tid (navn IKKE unik).
--   * `utstyr`     : id, navn (unik) — ingen kilde_tid.
--   Ingen tidligere migrasjon definerer kilde_nid/kilde_tid/import_kjoring_id.
--
-- INDEKSREGLER (nøyaktig som spesifisert):
--   * kilde_nid UNIKT (partiell, der satt) på ressurser, dokumenter, samlinger.
--   * kilde_nid på medier: indeks, men IKKE unik (én lek har flere medier).
--   * kilde_tid UNIKT (partiell, der satt) på samlinger, kategorier, utstyr.
--   * import_kjoring_id: vanlig indeks (angre = delete where import_kjoring_id = X).
--
-- RLS import_kjoring: PÅ. Les superadmin+ansatt (fase3_intern), skriv superadmin
--   (fase3_super). Ingen offentlig tilgang (ingen anon-grant — husets fase3-mønster
--   i migr 030 gir kun authenticated + service_role).
--
-- EGENSKAPER: Additiv · Idempotent (if not exists / drop+create policy) · ÉN transaksjon.
-- MØNSTER: følger 090_kompetansemaal_identitet.sql (nyeste godkjente fasit).
-- NB: kontrollrunde (verifikasjons-SELECT) skrives IKKE her — den er kontrollørens
--     (regel 4). Byggenotatet sier hva kontrolløren bør se etter.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) NY TABELL: import_kjoring  (ett anker per importkjøring)
-- ----------------------------------------------------------------------------
create table if not exists import_kjoring (
  id            uuid        primary key default gen_random_uuid(),
  kilde         text        not null,                       -- hvilken eksport, f.eks. '240826-eksport'
  versjon       text,                                       -- eksportversjon / manifest-merke
  startet_at    timestamptz not null default now(),
  ferdig_at     timestamptz,                                -- settes ved commit
  status        text        not null default 'paagaar'
                            check (status in ('paagaar','ferdig','rullet_tilbake')),
  antall_noder  integer,                                    -- kontrolltall mot manifest
  utfort_av     uuid        references profiles(id),
  notat         text
);

-- Rettigheter + RLS (speiler fase3-mønsteret i migr 030: authenticated + service_role,
-- INGEN anon). Les: intern (superadmin/ansatt). Skriv: kun superadmin.
grant select, insert, update, delete on import_kjoring to authenticated, service_role;

alter table import_kjoring enable row level security;

drop policy if exists p_les on import_kjoring;
create policy p_les on import_kjoring
  for select to authenticated
  using (fase3_intern());

drop policy if exists p_skriv on import_kjoring;
create policy p_skriv on import_kjoring
  for all to authenticated
  using (fase3_super())
  with check (fase3_super());

-- ----------------------------------------------------------------------------
-- 2) SPORING PÅ NODE-TABELLENE: ressurser, dokumenter, medier
-- ----------------------------------------------------------------------------

-- RESTRICT er bevisst: en kjoringsrad skal IKKE kunne slettes mens rader peker paa den.
-- Angre skal vaere eksplisitt (delete ... where import_kjoring_id = X), aldri en
-- bivirkning av aa slette kjoringsraden. Da beholder status 'rullet_tilbake' mening.

-- ressurser: én Drupal-node = én lek. kilde_nid UNIKT (der satt).
alter table ressurser add column if not exists kilde_nid         text;
alter table ressurser add column if not exists import_kjoring_id uuid references import_kjoring(id) on delete restrict;
create unique index if not exists uq_ressurser_kilde_nid
  on ressurser (kilde_nid) where kilde_nid is not null;
create index if not exists idx_ressurser_import_kjoring
  on ressurser (import_kjoring_id);

-- dokumenter: én Drupal-node = ett dokument. kilde_nid UNIKT (der satt).
-- (ressurs_id og dens cascade rører vi IKKE her — det ligger i 091B.)
alter table dokumenter add column if not exists kilde_nid         text;
alter table dokumenter add column if not exists import_kjoring_id uuid references import_kjoring(id) on delete restrict;
create unique index if not exists uq_dokumenter_kilde_nid
  on dokumenter (kilde_nid) where kilde_nid is not null;
create index if not exists idx_dokumenter_import_kjoring
  on dokumenter (import_kjoring_id);

-- medier: én lek har flere medier, hver med sin egen kilde-token.
-- kilde_nid er provenans, IKKE nøkkel → indeks, men IKKE unik.
alter table medier add column if not exists kilde_nid         text;
alter table medier add column if not exists import_kjoring_id uuid references import_kjoring(id) on delete restrict;
create index if not exists idx_medier_kilde_nid
  on medier (kilde_nid);
create index if not exists idx_medier_import_kjoring
  on medier (import_kjoring_id);

-- ----------------------------------------------------------------------------
-- 3) SPORING PÅ samlinger (samlinger er også importerte noder)
-- ----------------------------------------------------------------------------
-- Samme tre kolonner som node-tabellene, pluss kilde_tid for gjenkjenning ved
-- re-import. kilde_nid UNIKT (der satt), kilde_tid UNIKT (der satt).
alter table samlinger add column if not exists kilde_nid         text;
alter table samlinger add column if not exists kilde_tid         integer;
alter table samlinger add column if not exists import_kjoring_id uuid references import_kjoring(id) on delete restrict;
create unique index if not exists uq_samlinger_kilde_nid
  on samlinger (kilde_nid) where kilde_nid is not null;
create unique index if not exists uq_samlinger_kilde_tid
  on samlinger (kilde_tid) where kilde_tid is not null;
create index if not exists idx_samlinger_import_kjoring
  on samlinger (import_kjoring_id);

-- ----------------------------------------------------------------------------
-- 4) kilde_tid PÅ TAKSONOMIEN importen gjenkjenner node-for-node
-- ----------------------------------------------------------------------------
-- Kun kategorier og utstyr importeres som rader fra et Drupal-vokabular og må
-- kunne matche «samme term» på tvers av kjøringer via tid (navn er upålitelig).
-- kilde_tid UNIKT der satt — seed/huseide rader har NULL og berøres ikke.
alter table kategorier add column if not exists kilde_tid integer;
create unique index if not exists uq_kategorier_kilde_tid
  on kategorier (kilde_tid) where kilde_tid is not null;

alter table utstyr add column if not exists kilde_tid integer;
create unique index if not exists uq_utstyr_kilde_tid
  on utstyr (kilde_tid) where kilde_tid is not null;

commit;
