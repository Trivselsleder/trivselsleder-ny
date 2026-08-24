-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 066: ATOMISK KODESETT-GENERERING (4.3)
-- Trivselsleder-ny · 24. aug 2026 · TU steg 4.3 (kodegenerator + ark)
--
-- HVORFOR NY RPC (og ikke tu_opprett_koder fra 045):
--   tu_opprett_koder(p_runde, p_hmacs) setter inn HMAC-er og returnerer et
--   ANTALL. Ved kollisjon (on conflict do nothing) blir antallet lavere enn
--   bestilt, og kalleren måtte fylt på i et NYTT kall — men da kan flyten
--   avbrytes midt i (koder finnes, runden aldri åpnet, arket borte).
--   Steg 4.3 trenger noe sterkere, i ÉN transaksjon:
--     1. ENGANGSGARANTI: en runde kan bare få kodesett ÉN gang (rå-kodene
--        finnes kun på arket — et «ark nummer to» skal være umulig).
--     2. NØYAKTIG ANTALL: enten settes presis p_antall koder inn, eller
--        ingenting (kandidatlisten har reserver; rakk de ikke, rulles alt
--        tilbake og serveren prøver igjen med nytt parti).
--     3. ÅPNING: runden går utkast → apen i SAMME transaksjon (byggeplan
--        4.2: «runden åpnes derfra»). Ingen mellomtilstander å rydde opp i.
--     4. HVILKE: returnerer HMAC-ene som ble satt inn, så serveren vet
--        eksakt hvilke råkoder som skal på arket.
--   tu_opprett_koder røres IKKE (den forblir som i 045, ubrukt av koden).
--
-- SIKKERHET (husreglene fra 041/045): SECURITY DEFINER + set search_path=''
-- + fullkvalifiserte navn + caller-sjekk via tu_har_tilgang_skole(auth.uid()).
-- Kalles derfor ALLTID med brukerens token (aldri service/anon direkte) —
-- serveren (api/tu/opprett-koder.js) sender lærerens JWT videre.
-- REVOKE fra public/anon; grant til authenticated + service_role (B4-mønster).
--
-- PERSONVERN: rå-koder når aldri denne funksjonen — kun HMAC-er (migr 045-
-- prinsippet). Ingen logging, ingen tidsstempel på kodene, ingen elevkobling.
--
-- FORUTSETNING: migr 041 + 045 + 046 + 064 + 065 er kjørt live.
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent (create or replace; revoke/grant kan kjøres på nytt trygt).
-- ============================================================================

create or replace function public.tu_generer_kodesett(p_runde uuid, p_hmacs text[], p_antall int)
returns text[] language plpgsql security definer set search_path = '' as $$
declare
  v_skole uuid;
  v_status text;
  v_innsatte text[];
begin
  -- Autorisasjon + tilstand. FOR UPDATE (kontrollfunn 1, 24. aug): låser
  -- runde-raden, slik at to samtidige kall på samme runde ikke begge rekker
  -- å lese «utkast, ingen koder» før noen skriver. Kall nummer to venter her
  -- til det første er committet, leser da på nytt — og avvises rent
  -- (TU_FEIL_STATUS: runden er blitt 'apen'). Engangsgarantien er dermed
  -- atomisk, ikke bare sjekket.
  select skole_id, status into v_skole, v_status from public.tu_runder where id = p_runde for update;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  if v_status <> 'utkast' then raise exception 'TU_FEIL_STATUS: runden er ikke utkast'; end if;

  -- Engangsgaranti: har runden koder fra før, finnes det alt et ark der ute.
  if exists (select 1 from public.tu_koder k where k.runde_id = p_runde) then
    raise exception 'TU_KODER_FINNES: koder er allerede generert for runden';
  end if;

  -- Rimelighetsvern (elevtall er maks 200 + 2 ekstra; kandidater må dekke antallet).
  if p_antall is null or p_antall < 1 or p_antall > 250 then
    raise exception 'TU_UGYLDIG_ANTALL';
  end if;
  if p_hmacs is null or coalesce(array_length(p_hmacs, 1), 0) < p_antall then
    raise exception 'TU_FOR_FAA_KANDIDATER';
  end if;

  -- Sett inn de FØRSTE p_antall kandidatene som ikke kolliderer globalt.
  -- (Serveren sender reserver i tillegg, så en kollisjon normalt bare «bruker
  -- opp» en reserve i stedet for å velte kallet.)
  with kandidater as (
    select h.hmac, min(h.ord) as ord
    from unnest(p_hmacs) with ordinality as h(hmac, ord)
    group by h.hmac                                   -- defensiv dedup, bevarer rekkefølge
  ), ledige as (
    select k.hmac
    from kandidater k
    where not exists (select 1 from public.tu_koder t where t.kode_hmac = k.hmac)
    order by k.ord
    limit p_antall
  ), satt_inn as (
    insert into public.tu_koder (runde_id, kode_hmac)
    select p_runde, hmac from ledige
    on conflict (kode_hmac) do nothing                -- kappløp-vern (unik-indeksen fra 041)
    returning kode_hmac
  )
  select coalesce(array_agg(kode_hmac), '{}') into v_innsatte from satt_inn;

  -- NØYAKTIG ANTALL eller ingenting: exception ruller tilbake hele transaksjonen
  -- (også innsettingen over) — serveren prøver igjen med et helt nytt parti.
  if coalesce(array_length(v_innsatte, 1), 0) < p_antall then
    raise exception 'TU_KOLLISJON: fikk ikke plass til % koder', p_antall;
  end if;

  -- Åpne runden i samme transaksjon (utkast → apen; sjekket utkast over).
  update public.tu_runder set status = 'apen' where id = p_runde and status = 'utkast';

  return v_innsatte;
end $$;

-- B4-mønsteret (041/045): funksjoner får EXECUTE til PUBLIC som default → strammes.
revoke execute on function public.tu_generer_kodesett(uuid, text[], int) from public, anon;
grant  execute on function public.tu_generer_kodesett(uuid, text[], int) to authenticated, service_role;

-- ============================================================================
-- SLUTT MIGRASJON 066.
-- MERK: tu_opprett_koder (045) er bevisst uendret og fortsatt ubrukt av koden.
-- 4.4 (live-status) trenger ingen ny kolonne: «X av Y» = tu_koder.brukt-telling
-- via tu_folg_med mot elevtall på runden. 4.5 (auto-lukk) bygges senere.
-- ============================================================================
