-- 105_sok_leker_skoletype.sql
-- Etappe 7 D1 — SKOLETYPE-filteret som AVLEDNING i sok_leker (Kjartans beslutning 7. sep 2026).
--
-- SKOLETYPE har ingen tabell; importregelen (scripts/import/lib/regler.mjs::regelTrinn, «A1 låst»)
-- løser skoletype opp i trinn + egnet. Dette filteret speiler DEN regelen NØYAKTIG, så «trykk ett
-- sted» gir samme utvalg som importen la inn. Avledningen (enkeltvalg i filteret):
--   barnehage    → trinn 'bhg'
--   barnetrinn   → trinn 1–7
--   ungdomstrinn → trinn 8–10
--   kombinert    → trinn 8–10   (regelTrinn: K i isolasjon = 8–10; «betinget kun når verken B eller
--                                 U er satt» kollapser til 8–10 for et enkeltvalgt filter)
--   sfo          → egnet-kategori «SFO/AKS» (IKKE trinn)
-- Merk: importkodens kommentar-header (linje 82) sier «K→1–10», men den FAKTISKE låste koden
-- (linje 87–95) er K→8–10 betinget. Jeg fulgte koden, ikke header-kommentaren.
--
-- OVERLOAD-FELLA (CLAUDE.md): en ny parameter med standardverdi ERSTATTER ikke funksjonen — den
-- lager en overload, og to varianter gir tvetydige kall. Derfor: DROP gammel 11-arg signatur +
-- CREATE ny 12-arg + GRANT på nytt, ALT i én transaksjon.
--
-- HUSREGEL 104: kroppen under er lest fra basens EKTE pg_get_functiondef (ikke fra fil 089). En
-- senere migrasjon kan ha skrevet funksjonen om; en create-or-replace uten dagens klausuler ville
-- fjernet dem stille. search_path='' og grants (authenticated + service_role — IKKE anon/public,
-- målt i proacl) er bevart nøyaktig. Endringen er additiv: én ny param + to WHERE-ledd (styp-CTE).

begin;

-- Fjern den gamle 11-arg signaturen i SAMME transaksjon (unngår overload — en ny param med
-- standardverdi ERSTATTER ikke, den lager en overload). `create or replace` under gjør fila
-- idempotent (re-kjørbar): andre gang er 11-arg borte (drop if exists = no-op) og 12-arg
-- erstattes av seg selv. `create function` alene feilet migrasjonsporten på idempotens.
drop function if exists public.sok_leker(
  text, text, text, text, text, boolean, text, boolean, boolean, integer, integer);

create or replace function public.sok_leker(
  p_sok text default null,
  p_egnet text default null,
  p_trinn text default null,
  p_skoletype text default null,       -- NY: barnehage|barnetrinn|ungdomstrinn|kombinert|sfo
  p_sted text default null,
  p_utstyr text default null,
  p_uten_utstyr boolean default false,
  p_sesong text default null,
  p_kun_video boolean default false,
  p_kun_fav boolean default false,
  p_limit integer default 50,
  p_offset integer default 0)
 returns table(id uuid, tittel text, formaal text, sted text, antall_min integer, antall_maks integer, egnet text[], trinn jsonb, uten_utstyr boolean, har_video boolean, totalt_antall bigint)
 language sql
 stable security definer
 set search_path to ''
as $function$
  with param as (
    select
      raw,
      lower(raw) as norm,
      -- ILIKE-mønster med % _ \ i brukerteksten gjort til vanlige tegn
      -- (ellers gir «%» alene treff på alt).
      '%' || replace(replace(replace(lower(raw), '\', '\\'), '%', '\%'), '_', '\_') || '%' as mnst,
      -- Tomme filterverdier ('' / bare mellomrom) = ingen begrensning (jf. migr 084).
      nullif(btrim(coalesce(p_egnet,  '')), '') as egnet,
      nullif(btrim(coalesce(p_trinn,  '')), '') as trinn,
      nullif(btrim(coalesce(p_sted,   '')), '') as sted,
      nullif(btrim(coalesce(p_utstyr, '')), '') as utstyr,
      nullif(btrim(coalesce(p_sesong, '')), '') as sesong,
      -- NY: skoletype normaliseres til liten bokstav; tom = ingen begrensning.
      nullif(btrim(lower(coalesce(p_skoletype, ''))), '') as skoletype
    from (select nullif(btrim(left(coalesce(p_sok, ''), 200)), '') as raw) s
  ),
  -- NY: skoletype-avledning (speiler regler.mjs::regelTrinn). Gir enten et sett trinn-koder
  -- (barnehage/barne/ungdom/kombinert) ELLER en egnet-kategori (sfo) — aldri begge.
  styp as (
    select
      case (select skoletype from param)
        when 'barnehage'    then array['bhg']
        when 'barnetrinn'   then array['1','2','3','4','5','6','7']
        when 'ungdomstrinn' then array['8','9','10']
        when 'kombinert'    then array['8','9','10']
        else null::text[]
      end as trinn_koder,
      case when (select skoletype from param) = 'sfo' then 'SFO/AKS' else null::text end as egnet_navn
  ),
  spq as (
    -- Fulltekst-spørring på norsk konfig (nettstedet er norsk-først; svensk innhold
    -- dekkes av delstreng/trgm inntil egen sv-håndtering). websearch_to_tsquery
    -- feiler aldri på brukerinput («ball & !kjegle» blir 'ball' & 'kjegl').
    select case when (select raw from param) is not null
                then websearch_to_tsquery('norwegian', (select raw from param))
                else null end as q
  ),
  kandidater as (
    select r.id, r.sted, r.antall_min, r.antall_maks
    from public.ressurser r
    where r.status = 'publisert'
      and r.ressurstype <> 'aktiv_laering'   -- aktiv læring er egen side
      and (
        (select norm from param) is null
        or exists (
          select 1 from public.ressurs_innhold i
          where i.ressurs_id = r.id
            and (
              lower(i.tittel) = (select norm from param)
              or i.tittel ilike (select mnst from param)
              or ((select q from spq) is not null and i.sokevektor @@ (select q from spq))
              or extensions.similarity(lower(coalesce(i.tittel, '')), (select norm from param)) >= 0.30
            )
        )
      )
      and ((select egnet from param) is null or exists (
            select 1 from public.ressurs_egnet re
            join public.egnet_kategori ek on ek.id = re.egnet_id
            where re.ressurs_id = r.id and ek.navn = (select egnet from param)))
      and ((select trinn from param) is null or exists (
            select 1 from public.ressurs_trinn rt
            join public.trinn t on t.id = rt.trinn_id
            where rt.ressurs_id = r.id and t.kode = (select trinn from param)))
      -- NY: skoletype-avledning. trinn_koder satt → lek må ha minst ett av kodene; egnet_navn satt
      -- (sfo) → lek må ha egnet-kategori «SFO/AKS» (og INGEN trinn-begrensning). Begge null = av.
      -- styp krysskobles inn så trinn_koder er en KOLONNE (array-form «= any(kolonne)») og ikke
      -- tolkes som «= any(subquery)» (som ville sammenlignet text = text[]).
      and ((select trinn_koder from styp) is null or exists (
            select 1 from public.ressurs_trinn rt
            join public.trinn t on t.id = rt.trinn_id
            cross join styp sk
            where rt.ressurs_id = r.id and t.kode = any(sk.trinn_koder)))
      and ((select egnet_navn from styp) is null or exists (
            select 1 from public.ressurs_egnet re
            join public.egnet_kategori ek on ek.id = re.egnet_id
            where re.ressurs_id = r.id and ek.navn = (select egnet_navn from styp)))
      and ((select sted from param) is null
           or r.sted = (select sted from param) or r.sted = 'begge')
      and ((select utstyr from param) is null or exists (
            select 1 from public.ressurs_utstyr ru
            join public.utstyr u on u.id = ru.utstyr_id
            where ru.ressurs_id = r.id and u.navn = (select utstyr from param)))
      and (not coalesce(p_uten_utstyr, false) or not exists (
            select 1 from public.ressurs_utstyr ru where ru.ressurs_id = r.id))
      and ((select sesong from param) is null or exists (
            select 1 from public.ressurs_sesong rs
            join public.sesong s on s.id = rs.sesong_id
            where rs.ressurs_id = r.id and s.navn = (select sesong from param)))
      and (not coalesce(p_kun_video, false) or exists (
            select 1 from public.medier m
            where m.ressurs_id = r.id and m.type = 'video' and m.bunny_video_id is not null))
      and (not coalesce(p_kun_fav, false) or exists (
            select 1 from public.favoritter f
            where f.ressurs_id = r.id and f.bruker_id = auth.uid()))
  ),
  beriket as (
    select
      k.id, k.sted, k.antall_min, k.antall_maks,
      disp.tittel, disp.formaal,
      coalesce(rang.rang, 0::real) as rang,
      coalesce(rang.sim, 0::real)  as sim
    from kandidater k
    -- Visningsrad: samme språkvalg som frontend (nb -> nn -> annet).
    left join lateral (
      select i.tittel, i.formaal
      from public.ressurs_innhold i
      where i.ressurs_id = k.id
      order by case i.sprak when 'nb' then 0 when 'nn' then 1 else 2 end, i.id
      limit 1
    ) disp on true
    -- Rangering: 3 = eksakt tittel, +1 = delstreng i tittel, + ts_rank (0..~1) for
    -- fulltekst. Rent trgm-treff = 0 (sorteres deretter på sim).
    left join lateral (
      select
        max(
          (case when lower(i.tittel) = (select norm from param) then 3 else 0 end)::real
          + (case when i.tittel ilike (select mnst from param) then 1 else 0 end)::real
          + (case when (select q from spq) is not null and i.sokevektor @@ (select q from spq)
                  then ts_rank(i.sokevektor, (select q from spq)) else 0 end)::real
        ) as rang,
        max(extensions.similarity(lower(coalesce(i.tittel, '')), (select norm from param))) as sim
      from public.ressurs_innhold i
      where i.ressurs_id = k.id and (select norm from param) is not null
    ) rang on true
  )
  select
    b.id,
    b.tittel,
    b.formaal,
    b.sted,
    b.antall_min,
    b.antall_maks,
    coalesce((
      select array_agg(ek.navn order by ek.rekkefolge)
      from public.ressurs_egnet re
      join public.egnet_kategori ek on ek.id = re.egnet_id
      where re.ressurs_id = b.id
    ), array[]::text[]) as egnet,
    coalesce((
      select jsonb_agg(jsonb_build_object('kode', t.kode, 'navn', t.navn) order by t.rekkefolge)
      from public.ressurs_trinn rt
      join public.trinn t on t.id = rt.trinn_id
      where rt.ressurs_id = b.id
    ), '[]'::jsonb) as trinn,
    not exists (select 1 from public.ressurs_utstyr ru where ru.ressurs_id = b.id) as uten_utstyr,
    exists (
      select 1 from public.medier m
      where m.ressurs_id = b.id and m.type = 'video' and m.bunny_video_id is not null
    ) as har_video,
    count(*) over() as totalt_antall
  from beriket b
  -- b.id sist: deterministisk rekkefølge også ved lik tittel, så «Last mer»
  -- (offset) verken hopper over eller dobler rader.
  order by b.rang desc, b.sim desc, b.tittel asc nulls last, b.id asc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$function$;

-- Rettigheter: reproduser målt tilstand nøyaktig (authenticated + service_role; ingen anon/public).
revoke execute on function public.sok_leker(
  text, text, text, text, text, text, boolean, text, boolean, boolean, integer, integer)
  from public, anon, authenticated;
grant execute on function public.sok_leker(
  text, text, text, text, text, text, boolean, text, boolean, boolean, integer, integer)
  to authenticated, service_role;

commit;
