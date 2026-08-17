-- ============================================================================
-- ROLLEMODELL — additive felt paa bruker_skole (17. aug 2026)
-- Beslutning: BESLUTNING-rollemodell-17aug.md (Claude-prosjektet).
-- KJoRT + VERIFISERT LIVE i hovedbasen. Additiv/trygg: fjerner ingenting;
-- 'rolle' (tilgang: skoleadmin/skoleansatt) beholdes uendret.
-- MERK: DB er allerede oppdatert — dette er kun for migrasjonsmappa (idempotent).
-- ============================================================================
begin;
alter table public.bruker_skole
  add column if not exists stilling text
    check (stilling in ('rektor','inspektor','styrer','ansatt')),   -- stilling ved skolen
  add column if not exists tl_rolle text
    check (tl_rolle in ('htla','tla'));                             -- rolle i TL-programmet

-- Maks EN htla per skole (flere tla lov; NULL ubegrenset)
create unique index if not exists bruker_skole_en_htla_per_skole
  on public.bruker_skole (skole_id)
  where tl_rolle = 'htla';
commit;
