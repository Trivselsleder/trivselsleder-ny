-- ============================================================================
-- 135_hent_regionansvarlig.sql
-- MIN SIDE (E): trygt oppslag av skolens regionansvarlige (navn + e-post)
-- ============================================================================
-- KILDE: byggeoppdrag «Min side» 16. sep, punkt E — RA-linja under «Mest kjøpte leker»:
--   «Vil du ha råd om leker? Ta kontakt med din regionansvarlige.» + navn og e-post NÅR
--   nettverk_ansvarlig finnes for skolens nettverk; ellers bare teksten.
--
-- HVORFOR EN SECURITY DEFINER-FUNKSJON: RA-en er en annen bruker (profiles), og profiles
--   har RLS — en skolebruker kan ikke lese en annen brukers navn/e-post direkte. RA-ens
--   kontaktinfo er ment å DELES med skolen, så vi eksponerer nøyaktig navn+e-post via en
--   herdet funksjon (search_path='', skjema-kvalifisert), i stedet for å åpne profiles-RLS.
--   Kobling: skoler.nettverk → nettverk_ansvarlig.nettverk → profiles(bruker_id).
--
-- SKOLEGRENSE (F1, kontroll 16. sep): fordi funksjonen hopper over profiles-RLS, MÅ den selv
--   sperre for skolegrensen — ellers kan hvem som helst med konto slå opp RA for HVILKEN SOM
--   HELST skole de har uuid til (samme prinsipp som tu_har_tilgang_skole). Regel: kalleren får
--   bare svar for en skole de har en AKTIV bruker_skole-kobling til, eller hvis de er TL-ansatt/
--   superadmin (get_min_rolle()). Ellers 0 rader. auth.uid() virker inne i DEFINER-kallet.
--   K1 (Kjartans beslutning): funksjonen returnerer RA-ens innloggings-e-post (profiles.epost)
--   — dette er bevisst og skal beholdes.
--
-- RETTIGHETER (CLAUDE.md): revoke execute fra public/anon/authenticated, grant til
--   authenticated (skoler kaller den) + service_role. Ingen skrivetilgang, kun lesing av
--   to kontaktfelt. Returnerer 0 rader når skolen ikke har nettverk, RA ikke er satt, eller
--   kalleren ikke har lov til å se nettopp den skolens RA.
-- SPERRER: idempotens er iboende (create or replace) · verifisering ETTER · kvittering.
--   Én transaksjon. 104-fellen: ingen eksisterende funksjon røres (kun NY opprettes).
-- TILBAKERULLING (etter commit): drop function if exists public.hent_regionansvarlig(uuid);
-- ============================================================================

begin;

do $$
begin
  if to_regclass('public.nettverk_ansvarlig') is null or to_regclass('public.skoler') is null
     or to_regclass('public.profiles') is null then
    raise exception 'STOPP 135: mangler en forutsatt tabell (nettverk_ansvarlig/skoler/profiles).';
  end if;
end $$;

create or replace function public.hent_regionansvarlig(p_skole_id uuid)
returns table (navn text, epost text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.navn, p.epost
  from public.skoler s
  join public.nettverk_ansvarlig na on na.nettverk = s.nettverk
  join public.profiles p on p.id = na.bruker_id
  where s.id = p_skole_id
    and s.nettverk is not null
    -- Skolegrense (F1): kun egen skole (aktiv kobling) eller TL-ansatt/superadmin.
    and (
      exists (select 1 from public.bruker_skole bs
              where bs.bruker_id = auth.uid()
                and bs.skole_id  = p_skole_id
                and bs.aktiv     = true)
      or coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
    );
$$;

-- ── Rettigheter ──
revoke execute on function public.hent_regionansvarlig(uuid) from public, anon, authenticated;
grant  execute on function public.hent_regionansvarlig(uuid) to authenticated, service_role;

-- ── Verifisering ETTER ──
do $$
begin
  if to_regprocedure('public.hent_regionansvarlig(uuid)') is null then
    raise exception 'STOPP 135 (etter): funksjonen ble ikke opprettet.';
  end if;
  if not exists (select 1 from pg_proc where proname='hent_regionansvarlig' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')) then
    raise exception 'STOPP 135 (etter): mangler SECURITY DEFINER / search_path-herding.';
  end if;
  if has_function_privilege('anon','public.hent_regionansvarlig(uuid)','execute') then
    raise exception 'STOPP 135 (etter): anon har execute — skal være revokert.';
  end if;
  if not has_function_privilege('authenticated','public.hent_regionansvarlig(uuid)','execute') then
    raise exception 'STOPP 135 (etter): authenticated mangler execute.';
  end if;
end $$;

-- ── Kvittering ──
select concat_ws(' · ',
  'hent_regionansvarlig: ' || (to_regprocedure('public.hent_regionansvarlig(uuid)') is not null),
  'secdef+search_path: ' || exists (select 1 from pg_proc where proname='hent_regionansvarlig' and prosecdef and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')),
  'anon execute (skal være NEI): ' || has_function_privilege('anon','public.hent_regionansvarlig(uuid)','execute'),
  'authenticated execute: ' || has_function_privilege('authenticated','public.hent_regionansvarlig(uuid)','execute')
) as kvittering;

commit;
