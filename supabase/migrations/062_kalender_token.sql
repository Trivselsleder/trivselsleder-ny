-- 062: C2 (høring) – kalender-feeder via token-lenker.
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne).
--
-- Tre feeder, alle abonneres UTEN innlogging (kalenderapper kan ikke logge inn) —
-- selve token-lenken er nøkkelen, som en hemmelig delingslenke:
--   1) per RA:        profiles.kalender_token       → kurs i RA-ens nettverk
--   2) per kursholder: kursholdere.kalender_token    → kurs de skal holde
--   3) hele oversikten: innstilling kalender_alle_token → alle kurs
-- Token = uuid (ugjettbar). Kan «tilbakekalles» ved å sette en ny (egen jobb senere).
--
-- gen_random_uuid() er tilgjengelig (brukes alt som id-default flere steder). Volatil
-- default → hver eksisterende rad får sin EGEN token (tabellene skrives om, små).

begin;

alter table public.profiles
  add column if not exists kalender_token uuid not null default gen_random_uuid();

alter table public.kursholdere
  add column if not exists kalender_token uuid not null default gen_random_uuid();

-- Global «alle kurs»-token (kun hvis den ikke finnes).
insert into public.innstillinger (nokkel, verdi)
select 'kalender_alle_token', gen_random_uuid()::text
where not exists (select 1 from public.innstillinger where nokkel = 'kalender_alle_token');

-- Ansatt-sikret oppslag så RA kan kopiere SINE lenker (egen RA-token + alle-token)
-- uten å lene seg på innstillinger-RLS. Per-kursholder-token leses direkte fra
-- kursholdere (ansatte har SELECT der).
drop function if exists public.hent_mine_kalenderlenker();
create function public.hent_mine_kalenderlenker()
returns table(ra_token uuid, alle_token text)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  if coalesce(get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  return query select
    (select kalender_token from profiles where id = auth.uid()),
    (select verdi from innstillinger where nokkel = 'kalender_alle_token');
end;
$function$;
grant execute on function public.hent_mine_kalenderlenker() to authenticated, service_role;

commit;
