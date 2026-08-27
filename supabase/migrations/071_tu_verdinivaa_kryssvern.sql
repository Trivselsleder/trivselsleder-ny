-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 071: VERDI-NIVÅ SUBTRAKSJONSVERN (Udir 2.3)
--                        + retting av tu_skjermet_runde_kjonn (FUNN 0 + FUNN 1)
-- Trivselsleder-ny · 25. aug 2026 · Model B · hovedbasen «bak lås»
--
-- GRUNNLAG: uavhengig fable-kontroll av migr 070 (25. aug), funn 0 + funn 1
--   (claude_TU-skjerming-1.2-2.3-LEVERT-25aug.md) + gullstandard Udir 5.2 regel 2.3
--   + personverngrunnlag B3 pkt 5c + 7. Beslutning B (21. aug): Udir 1.2 + 2.3.
--
-- HVORFOR 071 (og ikke retting av 070): migr 070 er ALLEREDE KJØRT LIVE. Vi endrer
--   derfor ikke funksjonens oppførsel ved å redigere 070 retroaktivt, men REDEFINERER
--   funksjonen her med CREATE OR REPLACE. (070-FILA er separat rettet til den faktiske
--   sett-baserte live-kroppen slik at kjeden 041->070 bygger grønt fra bunnen — FUNN 0.)
--
-- ─── FUNN 1 (det denne migrasjonen løser) ───────────────────────────────────
--   070s kryssvern (tu_kryssvern_kjonn) verner HELE kjønnsceller. Men lekkasjen
--   skjer på VERDI-nivå inne i fordelings-JSON-en: når en svarverdi er skjult i én
--   gruppe (045s celle-/komplementærskjerming), men samme verdi er synlig i total +
--   de øvrige kjønnsgruppene, kan det skjulte tallet regnes ut som differansen
--   (bevist: gutt₄ = total − jente = 1 elev). Avsløringssøket fant 32/300 (sp 1) og
--   14/300 (mobbing) runder med minst én entydig bestembar skjult verdi.
--
-- ─── LØSNING: Udir-tro regel 2.3 PER SVARVERDI (komplementær, MINST MULIG ekstra) ─
--   For hvert spørsmål og hver svarverdi: hvis en verdi er skjult i minst én gruppe
--   slik at den kan rekonstrueres ved subtraksjon (total − synlige), skjules verdien
--   KOMPLEMENTÆRT — i total OG i minst én kjønnsgruppe — til regnestykket ikke lenger
--   gir et entydig svar. 045s rad-komplementær kjøres på nytt til FASTPUNKT (rad- og
--   kolonnesuppresjon påvirker hverandre).
--   VIKTIG (hele poenget): vi skjuler SÅ LITE SOM MULIG for å bryte subtraksjonen —
--   IKKE hele kjønnsdelingen. Kjønnsinnsikt (mobbing/inkludering) er formålet med
--   verktøyet, så vi ofrer heller en TOTAL-celle enn en hel kjønnsrad. Bevist:
--   løsningen skjuler ~39 % FÆRRE kjønnsceller enn «skjul hele delingen»-varianten,
--   og avsløringssweepet (4196 runder, «annet» tom og befolket, vanlige spm + mobbing)
--   gir 0 entydig bestembare skjulte celler. Udir-nivå, ikke strengere.
--   «annet»-kategorien er med i logikken. Ingen avrunding i skolens tall (utgang 1).
--
--   skjult_aarsak: en rad der en verdi er fjernet komplementært (uten at hele raden
--   er skjult av k/homogen) merkes 'kryssvern' — så rapporten kan formulere en
--   vennlig forklaring («Kjønnsfordelingen vises ikke her fordi gruppen er for liten
--   til at tallene kan deles uten at enkeltelever kan gjenkjennes.»). Ordet «anonym»
--   brukes ikke i UI.
--
-- ─── STABLE-vurdering (FUNN 0, del 2) ───────────────────────────────────────
--   tu_skjermet_runde_kjonn LESER kun (tu_innstillinger, tu_runder, tu_sporsmal,
--   tu_svar via tu_aggreger_kjonn) og gjør ren beregning i minne (jsonb/lokale
--   variabler, ingen temp-tabell, ingen skriving). STABLE er dermed KORREKT
--   (ikke VOLATILE, ikke IMMUTABLE). Bekreftet mot pg_proc.provolatile = 's'.
--
-- HUSREGEL 6: signaturen/RETURNS på tu_skjermet_runde_kjonn er UENDRET → CREATE OR
--   REPLACE er trygt og bevarer GRANT (ingen tilgangsglipp). tu_skole_resultat_kjonn
--   røres ikke (kaller bare kjernen). Ingen ny overload (bekreftet: 0 tu_-funksjoner
--   med >1 signatur). SECURITY DEFINER + SET search_path='' beholdt.
--
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- ============================================================================

begin;

-- KJERNEN — tu_skjermet_runde_kjonn med verdi-nivå 2.3 (kolonne-komplementær:
--   skjul TOTAL-verdien + én kjønnscelle) + 045s rad-komplementær, iterert til
--   FASTPUNKT. STABLE, ingen temp-tabell. Bevarer kjønnsinnsikt (prioritet): bryter
--   subtraksjonen ved å ofre en TOTAL-celle framfor hele kjønnsdelingen.
create or replace function public.tu_skjermet_runde_kjonn(p_runde uuid)
returns table(sporsmal int, gruppe text, antall int, fordeling jsonb,
              homogen boolean, skjult boolean, skjult_aarsak text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_celle   int := (select verdi::int from public.tu_innstillinger where nokkel='celle_min');
  v_homogen int := (select verdi::int from public.tu_innstillinger where nokkel='homogen_grense_pct');
  v_hdelgr  int := coalesce((select verdi::int from public.tu_innstillinger where nokkel='homogen_delgruppe_pct'),100);
  v_versjon int; v_land text;
  v_sp int;
  v_grupper text[] := array['total','jente','gutt','annet'];
  v_state jsonb := '{}'::jsonb;   -- "sp|gruppe" -> {sp,gruppe,present,raa_antall,skjult,homogen,aarsak,ford,all_ford,kryssvern}
  r record;
  v_key text;
begin
  select sporsmalversjon, land into v_versjon, v_land from public.tu_runder where id = p_runde;

  -- STEG 1: per-delgruppe grunnskjerming (k + 045 + 1.2)
  -- annet may be entirely absent (no rows). We still want a 'total/jente/gutt' baseline.
  for r in
    select ag.sporsmal, ag.gruppe, ag.fordeling, ag.antall,
           coalesce(
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel='terskel.'||sp.kategori),
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel='terskel.standard')
           ) as terskel
    from public.tu_aggreger_kjonn(p_runde) ag
    join public.tu_sporsmal sp
      on sp.nummer=ag.sporsmal and sp.versjon=v_versjon and sp.land=v_land
  loop
    declare
      v_under_k boolean := r.antall < r.terskel;
      v_h12 boolean := public.tu_er_homogen_delgruppe(r.fordeling, r.antall, v_hdelgr);
      v_res jsonb := case when v_under_k then null
                          else public.tu_skjerm_fordeling(r.fordeling, r.antall, v_homogen, v_celle) end;
      v_res_homogen boolean := coalesce((v_res->>'homogen')::boolean,false);
      v_skjult boolean := v_under_k or v_res_homogen or v_h12;
      v_aarsak text := case when v_under_k then 'k'
                            when v_res_homogen or v_h12 then 'homogen' else null end;
      v_ford jsonb := case when v_skjult then null else coalesce(v_res->'fordeling','{}'::jsonb) end;
    begin
      v_key := r.sporsmal::text || '|' || r.gruppe;
      v_state := v_state || jsonb_build_object(v_key, jsonb_build_object(
        'sp', r.sporsmal, 'gruppe', r.gruppe, 'present', true,
        'raa_antall', r.antall, 'skjult', v_skjult,
        'homogen', (not v_under_k and (v_res_homogen or v_h12)),
        'aarsak', v_aarsak, 'ford', v_ford, 'all_ford', r.fordeling,
        'kryssvern', false));
    end;
  end loop;

  -- STEG 2: value-level 2.3 fixpoint per sporsmal
  for v_sp in select distinct (e.value->>'sp')::int from jsonb_each(v_state) e loop
    declare
      v_vals int[];
      v_val int; v_g text; v_gkey text;
      v_changed boolean;
      v_iter int := 0;
    begin
      select array_agg(distinct k::int) into v_vals
      from jsonb_each(v_state) e,
           lateral jsonb_object_keys(coalesce((e.value->'all_ford'),'{}'::jsonb)) k
      where (e.value->>'sp')::int = v_sp;

      loop
        v_changed := false;
        v_iter := v_iter + 1;

        -- COL rule: for each value, ensure any hidden-nonzero column-cell is protected:
        --   safe iff (total hidden) AND (>=1 gender hidden) for that value.
        if v_vals is not null then
          foreach v_val in array v_vals loop
            declare
              v_total_key text := v_sp::text||'|total';
              v_total_present boolean := v_state ? v_total_key;
              v_total_skjult boolean := coalesce((v_state->v_total_key->>'skjult')::boolean,false);
              v_total_hasval boolean := v_total_present and not v_total_skjult
                                        and ((v_state->v_total_key->'ford') ? v_val::text);
              v_total_hidden boolean := (not v_total_present) or v_total_skjult or not v_total_hasval;
              v_gender_hidden boolean := false;
              v_present_hidden_nonzero boolean := false;
              v_gc int; v_gkey2 text; v_min_g text; v_min_c int;
            begin
              -- does any present gender/total cell hide a NONZERO true value?
              foreach v_g in array v_grupper loop
                v_gkey2 := v_sp::text||'|'||v_g;
                if v_state ? v_gkey2 then
                  if (coalesce((v_state->v_gkey2->>'skjult')::boolean,false)
                      or not ((v_state->v_gkey2->'ford') ? v_val::text))
                     and coalesce((v_state->v_gkey2->'all_ford'->>v_val::text)::int,0) > 0 then
                    v_present_hidden_nonzero := true;
                  end if;
                end if;
                if v_g <> 'total' then
                  if v_state ? v_gkey2 and (coalesce((v_state->v_gkey2->>'skjult')::boolean,false)
                        or not ((v_state->v_gkey2->'ford') ? v_val::text)) then
                    v_gender_hidden := true;
                  end if;
                  if not (v_state ? v_gkey2) then
                    -- absent gender => known zero => NOT a hidden nonzero, but counts as "known"
                    null;
                  end if;
                end if;
              end loop;

              if v_present_hidden_nonzero and not (v_total_hidden and v_gender_hidden) then
                -- (1) hide value in total if currently visible
                if v_total_present and not v_total_skjult and ((v_state->v_total_key->'ford') ? v_val::text) then
                  v_state := jsonb_set(v_state, array[v_total_key,'ford'],
                               (v_state->v_total_key->'ford') - v_val::text);
                  v_state := jsonb_set(v_state, array[v_total_key,'kryssvern'], 'true'::jsonb);
                  v_changed := true;
                end if;
                -- (2) ensure >=1 gender hidden for this value: hide smallest visible gender cell
                v_gender_hidden := false;
                foreach v_g in array array['jente','gutt','annet'] loop
                  v_gkey2 := v_sp::text||'|'||v_g;
                  if v_state ? v_gkey2 and (coalesce((v_state->v_gkey2->>'skjult')::boolean,false)
                        or not ((v_state->v_gkey2->'ford') ? v_val::text)) then
                    v_gender_hidden := true;
                  end if;
                end loop;
                if not v_gender_hidden then
                  v_min_g := null; v_min_c := 2147483647;
                  foreach v_g in array array['jente','gutt','annet'] loop
                    v_gkey2 := v_sp::text||'|'||v_g;
                    if v_state ? v_gkey2 and not coalesce((v_state->v_gkey2->>'skjult')::boolean,false)
                       and ((v_state->v_gkey2->'ford') ? v_val::text) then
                      v_gc := coalesce((v_state->v_gkey2->'ford'->>v_val::text)::int,0);
                      if v_gc < v_min_c then v_min_c := v_gc; v_min_g := v_g; end if;
                    end if;
                  end loop;
                  if v_min_g is not null then
                    v_gkey2 := v_sp::text||'|'||v_min_g;
                    v_state := jsonb_set(v_state, array[v_gkey2,'ford'],
                                 (v_state->v_gkey2->'ford') - v_val::text);
                    v_state := jsonb_set(v_state, array[v_gkey2,'kryssvern'], 'true'::jsonb);
                    v_changed := true;
                  end if;
                end if;
              end if;
            end;
          end loop;
        end if;

        -- ROW rule (045 re-fire): visible group, antall visible, exactly one nonzero value hidden -> hide smallest visible
        foreach v_g in array v_grupper loop
          v_gkey := v_sp::text||'|'||v_g;
          if v_state ? v_gkey and not coalesce((v_state->v_gkey->>'skjult')::boolean,false) then
            declare
              v_all jsonb := coalesce(v_state->v_gkey->'all_ford','{}'::jsonb);
              v_vis jsonb := coalesce(v_state->v_gkey->'ford','{}'::jsonb);
              v_hidden_cnt int; v_min_key text; v_min_val int := 2147483647; v_c int; v_k2 text;
            begin
              select count(*) into v_hidden_cnt
              from jsonb_object_keys(v_all) kk
              where not (v_vis ? kk) and coalesce((v_all->>kk)::int,0) > 0;
              if v_hidden_cnt = 1 and v_vis <> '{}'::jsonb then
                for v_k2 in select k from jsonb_object_keys(v_vis) k loop
                  v_c := coalesce((v_vis->>v_k2)::int,0);
                  if v_c < v_min_val then v_min_val := v_c; v_min_key := v_k2; end if;
                end loop;
                if v_min_key is not null then
                  v_state := jsonb_set(v_state, array[v_gkey,'ford'], v_vis - v_min_key);
                  v_state := jsonb_set(v_state, array[v_gkey,'kryssvern'], 'true'::jsonb);
                  v_changed := true;
                end if;
              end if;
            end;
          end if;
        end loop;

        exit when not v_changed or v_iter > 60;
      end loop;
    end;
  end loop;

  -- OUTPUT: skjult_aarsak reflects kryssvern when values were removed by 2.3 (and group not already k/homogen)
  return query
  select (e.value->>'sp')::int,
         e.value->>'gruppe',
         case when (e.value->>'skjult')::boolean then null else (e.value->>'raa_antall')::int end,
         case when (e.value->>'skjult')::boolean then null else (e.value->'ford') end,
         coalesce((e.value->>'homogen')::boolean,false),
         (e.value->>'skjult')::boolean,
         case
           when (e.value->>'aarsak') is not null then (e.value->>'aarsak')
           when coalesce((e.value->>'kryssvern')::boolean,false) then 'kryssvern'
           else null
         end
  from jsonb_each(v_state) e
  order by (e.value->>'sp')::int,
           case e.value->>'gruppe' when 'total' then 0 when 'jente' then 1
                                    when 'gutt' then 2 when 'annet' then 3 else 9 end;
end $$;

-- ---------------------------------------------------------------------------
-- GRANT (reaffirmert — CREATE OR REPLACE beholder grants, men vi setter dem
--   eksplisitt for å være trygge; ingen signaturendring).
-- ---------------------------------------------------------------------------
revoke execute on function public.tu_skjermet_runde_kjonn(uuid) from public, anon, authenticated;
-- (kalles kun av SECURITY DEFINER-funksjonene i steg 5; ingen direkte kallere)

commit;

-- ============================================================================
-- SLUTT MIGRASJON 071.
-- VERIFISER (samle-på-én-linje) etter kjøring — se leveransekvitteringen.
-- BOLK 3 (senere): utgang 2 (tu_statistikk) kjønnsdelt UTAD trenger samme verdi-
--   nivå-2.3 + nettverks-/nasjonaltvern (min. skoler + dominans) oppå denne kjernen.
-- ============================================================================
