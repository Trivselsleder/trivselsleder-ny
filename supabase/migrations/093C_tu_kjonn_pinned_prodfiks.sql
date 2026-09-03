-- ============================================================================
-- 093C_tu_kjonn_pinned_prodfiks.sql
-- RETTER FUNKSJONEN public.tu_kjonn_pinned I PRODUKSJON  (personvern / TU-skjerming)
-- Skrevet 3. sep 2026 av Cowork (Claude), etter Fables funksjonsdrift-kontroll
-- (claude_FUNKSJONSDRIFT-PROD-VS-FIL-3sep.md, funn nr. 1).
-- ============================================================================
--
-- HVORFOR DENNE FINNES - LES DETTE:
-- tu_kjonn_pinned er PROPAGATOREN i TU-skjermingskjernen: den avgjor hvilke
-- kjonnsdelte celler som kan avsloeres (pin) naar tall er delvis skjult. PROD
-- kjorer i dag versjonen fra 25. AUGUST. Fila 072 inneholder omskrivingen fra
-- 26. AUGUST ("RETTING Bit 1-4 + FUNN 5", 8 punkter) som fikk PASS mot MILP-
-- orakelet - men den ble ALDRI kjort live (jf. RETTET-notatene 26. aug: "ingenting
-- kjort mot produksjon"; 073 sier propagatoren er "BYTE-FROSSET").
--
-- KONSEKVENS: prod kjorer 073-KJERNEN (ny) sammen med 25.-aug-PROPAGATOREN (gammel)
-- - en kombinasjon som ALDRI fikk PASS. Den gamle propagatoren mangler de to noeklene
-- 073-kjernen sender inn ('celle_min' og 'ren'), og 26.-aug-kontrollen fant at den
-- lot kjonnsceller AVSLOERES (243 celler paa nivaa C, 1 155 paa C+). Skjermingen er
-- altsaa SVAKERE i prod enn den skal vaere. Dette er en PERSONVERNSAK.
--
-- HVA DEN GJOER: 'create or replace' av tu_kjonn_pinned med den verifiserte 26.-aug-
-- versjonen (kopiert BYTE FOR BYTE fra 072, linje 105-513) + revoke execute (072
-- linje 825). Ingenting annet fra 072 (kjernen er alt erstattet av 073).
--
-- POLARITET:
--   * MOT PROD: dette er en EKTE ENDRING - den bytter ut den gamle propagatoren.
--     Filen maa KJORES mot prod for at rettingen skal ta effekt.
--   * VED GJENOPPBYGGING: no-op. 072 lager alt denne versjonen fra fila; her blir
--     det bare en identisk 'create or replace' paa nytt.
--
-- IDEMPOTENT: 'create or replace' + 'revoke execute' kan kjores flere ganger trygt.
--
-- PLASSERING 093C: maa kjore etter 072 (lager funksjonen) og 073 (froes den). 093C
-- ligger godt etter begge, og grupperes med de andre opprydnings-migrasjonene fra
-- samme dag (093B). Kjoereren sorterer nummer, saa suffiks: 093 < 093B < 093C < 094.
--
-- KVITTERING: nederst staar en SELECT som viser md5 av funksjonsdefinisjonen i prod
-- etter kjoring, mot Fables forventede verdi 7da0a47675c4674e8e1e409e02ed74dc, pluss
-- en formatuavhengig sjekk paa at 'celle_min' og 'ren' naa finnes i kroppen.
-- ============================================================================

begin;

create or replace function public.tu_kjonn_pinned(p jsonb)
returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_m   int := (p->>'m')::int;
  v_T   int := (p->>'T')::int;
  v_hom int := (p->>'hom')::int;
  v_k   int := (p->>'k')::int;
  v_cm  int := coalesce((p->>'celle_min')::int, 4);   -- PKT 7: null-vakt
  v_cm1 int := coalesce((p->>'celle_min')::int, 4) - 1;
  v_names text[] := array['total','jente','gutt','annet'];
  BIG constant int := 1000000;
  v_pres boolean[] := array[false,false,false,false];
  v_skj  boolean[] := array[false,false,false,false];   -- kjønn helt skjult
  v_ren  boolean[] := array[false,false,false,false];   -- ren 045-rad (045-semantikk gjelder)
  v_hg   boolean[] := array[false,false,false,false];
  v_dom  int[]  := array[-1,-1,-1,-1];
  v_ak   text[] := array[null,null,null,null]::text[];
  v_gant int[]  := array[-1,-1,-1,-1];
  v_vis  boolean[];       -- 4 x m: synlig (kjent) celle
  v_cval int[];           -- 4 x m: synlig verdi (ellers 0)
  v_totknown int[];       -- 1 x m
  v_uns int[] := '{}';
  v_miss int := 0;
  v_minvis int[]     := array[BIG,BIG,BIG,BIG];   -- minste synlige celleverdi per rad
  v_minvis_k int[]   := array[-1,-1,-1,-1];        -- nøkkel(idx) til argmin synlig
  v_sumvis int[]     := array[0,0,0,0];
  v_nhid   int[]     := array[0,0,0,0];            -- antall skjulte celler per rad
  v_nonhom int[]     := array[BIG,BIG,BIG,BIG];    -- ikke-homogen øvre grense (pkt 6)
  v_ulo int[]; v_uhi int[];
  v_grp jsonb; v_ford jsonb; gi int; vi int; hh int; ww int; it int; changed boolean;
  v_nsk int := 0; v_Ssk int; v_ncomb bigint := 1;
  v_lo int[]; v_hi int[]; v_alo int[]; v_ahi int[]; v_tot int[];
  nlo int; nhi int; s1 int; s2 int; othlo int; othhi int; d int; nd int;
  v_feas boolean; v_bust boolean;
  v_u int; v_ucnt int; v_acc int; ok boolean;
  v_split int[]; v_skidx int[] := '{}'; v_asplit int[]; v_ok2 boolean;
  v_pin jsonb := '{}'::jsonb; v_over boolean := false;
  v_anyfeas boolean := false;   -- PKT 1: fantes en feasibel kombinasjon?
  v_ngp int := 0;               -- antall tilstedeværende kjønnsrader
  v_cnt_c int; v_cnt_p int; v_rest int; v_val0 int;
  -- ren-rad-valg (odometer)
  v_pure int[] := '{}';         -- gi-liste over rene kjønnsrader
  v_pnc  int[] := '{}';         -- antall valg per ren rad
  v_pch  int[] := '{}';         -- gjeldende valg per ren rad
  v_np int := 0; v_pi int; v_q int; v_ch int; v_pr int; v_ci int; v_pj int;
  v_cidx int; v_pidx int; v_cnt int; v_himax int; v_lob int; v_hib int;
  carry2 boolean; jj int;
begin
  v_vis  := array_fill(false, array[4, v_m]);
  v_cval := array_fill(0,     array[4, v_m]);
  v_totknown := array_fill(-1, array[v_m]);
  v_ulo := array_fill(BIG,  array[4, v_m]);
  v_uhi := array_fill(-BIG, array[4, v_m]);

  -- parse grid
  for gi in 1..4 loop
    v_grp := p->'g'->v_names[gi];
    if v_grp is not null then
      v_pres[gi] := true;
      v_hg[gi] := coalesce((v_grp->>'homogen')::boolean,false);
      if (v_grp ? 'dom') and (v_grp->>'dom') is not null then v_dom[gi] := (v_grp->>'dom')::int; end if;
      if gi > 1 and coalesce((v_grp->>'skjult')::boolean,false) then
        v_skj[gi] := true; v_ak[gi] := v_grp->>'aarsak'; v_nsk := v_nsk + 1;
      else
        v_gant[gi] := (v_grp->>'antall')::int;
        -- ren 045-rad? total er alltid ren (styres av split-filter); kjønnsrad: flagget 'ren'
        if gi = 1 then v_ren[1] := not v_hg[1];
        else v_ren[gi] := coalesce((v_grp->>'ren')::boolean, false);
        end if;
        v_ford := coalesce(v_grp->'ford','{}'::jsonb);
        if jsonb_typeof(v_ford)='object' then
          for vi in 1..v_m loop
            if v_ford ? (vi-1)::text then
              v_vis[gi][vi] := true;
              v_cval[gi][vi] := (v_ford->>(vi-1)::text)::int;
              if gi = 1 then v_totknown[vi] := v_cval[1][vi]; end if;
              v_sumvis[gi] := v_sumvis[gi] + v_cval[gi][vi];
              if v_cval[gi][vi] < v_minvis[gi]
                 or (v_cval[gi][vi] = v_minvis[gi] and (vi-1) < v_minvis_k[gi]) then
                if v_cval[gi][vi] < v_minvis[gi] then v_minvis[gi] := v_cval[gi][vi]; v_minvis_k[gi] := vi-1;
                elsif v_minvis_k[gi] = -1 then v_minvis_k[gi] := vi-1; end if;
              end if;
              if v_minvis_k[gi] = -1 then v_minvis_k[gi] := vi-1; end if;
            else
              v_nhid[gi] := v_nhid[gi] + 1;
            end if;
          end loop;
        end if;
        -- PKT 6: ikke-homogen øvre grense for synlige rader (kjønn alltid ikke-homogen når synlig;
        --   total kun når ikke merket homogen)
        if gi > 1 or not v_hg[1] then
          v_nonhom[gi] := (v_hom * v_gant[gi] + 99) / 100 - 1;
        end if;
      end if;
    end if;
  end loop;
  for gi in 2..4 loop if v_pres[gi] then v_ngp := v_ngp + 1; end if; end loop;

  -- totalens skjulte masse + uviste verdier
  v_miss := v_T;
  for vi in 1..v_m loop
    if v_totknown[vi] >= 0 then v_miss := v_miss - v_totknown[vi];
    else v_uns := array_append(v_uns, vi); end if;
  end loop;
  v_ucnt := coalesce(array_length(v_uns,1),0);

  v_Ssk := v_T;
  for gi in 2..4 loop if v_pres[gi] and not v_skj[gi] then v_Ssk := v_Ssk - v_gant[gi]; end if; end loop;
  for gi in 2..4 loop if v_skj[gi] then v_skidx := array_append(v_skidx, gi); end if; end loop;

  -- ren-rad-valg-liste
  for gi in 2..4 loop
    if v_pres[gi] and not v_skj[gi] and v_ren[gi] then
      v_q := v_nhid[gi];
      v_pure := array_append(v_pure, gi);
      v_pnc  := array_append(v_pnc, case when v_q = 0 then 1 when v_q = 1 then 2 else 2 + v_q*(v_q-1) end);
      v_pch  := array_append(v_pch, 0);
    end if;
  end loop;
  v_np := coalesce(array_length(v_pure,1),0);

  -- budsjett
  v_ncomb := 1;
  if v_ucnt >= 2 then
    for v_u in 1..(v_ucnt-1) loop v_ncomb := v_ncomb * (v_miss+1); exit when v_ncomb > 1000000; end loop;
  end if;
  if v_nsk >= 2 and v_ncomb <= 1000000 then
    for v_u in 1..(v_nsk-1) loop v_ncomb := v_ncomb * (v_Ssk+1); exit when v_ncomb > 1000000; end loop;
  end if;
  for v_pi in 1..v_np loop v_ncomb := v_ncomb * v_pnc[v_pi]; exit when v_ncomb > 1000000; end loop;
  if v_ncomb > 20000 then
    return jsonb_build_object('pin','{}'::jsonb,'over',true);
  end if;

  -- ENUMERER total-splitt
  v_split := array_fill(0, array[greatest(v_ucnt,1)]);
  loop
    ok := true; v_acc := 0;
    if v_ucnt >= 1 then
      for v_u in 1..v_ucnt-1 loop v_acc := v_acc + v_split[v_u]; end loop;
      if v_acc > v_miss then ok := false; else v_split[v_ucnt] := v_miss - v_acc; end if;
    end if;

    if ok then
      v_tot := array_fill(0, array[v_m]);
      for vi in 1..v_m loop if v_totknown[vi] >= 0 then v_tot[vi] := v_totknown[vi]; end if; end loop;
      if v_ucnt >= 1 then for v_u in 1..v_ucnt loop v_tot[v_uns[v_u]] := v_split[v_u]; end loop; end if;

      -- gyldighetsfilter på total-splitten
      v_ok2 := true;
      -- BIT 3: homogen total
      if v_hg[1] and v_dom[1] >= 0 and v_ucnt >= 1 then
        if v_tot[v_dom[1] + 1] < (v_hom * v_T + 99) / 100 then v_ok2 := false; end if;
      end if;
      -- PKT 6: synlig ikke-homogen total ⇒ hver total-celle < ceil(hom*T/100)
      if v_ok2 and not v_hg[1] and v_pres[1] then
        for vi in 1..v_m loop
          if v_tot[vi] >= (v_hom * v_T + 99) / 100 then v_ok2 := false; exit; end if;
        end loop;
      end if;
      -- PKT 4+5: eksakt 045-cellesemantikk på totalens uviste celler (fjernet v_minvis<BIG-vakt)
      if v_ok2 and v_ucnt >= 1 and v_ren[1] then
        v_cnt_c := 0; v_cnt_p := 0;
        for v_u in 1..v_ucnt loop
          v_val0 := v_tot[v_uns[v_u]];
          if v_val0 >= v_cm then
            v_cnt_c := v_cnt_c + 1;
            -- komplementær <= minste synlige (tiebreak nøkkel); hi_c = minvis eller minvis-1
            if v_minvis[1] < BIG then
              if v_val0 > v_minvis[1] then v_ok2 := false;
              elsif v_val0 = v_minvis[1] and (v_uns[v_u]-1) > v_minvis_k[1] then v_ok2 := false;
              end if;
            end if;
          elsif v_val0 >= 1 then
            v_cnt_p := v_cnt_p + 1;
          end if;
        end loop;
        -- (antall komplementær, antall primær) ∈ {(0,0),(0,>=2),(1,1)}
        if v_cnt_c > 1 then v_ok2 := false; end if;
        if v_cnt_c = 1 and v_cnt_p <> 1 then v_ok2 := false; end if;
        if v_cnt_c = 0 and v_cnt_p = 1 and v_minvis[1] < BIG then v_ok2 := false; end if;
      end if;

      if v_ok2 then
      -- ENUMERER skjult-antall-splitt
      v_asplit := array_fill(0, array[greatest(v_nsk,1)]);
      loop
        v_ok2 := true; v_acc := 0;
        if v_nsk >= 1 then
          for v_u in 1..v_nsk-1 loop v_acc := v_acc + v_asplit[v_u]; end loop;
          if v_acc > v_Ssk then v_ok2 := false; else v_asplit[v_nsk] := v_Ssk - v_acc; end if;
        end if;

        if v_ok2 then
          v_alo := array[0,0,0,0]; v_ahi := array[0,0,0,0];
          for gi in 1..4 loop
            if v_pres[gi] then
              if gi = 1 then v_alo[1] := v_T; v_ahi[1] := v_T;
              elsif v_skj[gi] then
                declare j int;
                begin for j in 1..v_nsk loop if v_skidx[j] = gi then v_alo[gi] := v_asplit[j]; v_ahi[gi] := v_asplit[j]; end if; end loop; end;
              else v_alo[gi] := v_gant[gi]; v_ahi[gi] := v_gant[gi];
              end if;
            end if;
          end loop;

          v_feas := true;
          for gi in 2..4 loop
            if v_skj[gi] then
              if v_ak[gi] = 'k' and v_alo[gi] > v_k - 1 then v_feas := false; end if;
            end if;
            if v_hg[gi] and v_alo[gi] < v_k then v_alo[gi] := v_k; end if;
            if v_pres[gi] and v_ak[gi] = 'k' and v_alo[gi] < 1 then v_alo[gi] := 1; end if;
          end loop;

          if v_feas then
            -- ren-rad-valg-odometer (nullstill for hver margin-kombinasjon)
            for v_pi in 1..v_np loop v_pch[v_pi] := 0; end loop;
            loop  -- over ren-rad-valg
              -- init celle-bånd
              v_lo := array_fill(0, array[4, v_m]);
              v_hi := array_fill(BIG, array[4, v_m]);
              v_bust := false;
              for gi in 1..4 loop
                if v_pres[gi] then
                  if gi = 1 then
                    for vi in 1..v_m loop v_lo[1][vi] := v_tot[vi]; v_hi[1][vi] := v_tot[vi]; end loop;
                  elsif v_skj[gi] then
                    for vi in 1..v_m loop v_lo[gi][vi] := 0; v_hi[gi][vi] := least(BIG, v_ahi[gi]); end loop;
                  else
                    -- synlig kjønnsrad: synlige celler faste, øvrige [0,nonhom]
                    for vi in 1..v_m loop
                      if v_vis[gi][vi] then v_lo[gi][vi] := v_cval[gi][vi]; v_hi[gi][vi] := v_cval[gi][vi];
                      else v_lo[gi][vi] := 0; v_hi[gi][vi] := least(v_nonhom[gi], v_ahi[gi]); end if;
                    end loop;
                  end if;
                end if;
              end loop;

              -- sett 045-regime-bånd for rene kjønnsrader iht valg
              for v_pi in 1..v_np loop
                gi := v_pure[v_pi];
                v_q := v_nhid[gi];
                v_rest := v_gant[gi] - v_sumvis[gi];
                v_ch := v_pch[v_pi];
                if v_q = 0 then
                  null;  -- ingen skjulte celler
                elsif v_ch = 0 then
                  -- alle skjulte = 0 (gyldig kun hvis rest=0)
                  if v_rest <> 0 then v_bust := true;
                  else for vi in 1..v_m loop if not v_vis[gi][vi] then v_lo[gi][vi]:=0; v_hi[gi][vi]:=0; end if; end loop; end if;
                elsif v_ch = 1 then
                  -- ingen komplementær, primærer (>=2 hvis synlig finnes): hver skjult i [lob,hib]
                  if v_rest < (case when v_minvis[gi] < BIG then 2 else 1 end) or v_rest > v_q * v_cm1 then
                    v_bust := true;
                  else
                    v_hib := least(v_cm1, case when v_minvis[gi] < BIG then v_rest - 1 else v_rest end);
                    v_lob := greatest(0, v_rest - (v_q - 1) * v_cm1);
                    for vi in 1..v_m loop
                      if not v_vis[gi][vi] then
                        v_lo[gi][vi] := greatest(v_lo[gi][vi], v_lob);
                        v_hi[gi][vi] := least(v_hi[gi][vi], v_hib);
                      end if;
                    end loop;
                  end if;
                else
                  -- komplementær c + primær p (ordnet par); øvrige skjulte = 0
                  v_pr := v_ch - 2; v_ci := v_pr / (v_q - 1); v_pj := v_pr % (v_q - 1);
                  if v_pj >= v_ci then v_pj := v_pj + 1; end if;
                  -- finn ci-te og pj-te skjulte celle (0-basert) -> celleindeks (1-basert vi)
                  v_cidx := -1; v_pidx := -1; v_cnt := 0;
                  for vi in 1..v_m loop
                    if not v_vis[gi][vi] then
                      if v_cnt = v_ci then v_cidx := vi; end if;
                      if v_cnt = v_pj then v_pidx := vi; end if;
                      v_cnt := v_cnt + 1;
                    end if;
                  end loop;
                  -- gyldighet: rest >= cm+1
                  if v_rest < v_cm + 1 then v_bust := true;
                  else
                    -- hi for komplementær: min(minvis(tiebreak), rest-1)
                    if v_minvis[gi] < BIG then
                      v_himax := v_minvis[gi];
                      if (v_cidx-1) > v_minvis_k[gi] then v_himax := v_minvis[gi] - 1; end if;
                    else
                      v_himax := v_rest - 1;
                    end if;
                    v_himax := least(v_himax, v_rest - 1);
                    -- øvrige skjulte = 0
                    for vi in 1..v_m loop
                      if not v_vis[gi][vi] and vi <> v_cidx and vi <> v_pidx then v_lo[gi][vi]:=0; v_hi[gi][vi]:=0; end if;
                    end loop;
                    -- komplementær
                    v_lo[gi][v_cidx] := greatest(v_lo[gi][v_cidx], v_cm);
                    v_hi[gi][v_cidx] := least(v_hi[gi][v_cidx], v_himax);
                    -- primær
                    v_lo[gi][v_pidx] := greatest(v_lo[gi][v_pidx], 1);
                    v_hi[gi][v_pidx] := least(v_hi[gi][v_pidx], v_cm1);
                    if greatest(v_cm, v_rest - v_cm1) > v_himax then v_bust := true; end if;
                  end if;
                end if;
              end loop;

              -- SHUTTLE
              if not v_bust then
                for it in 1..200 loop
                  changed := false;
                  for gi in 2..4 loop
                    if v_pres[gi] then
                      for vi in 1..v_m loop
                        nlo := v_lo[gi][vi]; nhi := v_hi[gi][vi];
                        othlo := 0; othhi := 0;
                        for hh in 2..4 loop if v_pres[hh] and hh <> gi then othlo := othlo + v_lo[hh][vi]; othhi := othhi + v_hi[hh][vi]; end if; end loop;
                        nhi := least(nhi, v_tot[vi] - othlo);
                        nlo := greatest(nlo, v_tot[vi] - othhi);
                        s1 := 0; s2 := 0;
                        for ww in 1..v_m loop if ww <> vi then s1 := s1 + v_lo[gi][ww]; s2 := s2 + v_hi[gi][ww]; end if; end loop;
                        nhi := least(nhi, v_ahi[gi] - s1);
                        nlo := greatest(nlo, v_alo[gi] - s2);
                        if nlo > v_lo[gi][vi] then v_lo[gi][vi] := nlo; changed := true; end if;
                        if nhi < v_hi[gi][vi] then v_hi[gi][vi] := nhi; changed := true; end if;
                        if v_lo[gi][vi] > v_hi[gi][vi] then v_bust := true; exit; end if;
                      end loop;
                      exit when v_bust;
                      if v_hg[gi] and v_dom[gi] >= 0 then
                        d := v_dom[gi] + 1; nd := (v_hom * v_alo[gi] + 99) / 100;
                        if nd > v_lo[gi][d] then v_lo[gi][d] := nd; changed := true; end if;
                      end if;
                    end if;
                  end loop;
                  exit when v_bust or not changed;
                end loop;
              end if;

              v_feas := not v_bust;
              if v_feas then
                for gi in 2..4 loop
                  if v_pres[gi] then for vi in 1..v_m loop if v_lo[gi][vi] > v_hi[gi][vi] then v_feas := false; end if; end loop; end if;
                end loop;
              end if;

              if v_feas then
                v_anyfeas := true;
                for gi in 2..4 loop
                  if v_pres[gi] then
                    for vi in 1..v_m loop
                      if v_lo[gi][vi] < v_ulo[gi][vi] then v_ulo[gi][vi] := v_lo[gi][vi]; end if;
                      if v_hi[gi][vi] > v_uhi[gi][vi] then v_uhi[gi][vi] := v_hi[gi][vi]; end if;
                    end loop;
                  end if;
                end loop;
              end if;

              -- neste ren-rad-valg
              exit when v_np < 1;
              carry2 := true; jj := 1;
              while carry2 and jj <= v_np loop
                v_pch[jj] := v_pch[jj] + 1;
                if v_pch[jj] >= v_pnc[jj] then v_pch[jj] := 0; jj := jj + 1; else carry2 := false; end if;
              end loop;
              exit when carry2;
            end loop;  -- ren-rad-valg
          end if;
        end if;

        exit when v_nsk < 2;
        declare carry boolean := true; j int := 1;
        begin
          while carry and j <= v_nsk-1 loop
            v_asplit[j] := v_asplit[j] + 1;
            if v_asplit[j] > v_Ssk then v_asplit[j] := 0; j := j + 1; else carry := false; end if;
          end loop;
          exit when carry;
        end;
      end loop;
      end if;
    end if;

    exit when v_ucnt < 2;
    declare carry boolean := true; j int := 1;
    begin
      while carry and j <= v_ucnt-1 loop
        v_split[j] := v_split[j] + 1;
        if v_split[j] > v_miss then v_split[j] := 0; j := j + 1; else carry := false; end if;
      end loop;
      exit when carry;
    end;
  end loop;

  -- PKT 1: ingen feasibel kombinasjon for en tilstedeværende kjønnsrad ⇒ selvmotsigende ⇒ eskaler
  if v_ngp >= 1 and not v_anyfeas then
    return jsonb_build_object('pin','{}'::jsonb,'over',true);
  end if;

  -- pins
  for gi in 2..4 loop
    if v_pres[gi] then
      for vi in 1..v_m loop
        if v_ulo[gi][vi] <= v_uhi[gi][vi] and v_ulo[gi][vi] = v_uhi[gi][vi] then
          v_pin := v_pin || jsonb_build_object(v_names[gi]||'|'||(vi-1)::text, v_ulo[gi][vi]);
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('pin', v_pin, 'over', v_over);
end $$;

revoke execute on function public.tu_kjonn_pinned(jsonb)        from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- KVITTERING (leses av Kjartan etter kjoring i prod)
-- ----------------------------------------------------------------------------
-- 1) md5 av hele funksjonsdefinisjonen (pg_get_functiondef) mot Fables forventede
--    verdi. 'matcher' = true betyr at prod naa er byte-lik den verifiserte fila.
--    (Skulle 'matcher' bli false, er det nesten alltid pg_get_functiondef-format
--    som varierer med Postgres-versjon - bruk da sjekk 2 som fasit og be Fable
--    reverifisere med sin egen normalisering.)
select
  md5(pg_get_functiondef('public.tu_kjonn_pinned(jsonb)'::regprocedure)) as md5_prod,
  '7da0a47675c4674e8e1e409e02ed74dc'                                     as md5_forventet_fable,
  md5(pg_get_functiondef('public.tu_kjonn_pinned(jsonb)'::regprocedure))
    = '7da0a47675c4674e8e1e409e02ed74dc'                                 as matcher;

-- 2) Formatuavhengig funksjonssjekk: den NYE (26.-aug) versjonen bruker noeklene
--    'celle_min' og 'ren'; den gamle (25.-aug) gjorde ikke. Begge skal vaere true.
select
  position('celle_min' in pg_get_functiondef('public.tu_kjonn_pinned(jsonb)'::regprocedure)) > 0 as har_celle_min,
  position('''ren'''    in pg_get_functiondef('public.tu_kjonn_pinned(jsonb)'::regprocedure)) > 0 as har_ren;

commit;
