-- 057: B12 (høring) – dedup-stempel for RA-varsel.
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne). Idempotent.
--
-- RA-varselet (cron-ra-varsel) sender en oppsummering til RA når en skole i et av
-- RA-ens nettverk enten sier «nei, men åpen for annet kurs» eller er vertskap som
-- har sagt nei. Dette stempelet gjør at HVER slik flagget rad varsles maks ÉN gang
-- (stemples først når varselet faktisk er sendt), så RA ikke får samme sak daglig.

begin;

alter table public.kurs_skole
  add column if not exists ra_varslet_at timestamptz;

commit;
