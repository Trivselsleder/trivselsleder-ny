-- 083_skoleundersokelse_token_rpc.sql
-- MODUL «Spørreundersøkelse til skolene» — byggetrinn 2, DEL D + E:
-- token-baserte SECURITY DEFINER-RPC-er for det OFFENTLIGE svarskjemaet.
--
-- Speiler kurs-eval sitt token-mønster (hent_kurs_skole_via_token migr 053 +
-- hent_evaluering_via_token migr 047 + lagre_evaluering). anon MÅ kunne kalle
-- begge (offentlig lenke uten innlogging) — derfor SECURITY DEFINER med streng,
-- token-avgrenset lesing. Rå tabeller er fortsatt stengt for anon (077/078).
--
-- IKKE KJØRT ENNÅ. IKKE PUSHET. Idempotent (DROP + CREATE der signatur er ny).
--
-- ── STEG 0-funn vi bygger på (verifisert i faktisk kode 31. aug 2026) ────────
-- * apnet_at-stempling: hent_kurs_skole_via_token (053) er plpgsql SECURITY DEFINER
--   og gjør «update ... set apnet_at = coalesce(apnet_at, now())» FØR return query.
--   Vi speiler nøyaktig teknikk.
-- * Spørsmålseierskap (079): skoleus_sporsmal.undersokelse_id NOT NULL, og
--   skoleus_runder.undersokelse_id NOT NULL. Spørsmålssettet MÅ hentes via rundens
--   undersokelse_id — IKKE globalt. skoleus_matriserad arver eierskap via sporsmal_id.
-- * skoleus_svar_unik_svar (078) = UNIQUE NULLS NOT DISTINCT (mottaker_id, sporsmal_id,
--   matriserad_id) → upsert-nøkkel. skoleus_svar_form_check (077): nøyaktig én av
--   ikke_aktuelt / verdi_tall / verdi_tekst.
-- * skoleus_runder.status ∈ (utkast, aktiv, lukket). Aktiv = åpen for svar.
-- * search_path settes til '' (tom) og alle objekt kvalifiseres med public. — strengere
--   enn 053 som bruker 'public'; oppdraget ber eksplisitt om SET search_path=''.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- DEL D: hent_skoleus_via_token(p_token) — offentlig oppslag for svarskjemaet.
--   Løser token → mottaker, stempler apnet_at (første åpning), returnerer runde,
--   skole, HELE spørsmålssettet (fra rundens undersøkelse) + tidligere svar for
--   denne mottakeren (levende lenke). Returnerer ALDRI andre skolers/mottakeres data.
--
-- Retur som ÉN rad med jsonb-nøstet innhold (enkelt for frontend + unngår at
-- retur-signaturen sprer seg over mange kolonner). Ukjent token → tom retur
-- (ingen exception som lekker eksistens). Lukket/utkast runde → stengt=true.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.hent_skoleus_via_token(uuid);
create function public.hent_skoleus_via_token(p_token uuid)
returns table(
  stengt        boolean,
  runde         jsonb,
  skole         jsonb,
  sporsmal      jsonb,
  tidligere_svar jsonb
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_mottaker  record;
  v_runde     record;
begin
  -- 1) Token → mottaker. Ukjent token → tom retur (ingen exception, ingen lekkasje).
  select m.id, m.runde_id, m.skole_id
    into v_mottaker
    from public.skoleus_mottaker m
   where m.lenke_token = p_token
   limit 1;
  if v_mottaker.id is null then
    return;  -- 0 rader
  end if;

  -- 2) Stemple apnet_at ved FØRSTE åpning (coalesce — speiler 053).
  update public.skoleus_mottaker
     set apnet_at = coalesce(apnet_at, now())
   where id = v_mottaker.id;

  -- 3) Runden (inkl. undersokelse_id, som eier spørsmålssettet).
  select r.id, r.navn, r.status, r.undersokelse_id
    into v_runde
    from public.skoleus_runder r
   where r.id = v_mottaker.runde_id;

  -- 4) Er runden ikke aktiv → returner stengt=true (skjemaet viser «avsluttet»),
  --    men avslør ikke spørsmål/svar.
  if v_runde.status is distinct from 'aktiv' then
    return query
      select
        true as stengt,
        jsonb_build_object('id', v_runde.id, 'navn', v_runde.navn, 'status', v_runde.status) as runde,
        (select jsonb_build_object('navn', s.navn) from public.skoler s where s.id = v_mottaker.skole_id) as skole,
        '[]'::jsonb as sporsmal,
        '[]'::jsonb as tidligere_svar;
    return;
  end if;

  -- 5) Aktiv runde: returner HELE spørsmålssettet (ordnet på blokk, rekkefolge, med
  --    matriserader ordnet på rekkefolge) + tidligere svar for DENNE mottakeren.
  return query
    select
      false as stengt,
      jsonb_build_object('id', v_runde.id, 'navn', v_runde.navn, 'status', v_runde.status) as runde,
      (select jsonb_build_object('navn', s.navn) from public.skoler s where s.id = v_mottaker.skole_id) as skole,
      coalesce((
        select jsonb_agg(sp order by sp.blokk_ord, sp.rekkefolge)
        from (
          select
            q.id, q.blokk, q.type, q.sporsmaltekst, q.skala_min, q.skala_max,
            q.tillat_ikke_aktuelt, q.rekkefolge,
            case q.blokk
              when 'rolle' then 1 when 'effekt' then 2 when 'drift' then 3
              when 'plattform' then 4 when 'aapent' then 5 else 99 end as blokk_ord,
            coalesce((
              select jsonb_agg(jsonb_build_object(
                       'id', mr.id, 'radtekst', mr.radtekst,
                       'rekkefolge', mr.rekkefolge, 'tillat_ikke_aktuelt', mr.tillat_ikke_aktuelt)
                     order by mr.rekkefolge)
              from public.skoleus_matriserad mr
              where mr.sporsmal_id = q.id
            ), '[]'::jsonb) as matriserader
          from public.skoleus_sporsmal q
          where q.undersokelse_id = v_runde.undersokelse_id
        ) sp
      ), '[]'::jsonb) as sporsmal,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'sporsmal_id', sv.sporsmal_id, 'matriserad_id', sv.matriserad_id,
                 'verdi_tall', sv.verdi_tall, 'verdi_tekst', sv.verdi_tekst,
                 'ikke_aktuelt', sv.ikke_aktuelt))
        from public.skoleus_svar sv
        where sv.mottaker_id = v_mottaker.id
      ), '[]'::jsonb) as tidligere_svar;
end;
$function$;

-- anon MÅ kunne kalle den (offentlig lenke). REVOKE fra public, GRANT til anon+authenticated.
revoke all on function public.hent_skoleus_via_token(uuid) from public;
grant execute on function public.hent_skoleus_via_token(uuid) to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- DEL E: lever_skoleus_svar(p_token, p_svar) — offentlig innsending (upsert).
--   Strengere enn kurs-eval: ALL validering ligger i RPC-en (ikke bare frontend).
--   Kjører ALT i én transaksjon (funksjonskropp er implisitt atomisk) — feiler ett
--   svar, ruller hele innsendingen tilbake.
--
--   p_svar = jsonb-array av { sporsmal_id, matriserad_id|null, verdi_tall|null,
--            verdi_tekst|null, ikke_aktuelt }.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.lever_skoleus_svar(uuid, jsonb);
create function public.lever_skoleus_svar(p_token uuid, p_svar jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_mottaker    record;
  v_runde_status text;
  v_undersokelse uuid;
  e             jsonb;
  v_sporsmal_id uuid;
  v_matriserad_id uuid;
  v_verdi_tall  integer;
  v_verdi_tekst text;
  v_ikke_aktuelt boolean;
  v_sp          record;
  v_rad_tillat  boolean;
  v_ant_form    integer;
begin
  -- 1) Token → mottaker. Ukjent → exception (frontend viser «lenke ugyldig»).
  select m.id, m.runde_id, m.skole_id
    into v_mottaker
    from public.skoleus_mottaker m
   where m.lenke_token = p_token
   limit 1;
  if v_mottaker.id is null then
    raise exception 'Ugyldig lenke.' using errcode = 'P0002';
  end if;

  -- 2) Runden må være aktiv, og vi trenger dens undersokelse_id for validering.
  select r.status, r.undersokelse_id into v_runde_status, v_undersokelse
    from public.skoleus_runder r where r.id = v_mottaker.runde_id;
  if v_runde_status is distinct from 'aktiv' then
    raise exception 'Runden er stengt.' using errcode = 'P0001';
  end if;

  if p_svar is null or jsonb_typeof(p_svar) <> 'array' then
    raise exception 'Ugyldig svarformat.' using errcode = 'P0001';
  end if;

  -- 3) Gå gjennom hvert svar, valider HARDT, og upsert.
  for e in select * from jsonb_array_elements(p_svar)
  loop
    v_sporsmal_id  := nullif(e->>'sporsmal_id', '')::uuid;
    v_matriserad_id := nullif(e->>'matriserad_id', '')::uuid;
    v_verdi_tall   := nullif(e->>'verdi_tall', '')::integer;
    v_verdi_tekst  := nullif(e->>'verdi_tekst', '');
    v_ikke_aktuelt := coalesce((e->>'ikke_aktuelt')::boolean, false);

    if v_sporsmal_id is null then
      raise exception 'Svar uten spørsmål-id.' using errcode = 'P0001';
    end if;

    -- 3a) Spørsmålet må tilhøre rundens undersøkelse.
    select q.id, q.type, q.skala_min, q.skala_max, q.tillat_ikke_aktuelt
      into v_sp
      from public.skoleus_sporsmal q
     where q.id = v_sporsmal_id and q.undersokelse_id = v_undersokelse;
    if v_sp.id is null then
      raise exception 'Ukjent spørsmål i denne undersøkelsen.' using errcode = 'P0001';
    end if;

    -- 3b) matriserad_id (hvis satt) må tilhøre nettopp dette spørsmålet, og krever matrise-type.
    v_rad_tillat := v_sp.tillat_ikke_aktuelt;  -- default: spørsmålets flagg (enkeltvalg/fritekst)
    if v_matriserad_id is not null then
      if v_sp.type <> 'matrise' then
        raise exception 'Matriserad angitt for et ikke-matrise-spørsmål.' using errcode = 'P0001';
      end if;
      select mr.tillat_ikke_aktuelt into v_rad_tillat
        from public.skoleus_matriserad mr
       where mr.id = v_matriserad_id and mr.sporsmal_id = v_sporsmal_id;
      if not found then
        raise exception 'Matriserad hører ikke til spørsmålet.' using errcode = 'P0001';
      end if;
    elsif v_sp.type = 'matrise' then
      raise exception 'Matrise-svar mangler matriserad.' using errcode = 'P0001';
    end if;

    -- 3c) Svarform: nøyaktig ÉN av ikke_aktuelt / verdi_tall / verdi_tekst (som form_check).
    v_ant_form := (case when v_ikke_aktuelt then 1 else 0 end)
                + (case when v_verdi_tall is not null then 1 else 0 end)
                + (case when v_verdi_tekst is not null then 1 else 0 end);
    if v_ant_form <> 1 then
      raise exception 'Hvert svar må ha nøyaktig én verdi (tall, tekst eller «ikke aktuelt»).' using errcode = 'P0001';
    end if;

    -- 3d) «ikke aktuelt» kun der tillatt (spørsmål for enkeltvalg/fritekst, rad for matrise).
    if v_ikke_aktuelt and not coalesce(v_rad_tillat, false) then
      raise exception '«Ikke aktuelt» er ikke tillatt her.' using errcode = 'P0001';
    end if;

    -- 3e) Type-regler for verdi.
    if v_sp.type = 'fritekst' then
      if v_verdi_tall is not null then
        raise exception 'Fritekst-spørsmål kan ikke ha tallverdi.' using errcode = 'P0001';
      end if;
    else
      -- matrise/enkeltvalg: tekst er ikke tillatt; tall (når satt) må ligge i skala.
      if v_verdi_tekst is not null then
        raise exception 'Skala-spørsmål kan ikke ha fritekst.' using errcode = 'P0001';
      end if;
      if v_verdi_tall is not null then
        if v_sp.skala_min is null or v_sp.skala_max is null
           or v_verdi_tall < v_sp.skala_min or v_verdi_tall > v_sp.skala_max then
          raise exception 'Tallverdi utenfor skala for spørsmålet.' using errcode = 'P0001';
        end if;
      end if;
    end if;

    -- 3f) Upsert på konfliktnøkkelen (mottaker_id, sporsmal_id, matriserad_id).
    --     mottaker_id/runde_id/skole_id settes ALLTID fra tokenet (aldri fra p_svar).
    insert into public.skoleus_svar
      (runde_id, skole_id, mottaker_id, sporsmal_id, matriserad_id, verdi_tall, verdi_tekst, ikke_aktuelt)
    values
      (v_mottaker.runde_id, v_mottaker.skole_id, v_mottaker.id, v_sporsmal_id, v_matriserad_id,
       v_verdi_tall, v_verdi_tekst, v_ikke_aktuelt)
    on conflict (mottaker_id, sporsmal_id, matriserad_id) do update
      set verdi_tall   = excluded.verdi_tall,
          verdi_tekst  = excluded.verdi_tekst,
          ikke_aktuelt = excluded.ikke_aktuelt,
          tidspunkt    = now();
  end loop;

  -- 4) Marker at mottakeren har svart (speiler kurs_skole.svart). coalesce → første gang teller.
  update public.skoleus_mottaker
     set svart_at = coalesce(svart_at, now())
   where id = v_mottaker.id;
end;
$function$;

revoke all on function public.lever_skoleus_svar(uuid, jsonb) from public;
grant execute on function public.lever_skoleus_svar(uuid, jsonb) to anon, authenticated, service_role;

commit;
