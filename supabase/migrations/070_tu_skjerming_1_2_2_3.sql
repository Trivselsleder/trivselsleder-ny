-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 070: SKJERMINGSKJERNE UDIR 1.2 + 2.3
--                        (homogenitet per delgruppe + subtraksjonsvern på tvers)
-- Trivselsleder-ny · 25. aug 2026 · Model B · hovedbasen «bak lås»
--
-- GRUNNLAG: byggeplan 21. aug (beslutning B) + personverngrunnlag B3 pkt 5 + 7 +
--   gullstandard-kartleggingen. Bygger den FELLES skjermingskjernen som steg 5
--   (rapport + aggregat) hviler på.
--
-- HVA SOM FINNES FRA FØR (migr 045 — RØRES IKKE, gjenbrukes):
--   * tu_skjerm_fordeling(): homogen-sperre (>= homogen_grense_pct % → skjul hele
--     fordelingen) + celle-skjerming (1..celle_min-1 skjules) + komplementær
--     skjerming INNEN én fordeling (skjules nøyaktig én celle → skjul også minste
--     synlige, så minst to er skjult). Dette dekker 2.3 på svarkategori-nivå.
--   * tu_skjermet_runde(): k-terskel per kategori + pipeline for HELE runden.
--   * tu_skole_resultat() (utgang 1), tu_statistikk() (utgang 2), terskler i
--     tu_innstillinger (justerbare begge veier).
--
-- HVA SOM MANGLER — og som denne migrasjonen tilfører:
--   All eksisterende skjerming ser bare på ÉN akse (svarfordelingen for hele
--   runden). Det finnes INGEN kjønnsdelt (gutt/jente/annet) skjerming ennå — 046
--   la til kjønn-kolonnen, men ingenting leser den i en delt visning. Steg 5s
--   rapport SKAL vise kjønnsdelt, og det er DER Udir 1.2/2.3 faktisk biter:
--     - 1.2 (homogenitet): en liten kjønnscelle der ALLE svarer likt er de facto
--       kjent, selv om HELE runden er over k-terskel.
--     - 2.3 (subtraksjonsvern PÅ TVERS): total = gutt + jente (+ annet). Skjules
--       kun én kjønnsgruppe mens total + de andre vises, kan den regnes ut som
--       differanse. Må skjermes komplementært PÅ TVERS av kjønnsgruppene.
--   045s komplementær-vern er innen ÉN fordeling; det finnes intet vern MELLOM
--   total og underkategori (kjønn). Det bygges her.
--
-- REGEL (byggeplan B): «hvis et aggregat er skjermet, må minst én underliggende
--   kategori også skjermes» + «skjuler du én kjønnscelle, skjul minst én til så
--   differansen ikke røper den (og omvendt)».
--
--
-- RETTING 25. aug (FUNN 0, kontroll): tu_skjermet_runde_kjonn er her SETT-BASERT
--   (ingen temp-tabell). Den temp-tabell-varianten som lå i fila kunne ikke merkes
--   STABLE (Postgres: «DROP TABLE is not allowed in a non-volatile function»). Fila
--   inneholder nå den faktiske live-kroppen, slik at kjeden 041->070 bygger grønt fra
--   bunnen. VERDI-NIVÅ subtraksjonsvern (2.3) legges på i migrasjon 071.
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent der mulig. Alle funksjoner: SECURITY DEFINER + SET search_path=''
--   der de leser data; rene hjelpere er IMMUTABLE uten tabelltilgang.
-- Husregel 6: nye funksjoner (ikke endret signatur på eksisterende) → ingen
--   DROP av 045/046-funksjoner nødvendig. tu_skjermet_runde_kjonn er NY.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) INNSTILLINGER — nye, justerbare parametre for den kjønnsdelte kjernen.
--    Begge veier, uten ny kode (som øvrige terskler i tu_innstillinger).
-- ---------------------------------------------------------------------------
insert into public.tu_innstillinger (nokkel, verdi) values
  -- REGEL 1.2 (homogenitet per delgruppe): skjul en delgruppes fordeling dersom
  -- én enkelt svarverdi utgjør >= denne prosenten av delgruppens svar. Settes
  -- til 100 = «kun når ALLE svarte helt likt». Kan settes lavere (f.eks. 90) for
  -- strengere homogenitetsvern per kjønnscelle uten ny kode.
  ('homogen_delgruppe_pct', '100'),
  -- Kjønnsdelt visning skrus av/på uten kode (av = kun total vises i rapporten).
  ('kjonnsdelt_aktiv'      , 'true')
on conflict (nokkel) do nothing;

-- ---------------------------------------------------------------------------
-- 1) REGEL 1.2 — homogenitetssjekk for ÉN delgruppes fordeling (ren funksjon).
--    Returnerer true dersom delgruppen er homogen etter delgruppe-terskelen
--    (én svarverdi >= p_grense_pct % av delgruppens svar). Komplement til 045s
--    homogen_grense_pct: den gjelder hele runden; denne gjelder PER kjønnscelle
--    og kan settes strengere (default 100 = alle svarte likt).
-- ---------------------------------------------------------------------------
create or replace function public.tu_er_homogen_delgruppe(
  p_fordeling jsonb, p_antall int, p_grense_pct int)
returns boolean
language plpgsql immutable set search_path = '' as $$
declare v_max int := 0; v_val int;
begin
  if p_antall is null or p_antall = 0 or p_fordeling is null then
    return false;
  end if;
  for v_val in select value::int from jsonb_each_text(p_fordeling) loop
    if v_val > v_max then v_max := v_val; end if;
  end loop;
  -- v_max * 100 >= p_grense_pct * p_antall  (heltallsaritmetikk, ingen avrunding)
  return v_max * 100 >= p_grense_pct * p_antall;
end $$;

-- ---------------------------------------------------------------------------
-- 2) REGEL 2.3 — subtraksjonsvern PÅ TVERS av delgrupper (ren funksjon).
--    Inn : ett spørsmåls skjermingsstatus for total + hver kjønnscelle, som
--          jsonb-array av {gruppe, skjult, antall}. 'total' er alltid med.
--    Regel: total = sum(kjønnsceller). Derfor:
--      (a) er TOTAL skjult, må minst én kjønnscelle også være skjult (ellers kan
--          ingen enkeltcelle isoleres, men prinsippet i byggeplan B kreves).
--          I praksis: er total skjult og alle kjønnsceller synlige, skjul den
--          minste kjønnscellen.
--      (b) er nøyaktig ÉN kjønnscelle skjult mens total + de andre er synlige,
--          kan den regnes som differanse → skjul også den nest minste synlige
--          kjønnscellen (komplementær på tvers). Da gjenstår >= 2 ukjente ledd.
--    Ut : array av gruppenavn som SKAL skjermes i tillegg (kan være tom).
--    Merk: 'annet' kan mangle (ingen svarte 'annet') — da finnes bare 2 celler.
-- ---------------------------------------------------------------------------
create or replace function public.tu_kryssvern_kjonn(p_grupper jsonb)
returns text[]
language plpgsql immutable set search_path = '' as $$
declare
  v_total_skjult boolean := false;
  v_synlige_kjonn jsonb := '[]'::jsonb;   -- kjønnsceller som er synlige, m/ antall
  v_skjulte_kjonn int := 0;
  v_elem jsonb;
  v_ekstra text[] := array[]::text[];
  v_min_gruppe text;
begin
  -- Del opp: total-status + tell synlige/skjulte kjønnsceller.
  for v_elem in select * from jsonb_array_elements(p_grupper) loop
    if (v_elem->>'gruppe') = 'total' then
      v_total_skjult := coalesce((v_elem->>'skjult')::boolean, false);
    else
      if coalesce((v_elem->>'skjult')::boolean, false) then
        v_skjulte_kjonn := v_skjulte_kjonn + 1;
      else
        v_synlige_kjonn := v_synlige_kjonn || jsonb_build_array(v_elem);
      end if;
    end if;
  end loop;

  -- (a) Total skjult, men ingen kjønnscelle skjult → skjul minste kjønnscelle.
  if v_total_skjult and v_skjulte_kjonn = 0
     and jsonb_array_length(v_synlige_kjonn) > 0 then
    select (e->>'gruppe') into v_min_gruppe
      from jsonb_array_elements(v_synlige_kjonn) e
     order by (e->>'antall')::int asc, (e->>'gruppe') asc
     limit 1;
    if v_min_gruppe is not null then
      v_ekstra := array_append(v_ekstra, v_min_gruppe);
      -- fjern den fra synlige (så neste steg ikke teller den igjen)
      v_synlige_kjonn := (
        select coalesce(jsonb_agg(e), '[]'::jsonb)
        from jsonb_array_elements(v_synlige_kjonn) e
        where (e->>'gruppe') <> v_min_gruppe);
      v_skjulte_kjonn := v_skjulte_kjonn + 1;
    end if;
  end if;

  -- (b) Nøyaktig én kjønnscelle skjult (og >= 2 celler synlige igjen finnes ikke
  --     nødvendigvis) → skjul også minste gjenværende synlige kjønnscelle, slik
  --     at differansen ikke røper den skjulte. Krever minst én synlig igjen.
  if v_skjulte_kjonn = 1 and jsonb_array_length(v_synlige_kjonn) >= 1 then
    select (e->>'gruppe') into v_min_gruppe
      from jsonb_array_elements(v_synlige_kjonn) e
     order by (e->>'antall')::int asc, (e->>'gruppe') asc
     limit 1;
    if v_min_gruppe is not null then
      v_ekstra := array_append(v_ekstra, v_min_gruppe);
    end if;
  end if;

  return v_ekstra;
end $$;

-- ---------------------------------------------------------------------------
-- 3) AGGREGERING PER KJØNN — total + gutt + jente + annet for én runde.
--    Speiler tu_aggreger (041), men grupperer i tillegg på kjønn. Ren lesing;
--    SECURITY DEFINER fordi tu_svar er stengt for direkte lesing.
--    Returnerer én rad per (sporsmal, gruppe) der gruppe ∈
--    {total,gutt,jente,annet}. 'total' = alle kjønn samlet.
-- ---------------------------------------------------------------------------
create or replace function public.tu_aggreger_kjonn(p_runde uuid)
returns table(sporsmal int, gruppe text, fordeling jsonb, antall int)
language sql stable security definer set search_path = '' as $$
  with utpakket as (
    select s.kjonn, (kv.key)::int sp, (kv.value)::int verdi
    from public.tu_svar s, lateral jsonb_each_text(s.svar) kv
    where s.runde_id = p_runde
  ),
  -- per kjønn
  teller_kjonn as (
    select kjonn as gruppe, sp, verdi, count(*)::int ant
    from utpakket group by kjonn, sp, verdi
  ),
  -- total (alle kjønn)
  teller_total as (
    select 'total'::text as gruppe, sp, verdi, count(*)::int ant
    from utpakket group by sp, verdi
  ),
  alle as (
    select * from teller_kjonn
    union all
    select * from teller_total
  )
  select sp as sporsmal, gruppe,
         jsonb_object_agg(verdi::text, ant order by verdi) as fordeling,
         sum(ant)::int as antall
  from alle
  group by sp, gruppe;
$$;

-- ---------------------------------------------------------------------------
-- 4) KJØNNSDELT SKJERMINGSPIPELINE for én runde — DEN FELLES KJERNEN.
--    Bruker eksisterende hjelpere fra 045 (k-terskel per kategori, homogen-
--    sperre, celle/komplementær innen fordeling) PER delgruppe, og legger på
--    Udir 1.2 (homogen per delgruppe) + 2.3 (subtraksjonsvern på tvers).
--    Ingen authz her (kun kalt av SECURITY DEFINER-funksjonene i steg 5).
--
--    Returnerer én rad per (sporsmal, gruppe):
--      antall     — delgruppens svartall (null hvis skjult)
--      fordeling  — skjermet fordeling (null hvis skjult/homogen)
--      homogen    — true hvis skjult pga. homogenitet (045 ELLER 1.2)
--      skjult     — true hvis delgruppen er skjermet (k, homogen, ELLER 2.3)
--      skjult_aarsak — 'k' | 'homogen' | 'kryssvern' | null (sporbarhet/tester)
-- ---------------------------------------------------------------------------
create or replace function public.tu_skjermet_runde_kjonn(p_runde uuid)
returns table(sporsmal int, gruppe text, antall int, fordeling jsonb,
              homogen boolean, skjult boolean, skjult_aarsak text)
language sql stable security definer set search_path = '' as $BODY$
  -- Fullstendig SETT-BASERT (CTE-lag) — INGEN temp-tabell. Dette er den kroppen som
  -- faktisk kjører live (den temp-tabell-baserte varianten kunne ikke merkes STABLE:
  -- «DROP TABLE is not allowed in a non-volatile function»). Kun LESING → STABLE er korrekt.
  with params as (
    select
      (select verdi::int from public.tu_innstillinger where nokkel='celle_min')          as celle,
      (select verdi::int from public.tu_innstillinger where nokkel='homogen_grense_pct')  as homogen,
      coalesce((select verdi::int from public.tu_innstillinger where nokkel='homogen_delgruppe_pct'),100) as hdelgr
  ),
  runde as (
    select sporsmalversjon as versjon, land from public.tu_runder where id = p_runde
  ),
  agg as (
    select a.sporsmal, a.gruppe, a.fordeling, a.antall
    from public.tu_aggreger_kjonn(p_runde) a
  ),
  medkat as (
    select ag.sporsmal, ag.gruppe, sp.kategori, ag.fordeling, ag.antall,
           coalesce(
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel = 'terskel.'||sp.kategori),
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel = 'terskel.standard')
           ) as terskel
    from agg ag
    cross join runde r
    join public.tu_sporsmal sp
      on sp.nummer = ag.sporsmal and sp.versjon = r.versjon and sp.land = r.land
  ),
  -- Steg 1: grunnskjerming per delgruppe (k + 045-hjelpere + 1.2)
  steg1 as (
    select m.sporsmal, m.gruppe, m.antall as raa_antall,
           (m.antall < m.terskel) as under_k,
           public.tu_er_homogen_delgruppe(m.fordeling, m.antall, p.hdelgr) as homogen_12,
           case when m.antall < m.terskel then null
                else public.tu_skjerm_fordeling(m.fordeling, m.antall, p.homogen, p.celle)
           end as res
    from medkat m cross join params p
  ),
  steg1b as (
    select s.sporsmal, s.gruppe, s.raa_antall,
           (s.under_k
             or coalesce((s.res->>'homogen')::boolean,false)
             or s.homogen_12) as skjult1,
           (not s.under_k and (coalesce((s.res->>'homogen')::boolean,false) or s.homogen_12)) as homogen1,
           case
             when s.under_k then 'k'
             when coalesce((s.res->>'homogen')::boolean,false) or s.homogen_12 then 'homogen'
             else null
           end as aarsak1,
           case when s.under_k or coalesce((s.res->>'homogen')::boolean,false) or s.homogen_12
                then null else s.res->'fordeling' end as fordeling1
    from steg1 s
  ),
  -- Steg 2: REGEL 2.3 — subtraksjonsvern PÅ TVERS av kjønnsceller (hele-celle-nivå)
  kryss as (
    select b.sporsmal,
           public.tu_kryssvern_kjonn(
             jsonb_agg(jsonb_build_object(
               'gruppe', b.gruppe, 'skjult', b.skjult1, 'antall', coalesce(b.raa_antall,0)))
           ) as ekstra
    from steg1b b
    group by b.sporsmal
  )
  select b.sporsmal, b.gruppe,
         case when (b.skjult1 or (k.ekstra @> array[b.gruppe])) then null else b.raa_antall end as antall,
         case when (b.skjult1 or (k.ekstra @> array[b.gruppe])) then null else b.fordeling1 end as fordeling,
         coalesce(b.homogen1,false) as homogen,
         (b.skjult1 or (k.ekstra @> array[b.gruppe])) as skjult,
         case
           when b.skjult1 then b.aarsak1
           when (k.ekstra @> array[b.gruppe]) then 'kryssvern'
           else null
         end as skjult_aarsak
  from steg1b b
  join kryss k on k.sporsmal = b.sporsmal
  order by b.sporsmal,
           case b.gruppe when 'total' then 0 when 'jente' then 1
                         when 'gutt' then 2 when 'annet' then 3 else 9 end;
$BODY$;

-- ---------------------------------------------------------------------------
-- 5) UTGANG 1 (kjønnsdelt) — SKOLERAPPORT per kjønn. Skolens egne tall, presise
--    opp til k-terskel; vakter: k + homogen (045+1.2) + komplementær (045) +
--    subtraksjonsvern på tvers (2.3). Kun skolen ser dem.
--    Respekterer kjonnsdelt_aktiv: er den 'false', returneres KUN total-radene.
-- ---------------------------------------------------------------------------
drop function if exists public.tu_skole_resultat_kjonn(uuid);
create function public.tu_skole_resultat_kjonn(p_runde uuid)
returns table(sporsmal int, gruppe text, antall int, fordeling jsonb,
              homogen boolean, skjult boolean, skjult_aarsak text)
language plpgsql stable security definer set search_path = '' as $$
declare v_skole uuid; v_aktiv boolean;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not (public.tu_har_tilgang_skole(v_skole)
          or public.tu_er_htla_paa_skole(v_skole)) then
    raise exception 'Ingen tilgang';
  end if;

  v_aktiv := coalesce(
    (select verdi = 'true' from public.tu_innstillinger where nokkel='kjonnsdelt_aktiv'),
    true);

  return query
    select k.sporsmal, k.gruppe, k.antall, k.fordeling, k.homogen, k.skjult, k.skjult_aarsak
    from public.tu_skjermet_runde_kjonn(p_runde) k
    where v_aktiv or k.gruppe = 'total'
    order by k.sporsmal,
             case k.gruppe when 'total' then 0 when 'jente' then 1
                           when 'gutt' then 2 when 'annet' then 3 else 9 end;
end $$;

-- ---------------------------------------------------------------------------
-- 6) GRANT / REVOKE
--    Rene hjelpere + intern pipeline + aggregering: ingen direkte kallere.
--    Utgang 1 (kjønnsdelt): innlogget skole/ansatt (som tu_skole_resultat).
-- ---------------------------------------------------------------------------
revoke execute on function public.tu_er_homogen_delgruppe(jsonb,int,int) from public, anon, authenticated;
revoke execute on function public.tu_kryssvern_kjonn(jsonb)              from public, anon, authenticated;
revoke execute on function public.tu_aggreger_kjonn(uuid)               from public, anon, authenticated;
revoke execute on function public.tu_skjermet_runde_kjonn(uuid)         from public, anon, authenticated;

revoke execute on function public.tu_skole_resultat_kjonn(uuid) from public, anon;
grant  execute on function public.tu_skole_resultat_kjonn(uuid) to authenticated, service_role;

-- ============================================================================
-- SLUTT MIGRASJON 070.
-- MERK (steg 5, senere bolker):
--   * Bolk 3: TL-aggregatet (utgang 2, tu_statistikk) får i tillegg 5%-avrunding
--     + nettverksvern. Kjønnsdelt aggregat UTAD krever samme 2.3-kryssvern +
--     nettverks-/nasjonaltvern (min. skoler + dominans) — bygges der.
--   * Denne bolken bygger den FELLES skjermingskjernen (k + 1.2 + 2.3) som både
--     utgang 1 og utgang 2 hviler på. Utgang 1 (skolens egne tall) er presise
--     opp til k-terskel; utgang 2 legger grovkorning oppå SENERE.
-- ============================================================================
