-- ============================================================================
-- 044_offentlige_skoler.sql
-- Felles, trygg kilde for OFFENTLIG skoleinformasjon (17. aug 2026).
-- Brukes av (a) offentlig skoleoversikt paa forsiden (uinnlogget) og
-- (b) naboskole-velger ved deling av periodeplan / TL-hjul (innlogget).
--
-- Personvern: eksponerer ALDRI kontakt-PII (rektor/HTLA/hovedkontakt,
-- e-post, telefon, adresse, tla_kontakter). Returnerer kun id + offentlig
-- basisinfo. Leser via SECURITY DEFINER slik at RLS-strammingen paa
-- public.skoler (migrasjon 042) forblir uendret for direkte tabell-lesing.
--
-- SET search_path = '' + full skjemakvalifisering (public.*) er et krav:
-- uten det kan definer-funksjonen slaa feil med 42P01 (relation not found).
--
-- Idempotent: kan kjores flere ganger uten skade.
-- ============================================================================
begin;

-- Slipp evt. tidligere versjon (ogsaa om retur-signaturen skulle endres senere).
drop function if exists public.hent_offentlige_skoler();

create or replace function public.hent_offentlige_skoler()
returns table (
  id uuid,
  navn text,
  kommune text,
  fylke text,
  elevtall integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.navn,
    s.kommunenavn as kommune,    -- tabellen har kommunenavn (ikke «kommune»)
    s.fylke,
    s.antall_elever as elevtall  -- tabellen har antall_elever (ikke «elevtall»)
  from public.skoler s
  where s.status = 'Aktiv'       -- kun aktive medlemsskoler; «Aktiv sagt opp» faller ut automatisk
  order by s.navn asc;
$$;

-- Ren lesefunksjon uten PII -> anon er trygt (forsiden er uinnlogget).
grant execute on function public.hent_offentlige_skoler() to anon, authenticated, service_role;

commit;
