-- ============================================================================
-- 139_f5_hjul_periodeplan_skolebinding.sql — F5: skolebinding på egen-ledd
-- ============================================================================
-- KILDE (fasit): Fable F5 (claude_KONTROLL-fable-agenttest-fasit-17sep.md) via
--   OPPDRAG-CODE-HUBSPOT-OG-TILGANG-17sep.md, DEL 3. Bygger på PRODS MÅLTE
--   policytekst (DEL 0 / resultat-hubspot-tilgang-prod.md §3), som er identisk med
--   filen 033 for disse fire policyene (ikke blant de 15 avvik-funksjonene; dette
--   er dessuten policyer, ikke funksjoner).
--
-- PROBLEM: første ledd i insert/update-policyene på tl_hjul og periodeplan var kun
--   «bruker_id = auth.uid()» — uten skolebinding. En innlogget bruker kunne dermed
--   sette inn (eller oppdatere til) en rad med skole_id = en ANNEN skole enn sin
--   egen, så lenge bruker_id var dem selv. Da havnet raden feil på en fremmed skole.
--
-- HVA: første ledd får «and fase3_har_skole(skole_id)». De to andre leddene
--   (skoleadmin på skolen · intern) er uendret. Endres KUN på _ins og _upd (både
--   USING og WITH CHECK der de finnes) — F5s eksakte avgrensning.
--
-- BEVISST URØRT (begrunnet, jf. Claudes merknad i DEL 0):
--   * _les (SELECT) og _del (DELETE): første ledd «bruker_id = auth.uid()» beholdes.
--     Disse gjelder brukerens EGNE, allerede-lagrede rader (skole_id ble satt ved
--     insert, som nå er skolebundet). Å lese/slette sin egen historiske rad er ikke
--     en kryssing til en fremmed skole, og å stramme dem ville hindret en bruker som
--     har byttet skole i å rydde i egne gamle rader. F5 nevner kun ins/upd.
--   * tl_hjul_lek_alle: arver tilgang via EXISTS mot foreldre-hjulet; foreldrenes
--     insert er nå skolebundet, så en lek kan bare legges på et hjul man har tilgang
--     til. Utenfor F5s navngitte omfang — urørt.
--
-- NEGATIV TEST (scripts/rigg/test-139-hjul-periodeplan-skolebinding.sql):
--   bruker som er medlem på skole B, men ikke A, prøver å sette inn rad med
--   skole_id = A og bruker_id = seg selv → RLS avviser (før: tillatt).
-- POSITIV TEST: samme bruker setter inn rad med skole_id = B → tillatt.
-- TILBAKERULLING: kjør 033 sine fire create-policy-blokker på nytt (eller drop+create
--   med det gamle uttrykket der første ledd er «bruker_id = auth.uid()» alene).
-- ============================================================================

begin;

-- ---- tl_hjul ----
drop policy if exists tl_hjul_ins on public.tl_hjul;
create policy tl_hjul_ins on public.tl_hjul for insert to authenticated
  with check (
    (bruker_id = auth.uid() and fase3_har_skole(skole_id))
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists tl_hjul_upd on public.tl_hjul;
create policy tl_hjul_upd on public.tl_hjul for update to authenticated
  using (
    (bruker_id = auth.uid() and fase3_har_skole(skole_id))
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  )
  with check (
    (bruker_id = auth.uid() and fase3_har_skole(skole_id))
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

-- ---- periodeplan ----
drop policy if exists periodeplan_ins on public.periodeplan;
create policy periodeplan_ins on public.periodeplan for insert to authenticated
  with check (
    (bruker_id = auth.uid() and fase3_har_skole(skole_id))
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists periodeplan_upd on public.periodeplan;
create policy periodeplan_upd on public.periodeplan for update to authenticated
  using (
    (bruker_id = auth.uid() and fase3_har_skole(skole_id))
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  )
  with check (
    (bruker_id = auth.uid() and fase3_har_skole(skole_id))
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: alle fire with_check/qual inneholder nå fase3_har_skole på egen-leddet.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname = 'public'
     and policyname in ('tl_hjul_ins','tl_hjul_upd','periodeplan_ins','periodeplan_upd')
     and coalesce(with_check, qual) like '%bruker_id = auth.uid()) AND fase3_har_skole%';
  if n <> 4 then
    raise exception 'STOPP 139 (etter): % av 4 policyer har skolebinding på egen-leddet, forventet 4.', n;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING.
-- ----------------------------------------------------------------------------
select string_agg(policyname || ' → ' || coalesce(with_check, qual), E'\n' order by policyname) as kvittering
from pg_policies
where schemaname = 'public'
  and policyname in ('tl_hjul_ins','tl_hjul_upd','periodeplan_ins','periodeplan_upd');

commit;
