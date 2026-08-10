-- Kulturkort-bestillinger (postutsending) — ekte, delt lagring.
--
-- Fram til 10. aug 2026 ble en bestilling fra bestillingsskjemaet KUN sendt som
-- e-post + lagret i bestillerens egen nettleser (localStorage). Ingen delt
-- kilde → admin-siden var i praksis alltid tom. Denne tabellen gir bestillinger
-- ekte lagring så Camilla ser dem uansett maskin, og de kan slås sammen med
-- kurs-kortene i én liste.
--
-- INSERT skjer fra api/send-bestilling.js med service-nøkkel (går utenom RLS).
-- Ansatte (superadmin/ansatt) leser og oppdaterer status via RLS nedenfor.

create table if not exists public.kulturkort_bestillinger (
  id            uuid primary key default gen_random_uuid(),
  skolenavn     text not null,
  antall_kort   integer not null,
  kontaktperson text not null,
  epost         text not null,
  gate          text,
  postnummer    text,
  poststed      text,
  melding       text,
  kortpris      integer,
  porto         integer,
  total         integer,
  status        text not null default 'Ny',
  created_at    timestamptz default now()
);

alter table public.kulturkort_bestillinger enable row level security;

drop policy if exists "Ansatte ser bestillinger" on public.kulturkort_bestillinger;
create policy "Ansatte ser bestillinger"
  on public.kulturkort_bestillinger for select
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.rolle in ('superadmin','ansatt')));

drop policy if exists "Ansatte oppdaterer bestillinger" on public.kulturkort_bestillinger;
create policy "Ansatte oppdaterer bestillinger"
  on public.kulturkort_bestillinger for update
  using (exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.rolle in ('superadmin','ansatt')));
