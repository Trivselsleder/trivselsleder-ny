-- 056: B10 (høring) – kobling nettverk → RA-konto.
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne).
--
-- Beslutning (Kjartan 19. aug): «RA eier nettverk, nettverk eier kursene».
-- Én RA har ansvar for flere nettverk; hvert nettverk har ÉN ansvarlig RA.
-- «Mine kurs» = alle kurs i nettverkene der den innloggede står som ansvarlig.
--
-- Nettverk finnes bare som tekst (på skoler/kurs), ikke som egen tabell. Denne
-- lille koblingstabellen er den autoritative RA↔nettverk-kilden og erstatter det
-- skjøre fritekst-RA-feltet.

begin;

create table if not exists public.nettverk_ansvarlig (
  nettverk    text primary key,
  bruker_id   uuid not null references public.profiles(id) on delete cascade,
  oppdatert_at timestamptz not null default now()
);

-- Rask oppslag «alle nettverk jeg er RA for».
create index if not exists nettverk_ansvarlig_bruker_idx
  on public.nettverk_ansvarlig (bruker_id);

alter table public.nettverk_ansvarlig enable row level security;

-- Samme rollemønster som kurs/kurs_skole: ansatte og superadmin ser og
-- administrerer; service-rollen har full tilgang.
drop policy if exists "Ansatt ser nettverksansvar" on public.nettverk_ansvarlig;
create policy "Ansatt ser nettverksansvar" on public.nettverk_ansvarlig
  as permissive for select to public
  using (get_min_rolle() = any (array['superadmin'::text, 'ansatt'::text]));

drop policy if exists "Ansatt administrerer nettverksansvar" on public.nettverk_ansvarlig;
create policy "Ansatt administrerer nettverksansvar" on public.nettverk_ansvarlig
  as permissive for all to public
  using (get_min_rolle() = any (array['superadmin'::text, 'ansatt'::text]))
  with check (get_min_rolle() = any (array['superadmin'::text, 'ansatt'::text]));

drop policy if exists "Service role full tilgang nettverksansvar" on public.nettverk_ansvarlig;
create policy "Service role full tilgang nettverksansvar" on public.nettverk_ansvarlig
  as permissive for all to service_role using (true) with check (true);

grant select, insert, update, delete on public.nettverk_ansvarlig to authenticated;
grant all on public.nettverk_ansvarlig to service_role;

commit;
