-- ============================================================================
-- 112_fase3_km_gjeldende_search_path.sql
-- ============================================================================
-- HVA: herder SECURITY-oppførselen til trigger-funksjonen fase3_km_gjeldende()
--   ved å feste et fast search_path (public, pg_temp) — samme herding som 099/032
--   gjorde for de andre fase3-funksjonene. Funksjonen leser fra `kompetansemaal`
--   ubestemt av kallerens search_path etter dette.
--
-- KILDE (fasit): claude_KO-VURDERINGER-oppdrag 10. sep, fil 112. Funksjonen er definert
--   i 092 (create or replace, linje 144) og festet som trigger trg_km_gjeldende (BEFORE
--   INSERT on ressurs_kompetansemaal).
--
-- METODE — ALTER FUNCTION, ALDRI create or replace (husregel 104, 6. sep):
--   En create-or-replace fra en gammel filtekst kunne stille fjernet en herding en
--   SENERE migrasjon har lagt på. ALTER FUNCTION ... SET rører KUN proconfig, aldri
--   kroppen (prosrc). Sperren under BEVISER at md5(prosrc) er uendret før/etter.
--
-- SPERRER (før/etter, i samme transaksjon):
--   * funksjonen må finnes (ellers STOPP).
--   * FØR: proconfig har INGEN search_path (ellers «allerede kjørt»-STOPP — idempotent).
--   * ETTER: proconfig har search_path, OG md5(prosrc) er byte-identisk med FØR.
--
-- TILBAKERULLING (etter commit, hvis nødvendig):
--   alter function public.fase3_km_gjeldende() reset search_path;
-- ============================================================================

begin;

do $$
declare
  v_oid          oid;
  v_md5_before   text;
  v_md5_after    text;
  v_cfg_before   text[];
  v_cfg_after    text[];
begin
  v_oid := to_regprocedure('public.fase3_km_gjeldende()');
  if v_oid is null then
    raise exception 'STOPP 112: public.fase3_km_gjeldende() finnes ikke — kjør 092 først.';
  end if;

  select proconfig, md5(prosrc) into v_cfg_before, v_md5_before from pg_proc where oid = v_oid;

  -- «allerede kjørt»-stopp: search_path allerede festet ⇒ stopp uten å endre noe.
  if v_cfg_before is not null and exists (select 1 from unnest(v_cfg_before) c where c like 'search_path=%') then
    raise exception 'STOPP 112 (allerede kjørt): fase3_km_gjeldende har allerede search_path (%). Ingenting endret.',
      array_to_string(v_cfg_before, ', ');
  end if;

  -- Selve herdingen (proconfig, ikke kropp).
  alter function public.fase3_km_gjeldende() set search_path = public, pg_temp;

  select proconfig, md5(prosrc) into v_cfg_after, v_md5_after from pg_proc where oid = v_oid;

  if v_md5_after is distinct from v_md5_before then
    raise exception 'STOPP 112: prosrc endret (md5 % -> %) — ALTER FUNCTION skal aldri røre kroppen. Rulles tilbake.',
      v_md5_before, v_md5_after;
  end if;
  if v_cfg_after is null or not exists (select 1 from unnest(v_cfg_after) c where c like 'search_path=%') then
    raise exception 'STOPP 112: search_path ikke festet etter ALTER (proconfig=%). Rulles tilbake.',
      coalesce(array_to_string(v_cfg_after, ', '), 'NULL');
  end if;

  raise notice '112 OK: search_path festet på fase3_km_gjeldende, prosrc uendret (md5 %).', v_md5_after;
end $$;

-- Kvittering: EN rad. proconfig skal inneholde search_path=public, pg_temp; prosrc_md5 = før-verdien.
select proname,
       proconfig,
       md5(prosrc) as prosrc_md5
from pg_proc
where oid = to_regprocedure('public.fase3_km_gjeldende()');

commit;
