-- 063_nyhetsbrev_broadcasts.sql
-- RESEND BROADCASTS-FUNDAMENTET (byggeplan 20. aug 2026):
-- samtykke-/mottakerbase + utsendingslogg for nyhetsbrev/masseutsending.
--
-- Prinsipper:
--  * EGEN base, adskilt fra kursdata (første trygge brikke vekk fra HubSpot).
--  * Feltene støtter alle tre bruksområdene fra dag én:
--      Bruk A (webinar-oppfølging, soft opt-in)  — bygges nå
--      Bruk B (hjemmeside-nyhetsbrev, DOUBLE opt-in: bekreft_token/bekreftet_at)
--      Bruk C (potensielle skoler, soft opt-in)
--  * Personlig, ugjettbar avmeldingslenke: avmelding_token (uuid) er hemmeligheten
--    i lenken. avmeldt_at satt = ute av ALLE framtidige utsendinger umiddelbart
--    (mottakeruttrekk filtrerer alltid på avmeldt_at is null).
--  * INGEN elevdata her — kun kontaktpersoner/interessenter.
--  * RLS + GRANT-vakter fra dag én (husregel 5): kun ansatte leser/skriver via
--    REST; anon har INGEN tilgang (ingen anon-policy, ingen anon-GRANT).
--    Avmeldings-endepunktet kjører server-side med service_role.

-- ── Tabell 1: mottakere (samtykkebasen) ─────────────────────────────────────
create table if not exists public.nyhetsbrev_mottakere (
  id                  uuid primary key default gen_random_uuid(),
  epost               text not null
                        check (epost ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  navn                text,
  rolle               text not null default 'ekstern'
                        check (rolle in ('htla','tla','ekstern','potensiell')),
  skole_id            uuid references public.skoler(id) on delete set null,
  skole_navn          text,                -- tilknytning i klartekst (tåler at skolen slettes)
  nyhetsbrev_samtykke boolean not null default false,
  samtykke_modell     text
                        check (samtykke_modell in ('double_opt_in','soft_opt_in')),
  samtykke_kilde      text,                -- f.eks. 'kontaktperson_tl_program', 'forside_skjema'
  samtykke_tidspunkt  timestamptz,
  bekreft_token       uuid not null default gen_random_uuid(),  -- Bruk B: double opt-in-bekreftelse
  bekreftet_at        timestamptz,                              -- Bruk B: når bekreftet
  avmelding_token     uuid not null default gen_random_uuid(),  -- personlig, ugjettbar avmeldingslenke
  avmeldt_at          timestamptz,
  resend_contact_id   text,               -- kobling til Resend-kontakten (settes ved synk)
  opprettet_at        timestamptz not null default now(),
  endret_at           timestamptz not null default now()
);

comment on table public.nyhetsbrev_mottakere is
  'Samtykke-/mottakerbase for nyhetsbrev (Resend Broadcasts). Adskilt fra kursdata. Kun kontaktpersoner — aldri elevdata.';
comment on column public.nyhetsbrev_mottakere.avmelding_token is
  'Hemmeligheten i den personlige avmeldingslenken. Lenken settes som Resend-kontaktegenskap og flettes inn i hver Broadcast.';

-- Én rad per e-postadresse (uansett store/små bokstaver)
create unique index if not exists nyhetsbrev_mottakere_epost_idx
  on public.nyhetsbrev_mottakere (lower(epost));
create unique index if not exists nyhetsbrev_mottakere_avmelding_idx
  on public.nyhetsbrev_mottakere (avmelding_token);
create unique index if not exists nyhetsbrev_mottakere_bekreft_idx
  on public.nyhetsbrev_mottakere (bekreft_token);
create index if not exists nyhetsbrev_mottakere_skole_idx
  on public.nyhetsbrev_mottakere (skole_id);

-- ── Tabell 2: utsendingslogg (én rad per Broadcast) ─────────────────────────
create table if not exists public.nyhetsbrev_utsendinger (
  id                  uuid primary key default gen_random_uuid(),
  bruk                text not null check (bruk in ('A','B','C')),
  emne                text not null,
  webinar_id          uuid references public.webinarer(id) on delete set null,  -- Bruk A
  opptak_lenke        text,               -- Bruk A: kan mangle (seksjonen utelates da)
  inkluder_tla        boolean not null default false,
  segment_navn        text,
  resend_segment_id   text,
  resend_broadcast_id text,
  antall_mottakere    integer,
  status              text not null default 'utkast'
                        check (status in ('utkast','planlagt','sendt','feilet')),
  planlagt_at         timestamptz,
  sendt_at            timestamptz,
  feilmelding         text,
  opprettet_av        uuid references public.profiles(id) on delete set null,
  opprettet_at        timestamptz not null default now()
);

comment on table public.nyhetsbrev_utsendinger is
  'Logg over Broadcasts-utsendinger (Bruk A/B/C): hvem, hva, når, Resend-id-er. Dokumentasjonsgrunnlag.';

create index if not exists nyhetsbrev_utsendinger_webinar_idx
  on public.nyhetsbrev_utsendinger (webinar_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.nyhetsbrev_mottakere  enable row level security;
alter table public.nyhetsbrev_utsendinger enable row level security;

-- Kun ansatte (er_ansatt() fra migrasjon 039) leser/skriver via REST.
drop policy if exists nyhetsbrev_mottakere_ansatt on public.nyhetsbrev_mottakere;
create policy nyhetsbrev_mottakere_ansatt on public.nyhetsbrev_mottakere
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

drop policy if exists nyhetsbrev_utsendinger_ansatt on public.nyhetsbrev_utsendinger;
create policy nyhetsbrev_utsendinger_ansatt on public.nyhetsbrev_utsendinger
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

-- ── GRANT-vakter ────────────────────────────────────────────────────────────
-- Som 039-mønsteret: authenticated + service_role. Anon får INGEN grants —
-- e-postadresser og samtykkedata skal aldri kunne leses anonymt. All anonym
-- interaksjon (avmelding) går via server-endepunkt med service-nøkkel.
grant select, insert, update, delete on public.nyhetsbrev_mottakere  to authenticated;
grant select, insert, update, delete on public.nyhetsbrev_utsendinger to authenticated;
grant select, insert, update, delete on public.nyhetsbrev_mottakere  to service_role;
grant select, insert, update, delete on public.nyhetsbrev_utsendinger to service_role;
revoke all on public.nyhetsbrev_mottakere  from anon;
revoke all on public.nyhetsbrev_utsendinger from anon;
