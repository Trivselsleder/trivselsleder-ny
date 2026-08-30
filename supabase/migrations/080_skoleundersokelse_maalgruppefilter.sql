-- 080_skoleundersokelse_maalgruppefilter.sql
-- MODUL «Spørreundersøkelse til skolene» — utvid runde-målgruppen fra ETT skoletype-
-- felt til et RIKT filter-sett (jsonb). En runde kan nå målrettes på flere akser
-- samtidig, som AND-es sammen: status, fylke, kommune, type, nettverk.
--
-- Rører KUN skoleus_runder.maalgruppe (text → jsonb) + generator-RPC
-- skoleus_opprett_mottakere. Ingen andre tabeller. IKKE KJØRT ENNÅ. IKKE PUSHET.
--
-- ── STEG 0-funn vi bygger på (verifisert i faktisk kode 30. aug 2026) ────────
-- EKSAKTE feltnavn på public.skoler (fra 019 + Skoler-adminens filter):
--   * status      text  (default 'Potensielle'). Verdisett (STATUS_VALG i AdminSkoler.jsx):
--                        'Påmeldt','Aktiv','Aktiv sagt opp','Pause','Tidligere','Potensielle'.
--                        Skrives av opprett-skole.js/skjema; kode filtrerer på 'Aktiv'/'Potensielle'.
--   * fylke       text
--   * kommunenavn text   ← «kommune»-aksen i filteret peker på DENNE kolonnen (ikke «kommune»).
--                          (kommunenr finnes også, men navnet er kommunenavn.)
--   * type        text   (barnehage/barnetrinn/ungdomstrinn/kombinert/SFO m.fl.)
--   * nettverk    text   ← KOLONNE, ikke koblingstabell. Bekreftet: migr 056 slår fast at
--                          «nettverk finnes bare som tekst (på skoler/kurs), ikke som egen tabell».
-- Fyllingsgrad/antall pr. verdi: kunne IKKE hentes live fra dette miljøet (ingen nett-
--   egress til Supabase). Feltnavnene + verdisettene er verifisert mot skjema + Skoler-
--   adminen; UI-nedtrekkene fylles fra LIVE distinkte verdier i basen ved kjøring.
-- Generator i dag (078): leser skoleus_runder.maalgruppe som TEXT og gjør
--   «v_maalgruppe is null or s.type = v_maalgruppe». Erstattes her.
-- Neste ledige migrasjonsnr = 080 (079 er høyeste). Bekreftet.
--
-- ── FILTER-FORMEN (jsonb på skoleus_runder.maalgruppe) ───────────────────────
--   {
--     "status":   ["Aktiv","Aktiv sagt opp"],   -- valgfri
--     "fylke":    ["Rogaland"],                   -- valgfri
--     "kommune":  ["Karmøy","Tysvær"],            -- valgfri (→ skoler.kommunenavn)
--     "type":     ["barnetrinn"],                 -- valgfri (→ skoler.type)
--     "nettverk": ["Haugalandet"]                 -- valgfri (→ skoler.nettverk)
--   }
--   Hver akse er valgfri. Utelatt ELLER tom liste = INGEN begrensning på den aksen.
--   Tomt objekt {} = alle skoler. Aksene som ER satt AND-es sammen.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) skoleus_runder.maalgruppe: text → jsonb (bakoverkompatibel migrering).
--    Eksisterende enkelt-skoletype 'X' migreres til {"type":["X"]}; NULL/'' → {}.
--    Idempotent: konverteres kun hvis kolonnen fortsatt er text.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_type text;
begin
  select data_type into v_type
    from information_schema.columns
   where table_schema = 'public' and table_name = 'skoleus_runder' and column_name = 'maalgruppe';

  if v_type = 'text' then
    -- Ingen default på text-kolonnen (077), men dropp for sikkerhets skyld før typebytte.
    alter table public.skoleus_runder alter column maalgruppe drop default;

    alter table public.skoleus_runder
      alter column maalgruppe type jsonb
      using (
        case
          when maalgruppe is null or btrim(maalgruppe) = '' then '{}'::jsonb
          else jsonb_build_object('type', jsonb_build_array(maalgruppe))
        end
      );

    alter table public.skoleus_runder alter column maalgruppe set default '{}'::jsonb;
    update public.skoleus_runder set maalgruppe = '{}'::jsonb where maalgruppe is null;
    alter table public.skoleus_runder alter column maalgruppe set not null;
  end if;
end $$;

comment on column public.skoleus_runder.maalgruppe is
  'Filter-sett (jsonb) for hvilke skoler runden gjelder: {status[],fylke[],kommune[],type[],nettverk[]}. '
  'Hver akse valgfri; utelatt/tom = ingen begrensning; {} = alle skoler. Aksene AND-es. '
  '«kommune» matcher skoler.kommunenavn.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Generator: skoleus_opprett_mottakere(p_runde) — bygg mottakeruttrekket ved å
--    AND-e sammen KUN de filter-aksene som faktisk har verdier. Alt annet BEVARES
--    uendret fra 078: hovedkontakt-fallback hktl→htla→rektor, hopp-over-uten-epost
--    (telles), idempotent ON CONFLICT (runde_id,skole_id) DO NOTHING, retur (opprettet,
--    hoppet_over). SECURITY DEFINER; grant authenticated+service_role, anon revoked.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.skoleus_opprett_mottakere(p_runde uuid)
returns table(opprettet integer, hoppet_over integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_filter    jsonb;
  v_funnet    boolean;
  v_status    text[];
  v_fylke     text[];
  v_kommune   text[];
  v_type      text[];
  v_nettverk  text[];
  v_opprettet integer := 0;
  v_hoppet    integer := 0;
  v_ins       integer;
  r           record;
  v_epost     text;
  v_navn      text;
  v_kilde     text;
begin
  -- Runden må finnes (henter samtidig filteret; tom om NULL).
  select true, coalesce(sr.maalgruppe, '{}'::jsonb) into v_funnet, v_filter
    from public.skoleus_runder sr where sr.id = p_runde;
  if v_funnet is null then
    raise exception 'Ukjent runde: %', p_runde using errcode = 'P0002';
  end if;

  -- Trekk ut hver akse til en text[]. Utelatt/tom akse → NULL = ingen begrensning.
  if jsonb_array_length(coalesce(v_filter->'status', '[]'::jsonb)) > 0 then
    v_status := array(select jsonb_array_elements_text(v_filter->'status'));
  end if;
  if jsonb_array_length(coalesce(v_filter->'fylke', '[]'::jsonb)) > 0 then
    v_fylke := array(select jsonb_array_elements_text(v_filter->'fylke'));
  end if;
  if jsonb_array_length(coalesce(v_filter->'kommune', '[]'::jsonb)) > 0 then
    v_kommune := array(select jsonb_array_elements_text(v_filter->'kommune'));
  end if;
  if jsonb_array_length(coalesce(v_filter->'type', '[]'::jsonb)) > 0 then
    v_type := array(select jsonb_array_elements_text(v_filter->'type'));
  end if;
  if jsonb_array_length(coalesce(v_filter->'nettverk', '[]'::jsonb)) > 0 then
    v_nettverk := array(select jsonb_array_elements_text(v_filter->'nettverk'));
  end if;

  -- Målgruppen: AND av de satte aksene (NULL-akse = ingen begrensning på den aksen).
  -- «kommune»-aksen matcher kolonnen kommunenavn (STEG 0).
  for r in
    select s.id, s.hktl_navn, s.hktl_epost, s.htla_navn, s.htla_epost, s.rektor_navn, s.rektor_epost
      from public.skoler s
     where (v_status   is null or s.status      = any(v_status))
       and (v_fylke    is null or s.fylke       = any(v_fylke))
       and (v_kommune  is null or s.kommunenavn = any(v_kommune))
       and (v_type     is null or s.type        = any(v_type))
       and (v_nettverk is null or s.nettverk    = any(v_nettverk))
  loop
    -- Fallback-kjede hktl → htla → rektor (uendret; kilde lagres i rolle).
    if nullif(trim(r.hktl_epost), '') is not null then
      v_epost := trim(r.hktl_epost);  v_navn := nullif(trim(r.hktl_navn), '');   v_kilde := 'hktl';
    elsif nullif(trim(r.htla_epost), '') is not null then
      v_epost := trim(r.htla_epost);  v_navn := nullif(trim(r.htla_navn), '');   v_kilde := 'htla';
    elsif nullif(trim(r.rektor_epost), '') is not null then
      v_epost := trim(r.rektor_epost); v_navn := nullif(trim(r.rektor_navn), ''); v_kilde := 'rektor';
    else
      v_epost := null;
    end if;

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

-- Grant-vakt uendret (create or replace beholder grants, men re-issues for idempotens).
revoke all on function public.skoleus_opprett_mottakere(uuid) from public;
grant execute on function public.skoleus_opprett_mottakere(uuid) to authenticated, service_role;

commit;
