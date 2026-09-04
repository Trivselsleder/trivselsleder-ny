-- 095_medier_original_samling_medie.sql
-- ============================================================================
-- ETAPPE 5 (FASE 3), SISTE RUNDE: MEDIER original/derivat + tabellen samling_medie
-- ============================================================================
-- HVA: (DEL 1) tre felt paa `medier` som skiller et bilde i full opploesning fra en
--      skjermkopi av samme bilde, og (DEL 2) en liten ny tabell `samling_medie` for
--      video/bilde som hoerer til en HEL samling (ikke én lek).
--
-- KILDE (fasit): claude_095-SPESIFIKASJON-3sep.md (Cowork B) + claude_FORSJEKK-092-095
--      -3sep.md seksjon 5/6 + ETAPPE5-SPESIFIKASJON-v3 punkt 8 + SAMLINGER punkt 5.
--
-- FORSJEKK (bekreftet mot filene OG prod-avlesningen 3. sep):
--   * `medier` har 026- + 091-kolonnene, og har IKKE er_original/opphav_medie_id/
--     alt_tekst_kilde (0 treff i migrasjonene OG i prod_skjema_kolonne.csv — ingen
--     manuell baseendring). 11 rader i basen -> er_original-defaulten backfiller 11.
--   * `samling_medie` finnes IKKE (0 treff i migrasjoner og prod) — ren CREATE.
--   * FK-maal finnes: samlinger (029), import_kjoring (091); hjelpefunksjonen
--     fase3_intern() finnes (030). `samlinger.synlig` finnes (029).
--   * Verken `medier` eller `samling_medie` har en `navn`-kolonne -> Move It-case-vernet
--     er vurdert og ikke aktuelt her.
--
-- BESLUTNINGER innarbeidet:
--   * opphav_medie_id er en SELV-refererende peker i medier (derivat -> original). IKKE
--     forveksle med kilde_nid (Drupal-fil-proveniens). ON DELETE SET NULL er et KRAV,
--     ikke pynt: tilbakerullingen `delete from medier where import_kjoring_id = X` (091)
--     treffer baade original og derivat i samme setning; en RESTRICT/CASCADE selv-FK kan
--     feile paa slettingsrekkefoelgen. SET NULL nuller derivatets peker trygt.
--   * samling_medie faar egen surrogat-id (speiler `medier`, ikke koblingstabellene),
--     med UNIQUE (samling_id, rekkefolge) — fase-2 Bunny-opplasting trenger stabil id.
--   * import_kjoring_id ON DELETE RESTRICT (som 091/092/093). samling_id ON DELETE
--     CASCADE (som samling_ressurs). RLS/GRANT speiler samling_ressurs (032) og 093.
--
-- EGENSKAPER: Additiv · Idempotent (if not exists / do-blokk-CHECK / drop+create policy)
--             · ÉN transaksjon. Avhenger av 026 + 029 + 091 (ikke 094/094B).
-- ============================================================================

begin;

-- ============================================================================
-- DEL 1 — medier: original vs. derivat
-- ============================================================================

-- Kjernefeltet. De 11 eksisterende radene er originaler -> faar true via default.
alter table medier add column if not exists er_original boolean not null default true;

-- Selv-refererende peker: derivat (er_original=false) -> originalens id, samme ressurs_id.
-- ON DELETE SET NULL er KRAV (trygg tilbakerulling, se topptekst).
alter table medier add column if not exists opphav_medie_id uuid references medier(id) on delete set null;

-- Kilde til alt-teksten: 'menneske' (ekte) vs 'fallback' (tittel brukt). NULL = ukjent/ikke satt.
alter table medier add column if not exists alt_tekst_kilde text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'medier_alt_tekst_kilde_check') then
    alter table medier add constraint medier_alt_tekst_kilde_check
      check (alt_tekst_kilde is null or alt_tekst_kilde in ('menneske','fallback'));
  end if;
end $$;

-- ============================================================================
-- DEL 2 — samling_medie: media som hoerer til en SAMLING (ikke én lek)
-- (medier.ressurs_id er NOT NULL, saa samle-video/-bilde har ellers intet sted aa bo)
-- ============================================================================

create table if not exists samling_medie (
  id                uuid        primary key default gen_random_uuid(),
  samling_id        uuid        not null references samlinger(id) on delete cascade,
  type              text        not null check (type in ('bilde','video')),   -- ingen 'pdf'
  bunny_video_id    text,
  storage_sti       text,
  original_filnavn  text,
  alt_tekst         text,
  alt_tekst_kilde   text        check (alt_tekst_kilde is null or alt_tekst_kilde in ('menneske','fallback')),
  kilde_nid         text,                                                       -- Drupal-fil-proveniens (indeks, ikke unik)
  import_kjoring_id uuid        references import_kjoring(id) on delete restrict, -- som 091/092/093
  rekkefolge        smallint    not null default 0,
  unique (samling_id, rekkefolge)
);

create index if not exists idx_samling_medie_samling       on samling_medie (samling_id);
create index if not exists idx_samling_medie_kilde_nid     on samling_medie (kilde_nid);
create index if not exists idx_samling_medie_import_kjoring on samling_medie (import_kjoring_id);

-- GRANT: authenticated + service_role (som 093 / samling_ressurs). INGEN anon: Supabase gir
-- som standard anon alle sju tabellrettigheter til en NY tabell, og 093B (rettighets-
-- migrasjonen) kjoerer FOER 095 og kjenner ikke samling_medie — saa den strammer den aldri.
-- Derfor revokes anon eksplisitt her (forsvar i dybden bak RLS; soesken har anon minus DML).
grant select, insert, update, delete on samling_medie to authenticated, service_role;
revoke all on samling_medie from anon;

alter table samling_medie enable row level security;

-- Lesepolicy: speiler samling_ressurs p_les (032) — synlig naar samlingen er synlig eller intern.
drop policy if exists p_les on samling_medie;
create policy p_les on samling_medie
  for select to authenticated
  using (exists (select 1 from samlinger s
                 where s.id = samling_medie.samling_id
                   and (s.synlig or fase3_intern())));

-- Skrivepolicy: speiler 093 p_skriv. (Importen kjoerer som service_role og forbigaar RLS;
-- policyen verner mot andre skrivere.)
drop policy if exists p_skriv on samling_medie;
create policy p_skriv on samling_medie
  for all to authenticated
  using (fase3_intern())
  with check (fase3_intern());

commit;
