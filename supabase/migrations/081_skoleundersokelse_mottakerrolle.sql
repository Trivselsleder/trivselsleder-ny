-- 081_skoleundersokelse_mottakerrolle.sql
-- MODUL «Spørreundersøkelse til skolene» — la runden bestemme HVILKEN kontakt-rolle
-- mottakeren er: hovedkontakt (dagens oppførsel), rektor, eller TL-ansvarlig.
--
-- Rører KUN skoleus_runder (ny kolonne mottaker_rolle) + generator-RPC
-- skoleus_opprett_mottakere. Ingen andre tabeller. IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent.
--
-- ── STEG 0-funn vi bygger på (verifisert i faktisk kode 30. aug 2026) ────────
-- Alle tre kontakt-rollene har EGNE adresse-kolonner på public.skoler (fra 019):
--   * hovedkontakt: hktl_navn, hktl_epost
--   * TL-ansvarlig: htla_navn, htla_epost      (EGNE felt — ikke bare tla_kontakter-jsonb)
--   * rektor:       rektor_navn, rektor_epost   (EGET adresse-felt — «send til rektor» kan bygges rent)
-- Dagens generator (080) leser alle tre i fallback-kjeden hktl→htla→rektor og lagrer hvilken
-- kilde som traff i skoleus_mottaker.rolle ('hktl'|'htla'|'rektor').
-- Neste ledige migrasjonsnr = 081 (080 høyest). Bekreftet.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) mottaker_rolle på skoleus_runder. Default 'hovedkontakt' = dagens oppførsel
--    (bakoverkompatibelt: eksisterende runder får default ved kolonne-tillegg).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.skoleus_runder
  add column if not exists mottaker_rolle text not null default 'hovedkontakt';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skoleus_runder_mottaker_rolle_check'
  ) then
    alter table public.skoleus_runder
      add constraint skoleus_runder_mottaker_rolle_check
      check (mottaker_rolle in ('hovedkontakt', 'rektor', 'tl_ansvarlig'));
  end if;
end $$;

comment on column public.skoleus_runder.mottaker_rolle is
  'Hvilken kontakt runden sendes til: hovedkontakt (fallback hktl→htla→rektor) | rektor (rektor_epost) | tl_ansvarlig (htla_epost).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Generator: velg kontakt ETTER runde.mottaker_rolle. Alt annet BEVARES fra 080:
--    målgruppe-filteret (jsonb, AND-et), hopp-over-uten-epost (telles), idempotent
--    ON CONFLICT, retur (opprettet, hoppet_over). Kilde lagres i skoleus_mottaker.rolle.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.skoleus_opprett_mottakere(p_runde uuid)
returns table(opprettet integer, hoppet_over integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_filter    jsonb;
  v_rolle     text;
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
  -- Runden må finnes (henter filter + mottakerrolle).
  select true, coalesce(sr.maalgruppe, '{}'::jsonb), coalesce(sr.mottaker_rolle, 'hovedkontakt')
    into v_funnet, v_filter, v_rolle
    from public.skoleus_runder sr where sr.id = p_runde;
  if v_funnet is null then
    raise exception 'Ukjent runde: %', p_runde using errcode = 'P0002';
  end if;

  -- Filter-akser → text[]. Utelatt/tom akse → NULL = ingen begrensning.
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

  -- Målgruppen: AND av de satte aksene («kommune» → kommunenavn).
  for r in
    select s.id, s.hktl_navn, s.hktl_epost, s.htla_navn, s.htla_epost, s.rektor_navn, s.rektor_epost
      from public.skoler s
     where (v_status   is null or s.status      = any(v_status))
       and (v_fylke    is null or s.fylke       = any(v_fylke))
       and (v_kommune  is null or s.kommunenavn = any(v_kommune))
       and (v_type     is null or s.type        = any(v_type))
       and (v_nettverk is null or s.nettverk    = any(v_nettverk))
  loop
    -- Velg kontakt ETTER runde.mottaker_rolle.
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
      -- 'hovedkontakt' (default): fallback hktl → htla → rektor (UENDRET fra 078/080).
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

    -- Ingen gyldig e-post for valgt rolle: hopp over (telles), ingen rad.
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
