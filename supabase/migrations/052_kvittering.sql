-- 052: B6 (høring) – kvitteringsmail etter innsendt svar.
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret). Idempotent.
--
-- Ett stempel: kvitteringen sendes bare ÉN gang per skole (ikke på nytt hvis
-- skolen redigerer svaret sitt senere).

begin;

alter table public.kurs_skole
  add column if not exists kvittering_sendt_at timestamptz;

commit;
