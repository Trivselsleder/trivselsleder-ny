-- 048: B2 (høring) – automatisk gjentakende purring.
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret). Idempotent.
--
-- Ren additiv endring: to kolonner + ett stempel + én innstilling. Ingen funksjoner,
-- ingen RLS-endring (cron-en bruker service_role). auto_purring er AV som standard,
-- så ingen kurs purres automatisk før en RA slår det på.

begin;

-- Per-kurs bryter: skrur automatisk purring på/av for dette kurset.
alter table public.kurs
  add column if not exists auto_purring boolean not null default false;

-- Per-skole skjerming: RA kan ta én skole ut av den automatiske purringen.
alter table public.kurs_skole
  add column if not exists auto_purring_skjermet boolean not null default false;

-- Når auto-purringen sist gikk ut til denne skolen (styrer intervallet).
alter table public.kurs_skole
  add column if not exists auto_purring_sist_at timestamptz;

-- Intervall i dager mellom hver automatiske purring (default 3). Redigerbar som
-- alle andre innstillinger.
insert into public.innstillinger (nokkel, verdi)
values ('auto_purring_intervall_dager', '3')
on conflict (nokkel) do nothing;

commit;
