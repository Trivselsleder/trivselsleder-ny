-- ============================================================================
-- 111_move_it_egnet.sql
-- ============================================================================
-- HVA: gir egnet-merket «Move It» (egnet_kategori.navn = 'Move It') til alle
--   leker som er en Move It-aktivitet, dvs. har kategori «Move It» ELLER en av
--   dens underkategorier. Kobling legges i ressurs_egnet (ressurs_id, egnet_id).
--
-- HVORFOR NAVN-LISTE OG IKKE HIERARKI: lek-passet flater ut kategorihierarkiet
--   paa navn (normaliserKategori), saa forelder-koblingen (kategorier.forelder_id)
--   finnes ikke i basen for disse radene. Vi maa derfor matche paa NAVN. De fem
--   navnene under er hentet fra Drupal-eksporten (game_category-terms.json):
--   «Move It» er tid 578 (toppnivaa, ingen forelder). Barna dens (parents=[578]):
--     tid 1141 «Kropp og hjerne», 1175 «Utføres alene», 1176 «Utføres parvis»,
--     1177 «Utføres i gruppe» — og i tillegg 1134 «Månedens Move it 2025» og
--     1185 «.Månedens Move it 2026».
--   Ingen av de sju navnene finnes under en ANNEN forelder i taksonomien (ingen
--   duplikatnavn) — verifisert i eksporten 10. sep, saa navn-match er entydig.
--
-- HVORFOR BARE FEM NAVN (ikke sju): de to «Månedens Move it»-nodene (Drupal-nid
--   16212 og 18886) er samlings-/landingsnoder, IKKE enkeltleker, og ble ALDRI
--   importert til basen (0 rader i public.ressurser med kilde_nid 16212/18886,
--   maalt 10. sep). Kategoriene «Månedens Move it 2025» / «.Månedens Move it 2026»
--   finnes derfor heller ikke i public.kategorier. Eksporten har 128 publiserte
--   Move It-noder (126 leker + de 2 Månedens-nodene); basen har 126 leker. Avviket
--   128 vs 126 er nettopp disse to ikke-importerte nodene — det er ingenting aa
--   merke for dem her, og de er utenfor lek-datasettet.
--
-- BEVIST FOER BYGG (10. sep 2026):
--   * Eksport: «Move It»=tid 578; 6 barn; ingen duplikatnavn; 128 publiserte noder
--     med Move It eller et barn (per tid: Move It 2, gruppe 77, parvis 27, alene 14,
--     kropp og hjerne 6, Månedens 2025 1, .Månedens 2026 1 — sum 128, ingen overlapp).
--   * Oevingskopi (bnbrbgvywdnczxajpaoj): 5 kategorier i basen (Move It 2, gruppe 77,
--     parvis 27, alene 14, kropp og hjerne 6 = 126, ingen overlapp). 126 DISTINKTE
--     maalressurser, alle status='publisert', alle fra én import-kjoering, alle med
--     ikke-null, distinkt kilde_nid. 0 har «Move It»-egnet fra foer. egnet_kategori
--     «Move It» finnes noeyaktig én gang (id=5 i oevingskopien; slaas opp paa NAVN
--     her, ikke hardkodet, i tilfelle prod har en annen id).
--   * Fingeravtrykk paa maalressursenes kilde_nid:
--       md5(string_agg(kilde_nid, ',' order by kilde_nid)) = 41bdc9d9ae6203e8246a02ae615bffe6
--   * Prod (maalt 10. sep): samme fem kategorier med samme antall (sum 126); egnet
--     «Move It» har 0 rader i ressurs_egnet.
--
-- ENDRINGSLOGG: ressurs_egnet har INGEN trigger (verifisert mot pg_trigger i
--   oevingskopien 10. sep; trg_logg ligger paa egnet_kategori/ressurser m.fl., ikke
--   paa koblingstabellen ressurs_egnet). Innsettingen roerer ikke ressurser. Derfor
--   gir kjoeringen 0 endringslogg-rader.
--
-- GRANTS: ingen nye objekter opprettes (kun INSERT i eksisterende ressurs_egnet).
--   Ingen grants trengs — bekreftet.
--
-- UNIK/PK: ressurs_egnet har PRIMARY KEY (ressurs_id, egnet_id) (025). Derfor er
--   «on conflict (ressurs_id, egnet_id) do nothing» gyldig (sikkerhetsnett; Sperre B
--   krever uansett 0 fra foer).
--
-- IKKE IDEMPOTENT — KAN KUN KJOERES EN GANG. Ved ny kjoering stopper Sperre B med
--   «allerede merket».
--
-- FORHAANDSVISNING (les FOER du committer): bytt 'commit;' nederst til 'rollback;',
--   kjoer, les kvitteringen, bytt tilbake til 'commit;' og kjoer paa nytt for aa utfoere.
--
-- TILBAKERULLING (etter commit, hvis noedvendig):
--   begin;
--   delete from public.ressurs_egnet
--   where egnet_id = (select id from public.egnet_kategori where navn='Move It')
--     and ressurs_id in (
--       select distinct rk.ressurs_id from public.ressurs_kategori rk
--       join public.kategorier k on k.id = rk.kategori_id
--       where k.navn in ('Move It','Utføres i gruppe','Utføres parvis','Utføres alene','Kropp og hjerne')
--     );
--   commit;
-- ============================================================================

begin;

do $$
declare
  v_egnet_id smallint;
  n_egnet    int;
  n_maal     int;
  n_merket   int;
  fp         text;
  fp_expect  text := '41bdc9d9ae6203e8246a02ae615bffe6';
  n_before   int;
  n_insert   int;
  n_after    int;
begin
  -- ----------------------------------------------------------------------
  -- Sperre (egnet): «Move It» finnes noeyaktig én gang. Id slaas opp paa navn.
  -- ----------------------------------------------------------------------
  select count(*), min(id) into n_egnet, v_egnet_id
    from public.egnet_kategori where navn = 'Move It';
  if n_egnet <> 1 then
    raise exception 'STOPP 111 (egnet): forventet noeyaktig 1 egnet_kategori «Move It», fant %. Ingenting endret.', n_egnet;
  end if;

  -- ----------------------------------------------------------------------
  -- Maal + Sperre A/B/C i ett pass over de 126 distinkte maalressursene
  -- ----------------------------------------------------------------------
  select count(*),
         count(*) filter (where re_finnes),
         md5(string_agg(kilde_nid, ',' order by kilde_nid))
    into n_maal, n_merket, fp
  from (
    select r.id, r.kilde_nid,
           exists (select 1 from public.ressurs_egnet re
                   where re.ressurs_id = r.id and re.egnet_id = v_egnet_id) as re_finnes
    from public.ressurser r
    where r.id in (
      select rk.ressurs_id
      from public.ressurs_kategori rk
      join public.kategorier k on k.id = rk.kategori_id
      where k.navn in ('Move It','Utføres i gruppe','Utføres parvis','Utføres alene','Kropp og hjerne')
    )
  ) m;

  -- Sperre A: antall distinkte maalressurser = tallet fra steg 2
  if n_maal <> 126 then
    raise exception 'STOPP 111 (A): forventet 126 distinkte maalressurser, fant %. Grunnlaget har endret seg — ingenting endret.', n_maal;
  end if;

  -- Sperre C: fingeravtrykk paa kilde_nid
  if fp is distinct from fp_expect then
    raise exception 'STOPP 111 (C): fingeravtrykk % <> forventet %. Maalressursene er ikke de vi maalte — ingenting endret.', fp, fp_expect;
  end if;

  -- Sperre B: ingen av dem har «Move It»-egnet fra foer
  if n_merket <> 0 then
    raise exception 'STOPP 111 (B): allerede merket — % av maalressursene har «Move It»-egnet fra foer. Migrasjonen er alt kjoert. Ingenting endret.', n_merket;
  end if;

  -- Baseline: totalt antall «Move It»-egnet-rader foer (forventet 0)
  select count(*) into n_before from public.ressurs_egnet where egnet_id = v_egnet_id;

  -- ----------------------------------------------------------------------
  -- Innsetting
  -- ----------------------------------------------------------------------
  insert into public.ressurs_egnet (ressurs_id, egnet_id)
  select distinct rk.ressurs_id, v_egnet_id
  from public.ressurs_kategori rk
  join public.kategorier k on k.id = rk.kategori_id
  where k.navn in ('Move It','Utføres i gruppe','Utføres parvis','Utføres alene','Kropp og hjerne')
  on conflict (ressurs_id, egnet_id) do nothing;
  get diagnostics n_insert = row_count;

  -- ----------------------------------------------------------------------
  -- Sperre ETTER: riktig antall innsatt, og ingen andre «Move It»-egnet-rader roert
  -- ----------------------------------------------------------------------
  if n_insert <> 126 then
    raise exception 'STOPP 111 (etter): satte inn % rader, forventet 126. Rulles tilbake.', n_insert;
  end if;

  select count(*) into n_after from public.ressurs_egnet where egnet_id = v_egnet_id;
  if n_after <> n_before + 126 then
    raise exception 'STOPP 111 (etter, total): «Move It»-egnet gikk fra % til %, forventet +126. Rulles tilbake.', n_before, n_after;
  end if;

  raise notice '111 OK: satte inn % «Move It»-egnet (total %->%)', n_insert, n_before, n_after;
end $$;

-- ----------------------------------------------------------------------------
-- Kvittering: EN rad. Les etter kjoering (og under forhaandsvisning m/rollback).
-- ----------------------------------------------------------------------------
select string_agg(x, ' · ') as kvittering_111 from ( values
  ('maalressurser (5 kategorier): ' || (
     select count(distinct rk.ressurs_id)
     from public.ressurs_kategori rk
     join public.kategorier k on k.id = rk.kategori_id
     where k.navn in ('Move It','Utføres i gruppe','Utføres parvis','Utføres alene','Kropp og hjerne')
   )::text),
  ('av dem med «Move It»-egnet naa: ' || (
     select count(distinct rk.ressurs_id)
     from public.ressurs_kategori rk
     join public.kategorier k on k.id = rk.kategori_id
     join public.ressurs_egnet re on re.ressurs_id = rk.ressurs_id
       and re.egnet_id = (select id from public.egnet_kategori where navn='Move It')
     where k.navn in ('Move It','Utføres i gruppe','Utføres parvis','Utføres alene','Kropp og hjerne')
   )::text),
  ('«Move It»-egnet totalt (hele tabell): ' || (
     select count(*) from public.ressurs_egnet
     where egnet_id = (select id from public.egnet_kategori where navn='Move It')
   )::text)
) as t(x);

commit;
