-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 073: BEVARINGSVARIANT 1 (RAD-ESKALERING)
-- Trivselsleder-ny · 27. aug 2026 · bygger på 072 (FUNN 5-rettet, Fable PASS)
--
-- HVA: Kun kjernen public.tu_skjermet_runde_kjonn REDEFINERES (CREATE OR REPLACE,
--   UENDRET signatur/RETURNS → GRANT bevart). Propagatoren public.tu_kjonn_pinned
--   fra 072 er BYTE-FROSSET og røres IKKE her.
--
-- ENDRING (mot 072): når FUNN 5-pure-proben finner at ren-tolkningen er infeasibel
--   for et spørsmåls kjønnsrader, eskalerte 072 HELE spørsmålets kjønnsdeling (alle
--   rader skjult). 073 skjuler i stedet BARE ÉN rad helt (skjult_aarsak NULL,
--   n>=1-semantikk) — den hvis egen skjuling gjør ren-tolkningen mulig igjen (blant
--   dem: færrest synlige celler); ellers kryssvern-raden med færrest synlige celler —
--   og kjører suppresjonsløkka VIDERE (ny propagator + ny probe) på de gjenværende
--   synlige radene. Mildere skjerming, samme sunnhet (bevist på nytt med union-sweep).
--
-- FUNN 6-RETTING (27. aug, arvet fra 072 — felles kjerne): en angriper som resonnerer
--   over «ren ELLER kryssvern» kunne i sjeldne tilfeller bestemme enkeltelevers svar selv
--   med alle kjønnsrader synlige (bevist nivå E: kun 2–5 råtabeller gir observert utdata,
--   alle med samme celleverdi; i ett tilfelle «annet»-elevens svar). Kjernen regnet
--   ALLEREDE ut ren-probens pin-mengde, men kastet den og så bare på 'over'-flagget.
--   RETTING: når ren-proben er feasibel, brukes pin-mengden — finnes en skjult, ikke-null
--   kjønnscelle som er pinnet i ren-verdenen, ko-supprimeres den (fall gjennom) i stedet
--   for å avslutte trygt. Ingen propagatorendring. Rettingen ligger i den FELLES kjernen;
--   siden 073 alltid kjøres etter 072, lukkes hullet også for den live-committede 072.
--
-- FUNN 7 (073-spesifikt, VALGT: dokumentert restrisiko — propagatoren IKKE rørt): en
--   rad-eskalert rad (skjult, aarsak NULL) modelleres i proben som n>=1, men angriperen vet
--   mer (n>=k, ikke homogen, var kryssvern). I 2 av 15 600 publiserte tilfeller er
--   ren-tolkningen dermed strengt tatt infeasibel mens proben sa feasibel — men 0 celler
--   ble bestembare (også nivå E). Fable-alternativ (a) var en propagatorendring; jeg valgte
--   (b) fordi propagatoren er live-kritisk og byte-frosset gjennom fire kontrollrunder, og
--   FUNN 7 har null realisert lekkasje. Kjartan/jurist beslutter endelig.
--
-- HARDE GRENSER (uendret): signatur/RETURNS = TABLE(sporsmal,gruppe,antall,fordeling,
--   homogen,skjult,skjult_aarsak). STABLE, SECURITY DEFINER, search_path=''. Ingen
--   overload. Ingen ny verdi i skjult_aarsak (k/homogen/kryssvern/NULL). celle_min(=4)
--   aldri forvekslet med v_k. Total = 045 felt for felt. tu_kjonn_pinned BYTE-FROSSET
--   (SHA 0ddb6aa0…, functiondef-md5 7da0a476… — verifisert uendret).
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- ============================================================================

begin;

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
  v_kjonn text[] := array['jente','gutt','annet'];
  v_scale jsonb := '{}'::jsonb;   -- sp -> svarskala-lengde (m)
  v_state jsonb := '{}'::jsonb;   -- "sp|gruppe" -> {sp,gruppe,raa_antall,skjult,homogen,aarsak,ford,all_ford,terskel,dom,kryssvern}
  r record;
  v_key text;
begin
  select sporsmalversjon, land into v_versjon, v_land from public.tu_runder where id = p_runde;

  -- svarskala-lengde per spørsmål (m) — trengs som verdiområde i propagatoren
  for r in
    select nummer, jsonb_array_length(svarskala) as m
    from public.tu_sporsmal where versjon = v_versjon and land = v_land
  loop
    v_scale := v_scale || jsonb_build_object(r.nummer::text, r.m);
  end loop;

  -- ========================================================================
  -- STEG 1 — per-delgruppe grunnskjerming (k + 045 + 1.2). UENDRET.
  --   Total-radens resultat = tu_skjermet_runde (045) → arkiv/utgang-1-konsistens.
  -- ========================================================================
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
      v_is_total boolean := (r.gruppe = 'total');
      v_under_k boolean := r.antall < r.terskel;
      v_h12 boolean := public.tu_er_homogen_delgruppe(r.fordeling, r.antall, v_hdelgr);
      v_res jsonb := case when v_under_k then null
                          else public.tu_skjerm_fordeling(r.fordeling, r.antall, v_homogen, v_celle) end;
      v_res_homogen boolean := coalesce((v_res->>'homogen')::boolean,false);
      -- TOTAL: nøyaktig 045-semantikk (tu_skjermet_runde) → skjult KUN under k; homogen
      --   skjuler bare fordelingen, antall står. Skolens hovedtall alltid intakt.
      --   KJØNN: strengere — homogen/1.2 skjuler HELE cellen (Udir 1.2-vern).
      v_skjult boolean := case when v_is_total then v_under_k
                               else v_under_k or v_res_homogen or v_h12 end;
      v_homflag boolean := case when v_is_total then ((not v_under_k) and v_res_homogen)
                                else (not v_under_k) and (v_res_homogen or v_h12) end;
      v_aarsak text := case when v_under_k then 'k'
                            when (not v_is_total) and (v_res_homogen or v_h12) then 'homogen'
                            else null end;
      v_ford jsonb := case when v_skjult then null
                           when v_res_homogen then null   -- homogen: fordeling skjult (antall vises for total)
                           else coalesce(v_res->'fordeling','{}'::jsonb) end;
      v_dom int := null;  -- dominant svarverdi (for homogen kjønnsrad → propagator)
      v_mx int := -1; v_kk text; v_cc int;
    begin
      -- dominant verdi (argmax rå-fordeling) — brukes kun for homogene kjønnsrader
      for v_kk, v_cc in select key, value::int from jsonb_each_text(coalesce(r.fordeling,'{}'::jsonb)) loop
        if v_cc > v_mx then v_mx := v_cc; v_dom := v_kk::int; end if;
      end loop;
      v_key := r.sporsmal::text || '|' || r.gruppe;
      v_state := v_state || jsonb_build_object(v_key, jsonb_build_object(
        'sp', r.sporsmal, 'gruppe', r.gruppe,
        'raa_antall', r.antall, 'skjult', v_skjult,
        'homogen', v_homflag,
        'aarsak', v_aarsak, 'ford', v_ford, 'all_ford', r.fordeling,
        'terskel', r.terskel, 'dom', v_dom, 'kryssvern', false));
    end;
  end loop;

  -- ========================================================================
  -- STEG 2 — kjønnsrad-suppresjon styrt av propagatoren. Total urørt.
  -- ========================================================================
  for v_sp in select distinct (e.value->>'sp')::int from jsonb_each(v_state) e loop
    declare
      v_total_key text := v_sp::text||'|total';
      v_m int := coalesce((v_scale->>v_sp::text)::int, 6);
      v_supp int := 0;
      v_grid jsonb; v_pinres jsonb; v_pin jsonb;
      v_g text; v_gk text; v_val int; v_bad_g text; v_bad_v int;
      v_min_g text; v_min_c int; v_gc int; v_ngender int := 0;
    begin
      -- tell tilstedeværende kjønnsgrupper
      foreach v_g in array v_kjonn loop
        if v_state ? (v_sp::text||'|'||v_g) then v_ngender := v_ngender + 1; end if;
      end loop;
      -- Hopp over steg 2 hvis:
      --  * total er skjult (da er alle kjønnsrader også skjult; ingen offentlig total), ELLER
      --  * ≤ 1 kjønnsgruppe finnes — da ER den ene gruppen = totalen (hele skolen), som
      --    uansett publiseres via 045; ingen subtraksjon mulig, ingenting å verne. (Å skjule
      --    den ville tvert imot gjøre total-cellene til «skjult+bestembar».)
      if (v_state ? v_total_key)
         and not coalesce((v_state->v_total_key->>'skjult')::boolean,false)
         and v_ngender >= 2 then

        loop
          v_supp := v_supp + 1;

          -- bygg grid til propagatoren
          v_grid := jsonb_build_object(
            'm', v_m, 'T', (v_state->v_total_key->>'raa_antall')::int,
            'hom', v_homogen, 'k', (v_state->v_total_key->>'terskel')::int,
            'celle_min', v_celle,   -- KJERNE-ENDRING (Bit 4): ren additiv nøkkel; signatur/RETURNS/GRANT uendret
            -- Total tas med som offentlig rad: 045-SYNLIGE celler (angriperens faktiske
            -- kunnskap via tu_skole_resultat/arkiv) + homogen-sidevern når fordelingen
            -- er skjult men antall vises.
            'g', jsonb_build_object('total', jsonb_strip_nulls(jsonb_build_object(
                    'antall', (v_state->v_total_key->>'raa_antall')::int,
                    'ford', case when jsonb_typeof(v_state->v_total_key->'ford')='object'
                                 then v_state->v_total_key->'ford' else '{}'::jsonb end,
                    'homogen', coalesce((v_state->v_total_key->>'homogen')::boolean,false),
                    'dom', case when coalesce((v_state->v_total_key->>'homogen')::boolean,false)
                                then v_state->v_total_key->'dom' else null end))));
          foreach v_g in array v_kjonn loop
            v_gk := v_sp::text||'|'||v_g;
            if v_state ? v_gk then
              if coalesce((v_state->v_gk->>'skjult')::boolean,false) then
                v_grid := jsonb_set(v_grid, array['g', v_g], jsonb_strip_nulls(jsonb_build_object(
                  'skjult', true,
                  'aarsak', v_state->v_gk->>'aarsak',
                  'homogen', coalesce((v_state->v_gk->>'homogen')::boolean,false),
                  'dom', v_state->v_gk->'dom')));
              else
                -- PKT 2: 'ren' = pur 045-rad (ingen steg-2-fjerning). Kryssvern-rader
                --   får ren=false → propagatoren gir dem INGEN 045-cellesemantikk
                --   (angriperen vet ikke hvilke celler steg 2 fjernet).
                v_grid := jsonb_set(v_grid, array['g', v_g], jsonb_build_object(
                  'skjult', false,
                  'antall', (v_state->v_gk->>'raa_antall')::int,
                  'ren', not coalesce((v_state->v_gk->>'kryssvern')::boolean,false),
                  'ford', coalesce(v_state->v_gk->'ford','{}'::jsonb)));
              end if;
            end if;
          end loop;

          v_pinres := public.tu_kjonn_pinned(v_grid);
          v_pin := v_pinres->'pin';

          -- Detektoren kunne ikke verifisere trygt innen budsjett (for stort
          -- kombinasjonsrom) → eskaler trygt: skjul hele kjønnsdelingen for spørsmålet.
          if coalesce((v_pinres->>'over')::boolean,false) then
            foreach v_g in array v_kjonn loop
              v_gk := v_sp::text||'|'||v_g;
              if v_state ? v_gk then
                v_state := jsonb_set(v_state, array[v_gk,'skjult'], 'true'::jsonb);
                v_state := jsonb_set(v_state, array[v_gk,'ford'], 'null'::jsonb);
                v_state := jsonb_set(v_state, array[v_gk,'homogen'], 'false'::jsonb);
                v_state := jsonb_set(v_state, array[v_gk,'aarsak'], 'null'::jsonb);
                v_state := jsonb_set(v_state, array[v_gk,'kryssvern'], 'true'::jsonb);
              end if;
            end loop;
            exit;
          end if;

          -- finn en SKJULT, ikke-null kjønnscelle som er entydig bestembar
          v_bad_g := null; v_bad_v := null;
          foreach v_g in array v_kjonn loop
            v_gk := v_sp::text||'|'||v_g;
            if v_state ? v_gk then
              for v_val in select (kk)::int from jsonb_object_keys(coalesce(v_state->v_gk->'all_ford','{}'::jsonb)) kk loop
                if coalesce((v_state->v_gk->'all_ford'->>v_val::text)::int,0) > 0
                   and (coalesce((v_state->v_gk->>'skjult')::boolean,false)
                        or not ((v_state->v_gk->'ford') ? v_val::text))
                   and (v_pin ? (v_g||'|'||v_val::text)) then
                  v_bad_g := v_g; v_bad_v := v_val; exit;
                end if;
              end loop;
            end if;
            exit when v_bad_g is not null;
          end loop;

          -- FUNN 5 PURE-PROBE + VARIANT 1 (rad-eskalering). Løkka fant ingen ren=false-pin.
          --   Merkelappen er fjernet, så en angriper vet om en synlig ko-supprimert (kryssvern)
          --   rad bare «ren ELLER kryssvern». Er gridet PURE-INFEASIBELT (ingen ren-tolkning
          --   finnes), UTLEDER angriperen at (minst) én rad er kryssvern og kan pinne celler via
          --   kryssvern-strukturen (nivå D). VARIANT 1: i stedet for å skjule HELE spørsmålets
          --   kjønnsdeling, skjuler vi bare ÉN rad helt — den hvis egen skjuling gjør ren-
          --   tolkningen mulig igjen (blant dem: færrest synlige celler = minst bevaringstap);
          --   ellers (felles infeasibilitet) kryssvern-raden med færrest synlige celler. Raden får
          --   skjult_aarsak NULL (n>=1-semantikk, allerede modellert), og løkka kjører VIDERE (ny
          --   propagator + ny probe) på de gjenværende synlige radene. Ingen ny propagator-
          --   modellering; union-sweepen bærer beviset. Ren-feasibel probe ⇒ ingen handling.
          if v_bad_g is null then
            declare
              v_haskv boolean := false; v_probe jsonb; v_probres jsonb;
              v_try jsonb; v_cand text := null; v_cand_cells int := 2147483647; v_cells int;
            begin
              foreach v_g in array v_kjonn loop
                v_gk := v_sp::text||'|'||v_g;
                if v_state ? v_gk and not coalesce((v_state->v_gk->>'skjult')::boolean,false)
                   and coalesce((v_state->v_gk->>'kryssvern')::boolean,false) then v_haskv := true; end if;
              end loop;
              if not v_haskv then exit; end if;   -- ingen kryssvern-rad → ingenting å utlede → trygt

              -- pure-probe: alle synlige rader som ren=true
              v_probe := v_grid;
              foreach v_g in array v_kjonn loop
                if (v_probe->'g') ? v_g and not coalesce((v_probe->'g'->v_g->>'skjult')::boolean,false) then
                  v_probe := jsonb_set(v_probe, array['g', v_g, 'ren'], 'true'::jsonb);
                end if;
              end loop;
              v_probres := public.tu_kjonn_pinned(v_probe);
              if not coalesce((v_probres->>'over')::boolean,false) then
                -- FUNN 6 (arvet fra 072, felles kjerne): ren-proben er FEASIBEL, men propagatoren
                --   kan likevel ha pinnet skjulte, ikke-null kjønnsceller i ren-verdenen. En
                --   union-pin krever at ALLE feasible hypoteser gir samme punkt; «alle rader ren»
                --   er én av dem, så når ren er feasibel og pinner en celle, er den også
                --   union-pinnet (propagatoren er eksakt på ren-grid). Kjernen KASTET tidligere
                --   denne pin-mengden og så bare på 'over'-flagget. Nå: finn en slik celle, sett
                --   v_bad_g/v_bad_v (samme test som hovedløkka over) og FALL GJENNOM til
                --   ko-suppresjonen — i stedet for å avslutte trygt.
                foreach v_g in array v_kjonn loop
                  v_gk := v_sp::text||'|'||v_g;
                  if v_state ? v_gk then
                    for v_val in select (kk)::int from jsonb_object_keys(coalesce(v_state->v_gk->'all_ford','{}'::jsonb)) kk loop
                      if coalesce((v_state->v_gk->'all_ford'->>v_val::text)::int,0) > 0
                         and (coalesce((v_state->v_gk->>'skjult')::boolean,false)
                              or not ((v_state->v_gk->'ford') ? v_val::text))
                         and ((v_probres->'pin') ? (v_g||'|'||v_val::text)) then
                        v_bad_g := v_g; v_bad_v := v_val; exit;
                      end if;
                    end loop;
                  end if;
                  exit when v_bad_g is not null;
                end loop;
                if v_bad_g is null then exit; end if;   -- ingen probe-pin → trygt, avslutt
                -- v_bad_g satt ⇒ fall gjennom (håndteres etter declare-blokken)
              else
                -- ren-infeasibel: VARIANT 1 rad-eskalering — finn kryssvern-rad hvis skjuling
                --   alene gjør ren feasibel igjen (færrest synlige celler); ellers færrest celler.
                foreach v_g in array v_kjonn loop
                  v_gk := v_sp::text||'|'||v_g;
                  if v_state ? v_gk and not coalesce((v_state->v_gk->>'skjult')::boolean,false)
                     and coalesce((v_state->v_gk->>'kryssvern')::boolean,false) then
                    v_try := jsonb_set(v_probe, array['g', v_g], jsonb_build_object('skjult', true, 'homogen', false));
                    if not coalesce((public.tu_kjonn_pinned(v_try)->>'over')::boolean,false) then
                      v_cells := (select count(*)::int from jsonb_object_keys(coalesce(v_state->v_gk->'ford','{}'::jsonb)));
                      if v_cells < v_cand_cells then v_cand_cells := v_cells; v_cand := v_g; end if;
                    end if;
                  end if;
                end loop;
                if v_cand is null then
                  foreach v_g in array v_kjonn loop
                    v_gk := v_sp::text||'|'||v_g;
                    if v_state ? v_gk and not coalesce((v_state->v_gk->>'skjult')::boolean,false)
                       and coalesce((v_state->v_gk->>'kryssvern')::boolean,false) then
                      v_cells := (select count(*)::int from jsonb_object_keys(coalesce(v_state->v_gk->'ford','{}'::jsonb)));
                      if v_cells < v_cand_cells then v_cand_cells := v_cells; v_cand := v_g; end if;
                    end if;
                  end loop;
                end if;
                -- skjul den valgte raden helt (aarsak NULL). kryssvern-flagget nulles ⇒ output NULL.
                if v_cand is not null then
                  v_gk := v_sp::text||'|'||v_cand;
                  v_state := jsonb_set(v_state, array[v_gk,'skjult'], 'true'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'ford'], 'null'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'homogen'], 'false'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'aarsak'], 'null'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'kryssvern'], 'false'::jsonb);
                end if;
              end if;
            end;
            -- VARIANT 1 skjulte en rad (v_bad_g fortsatt null) ⇒ kjør løkka videre.
            -- FUNN 6 satte v_bad_g ⇒ fall gjennom til ko-suppresjonen under.
            if v_bad_g is null then
              exit when v_supp > 60;   -- sikkerhetskapp (monotont: rad skjult / celle fjernet)
              continue;                 -- kjør videre på gjenværende synlige rader
            end if;
          end if;

          -- KO-SUPPRESJON: minste synlige kjønnscelle i samme KOLONNE (verdi)
          v_min_g := null; v_min_c := 2147483647;
          foreach v_g in array v_kjonn loop
            v_gk := v_sp::text||'|'||v_g;
            if v_state ? v_gk and not coalesce((v_state->v_gk->>'skjult')::boolean,false)
               and ((v_state->v_gk->'ford') ? v_bad_v::text) then
              v_gc := coalesce((v_state->v_gk->'ford'->>v_bad_v::text)::int,0);
              if v_gc < v_min_c then v_min_c := v_gc; v_min_g := v_g; end if;
            end if;
          end loop;
          if v_min_g is not null then
            v_gk := v_sp::text||'|'||v_min_g;
            v_state := jsonb_set(v_state, array[v_gk,'ford'], (v_state->v_gk->'ford') - v_bad_v::text);
            v_state := jsonb_set(v_state, array[v_gk,'kryssvern'], 'true'::jsonb);
          else
            -- ellers: minste synlige celle i samme RAD (bad_g), hvis synlig
            v_gk := v_sp::text||'|'||v_bad_g;
            if v_state ? v_gk and not coalesce((v_state->v_gk->>'skjult')::boolean,false)
               and (v_state->v_gk->'ford') <> '{}'::jsonb then
              v_min_g := null; v_min_c := 2147483647;
              declare v_kk2 text;
              begin
                for v_kk2 in select key from jsonb_object_keys(v_state->v_gk->'ford') key loop
                  v_gc := coalesce((v_state->v_gk->'ford'->>v_kk2)::int,0);
                  if v_gc < v_min_c then v_min_c := v_gc; v_min_g := v_kk2; end if;
                end loop;
              end;
              if v_min_g is not null then
                v_state := jsonb_set(v_state, array[v_gk,'ford'], (v_state->v_gk->'ford') - v_min_g);
                v_state := jsonb_set(v_state, array[v_gk,'kryssvern'], 'true'::jsonb);
              end if;
            else
              -- ESKALERING: skjul hele kjønnsdelingen for spm + fjern k/homogen-sidesignal
              foreach v_g in array v_kjonn loop
                v_gk := v_sp::text||'|'||v_g;
                if v_state ? v_gk then
                  v_state := jsonb_set(v_state, array[v_gk,'skjult'], 'true'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'ford'], 'null'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'homogen'], 'false'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'aarsak'], 'null'::jsonb);
                  v_state := jsonb_set(v_state, array[v_gk,'kryssvern'], 'true'::jsonb);
                end if;
              end loop;
              exit;
            end if;
          end if;

          exit when v_supp > 60;   -- terminering (monotont: celler fjernes bare)
        end loop;
      end if;
    end;
  end loop;

  -- ========================================================================
  -- OUTPUT — total urørt (= 045). skjult_aarsak = k/homogen/kryssvern på rett rad.
  --   FUNN 5 (26. aug, sluttkontroll): 'kryssvern'-merkelappen på en SYNLIG kjønnsrad
  --   lekker (forteller angriperen at ≥1 celle ≥ celle_min er fjernet + at resten følger
  --   045-struktur — «nivå D», 98 avslørte celler/300 runder). Rettingen: 'kryssvern'
  --   settes KUN på HELT SKJULTE rader (skjult=true, dvs. eskalerte). På synlige rader
  --   (kryssvern-ko-suppresjon) er skjult_aarsak NULL. Uten merkelappen vet angriperen om
  --   en synlig rad bare «ren ELLER kryssvern»; unionen ⊆ [0,nonhom] som propagatoren
  --   allerede omslutter, så dagens propagator er bevislig sunn uten ny modellering. Det
  --   interne v_state.kryssvern-flagget (som styrer 'ren' til propagatoren) er UENDRET.
  -- ========================================================================
  return query
  select (e.value->>'sp')::int,
         e.value->>'gruppe',
         case when (e.value->>'skjult')::boolean then null else (e.value->>'raa_antall')::int end,
         case when (e.value->>'skjult')::boolean then null else (e.value->'ford') end,
         coalesce((e.value->>'homogen')::boolean,false),
         (e.value->>'skjult')::boolean,
         case
           when (e.value->>'aarsak') is not null then (e.value->>'aarsak')
           when (e.value->>'skjult')::boolean and coalesce((e.value->>'kryssvern')::boolean,false) then 'kryssvern'
           else null
         end
  from jsonb_each(v_state) e
  order by (e.value->>'sp')::int,
           case e.value->>'gruppe' when 'total' then 0 when 'jente' then 1
                                    when 'gutt' then 2 when 'annet' then 3 else 9 end;
end $$;


-- ---------------------------------------------------------------------------
-- GRANT / REVOKE (uendret fra 072 — CREATE OR REPLACE beholder GRANT, men vi
--   gjentar REVOKE eksplisitt for robusthet). Propagatoren røres ikke.
-- ---------------------------------------------------------------------------
revoke execute on function public.tu_skjermet_runde_kjonn(uuid) from public, anon, authenticated;

commit;

-- ============================================================================
-- SLUTT MIGRASJON 073.
-- ============================================================================

-- ============================================================================
-- KONTROLLRUNDE (skrives KUN av den uavhengige kontrolløren — aldri av byggeren)
-- ----------------------------------------------------------------------------
-- Runde 1 av 073-kontrollen, 27. aug 2026. Bygger: Claude Code (variant 1 fra
-- KONTROLL-fable-funn5-REKONTROLL-26aug.md §5). Kontrollør: Fable 5, uavhengig
-- (regel 4), eget miljø (ren PG 16.13, kjede 019→073 fra bunnen), eget orakel
-- (k5_attacker.py nivå U + nytt nivå U2 for rad-eskalerte rader) og ny
-- orakel-uavhengig nivå E-simulator (k5_nivaaE.py: kjører den ekte kjernen på
-- alle kandidattabeller). Full rapport: _kontroll-072b/k5/KONTROLL-fable-073-variant1-27aug.md
--
-- KONTROLLERT (alle grønne):
--   * Kjede grønn, 073 idempotent (x2). Signatur/RETURNS/vol/secdef/search_path/
--     GRANT uendret, ingen overload, skjult_aarsak-mengden uendret.
--   * tu_kjonn_pinned BYTE-FROSSET: ingen definisjon i 073; md5(pg_get_functiondef)
--     identisk i 072- og 073-database; SHA-rekonstruksjon av 072 -> 0ddb6aa0... (41 634 B).
--     Diffen 072->073 ligger kun i probe-blokken i tu_skjermet_runde_kjonn.
--   * Total = 045 felt for felt og arkiv = 045: 0 avvik / 39 650 tilfeller.
--   * Rad-eskalering tett: union U2 900 r (70 884 skjulte celler) 0 pins; C 900 r 0;
--     homogen-tung 200 r 0; U 300 r 0; replay av alle 53 D-tilfeller (125 pins,
--     29 enkeltelever) 0 fortsatt bestembare; 0 SANN_UTENFOR / 0 INFEASIBLE.
--   * Bevaring (samme frø, 450 r, h2h mot 072): viser 10,72 % -> 12,27 %, bredde
--     8,60 -> 7,71, hele splitt skjult 57,5 % -> 47,7 %. Byggerens tall bekreftet.
--
-- FUNN (dom: MÅ RETTES):
--   * FUNN 6 (blokkerende, ARVET fra 072 — identisk utdata i 072 og 073): en
--     angriper som resonnerer over «ren ELLER kryssvern» kan i sjeldne tilfeller
--     bestemme skjulte kjønnsceller entydig selv når alle rader er synlige og
--     ren-proben er feasibel. Bevist på nivå E (kun 2–5 råtabeller gir nøyaktig
--     observert utdata; f.eks. avsløres svaret til den ene «annet»-eleven).
--     Rate: 2 pins/450 r ordinær generator, 5 pins/300 r nesten-homogen generator.
--     ÅRSAK: probe-blokken (L234–237) bruker bare probens 'over'-flagg og KASTER
--     probens pin-mengde, som allerede inneholder pinsene (verifisert ved direkte
--     propagatorkall). RETTING: når over=false, sjekk v_probres->'pin' mot skjulte
--     ikke-null celler (samme test som L187–202) og fall gjennom til ko-suppresjon
--     i stedet for exit. Komplett på nivå U (union-pin => ren-verden pinner samme
--     verdi eller ren infeasibel). Må også inn i 072-veien (072 er committet).
--   * FUNN 7 (073-spesifikt, strukturelt, 0 realiserte pins): rad-eskalert rad
--     (skjult=true, skjult_aarsak=NULL — NY kombinasjon i 073, synlig for skolen)
--     modelleres i proben som n>=1, men angriperen vet n>=k, ikke homogen og
--     kryssvern. 2 av 15 600 publiserte tilfeller er ren-infeasible for angriperen
--     mens proben sa feasibel. Anbefalt: ny radtype i propagatoren (bevisst
--     opphevet frys, additiv nøkkel) — ellers dokumentert restrisiko (jurist).
--   * BENCHMARK Elevundersøkelsen: IKKE bekreftet — TU viser celler Udir 1.1/1.3
--     ville skjult (879/150 r i 072, 974 i 073). Gjelder steg 1 (045-parametre),
--     ikke 073-endringen. Beslutning for Kjartan/jurist, ikke en 073-retting.
--
-- NESTE: bygger retter FUNN 6 (+ velger for FUNN 7), ny aksepttest med k5-harness
-- (U2 + C + HOM + NEARHOM + nivå E på flaggede tilfeller + replay), ny uavhengig
-- kontroll. Ingenting pushes før PASS.
-- ============================================================================

-- ============================================================================
-- KONTROLLRUNDE 2 — FUNN 6-rettingen (skrives KUN av den uavhengige kontrolløren)
-- ----------------------------------------------------------------------------
-- Runde 2 av 073-kontrollen, 27. aug 2026. Bygger: Claude Code (FUNN 6-retting
-- i den FELLES kjernen + valg (b) for FUNN 7, RETTET-funn6-claudecode-27aug.md).
-- Kontrollør: Fable 5, uavhengig (regel 4), eget miljø fra bunnen (ren PG 16.13
-- = prod, fersk klynge, kjede 000_stub + 019_KONTROLLSTUB + repoets 020→073).
-- 073 = SHA-256 cbb19fe0eb89d1e99830400ccf06212966abd7c6a31a8fa5c4aee8bb9e70ec49,
-- 28 724 B, byte-identisk Mac→sky. Egne orakler (k5_attacker nivå U/U2), egen
-- orakel-uavhengig nivå E (k5_nivaaE.py) + eget nivå-E-vitnesøk (k5_E_witness.py).
-- Ingen tall fra byggerrapporten er gjenbrukt. Full rapport:
-- _kontroll-072b/KONTROLL-fable-073-funn6-27aug.md
--
-- DOM: PASS.
--
-- 1. FUNN 6 TETT (nivå E, orakel-uavhengig). Reproduserte lekkasjen på den gamle
--    kjernen (db bygget kun til 072): tilfelle A (sp6, frø 9121) — nivå E gir 5 av
--    42 kandidattabeller som treffer observert utdata, ALLE med annet_0 = 1 =>
--    «annet»-elevens svar entydig bestembart (k5_case U2: annet_0 in [1,1] PIN).
--    På 073 slår ko-suppresjonen inn (gutt blir rad-eskalert): nivå-E-vitne finner
--    TO råtabeller som gir NØYAKTIG samme 073-utdata, én med annet_0 = 0 og én med
--    annet_0 = 1 => «annet»-eleven ubestembar (k5_case U2: annet_0 in [0,6], INGEN
--    pin, alle gutt/jente-celler brede intervaller). Ingen enkeltelev bestembar.
-- 2. FELLES KJERNE. Lekkasjetilfellet er et 072-stil-scenario (ingen rad-eskalering
--    originalt). 073 erstatter den ENE funksjonen tu_skjermet_runde_kjonn (ingen
--    overload) — fiksen ligger i den delte probe-blokken (v_probres->'pin' brukes
--    nå, fall-gjennom til ko-suppresjon), ikke i rad-eskaleringsgrenen. Gammel-
--    kjerne-db lekker (NEARHOM 072: 5 pins, inkl. gutt_1=1 og annet_4=1); samme
--    generator på 073 (U2): 0 pins. Hullet er lukket i det delte designet.
-- 3. TIDLIGERE GRØNNE INTAKTE (eget miljø, alle 0 kjønnscelle-pins):
--      union U2 350 r (27 748 skjulte celler) 0; nivå C 300 r (23 848) 0;
--      homogen-tung U2 200 r (14 857) 0; NEARHOM U2 300 r 0; h2h U 400 r 0;
--      replay alle 53 D-tilfeller (125 pins, 29 enkeltelever) nivå U2: 0 fortsatt
--      bestembar, 0 enkeltelev. 0 SANN_UTENFOR / 0 INFEASIBLE over 29 250 tilfeller.
-- 4. PROPAGATOR BYTE-FROSSET. tu_kjonn_pinned: ingen definisjon i 073 (kun 6 kall);
--    md5(pg_get_functiondef) = 7da0a476... identisk i 072-db, 073-db og fersk kjede.
--    Diffen 072->073 ligger KUN i kjernen (kjerne-md5 c0e3c8e7... -> 2312c5fa...).
--    072-fila uendret (SHA bcad87d1..., = variant-1-kontrollen der 0ddb6aa0-grunn-
--    laget ble rekonstruert). FUNN 7: propagatoren bevisst IKKE rørt (Kjartans
--    beslutning) — byte-frysen bekreftet, ikke krevd rettet.
-- 5. HARDE GRENSER. Signatur/RETURNS/vol(i/s)/secdef/search_path=""/GRANT uendret,
--    ingen overload, skjult_aarsak-mengden uendret (k/homogen/kryssvern/NULL, ingen
--    ny verdi). Total = 045 og arkiv = 045: 0 avvik / 29 250 tilfeller. Kjede
--    019->073 grønn fra bunnen, 073 idempotent (x2, rc=0).
-- 6. BEVARING (h2h samme frø 9121, 400 identiske runder, eget miljø): synlige
--    kjønnsceller 10,9 % (072) -> 12,0 % (073) av 35 912 rå; snitt-intervallbredde
--    7,89; rad-eskalering aktiv (1 154 rader i 073, 0 i 072); hele splitt skjult
--    2 576 -> 2 251. Rad-eskaleringens gevinst er bevart — FUNN 6-fiksen kostet
--    ~0,25 pp (mot variant-1s 12,27 %), som forutsatt.
--
-- Ingenting kjørt live, ingenting pushet. Kjartan pusher etter denne PASS.
-- ============================================================================
