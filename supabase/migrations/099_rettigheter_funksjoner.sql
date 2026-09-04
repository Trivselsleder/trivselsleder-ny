-- 099_rettigheter_funksjoner.sql
-- ============================================================================
-- SIKKERHET: rettigheter + rollevakt for ALLE 65 SECURITY DEFINER-funksjoner
-- ============================================================================
-- Bygger paa claude_KONTROLLFASIT-099-4sep.md (Fable, autoritativ). Formen fra 041/093C/098:
-- revoke fra public, anon, authenticated + eksplisitt grant per funksjon (alle 65, saa
-- gjenoppbygging = prod). Kroppen (create or replace + vakt) endres KUN i de 11 i DEL 1.
--
-- DEL 1: kropp+vakt paa 11 funksjoner (prods kropp, uendret, med vakt som foerste setning).
--   V1 = ren ansatt/superadmin-vakt. V2 = slipper service-noekkelen gjennom (auth.role()).
--   4 av dem er LANGUAGE sql i prod og konverteres til plpgsql for aa baere vakten
--   (samme signatur/RETURNS/kropp). De to RETURNS TABLE-konverteringene faar
--   '#variable_conflict use_column' saa OUT-kolonnenavn = kolonne (som i sql-funksjonen).
-- DEL 2: grant-bildet for alle 65 (17 anon+auth+service, 34 auth+service, 14 service).
--
-- MAALTILSTAND etter 099: anon 17 · authenticated 51 · service_role 65 (65 SECURITY DEFINER).
-- Idempotent (create or replace + revoke/grant). EN transaksjon.
-- ============================================================================

begin;

-- ============================================================================
-- DEL 1 — KROPP + VAKT (11 funksjoner). Prods kropp; vakt = foerste setning.
-- ============================================================================

-- forbered_evalueringer [V2]
CREATE OR REPLACE FUNCTION public.forbered_evalueringer(p_kurs_id uuid)
 RETURNS TABLE(skole_navn text, hktl_epost text, token text, alt_svart boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  if auth.role() is distinct from 'service_role'
     and coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  -- Opprett evaluering-rad for skoler på kurset som ikke har en ennå
  INSERT INTO evalueringer (kurs_skole_id)
  SELECT ks.id
  FROM kurs_skole ks
  WHERE ks.kurs_id = p_kurs_id
    AND NOT EXISTS (
      SELECT 1 FROM evalueringer e WHERE e.kurs_skole_id = ks.id
    );

  -- Returner mottakerliste
  RETURN QUERY
  SELECT
    s.navn,
    s.hktl_epost,
    e.token,
    (e.svart_tidspunkt IS NOT NULL) AS alt_svart
  FROM kurs_skole ks
  JOIN evalueringer e ON e.kurs_skole_id = ks.id
  LEFT JOIN skoler s ON ks.skole_id = s.id
  WHERE ks.kurs_id = p_kurs_id
  ORDER BY s.navn;
END;
$function$;

-- kopier_kurs [V1]
create or replace function public.kopier_kurs(p_id uuid)
returns uuid language plpgsql security definer set search_path to 'public'
as $function$
declare ny_id uuid;
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  insert into kurs (
    nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong,
    oppmote_vertskap, oppmote_ovrige,
    status, maks_antall, merknad, kursholder_id, backup_kursholder_id, uke, dag, navn)
  select
    nettverk, hall_id, dato, start_tid, slutt_tid, ra, sesong,
    oppmote_vertskap, oppmote_ovrige,
    'planlagt', maks_antall, merknad, kursholder_id, backup_kursholder_id, uke, dag, navn || ' (kopi)'
  from kurs where id = p_id
  returning id into ny_id;
  return ny_id;
end;
$function$;

-- sett_melding_handtert [V1]
CREATE OR REPLACE FUNCTION public.sett_melding_handtert(p_id uuid, p_handtert boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  UPDATE kurs_skole SET melding_handtert = p_handtert WHERE id = p_id;
END;
$function$;

-- legg_til_churn_signalord [V1]
CREATE OR REPLACE FUNCTION public.legg_til_churn_signalord(nytt_ord text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ny_id uuid;
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  insert into churn_signalord (ord)
  values (lower(trim(nytt_ord)))
  returning id into ny_id;
  return ny_id;
end;
$function$;

-- skoleus_opprett_mottakere [V2]
create or replace function public.skoleus_opprett_mottakere(p_runde uuid)
returns table(opprettet integer, hoppet_over integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_filter     jsonb;
  v_rolle      text;
  v_funnet     boolean;
  v_status     text[];
  v_fylke      text[];
  v_kommune    text[];
  v_type       text[];
  v_nettverk   text[];
  v_kommune_js jsonb;
  v_opprettet  integer := 0;
  v_hoppet     integer := 0;
  v_ins        integer;
  r            record;
  v_epost      text;
  v_navn       text;
  v_kilde      text;
begin
  if auth.role() is distinct from 'service_role'
     and coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  -- Runden må finnes (henter filter + mottakerrolle).
  select true, coalesce(sr.maalgruppe, '{}'::jsonb), coalesce(sr.mottaker_rolle, 'hovedkontakt')
    into v_funnet, v_filter, v_rolle
    from public.skoleus_runder sr where sr.id = p_runde;
  if v_funnet is null then
    raise exception 'Ukjent runde: %', p_runde using errcode = 'P0002';
  end if;

  -- Filter-akser → text[] (lowercased + trimmet). Utelatt/tom akse → NULL = ingen
  -- begrensning på den aksen. Matchen i WHERE-en er tilsvarende lower(btrim(kolonne)).
  if jsonb_array_length(coalesce(v_filter->'status', '[]'::jsonb)) > 0 then
    v_status := array(select lower(btrim(x)) from jsonb_array_elements_text(v_filter->'status') as t(x));
  end if;
  if jsonb_array_length(coalesce(v_filter->'fylke', '[]'::jsonb)) > 0 then
    v_fylke := array(select lower(btrim(x)) from jsonb_array_elements_text(v_filter->'fylke') as t(x));
  end if;
  if jsonb_array_length(coalesce(v_filter->'type', '[]'::jsonb)) > 0 then
    v_type := array(select lower(btrim(x)) from jsonb_array_elements_text(v_filter->'type') as t(x));
  end if;
  if jsonb_array_length(coalesce(v_filter->'nettverk', '[]'::jsonb)) > 0 then
    v_nettverk := array(select lower(btrim(x)) from jsonb_array_elements_text(v_filter->'nettverk') as t(x));
  end if;

  -- Kommune-aksen: godta BÅDE «kommune» og «kommunenavn» som nøkkel (bakoverkompat).
  -- Slå sammen de to jsonb-listene (|| på to arrays konkatenerer), lowercased + trimmet.
  v_kommune_js := coalesce(v_filter->'kommune', '[]'::jsonb) || coalesce(v_filter->'kommunenavn', '[]'::jsonb);
  if jsonb_array_length(v_kommune_js) > 0 then
    v_kommune := array(select lower(btrim(x)) from jsonb_array_elements_text(v_kommune_js) as t(x));
  end if;

  -- Målgruppen: AND av de satte aksene. Case-insensitiv/trimmet match; NULL-akse =
  -- ingen begrensning. «kommune» → kolonnen kommunenavn.
  for r in
    select s.id, s.hktl_navn, s.hktl_epost, s.htla_navn, s.htla_epost, s.rektor_navn, s.rektor_epost
      from public.skoler s
     where (v_status   is null or lower(btrim(s.status))      = any(v_status))
       and (v_fylke    is null or lower(btrim(s.fylke))       = any(v_fylke))
       and (v_kommune  is null or lower(btrim(s.kommunenavn)) = any(v_kommune))
       and (v_type     is null or lower(btrim(s.type))        = any(v_type))
       and (v_nettverk is null or lower(btrim(s.nettverk))    = any(v_nettverk))
  loop
    -- Velg kontakt ETTER runde.mottaker_rolle (uendret fra 081).
    if v_rolle = 'rektor' then
      if nullif(trim(r.rektor_epost), '') is not null then
        v_epost := trim(r.rektor_epost); v_navn := nullif(trim(r.rektor_navn), ''); v_kilde := 'rektor';
      else
        v_epost := null;
      end if;

    elsif v_rolle = 'tl_ansvarlig' then
      if nullif(trim(r.htla_epost), '') is not null then
        v_epost := trim(r.htla_epost); v_navn := nullif(trim(r.htla_navn), ''); v_kilde := 'htla';
      else
        v_epost := null;
      end if;

    else
      -- 'hovedkontakt' (default): fallback hktl → htla → rektor.
      if nullif(trim(r.hktl_epost), '') is not null then
        v_epost := trim(r.hktl_epost);  v_navn := nullif(trim(r.hktl_navn), '');   v_kilde := 'hktl';
      elsif nullif(trim(r.htla_epost), '') is not null then
        v_epost := trim(r.htla_epost);  v_navn := nullif(trim(r.htla_navn), '');   v_kilde := 'htla';
      elsif nullif(trim(r.rektor_epost), '') is not null then
        v_epost := trim(r.rektor_epost); v_navn := nullif(trim(r.rektor_navn), ''); v_kilde := 'rektor';
      else
        v_epost := null;
      end if;
    end if;

    -- Matchet filteret, men ingen gyldig e-post for valgt rolle: hopp over (TELLES).
    -- Skolen forsvinner aldri stilltiende.
    if v_epost is null then
      v_hoppet := v_hoppet + 1;
      continue;
    end if;

    insert into public.skoleus_mottaker (runde_id, skole_id, rolle, navn, epost)
    values (p_runde, r.id, v_kilde, v_navn, v_epost)
    on conflict (runde_id, skole_id) do nothing;

    get diagnostics v_ins = row_count;   -- 0 ved konflikt → teller ikke dobbelt
    v_opprettet := v_opprettet + v_ins;
  end loop;

  return query select v_opprettet, v_hoppet;
end;
$function$;

-- skoleus_kopier_undersokelse [V1]
create or replace function public.skoleus_kopier_undersokelse(p_kilde uuid, p_navn text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ny     uuid;
  r_sp     record;
  v_ny_sp  uuid;
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  if p_kilde is null then
    raise exception 'Mangler kilde-id';
  end if;
  if coalesce(btrim(p_navn), '') = '' then
    raise exception 'Mangler navn på den nye undersøkelsen';
  end if;
  if not exists (select 1 from public.skoleus_undersokelse where id = p_kilde) then
    raise exception 'Ukjent kilde-undersøkelse: %', p_kilde using errcode = 'P0002';
  end if;

  -- Ny undersøkelse (alltid variant, ikke mal). opprettet_av = den innloggede (NULL ved service_role).
  insert into public.skoleus_undersokelse (navn, beskrivelse, er_mal, opprettet_av)
  values (
    btrim(p_navn),
    (select beskrivelse from public.skoleus_undersokelse where id = p_kilde),
    false,
    auth.uid()
  )
  returning id into v_ny;

  -- Dyp-kopi: hvert spørsmål → nytt spørsmål under v_ny; deretter dets matriserader.
  for r_sp in
    select * from public.skoleus_sporsmal
     where undersokelse_id = p_kilde
     order by rekkefolge
  loop
    insert into public.skoleus_sporsmal
      (undersokelse_id, rekkefolge, blokk, type, sporsmaltekst,
       skala_min, skala_max, tillat_ikke_aktuelt, betinget_vis)
    values
      (v_ny, r_sp.rekkefolge, r_sp.blokk, r_sp.type, r_sp.sporsmaltekst,
       r_sp.skala_min, r_sp.skala_max, r_sp.tillat_ikke_aktuelt, r_sp.betinget_vis)
    returning id into v_ny_sp;

    insert into public.skoleus_matriserad
      (sporsmal_id, rekkefolge, radtekst, tillat_ikke_aktuelt)
    select v_ny_sp, mr.rekkefolge, mr.radtekst, mr.tillat_ikke_aktuelt
      from public.skoleus_matriserad mr
     where mr.sporsmal_id = r_sp.id
     order by mr.rekkefolge;
  end loop;

  return v_ny;
end;
$function$;

-- opprett_kurs_skole_mottakere [V2]
CREATE OR REPLACE FUNCTION public.opprett_kurs_skole_mottakere(p_kurs_skole_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_skole_id uuid;
  v_epost text;
  v_navn text;
  v_kontakt jsonb;
  v_antall integer := 0;
begin
  if auth.role() is distinct from 'service_role'
     and coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  select skole_id into v_skole_id from public.kurs_skole where id = p_kurs_skole_id;
  if v_skole_id is null then return 0; end if;

  select nullif(trim(hktl_epost), ''), nullif(trim(hktl_navn), '')
    into v_epost, v_navn
    from public.skoler where id = v_skole_id;

  if v_epost is not null then
    insert into public.kurs_skole_mottaker (kurs_skole_id, rolle, navn, epost)
    values (p_kurs_skole_id, 'htla', v_navn, v_epost)
    on conflict (kurs_skole_id, epost) do nothing;
    v_antall := v_antall + 1;
  end if;

  for v_kontakt in
    select value from jsonb_array_elements(
      coalesce((select tla_kontakter from public.skoler where id = v_skole_id), '[]'::jsonb))
  loop
    v_epost := nullif(trim(v_kontakt->>'epost'), '');
    if v_epost is not null then
      insert into public.kurs_skole_mottaker (kurs_skole_id, rolle, navn, epost)
      values (p_kurs_skole_id, 'tla', nullif(trim(v_kontakt->>'navn'), ''), v_epost)
      on conflict (kurs_skole_id, epost) do nothing;
      v_antall := v_antall + 1;
    end if;
  end loop;

  return v_antall;
end;
$function$;

-- oppdater_sporsmal [V1 (LANGUAGE sql -> plpgsql)]
CREATE OR REPLACE FUNCTION public.oppdater_sporsmal(p_id uuid, p_sporsmal text, p_skala_lav text, p_skala_hoy text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  update eval_sporsmal
  set sporsmal = p_sporsmal,
      skala_lav = p_skala_lav,
      skala_hoy = p_skala_hoy
  where id = p_id;
end;
$function$;

-- slett_churn_signalord [V1 (LANGUAGE sql -> plpgsql)]
CREATE OR REPLACE FUNCTION public.slett_churn_signalord(slett_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  delete from churn_signalord where id = slett_id;
end;
$function$;

-- hent_churn_oversikt [V1 (LANGUAGE sql -> plpgsql)]
CREATE OR REPLACE FUNCTION public.hent_churn_oversikt()
 RETURNS TABLE(totalt_svar bigint, totalt_nei bigint, flagget_antall bigint, skole_navn text, nettverk text, arsak text, kurs_dato date, er_flagget boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  return query
  WITH aktive_ord AS (
    SELECT lower(ord) AS ord FROM churn_signalord WHERE aktiv
  ),
  nei_svar AS (
    SELECT
      s.navn AS skole_navn,
      k.nettverk,
      ks.arsak_ikke_komme AS arsak,
      k.dato AS kurs_dato,
      EXISTS (
        SELECT 1 FROM aktive_ord ao
        WHERE ks.arsak_ikke_komme IS NOT NULL
          AND lower(ks.arsak_ikke_komme) LIKE '%' || ao.ord || '%'
      ) AS er_flagget
    FROM kurs_skole ks
    JOIN kurs k ON ks.kurs_id = k.id
    LEFT JOIN skoler s ON ks.skole_id = s.id
    WHERE ks.kommer = false
  )
  SELECT
    (SELECT count(*) FROM kurs_skole WHERE svart = true) AS totalt_svar,
    (SELECT count(*) FROM nei_svar) AS totalt_nei,
    (SELECT count(*) FROM nei_svar WHERE er_flagget) AS flagget_antall,
    ns.skole_navn,
    ns.nettverk,
    ns.arsak,
    ns.kurs_dato,
    ns.er_flagget
  FROM nei_svar ns
  ORDER BY ns.er_flagget DESC, ns.kurs_dato DESC;
end;
$function$;

-- hent_churn_signalord [V1 (LANGUAGE sql -> plpgsql)]
CREATE OR REPLACE FUNCTION public.hent_churn_signalord()
 RETURNS TABLE(id uuid, ord text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
begin
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  return query
  select id, ord from churn_signalord order by ord asc;
end;
$function$;

-- ============================================================================
-- DEL 2 — GRANT-BILDET (alle 65). revoke fra public,anon,authenticated + grant.
-- ============================================================================

-- 1a. anon + authenticated + service_role (17)
revoke execute on function public.hent_offentlige_skoler() from public, anon, authenticated;
grant  execute on function public.hent_offentlige_skoler() to anon, authenticated, service_role;
revoke execute on function public.hent_offentlige_webinarer() from public, anon, authenticated;
grant  execute on function public.hent_offentlige_webinarer() to anon, authenticated, service_role;
revoke execute on function public.hent_delt_periodeplan(token uuid) from public, anon, authenticated;
grant  execute on function public.hent_delt_periodeplan(token uuid) to anon, authenticated, service_role;
revoke execute on function public.hent_evaluering_via_token(token text) from public, anon, authenticated;
grant  execute on function public.hent_evaluering_via_token(token text) to anon, authenticated, service_role;
revoke execute on function public.hent_kurs_skole_via_token(token text) from public, anon, authenticated;
grant  execute on function public.hent_kurs_skole_via_token(token text) to anon, authenticated, service_role;
revoke execute on function public.hent_kursinfo_via_token(token text) from public, anon, authenticated;
grant  execute on function public.hent_kursinfo_via_token(token text) to anon, authenticated, service_role;
revoke execute on function public.hent_skoleus_via_token(p_token uuid) from public, anon, authenticated;
grant  execute on function public.hent_skoleus_via_token(p_token uuid) to anon, authenticated, service_role;
revoke execute on function public.lagre_evaluering(token text, p_vurd_gjennomforing integer, p_vurd_info integer, p_vurd_aktiviteter integer, p_gullkorn text, p_forbedring text, p_kjopsinteresse text, p_valgt_pakke_id uuid) from public, anon, authenticated;
grant  execute on function public.lagre_evaluering(token text, p_vurd_gjennomforing integer, p_vurd_info integer, p_vurd_aktiviteter integer, p_gullkorn text, p_forbedring text, p_kjopsinteresse text, p_valgt_pakke_id uuid) to anon, authenticated, service_role;
revoke execute on function public.lagre_skole_svar(token text, p_kommer boolean, p_antall_tl integer, p_er_vertskap boolean, p_arsak_ikke_komme text, p_arsak_ikke_vertskap text, p_kommentar text, p_apen_for_annet_kurs boolean, p_onske_tekst text, p_pa_vegne_av boolean) from public, anon, authenticated;
grant  execute on function public.lagre_skole_svar(token text, p_kommer boolean, p_antall_tl integer, p_er_vertskap boolean, p_arsak_ikke_komme text, p_arsak_ikke_vertskap text, p_kommentar text, p_apen_for_annet_kurs boolean, p_onske_tekst text, p_pa_vegne_av boolean) to anon, authenticated, service_role;
revoke execute on function public.lever_skoleus_svar(p_token uuid, p_svar jsonb) from public, anon, authenticated;
grant  execute on function public.lever_skoleus_svar(p_token uuid, p_svar jsonb) to anon, authenticated, service_role;
revoke execute on function public.hent_aktive_pakker() from public, anon, authenticated;
grant  execute on function public.hent_aktive_pakker() to anon, authenticated, service_role;
revoke execute on function public.hent_aktive_sporsmal() from public, anon, authenticated;
grant  execute on function public.hent_aktive_sporsmal() to anon, authenticated, service_role;
revoke execute on function public.hent_aktivt_semester() from public, anon, authenticated;
grant  execute on function public.hent_aktivt_semester() to anon, authenticated, service_role;
revoke execute on function public.meld_paa_webinar(p_webinar_id uuid, p_navn text, p_epost text, p_rolle text, p_skole_id uuid, p_nyhetsbrev_samtykke boolean) from public, anon, authenticated;
grant  execute on function public.meld_paa_webinar(p_webinar_id uuid, p_navn text, p_epost text, p_rolle text, p_skole_id uuid, p_nyhetsbrev_samtykke boolean) to anon, authenticated, service_role;
revoke execute on function public.get_min_rolle() from public, anon, authenticated;
grant  execute on function public.get_min_rolle() to anon, authenticated, service_role;
revoke execute on function public.fase3_rolle() from public, anon, authenticated;
grant  execute on function public.fase3_rolle() to anon, authenticated, service_role;
revoke execute on function public.fase3_har_skole(sid uuid) from public, anon, authenticated;
grant  execute on function public.fase3_har_skole(sid uuid) to anon, authenticated, service_role;

-- 1b. authenticated + service_role (34)
revoke execute on function public.hent_sendelogg_for_kurs(p_kurs_id uuid) from public, anon, authenticated;
grant  execute on function public.hent_sendelogg_for_kurs(p_kurs_id uuid) to authenticated, service_role;
revoke execute on function public.hent_mine_kalenderlenker() from public, anon, authenticated;
grant  execute on function public.hent_mine_kalenderlenker() to authenticated, service_role;
revoke execute on function public.er_ansatt() from public, anon, authenticated;
grant  execute on function public.er_ansatt() to authenticated, service_role;
revoke execute on function public.get_mine_skole_ids() from public, anon, authenticated;
grant  execute on function public.get_mine_skole_ids() to authenticated, service_role;
revoke execute on function public.get_mine_skoler() from public, anon, authenticated;
grant  execute on function public.get_mine_skoler() to authenticated, service_role;
revoke execute on function public.get_skoleansatte_for_meg() from public, anon, authenticated;
grant  execute on function public.get_skoleansatte_for_meg() to authenticated, service_role;
revoke execute on function public.tilknyttet_skole(p_skole_id uuid) from public, anon, authenticated;
grant  execute on function public.tilknyttet_skole(p_skole_id uuid) to authenticated, service_role;
revoke execute on function public.sok_leker(p_sok text, p_egnet text, p_trinn text, p_sted text, p_utstyr text, p_uten_utstyr boolean, p_sesong text, p_kun_video boolean, p_kun_fav boolean, p_limit integer, p_offset integer) from public, anon, authenticated;
grant  execute on function public.sok_leker(p_sok text, p_egnet text, p_trinn text, p_sted text, p_utstyr text, p_uten_utstyr boolean, p_sesong text, p_kun_video boolean, p_kun_fav boolean, p_limit integer, p_offset integer) to authenticated, service_role;
revoke execute on function public.oppdater_pakke(p_id uuid, p_navn text, p_pris integer, p_beskrivelse text, p_bilde_url text) from public, anon, authenticated;
grant  execute on function public.oppdater_pakke(p_id uuid, p_navn text, p_pris integer, p_beskrivelse text, p_bilde_url text) to authenticated, service_role;
revoke execute on function public.hent_evalueringer_admin() from public, anon, authenticated;
grant  execute on function public.hent_evalueringer_admin() to authenticated, service_role;
revoke execute on function public.hent_pakker_admin() from public, anon, authenticated;
grant  execute on function public.hent_pakker_admin() to authenticated, service_role;
revoke execute on function public.hent_evalueringer_eksport() from public, anon, authenticated;
grant  execute on function public.hent_evalueringer_eksport() to authenticated, service_role;
revoke execute on function public.flytt_skole_til_kurs(p_id uuid, p_nytt_kurs_id uuid) from public, anon, authenticated;
grant  execute on function public.flytt_skole_til_kurs(p_id uuid, p_nytt_kurs_id uuid) to authenticated, service_role;
revoke execute on function public.sett_kort_status(p_id uuid, p_status text) from public, anon, authenticated;
grant  execute on function public.sett_kort_status(p_id uuid, p_status text) to authenticated, service_role;
revoke execute on function public.forbered_evalueringer(p_kurs_id uuid) from public, anon, authenticated;
grant  execute on function public.forbered_evalueringer(p_kurs_id uuid) to authenticated, service_role;
revoke execute on function public.kopier_kurs(p_id uuid) from public, anon, authenticated;
grant  execute on function public.kopier_kurs(p_id uuid) to authenticated, service_role;
revoke execute on function public.oppdater_sporsmal(p_id uuid, p_sporsmal text, p_skala_lav text, p_skala_hoy text) from public, anon, authenticated;
grant  execute on function public.oppdater_sporsmal(p_id uuid, p_sporsmal text, p_skala_lav text, p_skala_hoy text) to authenticated, service_role;
revoke execute on function public.sett_melding_handtert(p_id uuid, p_handtert boolean) from public, anon, authenticated;
grant  execute on function public.sett_melding_handtert(p_id uuid, p_handtert boolean) to authenticated, service_role;
revoke execute on function public.hent_churn_oversikt() from public, anon, authenticated;
grant  execute on function public.hent_churn_oversikt() to authenticated, service_role;
revoke execute on function public.hent_churn_signalord() from public, anon, authenticated;
grant  execute on function public.hent_churn_signalord() to authenticated, service_role;
revoke execute on function public.legg_til_churn_signalord(nytt_ord text) from public, anon, authenticated;
grant  execute on function public.legg_til_churn_signalord(nytt_ord text) to authenticated, service_role;
revoke execute on function public.slett_churn_signalord(slett_id uuid) from public, anon, authenticated;
grant  execute on function public.slett_churn_signalord(slett_id uuid) to authenticated, service_role;
revoke execute on function public.skoleus_opprett_mottakere(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.skoleus_opprett_mottakere(p_runde uuid) to authenticated, service_role;
revoke execute on function public.skoleus_kopier_undersokelse(p_kilde uuid, p_navn text) from public, anon, authenticated;
grant  execute on function public.skoleus_kopier_undersokelse(p_kilde uuid, p_navn text) to authenticated, service_role;
revoke execute on function public.skoleus_resultat_effekt(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.skoleus_resultat_effekt(p_runde uuid) to authenticated, service_role;
revoke execute on function public.tu_folg_med(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_folg_med(p_runde uuid) to authenticated, service_role;
revoke execute on function public.tu_lukk_runde(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_lukk_runde(p_runde uuid) to authenticated, service_role;
revoke execute on function public.tu_skole_resultat(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_skole_resultat(p_runde uuid) to authenticated, service_role;
revoke execute on function public.tu_skole_resultat_kjonn(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_skole_resultat_kjonn(p_runde uuid) to authenticated, service_role;
revoke execute on function public.tu_skole_utvikling(p_skole uuid, p_trinn integer) from public, anon, authenticated;
grant  execute on function public.tu_skole_utvikling(p_skole uuid, p_trinn integer) to authenticated, service_role;
revoke execute on function public.tu_generer_kodesett(p_runde uuid, p_hmacs text[], p_antall integer) from public, anon, authenticated;
grant  execute on function public.tu_generer_kodesett(p_runde uuid, p_hmacs text[], p_antall integer) to authenticated, service_role;
revoke execute on function public.tu_statistikk(p_nettverk text, p_skoleaar text, p_trinn integer, p_land text) from public, anon, authenticated;
grant  execute on function public.tu_statistikk(p_nettverk text, p_skoleaar text, p_trinn integer, p_land text) to authenticated, service_role;
revoke execute on function public.tu_har_tilgang_skole(p_skole uuid) from public, anon, authenticated;
grant  execute on function public.tu_har_tilgang_skole(p_skole uuid) to authenticated, service_role;
revoke execute on function public.tu_er_htla_paa_skole(p_skole uuid) from public, anon, authenticated;
grant  execute on function public.tu_er_htla_paa_skole(p_skole uuid) to authenticated, service_role;

-- 1c. service_role (14)
revoke execute on function public.anonymiser_bruk_hendelse() from public, anon, authenticated;
grant  execute on function public.anonymiser_bruk_hendelse() to service_role;
revoke execute on function public.anonymiser_brukslogg() from public, anon, authenticated;
grant  execute on function public.anonymiser_brukslogg() to service_role;
revoke execute on function public.opprett_kurs_skole_mottakere(p_kurs_skole_id uuid) from public, anon, authenticated;
grant  execute on function public.opprett_kurs_skole_mottakere(p_kurs_skole_id uuid) to service_role;
revoke execute on function public.fase3_logg_endring() from public, anon, authenticated;
grant  execute on function public.fase3_logg_endring() to service_role;
revoke execute on function public.tu_aggreger(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_aggreger(p_runde uuid) to service_role;
revoke execute on function public.tu_aggreger_kjonn(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_aggreger_kjonn(p_runde uuid) to service_role;
revoke execute on function public.tu_skjermet_runde(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_skjermet_runde(p_runde uuid) to service_role;
revoke execute on function public.tu_skjermet_runde_kjonn(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_skjermet_runde_kjonn(p_runde uuid) to service_role;
revoke execute on function public.tu_er_ansatt() from public, anon, authenticated;
grant  execute on function public.tu_er_ansatt() to service_role;
revoke execute on function public.tu_lever_svar(p_kode_hmac text, p_svar jsonb, p_trinn integer, p_kjonn text) from public, anon, authenticated;
grant  execute on function public.tu_lever_svar(p_kode_hmac text, p_svar jsonb, p_trinn integer, p_kjonn text) to service_role;
revoke execute on function public.tu_auto_lukk_forfalne(p_idag_oslo date, p_utfor boolean) from public, anon, authenticated;
grant  execute on function public.tu_auto_lukk_forfalne(p_idag_oslo date, p_utfor boolean) to service_role;
revoke execute on function public.tu_lukk_runde_motor(p_runde uuid) from public, anon, authenticated;
grant  execute on function public.tu_lukk_runde_motor(p_runde uuid) to service_role;
revoke execute on function public.tu_slett_utgatte_raasvar() from public, anon, authenticated;
grant  execute on function public.tu_slett_utgatte_raasvar() to service_role;
revoke execute on function public.tu_opprett_koder(p_runde uuid, p_hmacs text[]) from public, anon, authenticated;
grant  execute on function public.tu_opprett_koder(p_runde uuid, p_hmacs text[]) to service_role;

commit;

-- ============================================================================
-- KVITTERING (Kjartan, Supabase SQL-editor, kun lesing, eget kjoer etter 099)
-- Forventet: anon 17 · authenticated 51 · service_role 65 · med_rollevakt 28 · sporring 2 = 0 rader
-- ============================================================================
select
  count(*)                                                                             as secdef_totalt,
  count(*) filter (where has_function_privilege('anon',          p.oid, 'execute'))    as anon,
  count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))    as authenticated,
  count(*) filter (where has_function_privilege('service_role',  p.oid, 'execute'))    as service_role,
  count(*) filter (where p.prosrc ~* 'get_min_rolle|tu_har_tilgang_skole|tu_er_ansatt\(\)|tu_er_htla') as med_rollevakt_i_kropp
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef;

select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and p.prorettype <> 'trigger'::regtype
  and has_function_privilege('authenticated', p.oid, 'execute')
  and p.prosrc ~* '\m(insert|update|delete)\M'
  and p.prosrc !~* 'get_min_rolle|tu_har_tilgang_skole'
  and p.proname not in ('lagre_evaluering','lagre_skole_svar','lever_skoleus_svar',
                        'hent_kurs_skole_via_token','hent_skoleus_via_token','meld_paa_webinar')
order by 1;
