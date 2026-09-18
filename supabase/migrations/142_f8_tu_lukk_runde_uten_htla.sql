-- ============================================================================
-- 142_f8_tu_lukk_runde_uten_htla.sql — F8: HTLA kan ikke lukke en TU-runde
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning F8 via OPPDRAG-CODE-HUBSPOT-OG-TILGANG-17sep.md,
--   DEL 3. tu_lukk_runde er blant de 15 funksjonene der PRODS KROPP avviker fra
--   migrasjonsfilene (claude_FN-AVVIK-KARTLAGT-12sep.md). Denne migrasjonen bygger
--   derfor på PRODS FAKTISKE KROPP, avlest i DEL 0 (resultat-hubspot-tilgang-prod.md
--   §6, pg_get_functiondef 17. sep) — IKKE på fil 045/068/069. secdef=true og
--   search_path='' er bevart byte-likt; ENESTE endring er tilgangssjekken.
--
-- HVA (én endring): fjern «or public.tu_er_htla_paa_skole(v_r.skole_id)» fra
--   tilgangssjekken. Etter dette slipper KUN public.tu_har_tilgang_skole
--   (skoleadmin/superadmin) å lukke en runde. En HTLA får «Ingen tilgang».
--   Resten av kroppen (for update-radlås, arkiver-før-sletting, slett kodehasher,
--   re-stemple svar) er uendret fra prod.
--
-- FRONTEND (samme leveranse): «Lukk runde»-knappen gates på kontekst.kanOpprette
--   (skoleadmin/superadmin) i SkoleTrivselsundersokelsen.jsx, så HTLA ikke ser den.
--
-- RETTIGHETER: samme som 099 for denne funksjonen (revoke public/anon/authenticated,
--   grant authenticated + service_role). Reapplisert her siden create-or-replace ikke
--   endrer eksisterende grants, men vi setter dem eksplisitt for å være trygge.
--
-- NEGATIV TEST (scripts/rigg/test-142-tu-lukk-runde-uten-htla.sql): en aktiv HTLA på
--   egen skole får «Ingen tilgang» ved kall på tu_lukk_runde. POSITIV: skoleadmin på
--   skolen lukker runden (status→lukket, koder slettet, arkivrad skrevet).
-- TILBAKERULLING: create-or-replace prods §6-kropp (med htla-leddet tilbake).
-- ============================================================================

begin;

create or replace function public.tu_lukk_runde(p_runde uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_r public.tu_runder%rowtype; v_resultat jsonb; v_total int;
begin
  -- FUNN 1-RETTING: «for update» tar radlåsen først, slik at en samtidig
  -- elev-innsending tvinger lukkingen til å vente (som tu_lukk_runde_motor).
  select * into v_r from public.tu_runder where id = p_runde for update;
  if v_r.id is null then raise exception 'Ukjent runde'; end if;
  -- F8 (17. sep): KUN skoleadmin/superadmin kan lukke en runde. HTLA-hjelperen
  -- er fjernet fra vakten — en HTLA får «Ingen tilgang».
  if not public.tu_har_tilgang_skole(v_r.skole_id) then
    raise exception 'Ingen tilgang';
  end if;

  -- (1) lukk
  update public.tu_runder set status='lukket', lukket_at = coalesce(lukket_at, now())
   where id = p_runde;

  -- (2) ARKIVER FØR SLETTING — ferdig skjermet utgang-1-resultat
  select count(*) into v_total from public.tu_svar where runde_id = p_runde;
  select jsonb_agg(to_jsonb(t)) into v_resultat
    from public.tu_skjermet_runde(p_runde) t;
  if not exists (select 1 from public.tu_arkiv a where a.runde_id = p_runde) then
    insert into public.tu_arkiv(runde_id, skole_id, trinn, skoleaar, semester,
                                land, sporsmalversjon, antall_totalt, resultat)
    values (p_runde, v_r.skole_id, v_r.trinn, v_r.skoleaar, v_r.semester,
            v_r.land, v_r.sporsmalversjon, v_total, coalesce(v_resultat, '[]'::jsonb));
  end if;

  -- (3) slett kodehasher (runden er lukket → kodene skal aldri virke igjen)
  delete from public.tu_koder where runde_id = p_runde;

  -- (4) re-stemple svar (felles xmin → bryter transaksjonstids-tråden)
  update public.tu_svar set svar = svar where runde_id = p_runde;
end $function$;

-- Rettigheter (samme sett som 099 for tu_lukk_runde).
revoke execute on function public.tu_lukk_runde(uuid) from public, anon, authenticated;
grant  execute on function public.tu_lukk_runde(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: htla-leddet er borte, har-tilgang-leddet står, secdef+search_path bevart.
-- ----------------------------------------------------------------------------
do $$
declare v_def text; v_secdef boolean; v_cfg text[];
begin
  select pg_get_functiondef(p.oid), p.prosecdef, p.proconfig
    into v_def, v_secdef, v_cfg
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname='public' and p.proname='tu_lukk_runde';
  -- Sperren måler KODE, ikke tekst: den ser etter det faktiske funksjonskallet
  -- «or public.tu_er_htla_paa_skole(...)», ikke bare navnet — så en kommentar som
  -- nevner hjelperen ikke utløser den («sed på en kommentar er ikke sed på koden»).
  if v_def like '%or public.tu_er_htla_paa_skole(%' then
    raise exception 'STOPP 142 (etter): htla-leddet finnes fortsatt i tu_lukk_runde.';
  end if;
  if v_def not like '%tu_har_tilgang_skole%' then
    raise exception 'STOPP 142 (etter): har-tilgang-leddet mangler i tu_lukk_runde.';
  end if;
  if not v_secdef then raise exception 'STOPP 142 (etter): tu_lukk_runde er ikke SECURITY DEFINER.'; end if;
  if coalesce(array_to_string(v_cfg, ','), '') not like '%search_path%' then
    raise exception 'STOPP 142 (etter): search_path-innstillingen mangler (proconfig=%).', v_cfg;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING.
-- ----------------------------------------------------------------------------
select 'tu_lukk_runde: htla-ledd fjernet, secdef+search_path bevart' as kvittering;

commit;
