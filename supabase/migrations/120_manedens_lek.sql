-- ============================================================================
-- 120_manedens_lek.sql — «Månedens lek» (automatisk, med redaksjonell reserve)
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning 11. sep 2026 (kveld). «Månedens lek» skal gå
--   AUTOMATISK, basert på skolenes faktiske bruk. Redaksjonell RESERVE når data er
--   for tynt. Valget FRYSES per måned. KUN antall lagres — ALDRI hvilke skoler.
--
-- ── SIGNALER FOR «EN SKOLE HAR BRUKT EN LEK» (kartlagt 11. sep, begrunnet) ──
-- Kravet er en SKOLE-dimensjon per lek. Kartleggingen av loggene viser:
--   * periodeplan_rad → periodeplan.skole_id (033/035): FYLLES med ekte skole_id via
--     hentMinSkole() (src/lib/periodeplan.js). Sterkt signal: skolen la leken i en
--     periodeplan. Ingen anonymisering rører denne. Tidsstempel: periodeplan.opprettet_at
--     (raden har ikke eget stempel — opprettet_at er det deterministiske «lagt til»-punktet).
--   * tl_hjul_lek → tl_hjul.skole_id (033): FYLLES med ekte skole_id (src/lib/hjul.js).
--     Sterkt signal: skolen la leken i et TL-hjul. Ingen anonymisering. Tidsstempel:
--     tl_hjul.opprettet_at (samme begrunnelse).
--   * bruk_hendelse (028): har skole_id + ressurs_id + tidspunkt. Hendelsene
--     'visning'/'video_spilt'/'pdf_nedlastet'/'favoritt' = «skolen åpnet/brukte leken».
--     ANONYMISERING (088): skole_id fjernes KUN for hendelse='sok' etter 30 dager — de
--     fire brukssignalene beholder skole_id. Derfor er forrige-måned-uttrekket trygt.
--     SKRIVESIDE (rettet 12. sep, src/lib/leker.js): loggBrukHendelse stempler nå skole_id
--     på de fire brukssignalene (fra brukerens aktive bruker_skole). INTERNE roller
--     (superadmin/ansatt) stemples ALDRI — deres test/simulering får skole_id=null.
--     Vi filtrerer `skole_id is not null`, så bruk fra utloggede/interne bidrar 0 skoler.
-- INTERNE/TEST: i tillegg utelates test-/demoskoler fra ALLE tre signalene (se intern_skole-
--   CTE): 'Demoskolen' (interne test av periodeplaner/TL-hjul) og 'Bjørnehaugen skole'
--   (testkontoen «Test Bjørnehaugen», Kjartans beslutning 12. sep 2026). NAVNBASERT fordi
--   basen ikke har noen test-/demo-markør (019). Andre test-/demoskoler kan ikke skilles ut
--   automatisk; dokumentert som restrisiko (lav: ≥5 distinkte skoler kreves, én ekstra skole
--   kan ikke alene utløse et valg). Lista må utvides hvis flere testskoler kommer til.
-- VALGT BORT: 'sok' (et søk er ikke bruk av en bestemt lek, og skole_id anonymiseres);
--   favoritter-TABELLEN (har INGEN skole_id — kan ikke gi skole-dimensjon; bruk_hendelse
--   sitt 'favoritt'-signal dekker favorisering med skole-dimensjon i stedet).
-- PERSONVERN: funksjonen lagrer KUN antall_skoler (og bare for kilde='automatisk').
--   Ingen skole-id lagres noe sted. (RISIKOPROFIL: leker/planer/hjul er ikke sensitive.)
--
-- ── HVA (én tabell + én funksjon) ──
--   public.manedens_lek(maaned pk, ressurs_id, kilde, antall_skoler, laget_at) —
--     én rad per måned, frosset. LAGRET kilde ∈ ('automatisk','reserve'). 'ingen' er en
--     forbigående RETURVERDI (ikke nok data ennå) og lagres ALDRI — derfor er 'ingen' tatt
--     ut av CHECK-regelen (funn B-1, 12. sep 2026).
--   public.hent_manedens_lek() → (ressurs_id, kilde): finnes rad for inneværende
--     måned (Europe/Oslo) → returner den. Ellers regn ut, sett inn (on conflict do
--     nothing), returner:
--       (1) AUTOMATISK: publisert lek (ressurstype<>'aktiv_laering') med FLEST DISTINKTE
--           skoler i forrige kalendermåned (union av de tre signalene). Krav ≥ 5 skoler.
--           Likhet: flest totale hendelser, så lavest kilde_nid, så nb-tittel, så id
--           (fullt deterministisk).
--       (2) RESERVE: synlig samling med nokkel='manedens-lek' (117-kolonnen — sjekkes,
--           ellers hoppes steget over) → første publiserte lek i
--           samling_ressurs_plassering (119) med seksjon = norsk månedsnavn for
--           inneværende måned («Januar»…«Desember»), i rekkefolge.
--       (3) Ellers kilde='ingen', ressurs_id=null — IKKE lagret (se under): måneden låses
--           ikke før det finnes et reelt valg, så data/reserve lagt inn senere fanges opp.
--
-- ── RETTIGHETER ──
--   Tabell: RLS på; authenticated LESER (policy using(true) — månedens lek er ikke
--     sensitivt); KUN funksjonen skriver (SECURITY DEFINER, eier=postgres, omgår RLS).
--     service_role får full DML (backend/cron). anon revokert (husregel).
--   Funksjon: SECURITY DEFINER, search_path='', alt skjemakvalifisert. Execute revokert
--     fra public/anon/authenticated og gitt til authenticated + service_role (form 098/099).
--     Tilgangsvakten ER grant-modellen (anon kan ikke kalle). Ingen get_min_rolle-gate:
--     funksjonen utleverer ikke skoledata og skriver kun en offentlig, idempotent månedsrad.
--
-- SPERRER: idempotens FØR (tabell finnes ⇒ stopp rent) · eksklusjons-sperre FØR (begge
--   test-/demoskolenavn MÅ finnes i skoler, ellers hardt stopp — funn B-1) · verifisering
--   ETTER (tabell + funksjon + RLS + execute-bilde) · kvittering på én rad (med de matchede
--   eksklusjonsskolenes id·navn) før commit.
-- EGENSKAPER: Additiv · idempotent stopp ved re-kjøring · ÉN transaksjon.
--
-- TILBAKERULLING (etter commit): begin;
--   drop function if exists public.hent_manedens_lek();
--   drop table if exists public.manedens_lek; commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- IDEMPOTENS-SPERRE (raise FØR skriving): re-kjøring stopper rent.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.manedens_lek') is not null then
    raise exception 'STOPP 120 (allerede kjørt): tabellen public.manedens_lek finnes allerede.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- EKSKLUSJONS-SPERRE (raise FØR skriving) — funn B-1 (Fable, 12. sep 2026).
-- «Månedens lek» ekskluderer test-/demoskoler PÅ NAVN (intern_skole-CTE i funksjonen). Gir
-- ett av navnene NULL treff i skoler-tabellen (skrivefeil, omdøpt skole, tom base), faller
-- eksklusjonen stille bort: en ekte testskole ville da telt som én av de ≥5 og utløst en
-- automatisk kåring uten at noen så det. Derfor stopper vi HARDT her hvis ett av navnene
-- mangler, og navngir det. NAVN er nøkkelen — id-ene hardkodes IKKE (de er ikke garantert
-- like i øvingskopien). Denne lista MÅ holdes i synk med intern_skole-CTE lenger nede.
-- ----------------------------------------------------------------------------
do $$
declare
  v_mangler text;
begin
  select string_agg(n.navn, ', ' order by n.navn)
    into v_mangler
    from (values ('Demoskolen'), ('Bjørnehaugen skole')) as n(navn)
   where not exists (select 1 from public.skoler s where s.navn = n.navn);
  if v_mangler is not null then
    raise exception 'STOPP 120 (B-1): eksklusjonsskole mangler i skoler-tabellen: %. Uten den ville en testskole telt som ekte skole og kunnet utløse automatisk kåring. Rett skolenavnet (eller opprett skolen) slik at navnet matcher intern_skole-CTE, før 120 kjøres.', v_mangler;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- TABELL
-- ----------------------------------------------------------------------------
create table public.manedens_lek (
  maaned        date primary key,                    -- første dag i måneden (Europe/Oslo)
  ressurs_id    uuid references public.ressurser(id) on delete set null,
  kilde         text not null check (kilde in ('automatisk','reserve')),  -- 'ingen' er forbigående returverdi, lagres aldri (B-1)
  antall_skoler integer,                             -- KUN satt for kilde='automatisk'
  laget_at      timestamptz not null default now()
);
comment on table public.manedens_lek is
  'Månedens lek (120), frosset per måned. Kun antall_skoler lagres (kun for automatisk) — aldri hvilke skoler.';

alter table public.manedens_lek enable row level security;

grant select on public.manedens_lek to authenticated;
grant select, insert, update, delete on public.manedens_lek to service_role;
revoke all on public.manedens_lek from anon;

-- LES: månedens lek er ikke sensitivt → alle innloggede kan lese. Skriving skjer kun via
-- SECURITY DEFINER-funksjonen (eier postgres omgår RLS), så ingen skrive-policy for authenticated.
create policy p_les on public.manedens_lek for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- FUNKSJON: hent_manedens_lek()
-- ----------------------------------------------------------------------------
create or replace function public.hent_manedens_lek()
returns table (ressurs_id uuid, kilde text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_maaned        date;
  v_forrige_start date;
  v_forrige_slutt date;
  v_res           uuid;
  v_kilde         text;
  v_antall        int;
  v_maanednavn    text;
  v_har_nokkel    boolean;
begin
  -- Inneværende måned i Europe/Oslo (første dag).
  v_maaned := date_trunc('month', (now() at time zone 'Europe/Oslo'))::date;

  -- Frosset: finnes rad for inneværende måned → returner den uendret.
  select m.ressurs_id, m.kilde into v_res, v_kilde
    from public.manedens_lek m where m.maaned = v_maaned;
  if found then
    ressurs_id := v_res; kilde := v_kilde; return next; return;
  end if;

  -- Forrige kalendermåned [start, slutt).
  v_forrige_start := (v_maaned - interval '1 month')::date;
  v_forrige_slutt := v_maaned;

  -- (1) AUTOMATISK — flest distinkte skoler forrige måned, blant publiserte leker.
  with intern_skole as (
    -- Test-/demoskoler som IKKE skal telle som ekte skolebruk. NAVNBASERT fordi basen ikke
    -- har noen test-/demo-markør (ingen egen kolonne på skoler, 019). Interne (superadmin/
    -- ansatt) tester/simulerer via disse. Utelates fra ALLE tre signalene. Eksakt navnematch
    -- (som før). LISTA MÅ UTVIDES hvis flere testskoler kommer til:
    --   'Demoskolen'         — interne test av periodeplaner/TL-hjul.
    --   'Bjørnehaugen skole' — testkontoen «Test Bjørnehaugen» (Kjartans beslutning 12. sep 2026).
    select id from public.skoler where navn in ('Demoskolen', 'Bjørnehaugen skole')
  ),
  bruk as (
    select pp.skole_id, pr.ressurs_id
      from public.periodeplan_rad pr
      join public.periodeplan pp on pp.id = pr.plan_id
     where pr.ressurs_id is not null and pp.skole_id is not null
       and pp.skole_id not in (select id from intern_skole)
       and (pp.opprettet_at at time zone 'Europe/Oslo') >= v_forrige_start
       and (pp.opprettet_at at time zone 'Europe/Oslo') <  v_forrige_slutt
    union all
    select th.skole_id, thl.ressurs_id
      from public.tl_hjul_lek thl
      join public.tl_hjul th on th.id = thl.hjul_id
     where thl.ressurs_id is not null and th.skole_id is not null
       and th.skole_id not in (select id from intern_skole)
       and (th.opprettet_at at time zone 'Europe/Oslo') >= v_forrige_start
       and (th.opprettet_at at time zone 'Europe/Oslo') <  v_forrige_slutt
    union all
    select bh.skole_id, bh.ressurs_id
      from public.bruk_hendelse bh
     where bh.ressurs_id is not null and bh.skole_id is not null
       and bh.skole_id not in (select id from intern_skole)
       and bh.hendelse in ('visning','video_spilt','pdf_nedlastet','favoritt')
       and (bh.tidspunkt at time zone 'Europe/Oslo') >= v_forrige_start
       and (bh.tidspunkt at time zone 'Europe/Oslo') <  v_forrige_slutt
  ),
  per_lek as (
    select b.ressurs_id as rid,
           count(distinct b.skole_id) as skoler,
           count(*) as total
      from bruk b
      join public.ressurser r on r.id = b.ressurs_id
     where r.status = 'publisert' and r.ressurstype <> 'aktiv_laering'
     group by b.ressurs_id
  )
  select pl.rid, pl.skoler into v_res, v_antall
    from per_lek pl
    join public.ressurser r on r.id = pl.rid
    left join public.ressurs_innhold ri on ri.ressurs_id = pl.rid and ri.sprak = 'nb'
   where pl.skoler >= 5
   order by pl.skoler desc, pl.total desc, r.kilde_nid asc nulls last, ri.tittel asc nulls last, pl.rid asc
   limit 1;

  if found then
    insert into public.manedens_lek (maaned, ressurs_id, kilde, antall_skoler)
      values (v_maaned, v_res, 'automatisk', v_antall)
      on conflict (maaned) do nothing;
    select m.ressurs_id, m.kilde into v_res, v_kilde from public.manedens_lek m where m.maaned = v_maaned;
    ressurs_id := v_res; kilde := v_kilde; return next; return;
  end if;

  -- (2) RESERVE — samling nokkel='manedens-lek', seksjon = norsk månedsnavn.
  -- nokkel-kolonnen kommer i 117; finnes den ikke, hopp over reserve (plpgsql planlegger
  -- den innebygde spørringen først ved kjøring, så s.nokkel-referansen feiler ikke her).
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'samlinger' and column_name = 'nokkel'
  ) into v_har_nokkel;

  if v_har_nokkel then
    v_maanednavn := case extract(month from v_maaned)::int
      when 1 then 'Januar'  when 2 then 'Februar'  when 3 then 'Mars'      when 4  then 'April'
      when 5 then 'Mai'     when 6 then 'Juni'      when 7 then 'Juli'      when 8  then 'August'
      when 9 then 'September' when 10 then 'Oktober' when 11 then 'November' when 12 then 'Desember'
    end;

    select srp.ressurs_id into v_res
      from public.samlinger s
      join public.samling_ressurs_plassering srp on srp.samling_id = s.id
      join public.ressurser r on r.id = srp.ressurs_id
     where s.nokkel = 'manedens-lek' and s.synlig
       and srp.seksjon = v_maanednavn
       and r.status = 'publisert' and r.ressurstype <> 'aktiv_laering'
     order by srp.rekkefolge asc, srp.ressurs_id asc
     limit 1;

    if found then
      insert into public.manedens_lek (maaned, ressurs_id, kilde, antall_skoler)
        values (v_maaned, v_res, 'reserve', null)
        on conflict (maaned) do nothing;
      select m.ressurs_id, m.kilde into v_res, v_kilde from public.manedens_lek m where m.maaned = v_maaned;
      ressurs_id := v_res; kilde := v_kilde; return next; return;
    end if;
  end if;

  -- (3) INGEN — IKKE frys (rettet 12. sep 2026, Fable C-1). Å skrive en 'ingen'-rad ville
  --   låst måneden: den frosne-sjekken øverst ville returnert 'ingen' resten av måneden selv
  --   om reserven eller dataene ble lagt inn ETTERPÅ. Kjøres funksjonen tidlig i en
  --   lanseringsmåned, ville kortet stått tomt hele måneden. Vi skriver derfor INGEN rad her
  --   — returnerer (null, 'ingen') og lar valget regnes på nytt ved neste kall. 'automatisk'
  --   og 'reserve' fryses som før (stabile valg); 'ingen' betyr «ikke nok data ennå».
  ressurs_id := null; kilde := 'ingen'; return next; return;
end;
$$;

-- Execute-bilde (form 098/099): kun authenticated + service_role. anon revokert.
revoke execute on function public.hent_manedens_lek() from public, anon, authenticated;
grant  execute on function public.hent_manedens_lek() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.manedens_lek') is null then
    raise exception 'STOPP 120 (etter): tabellen manedens_lek ble ikke opprettet.';
  end if;
  if not exists (select 1 from pg_class where oid='public.manedens_lek'::regclass and relrowsecurity) then
    raise exception 'STOPP 120 (etter): RLS ikke aktivert på manedens_lek.';
  end if;
  if to_regprocedure('public.hent_manedens_lek()') is null then
    raise exception 'STOPP 120 (etter): funksjonen hent_manedens_lek() finnes ikke.';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='hent_manedens_lek' and p.prosecdef) then
    raise exception 'STOPP 120 (etter): hent_manedens_lek er ikke SECURITY DEFINER.';
  end if;
  if has_function_privilege('anon', 'public.hent_manedens_lek()', 'execute') then
    raise exception 'STOPP 120 (etter): anon har execute på hent_manedens_lek — skal være revokert.';
  end if;
  if not has_function_privilege('authenticated', 'public.hent_manedens_lek()', 'execute') then
    raise exception 'STOPP 120 (etter): authenticated mangler execute på hent_manedens_lek.';
  end if;
  if has_table_privilege('anon', 'public.manedens_lek', 'SELECT') then
    raise exception 'STOPP 120 (etter): anon har select på manedens_lek — skal være revokert.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'tabell: '   || (to_regclass('public.manedens_lek') is not null),
  'funksjon: ' || (to_regprocedure('public.hent_manedens_lek()') is not null),
  'rader (skal være 0): ' || (select count(*) from public.manedens_lek),
  'ekskluderte skoler (id·navn): ' || (
     select string_agg(s.id || '·' || s.navn, ' | ' order by s.navn)
       from public.skoler s where s.navn in ('Demoskolen', 'Bjørnehaugen skole')),
  'authenticated execute: ' || has_function_privilege('authenticated','public.hent_manedens_lek()','execute'),
  'anon execute: ' || has_function_privilege('anon','public.hent_manedens_lek()','execute')
) as kvittering;

commit;
