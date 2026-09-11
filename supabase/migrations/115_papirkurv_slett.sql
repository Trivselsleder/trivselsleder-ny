-- ============================================================================
-- 115_papirkurv_slett.sql
-- ============================================================================
-- HVA: gjør «arkivert» om til en 30-dagers PAPIRKURV for periodeplan og tl_hjul.
--   Kjartans beslutning 10. sep 2026: «Arkiver» erstattes av «Slett» med
--   bekreftelse og 30 dagers angrefrist, deretter endelig sletting. Begrunnelse:
--   «Arkiver» er ulogisk, og planer kan inneholde barnenavn.
--
--   Statusfeltet beholdes (text default 'aktiv', check ('aktiv','arkivert') fra
--   migr 033) — «i papirkurven» = status='arkivert'. Det NYE er:
--     * en kolonne arkivert_at som tidsstempler NÅR raden havnet i papirkurven,
--     * en trigger som setter/nullstiller arkivert_at automatisk ved statusbytte,
--     * en funksjon slett_utlopte_papirkurv() som sletter rader eldre enn 30 dager.
--
--   Barna forsvinner via eksisterende CASCADE:
--     periodeplan_rad.plan_id -> periodeplan  ON DELETE CASCADE
--     tl_hjul_lek.hjul_id     -> tl_hjul      ON DELETE CASCADE
--
-- HVORFOR NY KOLONNE OG IKKE endret_at: trg_periodeplan_endret / trg_tl_hjul_endret
--   (migr 033, fase4_sett_endret_at) setter endret_at = now() ved ALLE endringer.
--   endret_at kan derfor IKKE brukes som slettetidspunkt — en redigering ville
--   flyttet fristen. arkivert_at settes KUN ved overgang til/fra 'arkivert'.
--
-- TRIGGER-LOGIKK (papirkurv_sett_arkivert_at, BEFORE INSERT OR UPDATE per tabell):
--   arkivert_at settes ALLTID av basen ut fra TG_OP + OLD/NEW — en klientsatt
--   arkivert_at ignoreres fullstendig (kan ikke forfalske eller forlenge fristen):
--     INSERT: status='arkivert' -> now(),  ellers -> null.
--     UPDATE: aktiv->arkivert    -> now()  (fristen starter),
--             arkivert->arkivert -> OLD.arkivert_at (fristen står; redigering flytter den ikke),
--             ->aktiv            -> null   (gjenoppretting starter på nytt).
--   Egen search_path='' på funksjonen (herding). Den rører kun NEW/OLD, leser ingen
--   tabeller, så den er SECURITY INVOKER — trigger-mekanismen krever ikke EXECUTE.
--
--   REKKEFØLGE: funksjonen lages FØR backfill, men triggerne kobles på ETTER backfill.
--   Ellers ville arkivert->arkivert-grenen satt NEW.arkivert_at := OLD (= null) og
--   dermed STILLE overstyrt backfillens `set arkivert_at = now()`.
--
-- BACKFILL: eksisterende rader med status='arkivert' får arkivert_at = now()
--   (dvs. 30 dager frist fra kjøringstidspunktet). Sperre: antall backfilled =
--   antall arkiverte målt i SAMME transaksjon (ellers stopp + rullback).
--
-- SLETTEFUNKSJON (slett_utlopte_papirkurv): SECURITY DEFINER, search_path='',
--   alt skjema-kvalifisert. Sletter status='arkivert' and arkivert_at < now() -
--   interval '30 days' i BEGGE tabeller, returnerer antall per tabell. Kalles av
--   nattjobben (api/papirkurv/cron-slett.js) med service-nøkkel. revoke execute
--   from public, anon, authenticated; grant execute to service_role.
--
-- GRANTS: ingen nye TABELLER (kun ny kolonne på eksisterende — arver grants).
--   To nye FUNKSJONER: trigger-funksjonen (revoke fra public/anon/authenticated,
--   ingen grant — trigger fyrer uansett) og slettefunksjonen (kun service_role).
--
-- IKKE IDEMPOTENT — KAN KUN KJØRES EN GANG. Sperre A stopper ved ny kjøring
--   («kolonnen arkivert_at finnes allerede»). ALTER ADD COLUMN er uten IF NOT
--   EXISTS med vilje, så en utilsiktet dobbeltkjøring aldri går stille.
--
-- FORHÅNDSVISNING/PRØVE: hele migrasjonen er DDL (legger til kolonne + objekter).
--   Den kan ikke «forhåndsvises» meningsfullt med rollback slik en ren INSERT kan;
--   se lokal prøve i leveransenotatet. En avbrutt DO-blokk (sperre) ruller HELE
--   transaksjonen tilbake, så ingenting delvis-committes.
--
-- TILBAKERULLING (etter commit, hvis nødvendig):
--   begin;
--   drop trigger if exists trg_periodeplan_papirkurv on public.periodeplan;
--   drop trigger if exists trg_tl_hjul_papirkurv     on public.tl_hjul;
--   drop function if exists public.papirkurv_sett_arkivert_at();
--   drop function if exists public.slett_utlopte_papirkurv();
--   alter table public.periodeplan drop column if exists arkivert_at;
--   alter table public.tl_hjul     drop column if exists arkivert_at;
--   commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Sperre A: kolonnen finnes ikke fra før («allerede kjørt»).
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.periodeplan'::regclass
      and attname = 'arkivert_at' and not attisdropped
  ) then
    raise exception 'STOPP 115 (A): kolonnen arkivert_at finnes allerede paa periodeplan — migrasjonen er alt kjoert. Ingenting endret.';
  end if;
  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.tl_hjul'::regclass
      and attname = 'arkivert_at' and not attisdropped
  ) then
    raise exception 'STOPP 115 (A): kolonnen arkivert_at finnes allerede paa tl_hjul — migrasjonen er alt kjoert. Ingenting endret.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) Ny kolonne (uten IF NOT EXISTS — sperre A har alt fastslaatt at den mangler)
-- ----------------------------------------------------------------------------
alter table public.periodeplan add column arkivert_at timestamptz;
alter table public.tl_hjul     add column arkivert_at timestamptz;

-- ----------------------------------------------------------------------------
-- 2) Trigger-FUNKSJON: sett arkivert_at deterministisk ut fra TG_OP + OLD/NEW.
--    Klientsatt arkivert_at ignoreres ALLTID. Rører kun NEW/OLD; leser ingen
--    tabeller. Egen search_path='' (herding). Triggerne kobles paa ETTER backfill.
-- ----------------------------------------------------------------------------
create or replace function public.papirkurv_sett_arkivert_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Ny rad: arkivert med en gang -> now(), ellers ingen frist.
    if new.status = 'arkivert' then
      new.arkivert_at := now();
    else
      new.arkivert_at := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.status = 'arkivert' then
      if old.status = 'arkivert' then
        -- Alt i papirkurven: behold fristen (redigering skal ikke flytte den,
        -- og en klientsatt arkivert_at skal ikke kunne overstyre den).
        new.arkivert_at := old.arkivert_at;
      else
        -- aktiv -> arkivert: fristen starter naa.
        new.arkivert_at := now();
      end if;
    else
      -- -> aktiv (gjenoppretting): ut av papirkurven, fristen nullstilles.
      new.arkivert_at := null;
    end if;
  end if;
  return new;
end;
$$;

-- Trigger-funksjoner kalles av trigger-mekanismen uansett EXECUTE-rettighet
-- (Postgres sjekker ikke EXECUTE for dem), saa ingen grant trengs. Vi fjerner
-- likevel den implisitte PUBLIC-execute (kan ikke kalles direkte via rpc/).
revoke execute on function public.papirkurv_sett_arkivert_at() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) Backfill: eksisterende arkiverte rader faar arkivert_at = now().
--    Kjoeres FOER triggerne kobles paa (ellers ville arkivert->arkivert-grenen
--    satt arkivert_at tilbake til OLD = null og noeytralisert backfillen).
--    Sperre B: antall backfilled = antall arkiverte (samme transaksjon).
-- ----------------------------------------------------------------------------
do $$
declare
  n_ark_plan int;
  n_bf_plan  int;
  n_ark_hjul int;
  n_bf_hjul  int;
begin
  select count(*) into n_ark_plan from public.periodeplan where status = 'arkivert';
  update public.periodeplan set arkivert_at = now()
   where status = 'arkivert' and arkivert_at is null;
  get diagnostics n_bf_plan = row_count;
  if n_bf_plan <> n_ark_plan then
    raise exception 'STOPP 115 (B, periodeplan): backfilte % men fant % arkiverte. Rulles tilbake.', n_bf_plan, n_ark_plan;
  end if;

  select count(*) into n_ark_hjul from public.tl_hjul where status = 'arkivert';
  update public.tl_hjul set arkivert_at = now()
   where status = 'arkivert' and arkivert_at is null;
  get diagnostics n_bf_hjul = row_count;
  if n_bf_hjul <> n_ark_hjul then
    raise exception 'STOPP 115 (B, tl_hjul): backfilte % men fant % arkiverte. Rulles tilbake.', n_bf_hjul, n_ark_hjul;
  end if;

  raise notice '115 OK backfill: periodeplan % / tl_hjul %', n_bf_plan, n_bf_hjul;
end $$;

-- ----------------------------------------------------------------------------
-- 4) Koble triggerne paa NAA (etter backfill). BEFORE INSERT OR UPDATE paa begge
--    tabeller, saa arkivert_at ogsaa settes ved direkte insert av en arkivert rad.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_periodeplan_papirkurv on public.periodeplan;
create trigger trg_periodeplan_papirkurv before insert or update on public.periodeplan
  for each row execute function public.papirkurv_sett_arkivert_at();

drop trigger if exists trg_tl_hjul_papirkurv on public.tl_hjul;
create trigger trg_tl_hjul_papirkurv before insert or update on public.tl_hjul
  for each row execute function public.papirkurv_sett_arkivert_at();

-- ----------------------------------------------------------------------------
-- 5) Slettefunksjon: fjern papirkurv-rader eldre enn 30 dager (begge tabeller).
--    Barna forsvinner via CASCADE. Returnerer antall per tabell.
-- ----------------------------------------------------------------------------
create or replace function public.slett_utlopte_papirkurv()
returns table (slettet_periodeplan bigint, slettet_tl_hjul bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_plan bigint;
  n_hjul bigint;
begin
  delete from public.periodeplan
   where status = 'arkivert'
     and arkivert_at is not null
     and arkivert_at < now() - interval '30 days';
  get diagnostics n_plan = row_count;

  delete from public.tl_hjul
   where status = 'arkivert'
     and arkivert_at is not null
     and arkivert_at < now() - interval '30 days';
  get diagnostics n_hjul = row_count;

  slettet_periodeplan := n_plan;
  slettet_tl_hjul := n_hjul;
  return next;
end;
$$;

-- Kun service_role (nattjobben) skal kunne kalle denne — den masse-sletter
-- brukerdata og skal ikke kunne utloeses utenfra via rpc/. Supabase gir anon OG
-- authenticated eksplisitt execute som standard, saa de maa navngis i revoke
-- (formen fra 096/098/099).
revoke execute on function public.slett_utlopte_papirkurv() from public, anon, authenticated;
grant  execute on function public.slett_utlopte_papirkurv() to service_role;

-- ----------------------------------------------------------------------------
-- Kvittering: EN rad. Les etter kjoering.
-- ----------------------------------------------------------------------------
select string_agg(x, ' · ') as kvittering_115 from ( values
  ('periodeplan arkivert m/arkivert_at: ' || (
     select count(*) from public.periodeplan where status='arkivert' and arkivert_at is not null)::text),
  ('tl_hjul arkivert m/arkivert_at: ' || (
     select count(*) from public.tl_hjul where status='arkivert' and arkivert_at is not null)::text),
  ('periodeplan utloept (>30d, slettes ved neste nattjobb): ' || (
     select count(*) from public.periodeplan where status='arkivert' and arkivert_at < now() - interval '30 days')::text),
  ('tl_hjul utloept (>30d, slettes ved neste nattjobb): ' || (
     select count(*) from public.tl_hjul where status='arkivert' and arkivert_at < now() - interval '30 days')::text)
) as t(x);

commit;
