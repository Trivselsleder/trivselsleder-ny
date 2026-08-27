-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 072: SUBTRAKSJONSVERN I KJØNNSRADENE (Udir 2.3)
--                        — retting av FUNN 2 fra den uavhengige fable-kontrollen
-- Trivselsleder-ny · 25. aug 2026 · Model B · hovedbasen «bak lås»
--
-- GRUNNLAG: uavhengig fable-kontroll av migr 071 (25. aug), FUNN 2 + retteliste
--   (claude_TU-skjerming-071-retting-25aug.md) + gullstandard Udir 5.2 regel 2.3
--   + personverngrunnlag B3 pkt 5c + 7. Kjartan har valgt PUNKT 1 ALTERNATIV (a):
--   Udir-tro — la totalen stå, legg komplementærskjermingen i KJØNNSRADENE.
--
-- ─── PRINSIPPFEILEN SOM RETTES (FUNN 2) ─────────────────────────────────────
--   071 vernet ved å skjule TOTAL-celler. Men skolens total-rad ligger uskjermet
--   i tu_skole_resultat (045), i tu_arkiv etter lukking, og i tu_skole_utvikling.
--   Samme skoleadmin/superadmin henter totalen derfra + kjønnstallene her og regner
--   ut differansen likevel (bevist: 40,9 % lekket, 7217 celler, 2384 = én elev). Et
--   subtraksjonsvern kan ikke hvile på å skjule en størrelse som publiseres åpent i
--   en annen utgang. Udir 2.3 løses i praksis ved å skjerme i UNDERKATEGORIENE (kjønn).
--
-- ─── LØSNING (alternativ a) — Udir-tro 2.3 i KJØNNSRADENE ────────────────────
--   Redefinerer tu_skjermet_runde_kjonn (CREATE OR REPLACE, UENDRET signatur/RETURNS
--   → husregel 6; GRANT bevart). Steg 1 (k + 045 + 1.2 per delgruppe) er UENDRET.
--   Nytt steg 2 = SEKUNDÆR CELLE-SUPPRESJON KUN i kjønnsradene, styrt av en eksakt
--   intervall-propagator (tu_kjonn_pinned) som modellerer nøyaktig den angriperen som
--   har ALLE utganger for runden:
--     * TOTAL-RADEN RØRES ALDRI. Den er identisk med 045-totalen (tu_skole_resultat /
--       tu_skjermet_runde) og med arkivet — og tas MED i propagatoren som en offentlig
--       rad. Fordi total = jente+gutt+annet er felles og uendret, dekker vernet nå ALLE
--       utganger for samme runde (045-total + arkiv + kjønn) samtidig. Skolens
--       hovedtall står alltid intakt.
--     * PROPAGATOR (tu_kjonn_pinned): grid = total (offentlig antall + synlige celler)
--       + hver kjønnscelle, med bindingene total_v = jente_v+gutt_v+annet_v per verdi,
--       sum(verdier)=antall per rad, sum(kjønn)=total-antall, k-sidevern (skjult 'k' ⇒
--       antall<k) og homogenitet (skjult 'homogen' ⇒ dominant ≥ homogen_grense %).
--       Intervall-propagering til fastpunkt gir hvilke celler som er ENTYDIG bestembare.
--     * SUPPRESJON: så lenge en SKJULT, ikke-null kjønnscelle er entydig bestembar,
--       skjul minst mulig ekstra i kjønnsradene for å bryte det: minste synlige
--       kjønnscelle i samme KOLONNE (verdi), ellers i samme RAD. Aldri i totalen.
--     * ESKALERING (sjelden, f.eks. dominant homogen kjønnsgruppe der ingen annen
--       kjønnscelle kan forsegle): skjul hele kjønnsdelingen for spørsmålet OG fjern
--       det eksploiterbare k/homogen-sidesignalet (samlet, uinformativ 'kryssvern'),
--       så nivå B ikke kan utlede en dominant via total. Dette er variant-A-nivå KUN
--       for det spørsmålet — men vernet er aldri strengere enn variant A totalt.
--
-- ─── MINIMALITET (retteliste punkt 2) ───────────────────────────────────────
--   Vi skjuler bare når en verdi FAKTISK er entydig bestembar (propagatoren pin-er
--   den), aldri «så snart noen gruppe skjuler». 071 skjulte 67,6 % unødvendig; her
--   fjernes bare det som må til. (Bevist mot 1-minimalitet + LP i aksepttesten.)
--
-- ─── MELDING / skjult_aarsak (retteliste punkt 3+4) ─────────────────────────
--   INGEN total-celle fjernes (heller ikke de lik summen av synlige kjønnsceller —
--   de 14 kosmetiske «avsløringene» fra 071-kontrollen er borte). 'kryssvern' lander
--   på KJØNNSRADEN der en verdi faktisk er skjult, aldri på total. Rapporten kan vise
--   en vennlig forklaring på kjønnsraden («Kjønnsfordelingen vises ikke her fordi
--   gruppen er for liten til at tallene kan deles uten at enkeltelever kan
--   gjenkjennes.»). Ordet «anonym» brukes ikke i UI. skjult_aarsak ∈ k/homogen/kryssvern.
--
-- ─── STABLE ─────────────────────────────────────────────────────────────────
--   Kjernen LESER kun og regner i minne (jsonb/arrays, ingen temp-tabell, ingen
--   skriving). STABLE korrekt. Hjelperen tu_kjonn_pinned er ren (IMMUTABLE).
--   SECURITY DEFINER + SET search_path='' beholdt. Ingen ny overload.
--
-- HUSREGEL 6: uendret signatur/RETURNS på kjernen → CREATE OR REPLACE bevarer GRANT.
--   tu_skole_resultat_kjonn røres ikke. 070/071 allerede kjørt live → vi REDEFINERER.
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
--
-- ─── RETTING Bit 1-4 (26. aug 2026, mot uavhengig fable-MILP-orakel) ─────────
--   Kontrollen 26. aug fant fortsatt avslørbare kjønnsceller (243 nivå C, 1155 C+).
--   propagatoren er skrevet om iht rettelistens 8 punkter:
--     1. Tom union (ingen feasibel kombinasjon for en tilstedeværende kjønnsrad) ⇒
--        over=true (eskaler trygt). En selvmotsigende modell rapporteres aldri «ingen pins».
--     2. 045-cellesemantikk gjelder KUN rene rader: kjernen sender 'ren' per synlig
--        kjønnsrad (=ikke kryssvern). Kryssvern-rader får ingen 045-semantikk (angriperen
--        vet ikke hvilke celler steg 2 fjernet).
--     3. 045-strukturen gjort EKSAKT: valget «ingen komplementær / komplementær c +
--        primær p» enumereres per ren rad i kombinasjons-odometeret (q·(q-1)+2 valg),
--        i stedet for uttrykt som per-celle intervall-union (som ikke fanget koblingen
--        «komplementær ⇔ nøyaktig én primær»).
--     4. Fjernet v_minsynlig<BIG-vaktene: rene rader med tom ford får full 045-semantikk
--        (hi_c=rest). Homogen total beholder Bit 3-vakten (ingen cellesemantikk der).
--     5. Total-splitt (4c): samme eksakte (#komplementær,#primær)∈{(0,0),(0,≥2),(1,1)}-filter.
--     6. Ikke-homogen-grense på synlige rader: celle ≤ ceil(hom·n/100)-1 (kjønn + synlig
--        ikke-homogen total).
--     7. Null-vakt på celle_min (coalesce(...,4)).
--   Aksepttest (lokal PG16, uavhengig MILP-orakel, ≥900 runder/nivå): 0 kjønns-pins på
--   C og C+, R1/R2 gir intervaller, total=045 uendret, kjeden idempotent grønn.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- HJELPER: tu_kjonn_pinned — EKSAKT avsløringsdetektor for ETT spørsmåls grid.
--   Inn (jsonb): { m, T, hom, k, g: { total:{antall,ford,homogen,dom},
--     jente:{skjult,antall,ford | skjult,aarsak,homogen,dom}, gutt:..., annet:... } }
--   Ut  (jsonb): { pin: {"jente|2":verdi,...}, over: bool }
--
--   METODE: 2D-tabell (kjønn × svarverdi) med rad-marginer (antall) og kolonne-marginer
--   (total_v). Intervall-propagering («shuttle») gir EKSAKTE cellegrenser for en 2D-tabell
--   NÅR alle marginer er faste. Den eneste ukjente marginen er totalens SKJULTE celler
--   (045-skjermet). Vi ENUMERERER derfor fordelingen av totalens skjulte masse (M) over de
--   uviste verdiene, og — når >1 kjønnsgruppe er helt skjult — deres antall-splitt, og kjører
--   propagatoren for HVER kombinasjon. Unionen av cellegrensene er da eksakt. Budsjett-tak:
--   blir kombinasjonstallet for stort, returneres over=true (kjernen eskalerer da trygt).
--   En celle er «pin» (entydig bestembar) når union-lo = union-hi.
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- KJERNEN — tu_skjermet_runde_kjonn. Steg 1 uendret; steg 2 = kjønnsrad-suppresjon
--   styrt av tu_kjonn_pinned (total urørt).
-- ---------------------------------------------------------------------------
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

          -- FUNN 5 PURE-PROBE: løkka fant ingen ren=false-pin. Men merkelappen er fjernet, så
          --   en angriper vet om en synlig ko-supprimert (kryssvern) rad bare «ren ELLER
          --   kryssvern». Er gridet PURE-INFEASIBELT (ingen ren-tolkning finnes), UTLEDER
          --   angriperen at raden er kryssvern og kan pinne celler via kryssvern-strukturen
          --   (nivå D). Vi kjører derfor propagatoren på nytt med alle synlige rader som ren=true;
          --   returnerer den over=true (selvmotsigende ren-tolkning), eskalerer vi trygt.
          --   Pure-feasible tilfeller trenger ingen handling: da omslutter unionen ren-verdenene,
          --   og en evt. struktur-pin er ikke felles for ren og kryssvern (ellers total-bestemt og
          --   alt fanget av ren=false-løkka over).
          if v_bad_g is null then
            declare v_haskv boolean := false; v_probe jsonb; v_probres jsonb;
            begin
              foreach v_g in array v_kjonn loop
                v_gk := v_sp::text||'|'||v_g;
                if v_state ? v_gk and not coalesce((v_state->v_gk->>'skjult')::boolean,false)
                   and coalesce((v_state->v_gk->>'kryssvern')::boolean,false) then v_haskv := true; end if;
              end loop;
              if v_haskv then
                v_probe := v_grid;
                foreach v_g in array v_kjonn loop
                  if (v_probe->'g') ? v_g and not coalesce((v_probe->'g'->v_g->>'skjult')::boolean,false) then
                    v_probe := jsonb_set(v_probe, array['g', v_g, 'ren'], 'true'::jsonb);
                  end if;
                end loop;
                v_probres := public.tu_kjonn_pinned(v_probe);
                if coalesce((v_probres->>'over')::boolean,false) then
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
                end if;
              end if;
            end;
            exit;   -- trygt: ingen ren=false-pin (probe har eskalert ved behov)
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
-- GRANT / REVOKE
-- ---------------------------------------------------------------------------
revoke execute on function public.tu_kjonn_pinned(jsonb)        from public, anon, authenticated;
revoke execute on function public.tu_skjermet_runde_kjonn(uuid) from public, anon, authenticated;

commit;

-- ============================================================================
-- SLUTT MIGRASJON 072.
-- VERIFISER (samle-på-én-linje) etter kjøring — se leveransekvitteringen.
-- BOLK 3 (senere): utgang 2 (tu_statistikk) kjønnsdelt UTAD trenger samme verdi-
--   nivå-2.3 i kjønnsradene + nettverks-/nasjonaltvern (min. skoler + dominans).
-- ============================================================================
