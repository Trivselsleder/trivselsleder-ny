-- 089_sok_leker_rpc.sql  (rettet etter kontroll 2. sep 2026 — se KONTROLL-fable-089-2sep.md)
-- Etappe 4 (Fase 3): flytt «Finn en lek»-søket fra nettleseren til basen.
--
-- Én RPC som tar fritekst + alle filtre + sideinndeling og gjør hele jobben i
-- Postgres. Returnerer KUN feltene listevisningen faktisk bruker, pluss totalt
-- antall treff (for «Last mer» og treff-teller). De sju lange tekstfeltene
-- (forberedelse, inndeling, utgangsposisjon, kronologi, regler, variasjoner,
-- instruktoernotat) leveres ALDRI herfra — de hentes kun på lekesiden (hentLek).
--
-- Rangering (høyest først): eksakt tittel -> delstreng i tittel -> fulltekst i
-- HELE beskrivelsen (sokevektor, migr 024) -> trgm-likhet på tittel (skrivefeil;
-- «balfangeren» treffer «Ballfangeren»). Et rent trgm-treff får rang 0 og havner
-- alltid under alle fulltekst-treff.
--
-- SIKKERHET (husets oppskrift for utleverende DEFINER-RPC):
--   * SECURITY DEFINER + SET search_path = '' (alt skjemakvalifisert; pg_catalog
--     søkes alltid implisitt, så 'norwegian', @@, ilike og ts_rank virker).
--   * REVOKE fra public + anon; GRANT kun til authenticated (+ service_role).
--   * Leverer KUN status='publisert' og ressurstype<>'aktiv_laering'.
--   * «Kun favoritter» bruker auth.uid(); uten innlogget bruker gir det 0 rader.
--
-- pg_trgm-SKJEMA (det ene miljøavhengige punktet): funksjonen kaller
--   extensions.similarity(). Migr 024 installerte pg_trgm UTEN skjema, så den kan
--   ligge i public. DO-blokken under flytter den til extensions hvis så — pg_trgm
--   er relokerbar, trgm-indeksen (idx_ressurs_innhold_tittel_trgm) peker på
--   operatorklassen via OID og påvirkes ikke, og ingen annen kode i huset
--   refererer similarity/%-operatoren. Er den allerede i extensions: ingen endring.
--
-- IDEMPOTENT. Kjøres i Supabase SQL-editor som ÉN transaksjon.
-- VED SENERE SIGNATURENDRING: legg til DROP for den GAMLE signaturen — en ny
-- parameter med standardverdi erstatter ikke funksjonen, den lager en overload.

do $$
begin
  if exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

drop function if exists public.sok_leker(text, text, text, text, text, boolean, text, boolean, boolean, integer, integer);

create function public.sok_leker(
  p_sok         text    default null,   -- fritekst; null/tom = ingen tekstfiltrering
  p_egnet       text    default null,   -- egnet_kategori.navn
  p_trinn       text    default null,   -- trinn.kode
  p_sted        text    default null,   -- 'inne' | 'ute' (matcher også 'begge')
  p_utstyr      text    default null,   -- utstyr.navn
  p_uten_utstyr boolean default false,  -- kun leker uten utstyr
  p_sesong      text    default null,   -- sesong.navn
  p_kun_video   boolean default false,  -- kun leker med video
  p_kun_fav     boolean default false,  -- kun innlogget brukers favoritter
  p_limit       integer default 50,     -- «Last mer» henter 50 om gangen
  p_offset      integer default 0
)
returns table (
  id             uuid,
  tittel         text,
  formaal        text,
  sted           text,
  antall_min     integer,
  antall_maks    integer,
  egnet          text[],
  trinn          jsonb,
  uten_utstyr    boolean,
  har_video      boolean,
  totalt_antall  bigint
)
language sql
stable
security definer
set search_path = ''
as $$
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
      nullif(btrim(coalesce(p_sesong, '')), '') as sesong
    from (select nullif(btrim(left(coalesce(p_sok, ''), 200)), '') as raw) s
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
$$;

-- Rettigheter: aldri anon/public; kun innloggede (+ service_role for jobber).
revoke all on function public.sok_leker(text, text, text, text, text, boolean, text, boolean, boolean, integer, integer) from public;
revoke all on function public.sok_leker(text, text, text, text, text, boolean, text, boolean, boolean, integer, integer) from anon;
grant execute on function public.sok_leker(text, text, text, text, text, boolean, text, boolean, boolean, integer, integer) to authenticated;
grant execute on function public.sok_leker(text, text, text, text, text, boolean, text, boolean, boolean, integer, integer) to service_role;

-- KONTROLL ETTER KJØRING (skal gi 'extensions' og fire rader):
-- select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm';
-- select grantee, privilege_type from information_schema.routine_privileges where routine_name='sok_leker';
-- select tittel, totalt_antall from public.sok_leker(p_sok => 'balfangeren');
