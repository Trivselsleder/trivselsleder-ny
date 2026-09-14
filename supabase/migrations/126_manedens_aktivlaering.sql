-- ============================================================================
-- 126_manedens_aktivlaering.sql — «Månedens aktiv læring» + fjern reserve-veien
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning 14. september 2026.
--   (A) «Månedens lek» skal KUN vise hva skolene FAKTISK bruker. Den kuraterte
--       TL-RESERVEN utgår helt (lekene kommer uansett via lekekursene, og to kilder
--       i samme kort er forvirrende kommunikasjon). Reserve-steget (2) i
--       hent_manedens_lek fjernes → funksjonen returnerer nå kun 'automatisk' eller
--       'ingen'. Ingen samling har noensinne hatt nokkel='manedens-lek', så steget
--       var uansett dødt i prod.
--   (B) «Månedens aktiv læring» innføres etter SAMME prinsipp, i samme kort på Min
--       side (frontend bygges senere, venter på design). Egen tabell + egen funksjon
--       som speiler hent_manedens_lek, med tre forskjeller:
--         · ressurstype = 'aktiv_laering' (motsatt filter av lek-funksjonen)
--         · bruk_hendelse teller også 'aktiv_laering_apnet' (ny type fra migr 125)
--         · egen frysetabell public.manedens_aktivlaering (samme mønster)
--       Periodeplan og TL-hjul teller fortsatt — et aktiv læring-opplegg kan legges i
--       begge. Samme terskel (≥ 5 distinkte skoler), samme eksklusjon av testskolene,
--       samme frysemekanikk, og 'ingen' fryses ALDRI (jf. Fable C-1, 12. sep).
--
-- ── FORUTSETNINGER (harde sperrer) ──
--   · migr 120 må stå i basen (public.manedens_lek + hent_manedens_lek finnes).
--   · migr 125 må stå i basen (bruk_hendelse godtar 'aktiv_laering_apnet').
--   · begge testskolenavn må finnes i skoler (samme B-1-sperre som 120) — ellers ville
--     eksklusjonen stille falt bort og en testskole telt som ekte.
--
-- ── CHECK PÅ manedens_lek.kilde: STRAMMET fra ('automatisk','reserve') til
--    ('automatisk') ──
--   Reserve-veien er borte, så 'reserve' skal ikke lenger kunne lagres. Vi MÅLER først
--   (raise hvis en reserve-rad finnes) i stedet for å anta at tabellen er tom — en slik
--   rad ville ellers gitt et kryptisk constraint-brudd. Prod-tabellen forventes tom.
--   manedens_aktivlaering får ('automatisk') fra start (aldri hatt reserve).
--
-- ── 12.-SEP-LÆRDOM (funksjonskropper avviker fra filer) ──
--   hent_manedens_lek er IKKE blant de 15 funksjonene som avvek i prod (12. sep), og
--   INGEN migrasjon 121–125 rører den. Prods kropp = migr 120. create-or-replace under
--   bygger derfor på 120s kropp (reserve-steget fjernet), med search_path='' og
--   security definer bevart (jf. 104-fellen: en replace uten disse ville stille fjernet
--   herdingen).
--
-- ── RETTIGHETER (husregel + 12.-sep default-privileges-lærdom) ──
--   Prod har et ÅPENT default-privileges-sett som gir anon fulle rettigheter på
--   FRAMTIDIGE tabeller. Den nye tabellen setter derfor rettigheter EKSPLISITT
--   (revoke all … from anon) og har RLS på. authenticated LESER (ikke sensitivt), kun
--   funksjonen skriver (SECURITY DEFINER, eier postgres, omgår RLS). Funksjonen:
--   SECURITY DEFINER, search_path='', execute revokert fra public/anon/authenticated og
--   gitt til authenticated + service_role (form 098/099). anon kan ikke kalle.
--
-- SPERRER: idempotens FØR (manedens_aktivlaering finnes ⇒ stopp rent) · forutsetning
--   120+125 FØR · eksklusjons-sperre FØR (B-1) · reserve-rad-måling FØR stramming ·
--   verifisering ETTER (begge tabeller + begge funksjoner + RLS + execute-bilde +
--   strammet CHECK) · kvittering på én rad før commit.
-- EGENSKAPER: idempotent stopp ved re-kjøring · ÉN transaksjon.
--
-- TILBAKERULLING (etter commit): begin;
--   drop function if exists public.hent_manedens_aktivlaering();
--   drop table if exists public.manedens_aktivlaering;
--   -- gjenopprett reserve i lek-funksjonen + CHECK fra migr 120 om ønskelig
--   alter table public.manedens_lek drop constraint manedens_lek_kilde_check;
--   alter table public.manedens_lek add constraint manedens_lek_kilde_check
--     check (kilde in ('automatisk','reserve')); commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- IDEMPOTENS-SPERRE (raise FØR skriving): re-kjøring stopper rent.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.manedens_aktivlaering') is not null then
    raise exception 'STOPP 126 (allerede kjørt): tabellen public.manedens_aktivlaering finnes allerede.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- FORUTSETNINGER (raise FØR skriving): 120 og 125 må stå i basen.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.manedens_lek') is null
     or to_regprocedure('public.hent_manedens_lek()') is null then
    raise exception 'STOPP 126: migr 120 (manedens_lek + hent_manedens_lek) må stå i basen først.';
  end if;
  if (select pg_get_constraintdef(oid) from pg_constraint
        where conrelid = 'public.bruk_hendelse'::regclass
          and conname  = 'bruk_hendelse_hendelse_check') not like '%aktiv_laering_apnet%' then
    raise exception 'STOPP 126: bruk_hendelse godtar ikke ''aktiv_laering_apnet'' — migr 125 må kjøres først.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- EKSKLUSJONS-SPERRE (raise FØR skriving) — samme som 120 (B-1). Begge testskolenavn
-- MÅ finnes i skoler; ellers faller eksklusjonen stille bort og en testskole kan telle
-- som ekte og alene skyve en kåring over terskelen. NAVN er nøkkelen (id-ene er ikke
-- garantert like i øvingskopien). MÅ holdes i synk med intern_skole-CTE i BEGGE
-- funksjonene under. (Se anbefaling i =TIL CLAUDE= om å samle lista ett sted.)
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
    raise exception 'STOPP 126 (B-1): eksklusjonsskole mangler i skoler-tabellen: %. Uten den ville en testskole telt som ekte skole. Rett skolenavnet (eller opprett skolen) før 126 kjøres.', v_mangler;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- (A) STRAM CHECK PÅ manedens_lek.kilde: ('automatisk','reserve') → ('automatisk').
-- Mål FØRST at ingen reserve-rad finnes (ikke anta at tabellen er tom).
-- ----------------------------------------------------------------------------
do $$
declare
  v_reserve int;
begin
  select count(*) into v_reserve from public.manedens_lek where kilde = 'reserve';
  if v_reserve > 0 then
    raise exception 'STOPP 126: % rad(er) i manedens_lek har kilde=''reserve''. Reserve-veien fjernes nå; en slik rad ville brutt den strammede CHECK-regelen. Avklar med Kjartan før 126 kjøres.', v_reserve;
  end if;
end $$;

alter table public.manedens_lek drop constraint manedens_lek_kilde_check;
alter table public.manedens_lek
  add constraint manedens_lek_kilde_check check (kilde in ('automatisk'));

comment on constraint manedens_lek_kilde_check on public.manedens_lek is
  'Kun ''automatisk'' lagres (126): reserve-veien utgått, ''ingen'' er forbigående returverdi.';

-- ----------------------------------------------------------------------------
-- (A) ERSTATT hent_manedens_lek() — reserve-steget (2) fjernet. Bygger på migr 120s
-- kropp (verifisert = prod). Kun 'automatisk' eller 'ingen'; 'ingen' fryses ALDRI.
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

  -- (1) AUTOMATISK — flest distinkte skoler forrige måned, blant publiserte LEKER.
  with intern_skole as (
    -- Test-/demoskoler (navnbasert, jf. 120). MÅ holdes i synk med eksklusjons-sperra.
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

  -- (2) INGEN — IKKE frys (Fable C-1, 12. sep). En 'ingen'-rad ville låst måneden slik at
  --   data lagt inn senere aldri ble fanget opp. Returner (null,'ingen') og regn på nytt
  --   ved neste kall. (Reserve-steget som lå her er fjernet 14. sep — Kjartans beslutning.)
  ressurs_id := null; kilde := 'ingen'; return next; return;
end;
$$;

-- Execute-bilde (form 098/099): kun authenticated + service_role. anon revokert.
revoke execute on function public.hent_manedens_lek() from public, anon, authenticated;
grant  execute on function public.hent_manedens_lek() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- (B) TABELL: manedens_aktivlaering (samme mønster som manedens_lek).
-- CHECK har KUN 'automatisk' fra start (aldri hatt reserve). 'ingen' lagres aldri.
-- ----------------------------------------------------------------------------
create table public.manedens_aktivlaering (
  maaned        date primary key,                    -- første dag i måneden (Europe/Oslo)
  ressurs_id    uuid references public.ressurser(id) on delete set null,
  kilde         text not null check (kilde in ('automatisk')),  -- 'ingen' er forbigående returverdi, lagres aldri
  antall_skoler integer,                             -- KUN satt for kilde='automatisk'
  laget_at      timestamptz not null default now()
);
comment on table public.manedens_aktivlaering is
  'Månedens aktiv læring (126), frosset per måned. Kun antall_skoler lagres — aldri hvilke skoler.';

alter table public.manedens_aktivlaering enable row level security;

-- Rettigheter EKSPLISITT (12.-sep default-privileges-lærdom: prod har åpent sett på
-- framtidige objekter). authenticated leser; kun funksjonen (SECURITY DEFINER) skriver;
-- service_role full DML (backend/cron); anon revokert.
grant select on public.manedens_aktivlaering to authenticated;
grant select, insert, update, delete on public.manedens_aktivlaering to service_role;
revoke all on public.manedens_aktivlaering from anon;

create policy p_les on public.manedens_aktivlaering for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- (B) FUNKSJON: hent_manedens_aktivlaering() — speiler hent_manedens_lek, men filtrerer
-- ressurstype = 'aktiv_laering' og teller også 'aktiv_laering_apnet'. Ingen reserve.
-- ----------------------------------------------------------------------------
create or replace function public.hent_manedens_aktivlaering()
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
begin
  v_maaned := date_trunc('month', (now() at time zone 'Europe/Oslo'))::date;

  select m.ressurs_id, m.kilde into v_res, v_kilde
    from public.manedens_aktivlaering m where m.maaned = v_maaned;
  if found then
    ressurs_id := v_res; kilde := v_kilde; return next; return;
  end if;

  v_forrige_start := (v_maaned - interval '1 month')::date;
  v_forrige_slutt := v_maaned;

  -- (1) AUTOMATISK — flest distinkte skoler forrige måned, blant publiserte AKTIV
  --     LÆRING-opplegg. Periodeplan + TL-hjul teller (opplegget kan ligge i begge), og
  --     bruk_hendelse teller også 'aktiv_laering_apnet' (åpning av aktiv læring-siden).
  with intern_skole as (
    -- Test-/demoskoler (navnbasert, jf. 120). MÅ holdes i synk med eksklusjons-sperra.
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
       and bh.hendelse in ('visning','video_spilt','pdf_nedlastet','favoritt','aktiv_laering_apnet')
       and (bh.tidspunkt at time zone 'Europe/Oslo') >= v_forrige_start
       and (bh.tidspunkt at time zone 'Europe/Oslo') <  v_forrige_slutt
  ),
  per_opplegg as (
    select b.ressurs_id as rid,
           count(distinct b.skole_id) as skoler,
           count(*) as total
      from bruk b
      join public.ressurser r on r.id = b.ressurs_id
     where r.status = 'publisert' and r.ressurstype = 'aktiv_laering'
     group by b.ressurs_id
  )
  select pl.rid, pl.skoler into v_res, v_antall
    from per_opplegg pl
    join public.ressurser r on r.id = pl.rid
    left join public.ressurs_innhold ri on ri.ressurs_id = pl.rid and ri.sprak = 'nb'
   where pl.skoler >= 5
   order by pl.skoler desc, pl.total desc, r.kilde_nid asc nulls last, ri.tittel asc nulls last, pl.rid asc
   limit 1;

  if found then
    insert into public.manedens_aktivlaering (maaned, ressurs_id, kilde, antall_skoler)
      values (v_maaned, v_res, 'automatisk', v_antall)
      on conflict (maaned) do nothing;
    select m.ressurs_id, m.kilde into v_res, v_kilde from public.manedens_aktivlaering m where m.maaned = v_maaned;
    ressurs_id := v_res; kilde := v_kilde; return next; return;
  end if;

  -- (2) INGEN — IKKE frys (samme begrunnelse som lek-funksjonen, Fable C-1).
  ressurs_id := null; kilde := 'ingen'; return next; return;
end;
$$;

revoke execute on function public.hent_manedens_aktivlaering() from public, anon, authenticated;
grant  execute on function public.hent_manedens_aktivlaering() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
begin
  -- ny tabell + RLS
  if to_regclass('public.manedens_aktivlaering') is null then
    raise exception 'STOPP 126 (etter): tabellen manedens_aktivlaering ble ikke opprettet.';
  end if;
  if not exists (select 1 from pg_class where oid='public.manedens_aktivlaering'::regclass and relrowsecurity) then
    raise exception 'STOPP 126 (etter): RLS ikke aktivert på manedens_aktivlaering.';
  end if;
  -- ny funksjon + secdef + execute-bilde
  if to_regprocedure('public.hent_manedens_aktivlaering()') is null then
    raise exception 'STOPP 126 (etter): hent_manedens_aktivlaering() finnes ikke.';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                 where n.nspname='public' and p.proname='hent_manedens_aktivlaering' and p.prosecdef) then
    raise exception 'STOPP 126 (etter): hent_manedens_aktivlaering er ikke SECURITY DEFINER.';
  end if;
  if has_function_privilege('anon', 'public.hent_manedens_aktivlaering()', 'execute') then
    raise exception 'STOPP 126 (etter): anon har execute på hent_manedens_aktivlaering — skal være revokert.';
  end if;
  if not has_function_privilege('authenticated', 'public.hent_manedens_aktivlaering()', 'execute') then
    raise exception 'STOPP 126 (etter): authenticated mangler execute på hent_manedens_aktivlaering.';
  end if;
  if has_table_privilege('anon', 'public.manedens_aktivlaering', 'SELECT') then
    raise exception 'STOPP 126 (etter): anon har select på manedens_aktivlaering — skal være revokert.';
  end if;
  -- begge funksjonene skal fortsatt være secdef med search_path pinnet (104-fellen).
  -- proconfig lagrer elementet som search_path="" — sjekk med prefiks-LIKE, ikke likhet.
  if not exists (select 1 from pg_proc where proname='hent_manedens_lek' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')) then
    raise exception 'STOPP 126 (etter): hent_manedens_lek mistet secdef/search_path-herdingen.';
  end if;
  if not exists (select 1 from pg_proc where proname='hent_manedens_aktivlaering' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')) then
    raise exception 'STOPP 126 (etter): hent_manedens_aktivlaering mangler search_path-herdingen.';
  end if;
  -- lek-CHECK strammet
  if (select pg_get_constraintdef(oid) from pg_constraint
        where conrelid='public.manedens_lek'::regclass and conname='manedens_lek_kilde_check') like '%reserve%' then
    raise exception 'STOPP 126 (etter): manedens_lek_kilde_check har fortsatt ''reserve''.';
  end if;
  -- reserve-steget skal være borte fra lek-funksjonen
  if (select pg_get_functiondef('public.hent_manedens_lek()'::regprocedure)) like '%manedens-lek%' then
    raise exception 'STOPP 126 (etter): reserve-steget (nokkel=manedens-lek) står fortsatt i hent_manedens_lek.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'manedens_aktivlaering: ' || (to_regclass('public.manedens_aktivlaering') is not null),
  'hent_manedens_aktivlaering: ' || (to_regprocedure('public.hent_manedens_aktivlaering()') is not null),
  'AL-rader (skal være 0): ' || (select count(*) from public.manedens_aktivlaering),
  'lek-CHECK: ' || (select pg_get_constraintdef(oid) from pg_constraint
                      where conrelid='public.manedens_lek'::regclass and conname='manedens_lek_kilde_check'),
  'reserve fjernet fra lek-fn: ' || ((select pg_get_functiondef('public.hent_manedens_lek()'::regprocedure)) not like '%manedens-lek%'),
  'AL teller aktiv_laering_apnet: ' || ((select pg_get_functiondef('public.hent_manedens_aktivlaering()'::regprocedure)) like '%aktiv_laering_apnet%'),
  'ekskluderte skoler (id·navn): ' || (
     select string_agg(s.id || '·' || s.navn, ' | ' order by s.navn)
       from public.skoler s where s.navn in ('Demoskolen', 'Bjørnehaugen skole')),
  'AL authenticated execute: ' || has_function_privilege('authenticated','public.hent_manedens_aktivlaering()','execute'),
  'AL anon execute: ' || has_function_privilege('anon','public.hent_manedens_aktivlaering()','execute')
) as kvittering;

commit;
