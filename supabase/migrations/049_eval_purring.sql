-- 049: B3 (høring) – ÉN automatisk purring på ubesvart evaluering.
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret). Idempotent.
--
-- Additivt: ett stempel + én innstilling. Stempelet gjør at purringen aldri går
-- ut mer enn ÉN gang per skole (låst av høringen: én purring, ikke to).

begin;

-- Når evaluerings-påminnelsen gikk ut (null = ikke sendt). Aldri mer enn én.
alter table public.kurs_skole
  add column if not exists eval_purring_sendt_at timestamptz;

-- Antall dager etter kursdagen før evaluerings-påminnelsen sendes (default 4).
insert into public.innstillinger (nokkel, verdi)
values ('eval_purring_dager', '4')
on conflict (nokkel) do nothing;

commit;
