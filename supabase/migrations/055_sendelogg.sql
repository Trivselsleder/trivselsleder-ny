-- 055: B9 (høring) – sendelogg per skole for «Se svar».
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne).
--
-- epost_logg har (ennå) IKKE radsikkerhet (RLS). Da må lesing skje gjennom en
-- kontrollert vei med EKSPLISITT rollesjekk, ellers kan e-postadressene i loggen
-- i prinsippet leses uten innlogging. Denne funksjonen er den veien: den kjører
-- med forhøyet rett (SECURITY DEFINER), men slipper bare ansatte/superadmin til.
--
-- Returnerer én rad per utsendt (eller forsøkt) e-post for skolene på ETT kurs,
-- eldste først. Frontenden grupperer på kurs_skole_id.
--
-- Husregel 6: retur-signatur er ny → drop + recreate + grant.

begin;

drop function if exists public.hent_sendelogg_for_kurs(uuid);

create function public.hent_sendelogg_for_kurs(p_kurs_id uuid)
returns table(
  kurs_skole_id uuid,
  type text,
  mottaker_epost text,
  mottaker_navn text,
  status text,
  feilmelding text,
  opprettet_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- Kun ansatte/superadmin. En anonym eller innlogget skolebruker får ingenting
  -- (unntak), ALDRI e-postadresser fra loggen. coalesce sikrer at NULL-rolle
  -- (anon) også faller utenfor og utløser unntaket.
  if coalesce(get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;

  return query
  select el.kurs_skole_id,
         el.type,
         el.mottaker_epost,
         el.mottaker_navn,
         el.status,
         el.feilmelding,
         el.opprettet_at
    from epost_logg el
    join kurs_skole ks on ks.id = el.kurs_skole_id
   where ks.kurs_id = p_kurs_id
   order by el.opprettet_at asc;
end;
$function$;

-- IKKE grant til anon: sendeloggen skal aldri kunne leses anonymt. Selve
-- rollesjekken over stopper anon uansett, men vi holder også grantet stramt.
grant execute on function public.hent_sendelogg_for_kurs(uuid) to authenticated, service_role;

commit;
