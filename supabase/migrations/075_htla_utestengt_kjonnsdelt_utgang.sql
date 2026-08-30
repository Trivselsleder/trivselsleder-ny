-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 075: HTLA UT AV DEN KJØNNSDELTE UTGANGEN
-- ----------------------------------------------------------------------------
-- HVA:  CREATE OR REPLACE av public.tu_skole_resultat_kjonn(uuid). ÉN endring
--       mot 070-versjonen: tilgangs-gaten mister ` or tu_er_htla_paa_skole(...)`,
--       slik at kun tu_har_tilgang_skole(v_skole) (skoleadmin/rektor/superadmin)
--       slipper inn. Aktiv HTLA får nå 'Ingen tilgang' på DB-nivå.
-- HVORFOR: HTLA skal IKKE se den kjønnsdelte resultatutgangen (lederbeslutning
--       28. aug; frontend skjuler den allerede). Dette lukker det tilsvarende
--       hullet på databasenivå. LANSERINGSPORT (må være lukket før kjønnsdelt
--       vises for ekte barn), ikke pilotblokkerende — jf. STATUS.md 30. aug.
-- KONSISTENS: tu_skole_resultat (045-total, ikke-kjønn) har ingen HTLA-klausul
--       fra før; 075 gjør den kjønnsdelte utgangen konsistent med den.
-- SCOPE: Rører KUN tu_skole_resultat_kjonn. tu_skjermet_runde_kjonn (072),
--       skjermingskjernen og alle andre funksjoner er URØRT.
-- GRANTS: CREATE OR REPLACE beholder eksisterende grants (samme signatur/retur).
-- IDEMPOTENT: CREATE OR REPLACE kan kjøres flere ganger uten sideeffekt.
-- MERK: Ikke kjørt i SQL-editor, ikke pushet — venter uavhengig Fable-kontroll.
-- ============================================================================

create or replace function public.tu_skole_resultat_kjonn(p_runde uuid)
returns table(sporsmal int, gruppe text, antall int, fordeling jsonb,
              homogen boolean, skjult boolean, skjult_aarsak text)
language plpgsql stable security definer set search_path = '' as $$
declare v_skole uuid; v_aktiv boolean;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not (public.tu_har_tilgang_skole(v_skole)) then
    raise exception 'Ingen tilgang';
  end if;

  v_aktiv := coalesce(
    (select verdi = 'true' from public.tu_innstillinger where nokkel='kjonnsdelt_aktiv'),
    true);

  return query
    select k.sporsmal, k.gruppe, k.antall, k.fordeling, k.homogen, k.skjult, k.skjult_aarsak
    from public.tu_skjermet_runde_kjonn(p_runde) k
    where v_aktiv or k.gruppe = 'total'
    order by k.sporsmal,
             case k.gruppe when 'total' then 0 when 'jente' then 1
                           when 'gutt' then 2 when 'annet' then 3 else 9 end;
end $$;

-- SLUTT MIGRASJON 075.
