-- 084_skoleundersokelse_maalgruppe_fiks.sql
-- MODUL «Spørreundersøkelse til skolene» — HERD målgruppe-filteret i generatoren
-- skoleus_opprett_mottakere, så en runde ikke lenger STILLTIENDE treffer 0 skoler.
--
-- Rører KUN funksjonen public.skoleus_opprett_mottakere(uuid) (DROP + CREATE).
-- Ingen tabeller, ingen kolonner, ingen data. IKKE KJØRT MOT PROD. IKKE PUSHET. Idempotent.
--
-- ── HVA VAR GALT (bevist live 31. aug 2026) ──────────────────────────────────
-- En aktiv runde «Test 31» med
--   {"type":["Barnetrinn"],"fylke":["Agder"],"status":["Aktiv"],"kommune":["Arendal"]}
-- ga 0 opprettet OG 0 hoppet over, enda «Kjartans Trivselsskole» hadde
-- kommunenavn='Arendal', fylke='Agder', type='Barnetrinn', hktl_epost satt.
--
-- To ting kan gjøre at en akse STILLTIENDE nuller uttrekket (skolen faller ut i
-- WHERE-en, altså FØR hopp-over-telleren — derfor 0/0, ikke 0/N):
--
--   1) STATUS-AKSEN. skoler.status er default 'Potensielle' (019). Runden krevde
--      status='Aktiv'. En testskole som IKKE er satt til 'Aktiv' faller da korrekt
--      ut — men resultatet 0/0 forklarer ikke HVILKEN akse som tok den. Dette er
--      selve live-årsaken: status-aksen filtrerte vekk skolen.
--
--   2) BOKSTAVSTØRRELSE. Alle aksene matchet før EKSAKT (s.type = any(...)). Var
--      det minste avvik i casing/mellomrom mellom lagret filterverdi og kolonne-
--      verdi ('barnetrinn' vs 'Barnetrinn', ' Agder' vs 'Agder'), traff aksen 0.
--
-- «kommune»-nøkkelen var IKKE feilen: 080/081 leste allerede v_filter->'kommune'
-- og matchet mot kolonnen s.kommunenavn. Frontend (AdminSkoleundersokelse.jsx,
-- AKSER + byggFilterObjekt) sender nøkkelen 'kommune' og speiler samme oversettelse.
-- Vi HERDER likevel denne aksen (se punkt B) så den aldri kan bli en fella.
--
-- ── HVA VI RETTER (kun i generatoren) ────────────────────────────────────────
--   A) CASE-INSENSITIV + trimmet match på ALLE tekst-akser (status, fylke,
--      kommune, type, nettverk): lower(btrim(kolonne)) = any(lower+btrim av filter).
--      Da er «barnetrinn» = «Barnetrinn», « Agder» = «Agder». Ingen akse nuller
--      lenger på grunn av casing/mellomrom.
--   B) KOMMUNE-AKSEN godtar nå BÅDE nøkkelen «kommune» (dagens frontend + alle
--      lagrede runder) OG «kommunenavn» (samme navn som kolonnen). De to slås
--      sammen. Bakoverkompatibelt: gamle runder med «kommune» fungerer uendret;
--      framtidig frontend kan bruke «kommunenavn» uten migrering. (Valgt fordi
--      det er tryggest — ingen lagrede runder må skrives om, se pkt C i notatet.)
--
-- ALT ANNET BEVARES UENDRET fra 081: mottaker_rolle-valg (hovedkontakt/rektor/
-- tl_ansvarlig), fallback-kjede hktl→htla→rektor, hopp-over-uten-epost (telles i
-- hoppet_over — skoler forsvinner ALDRI stilltiende når de matcher filteret),
-- idempotent ON CONFLICT (runde_id,skole_id) DO NOTHING, retur (opprettet,
-- hoppet_over). SECURITY DEFINER; grant authenticated+service_role, anon revoked.
--
-- Neste ledige migrasjonsnr = 084 (083 høyest på disk). Bekreftet.

begin;

comment on column public.skoleus_runder.maalgruppe is
  'Filter-sett (jsonb) for hvilke skoler runden gjelder: {status[],fylke[],kommune[],type[],nettverk[]}. '
  'Hver akse valgfri; utelatt/tom = ingen begrensning; {} = alle skoler. Aksene AND-es. '
  'Matching er case-insensitiv og trimmet. «kommune» (også «kommunenavn») matcher skoler.kommunenavn.';

-- Signaturen er uendret (uuid → table(opprettet int, hoppet_over int)); DROP+CREATE
-- for en ren erstatning slik oppdraget ber om.
drop function if exists public.skoleus_opprett_mottakere(uuid);
create function public.skoleus_opprett_mottakere(p_runde uuid)
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

revoke all on function public.skoleus_opprett_mottakere(uuid) from public;
grant execute on function public.skoleus_opprett_mottakere(uuid) to authenticated, service_role;

commit;
