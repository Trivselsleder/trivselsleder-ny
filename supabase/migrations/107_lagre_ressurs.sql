-- ============================================================================
-- 107_lagre_ressurs.sql — D2: RPC som lagrer en hel lek/aktiv-læring i ÉN transaksjon.
-- Spesifikasjon (revidert etter Fable, 11 funn): claude_D2-SPESIFIKASJON-lagre-ressurs-7sep.md
-- ============================================================================
-- GEVINST (ærlig): atomisitet + rollevakt ett sted + optimistisk lås. Triggerne (logg/søk/ferskhet)
--   fyrer uansett og telles ikke som RPC-gevinst. Risikoprofil lav (leker, ikke TU).
--
-- INNEHOLDER TRE TING (alle målt nødvendige):
--   1) FUNN 1: herd fase3_ferskhet (search_path) — ellers feiler RPC-ens innhold-skriving under ''.
--   2) FUNN 5: BEFORE UPDATE-trigger på ressurser som setter endret_at=now() (lås robust uansett vei).
--   3) lagre_ressurs(jsonb): SECURITY DEFINER, search_path='', coalesce(get_min_rolle()) som vakt.
--
-- HUSREGEL 104: fase3_ferskhet endres KUN med `alter function … set search_path` — funksjonskroppen
--   røres ikke (ingen create-or-replace fra gammel filtekst). fase3_km_gjeldende har samme hull men er
--   UTENFOR D2 (fyrer på ressurs_kompetansemaal, som RPC-en ikke skriver) — hører til D4/køen.
-- ============================================================================

begin;

-- ── FUNN 1: herd ferskhet-triggeren (samme herding som 104 ga fase3_logg_endring) ──────────
alter function public.fase3_ferskhet() set search_path = public, pg_temp;

-- ── FUNN 5: endret_at settes av basen ved enhver UPDATE på ressurser ───────────────────────
create or replace function public.fase3_sett_endret_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.endret_at := now();
  return new;
end $$;

drop trigger if exists trg_endret_at on public.ressurser;
create trigger trg_endret_at before update on public.ressurser
  for each row execute function public.fase3_sett_endret_at();

-- ── lagre_ressurs(jsonb) ───────────────────────────────────────────────────────────────────
create or replace function public.lagre_ressurs(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_id        uuid;
  v_opprettet boolean := false;
  v_sprak     text := coalesce(p_data->>'sprak', 'nb');
  v_rad       public.ressurser%rowtype;
  v_inn       public.ressurs_innhold%rowtype;
  v_res       jsonb := coalesce(p_data->'ressurs', '{}'::jsonb);
  v_in        jsonb := coalesce(p_data->'innhold', '{}'::jsonb);
  r_tax       record;
  r_med       jsonb;
  v_tittel    text;
  v_c         text;
begin
  -- ROLLEVAKT (funn 2: coalesce). get_min_rolle setter egen search_path=public → virker fra ''.
  if coalesce(public.get_min_rolle(), '') not in ('ansatt','superadmin') then
    raise exception 'Ikke tilgang: bare interne kan lagre ressurser.' using errcode = '42501';
  end if;

  -- ── RESSURSER: ny eller oppdatering ──────────────────────────────────────────────────────
  if p_data->>'id' is null then
    v_opprettet := true;
    insert into public.ressurser
      (ressurstype, sted, antall_min, antall_maks, kan_ledes_av_elever, redaksjonell_rating,
       status, opprettet_av, endret_av)
    values (
      coalesce(v_res->>'ressurstype', 'lek'),
      v_res->>'sted',
      (v_res->>'antall_min')::int,
      (v_res->>'antall_maks')::int,
      coalesce((v_res->>'kan_ledes_av_elever')::boolean, false),
      (v_res->>'redaksjonell_rating')::numeric,
      coalesce(v_res->>'status', 'utkast'),
      v_uid, v_uid)
    returning * into v_rad;
    v_id := v_rad.id;
  else
    v_id := (p_data->>'id')::uuid;
    -- FUNN 4a: id satt ⇒ token påkrevd.
    if not (p_data ? 'endret_at') or p_data->>'endret_at' is null then
      raise exception 'Mangler endringsstempel — last inn leken på nytt.' using errcode = 'P0001';
    end if;
    -- FUNN 4c: raden må finnes.
    select * into v_rad from public.ressurser where id = v_id for update;
    if not found then
      raise exception 'Ressursen finnes ikke (kan være slettet). Last inn på nytt.' using errcode = 'P0001';
    end if;
    -- FUNN 4b / R1: sammenlign som TIDSPUNKT, ikke tekst. Samme tidspunkt har to tekstformer
    -- (PostgREST JSON-form 2026-…T06:23:41.543139+00:00 vs ::text-form 2026-… 06:23:41.543139+00),
    -- så tekst-sammenligning var ALLTID ulik og feilet hver lagring. timestamptz-parsing bevarer
    -- mikrosekundene (kun JS Date runder til ms). Ugyldig token (22007) → samme melding som funn 4a.
    begin
      if (p_data->>'endret_at')::timestamptz is distinct from v_rad.endret_at then
        raise exception 'Noen andre lagret denne %. Last inn på nytt før du lagrer.',
          to_char(v_rad.endret_at at time zone 'Europe/Oslo', 'HH24:MI') using errcode = 'P0001';
      end if;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Mangler endringsstempel — last inn leken på nytt.' using errcode = 'P0001';
    end;
    -- FUNN 3: behold ved fravær (case when nøkkel finnes …). endret_at settes av trigger (funn 5).
    update public.ressurser set
      ressurstype = case when v_res ? 'ressurstype' then v_res->>'ressurstype' else v_rad.ressurstype end,
      sted        = case when v_res ? 'sted' then v_res->>'sted' else v_rad.sted end,
      antall_min  = case when v_res ? 'antall_min' then (v_res->>'antall_min')::int else v_rad.antall_min end,
      antall_maks = case when v_res ? 'antall_maks' then (v_res->>'antall_maks')::int else v_rad.antall_maks end,
      kan_ledes_av_elever = case when v_res ? 'kan_ledes_av_elever' then (v_res->>'kan_ledes_av_elever')::boolean else v_rad.kan_ledes_av_elever end,
      redaksjonell_rating = case when v_res ? 'redaksjonell_rating' then (v_res->>'redaksjonell_rating')::numeric else v_rad.redaksjonell_rating end,
      status      = case when v_res ? 'status' then v_res->>'status' else v_rad.status end,
      endret_av   = v_uid
    where id = v_id
    returning * into v_rad;
  end if;

  -- ── RESSURS_INNHOLD (funn 3: behold ved fravær; upsert på (ressurs_id, sprak)) ────────────
  if p_data ? 'innhold' then
    select * into v_inn from public.ressurs_innhold where ressurs_id = v_id and sprak = v_sprak;
    insert into public.ressurs_innhold
      (ressurs_id, sprak, tittel, formaal, beskrivelse, forberedelse, inndeling, utgangsposisjon,
       kronologi, regler, variasjoner, instruktoernotat, antall_raatekst)
    values (v_id, v_sprak,
      case when v_in ? 'tittel'          then v_in->>'tittel'          else v_inn.tittel end,
      case when v_in ? 'formaal'         then v_in->>'formaal'         else v_inn.formaal end,
      case when v_in ? 'beskrivelse'     then v_in->>'beskrivelse'     else v_inn.beskrivelse end,
      case when v_in ? 'forberedelse'    then v_in->>'forberedelse'    else v_inn.forberedelse end,
      case when v_in ? 'inndeling'       then v_in->>'inndeling'       else v_inn.inndeling end,
      case when v_in ? 'utgangsposisjon' then v_in->>'utgangsposisjon' else v_inn.utgangsposisjon end,
      case when v_in ? 'kronologi'       then v_in->>'kronologi'       else v_inn.kronologi end,
      case when v_in ? 'regler'          then v_in->>'regler'          else v_inn.regler end,
      case when v_in ? 'variasjoner'     then v_in->>'variasjoner'     else v_inn.variasjoner end,
      case when v_in ? 'instruktoernotat' then v_in->>'instruktoernotat' else v_inn.instruktoernotat end,
      case when v_in ? 'antall_raatekst' then v_in->>'antall_raatekst' else v_inn.antall_raatekst end)
    on conflict (ressurs_id, sprak) do update set
      tittel = excluded.tittel, formaal = excluded.formaal, beskrivelse = excluded.beskrivelse,
      forberedelse = excluded.forberedelse, inndeling = excluded.inndeling,
      utgangsposisjon = excluded.utgangsposisjon, kronologi = excluded.kronologi,
      regler = excluded.regler, variasjoner = excluded.variasjoner,
      instruktoernotat = excluded.instruktoernotat, antall_raatekst = excluded.antall_raatekst;
  end if;

  -- FUNN 10: publisert krever tittel på det redigerte språket.
  if v_rad.status = 'publisert' then
    select tittel into v_tittel from public.ressurs_innhold where ressurs_id = v_id and sprak = v_sprak;
    if coalesce(v_tittel, '') = '' then
      raise exception 'En publisert lek må ha en tittel.' using errcode = 'P0001';
    end if;
  end if;

  -- ── SEKS TAKSONOMI-KOBLINGER (synk; funn 7: null-vakt + <> all) ───────────────────────────
  for r_tax in select * from (values
      ('kategori_ids','ressurs_kategori','kategori_id'),
      ('utstyr_ids','ressurs_utstyr','utstyr_id'),
      ('egnet_ids','ressurs_egnet','egnet_id'),
      ('fag_ids','ressurs_fag','fag_id'),
      ('sesong_ids','ressurs_sesong','sesong_id'),
      ('trinn_ids','ressurs_trinn','trinn_id')
    ) as t(nokkel, tbl, col)
  loop
    if p_data ? r_tax.nokkel and jsonb_typeof(p_data->r_tax.nokkel) = 'array' then
      if exists (select 1 from jsonb_array_elements(p_data->r_tax.nokkel) e where jsonb_typeof(e) = 'null') then
        raise exception 'Ugyldig (tom) verdi i %.', r_tax.nokkel using errcode = 'P0001';
      end if;
      execute format('delete from public.%I where ressurs_id = $1 and %I <> all($2::int[])', r_tax.tbl, r_tax.col)
        using v_id, array(select (jsonb_array_elements_text(p_data->r_tax.nokkel))::int);
      execute format('insert into public.%I (ressurs_id, %I) select $1, x from unnest($2::int[]) x on conflict do nothing', r_tax.tbl, r_tax.col)
        using v_id, array(select (jsonb_array_elements_text(p_data->r_tax.nokkel))::int);
    end if;
    -- fravær / JSON null: rør ikke.
  end loop;

  -- ── TRINN_INNHOLD (funn 8: synk kun for v_sprak; trinn må finnes i ressurs_trinn) ─────────
  if p_data ? 'trinn_innhold' and jsonb_typeof(p_data->'trinn_innhold') = 'array' then
    if exists (
      select 1 from jsonb_array_elements(p_data->'trinn_innhold') e
      where not exists (select 1 from public.ressurs_trinn rt
                        where rt.ressurs_id = v_id and rt.trinn_id = (e->>'trinn_id')::smallint)
    ) then
      raise exception 'Variant-tekst for et trinn leken ikke har.' using errcode = 'P0001';
    end if;
    delete from public.ressurs_trinn_innhold
     where ressurs_id = v_id and sprak = v_sprak
       and trinn_id <> all (array(select (e->>'trinn_id')::smallint
                                  from jsonb_array_elements(p_data->'trinn_innhold') e));
    insert into public.ressurs_trinn_innhold (ressurs_id, trinn_id, sprak, variant)
    select v_id, (e->>'trinn_id')::smallint, v_sprak, e->>'variant'
    from jsonb_array_elements(p_data->'trinn_innhold') e
    on conflict (ressurs_id, trinn_id, sprak) do update set variant = excluded.variant;
  end if;

  -- ── MEDIER (funn 6) ──────────────────────────────────────────────────────────────────────
  if p_data ? 'medier_fjern' and jsonb_typeof(p_data->'medier_fjern') = 'array' then
    delete from public.medier
     where ressurs_id = v_id                                        -- FUNN 6a
       and id = any (array(select (jsonb_array_elements_text(p_data->'medier_fjern'))::uuid));
  end if;
  if p_data ? 'medier' and jsonb_typeof(p_data->'medier') = 'array' then
    for r_med in select value from jsonb_array_elements(p_data->'medier') loop
      if (r_med->>'type') = 'bilde' and coalesce(r_med->>'alt_tekst', '') = '' then
        raise exception 'Alt-tekst er påkrevd for bilder (universell utforming).' using errcode = 'P0001';
      end if;
      if r_med->>'id' is null then
        insert into public.medier
          (ressurs_id, type, bunny_video_id, storage_sti, original_filnavn, alt_tekst, alt_tekst_kilde, rekkefolge)
        values (v_id, r_med->>'type', r_med->>'bunny_video_id', r_med->>'storage_sti',
          r_med->>'original_filnavn', r_med->>'alt_tekst',
          case when r_med ? 'alt_tekst' then 'menneske' else null end,   -- FUNN 6c
          coalesce((r_med->>'rekkefolge')::smallint, 0));
      else
        update public.medier set                                   -- FUNN 6b: kun alt_tekst + rekkefolge
          alt_tekst = case when r_med ? 'alt_tekst' then r_med->>'alt_tekst' else alt_tekst end,
          alt_tekst_kilde = case when r_med ? 'alt_tekst' then 'menneske' else alt_tekst_kilde end,  -- FUNN 6c
          rekkefolge = case when r_med ? 'rekkefolge' then (r_med->>'rekkefolge')::smallint else rekkefolge end
        where id = (r_med->>'id')::uuid and ressurs_id = v_id;      -- FUNN 6a
      end if;
    end loop;
  end if;

  -- ── RESSURS_DOKUMENT (funn 8: rekkefolge = array-indeks) ─────────────────────────────────
  if p_data ? 'dokument_ids' and jsonb_typeof(p_data->'dokument_ids') = 'array' then
    if exists (select 1 from jsonb_array_elements(p_data->'dokument_ids') e where jsonb_typeof(e) = 'null') then
      raise exception 'Ugyldig (tom) verdi i dokument_ids.' using errcode = 'P0001';
    end if;
    delete from public.ressurs_dokument
     where ressurs_id = v_id
       and dokument_id <> all (array(select (jsonb_array_elements_text(p_data->'dokument_ids'))::uuid));
    insert into public.ressurs_dokument (ressurs_id, dokument_id, rekkefolge)
    select v_id, (val)::uuid, (idx - 1)::smallint
    from jsonb_array_elements_text(p_data->'dokument_ids') with ordinality as t(val, idx)
    on conflict (ressurs_id, dokument_id) do update set rekkefolge = excluded.rekkefolge;
  end if;

  -- R1: returner endret_at UTEN ::text → jsonb_build_object gir JSON-formen, samme som PostgREST
  -- leverer, så D3 kan bruke kvitteringen direkte som neste lås-token.
  return jsonb_build_object('id', v_id, 'endret_at', v_rad.endret_at, 'opprettet', v_opprettet);

exception
  -- FUNN 10: feltnavn fra constraint, ikke egen mapping.
  when check_violation then
    get stacked diagnostics v_c = constraint_name;
    raise exception 'Ugyldig verdi (%).', v_c using errcode = '22000';
  when foreign_key_violation then
    raise exception 'En valgt kategori/utstyr/trinn/dokument finnes ikke lenger — last inn på nytt.'
      using errcode = '23503';
end $$;

-- Rettigheter (098/099-form).
revoke execute on function public.lagre_ressurs(jsonb) from public, anon, authenticated;
grant  execute on function public.lagre_ressurs(jsonb) to authenticated, service_role;

commit;
