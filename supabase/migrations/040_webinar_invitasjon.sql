-- 040_webinar_invitasjon.sql
-- Sporings-/dublettverntabell for webinar-invitasjoner + QA-sperre-flagg.
-- Invitasjon = e-post til skole-/prospektkontakter om et webinar. Atomisk
-- «reserver (insert on conflict do nothing) → send → rull tilbake ved feil»,
-- samme vern som kurs-invitasjonsmotoren. Selve påmeldingen skjer via RPC som før.

create table if not exists public.webinar_invitasjon (
  id            uuid primary key default gen_random_uuid(),
  webinar_id    uuid not null references public.webinarer(id) on delete cascade,
  skole_id      uuid references public.skoler(id) on delete set null,
  epost         text not null,
  mottaker_navn text,
  segment       text,               -- 'nettverk:<navn>' | 'alle_aktive' | 'prospekt'
  sendt_at      timestamptz,
  resend_id     text,
  opprettet_at  timestamptz not null default now()
);
-- Dublettvern: én invitasjon per (webinar, e-post). on conflict matcher denne.
create unique index if not exists webinar_invitasjon_unik_idx
  on public.webinar_invitasjon (webinar_id, lower(epost));
create index if not exists webinar_invitasjon_webinar_idx
  on public.webinar_invitasjon (webinar_id);

alter table public.webinar_invitasjon enable row level security;

-- Kun ansatte leser (inneholder e-postadresser); skriving går via service-nøkkel i endepunktet.
drop policy if exists webinar_invitasjon_les_ansatt on public.webinar_invitasjon;
create policy webinar_invitasjon_les_ansatt on public.webinar_invitasjon
  for select to authenticated using (er_ansatt());

drop policy if exists webinar_invitasjon_skriv_ansatt on public.webinar_invitasjon;
create policy webinar_invitasjon_skriv_ansatt on public.webinar_invitasjon
  for all to authenticated using (er_ansatt()) with check (er_ansatt());

grant select, insert, update, delete on public.webinar_invitasjon to authenticated, service_role;

-- QA-sperre for ekstern utsending til prospekt-/rektorliste (kap. 17.2).
-- Ekstern invitasjon er BLOKKERT til denne står på 'ja'. Default 'nei'.
do $$
begin
  if to_regclass('public.innstillinger') is not null then
    insert into public.innstillinger (nokkel, verdi) values ('rektorliste_qa_ok', 'nei')
    on conflict (nokkel) do nothing;
  end if;
end $$;
