-- 092_kompetansemaal_kobling.sql
-- ============================================================================
-- ETAPPE 5 (FASE 3): KOMPETANSEMÅL-KOBLING — TILSTANDER, FORSLAG, GJELDENDE-VERN
-- ============================================================================
-- ############################################################################
-- !!!  ADVARSEL — DENNE FILEN MÅ IKKE KJØRES ALENE  !!!
-- Del 4 (Move It-navneretting) endrer basen fra «Move it» til «Move It». I DAG
-- MATCHER frontend og base hverandre («Move it», liten i) — egnet-filteret VIRKER
-- (kontrollør: «Move it» -> 6 treff, «Move It» -> 0). Kjøres Del 4 uten at frontend
-- endres samtidig, blir Move it-boksen DØD (0 treff). Del 4 FORUTSETTER at
-- SkoleHjem.jsx:80 og SkoleAktiviteter.jsx:16 endres til «Move It» og deployes i
-- SAMME vending som denne migrasjonen. Del 1-3 er nøytrale; Del 4 er koblet til frontend.
-- ############################################################################
--
-- HVA (fire deler, alle additive/idempotente):
--   1) UTVID `ressurs_kompetansemaal` med koblingstilstander (maskin vs menneske,
--      tillit, bekreftelse, import-kjøring, erstattet-tid).
--   2) NY tabell `ressurs_kompetansemaal_forslag` (usikre/tomme koblinger — de som
--      IKKE skal ligge i selve koblingstabellen, men i en forslagskø Marielle rydder).
--   3) UTVID triggeren `fase3_km_gjeldende` (fra migr 032): den stopper i dag kobling
--      til ERSTATTEDE mål; nå skal den også stoppe kobling til UTGÅTTE (utgatt=true).
--   4) NAVNERETTING (Kjartans beslutning 3. sep): «Move it» -> «Move It» i BÅDE
--      `egnet_kategori` og `kategorier`. Dette er en KONSISTENS-endring mot eksportfila
--      fra gamle siden (som bruker «Move It»), IKKE en feilretting — og den KREVER
--      samtidig frontend-endring. Se ADVARSEL over.
--
-- KILDE (fasit): claude_ETAPPE5-SPESIFIKASJON-v3-2sep.md punkt 2 (koblingstilstander)
--      + claude_FORSJEKK-092-095-3sep.md (eget forarbeid, bekreftet mot base 3. sep).
--
-- FORSJEKK (lest i basen i dag):
--   * `ressurs_kompetansemaal` (025): naken m2m (ressurs_id, kompetansemaal_id, PK,
--     begge FK cascade). INGEN tilstands-kolonner finnes (satt_av m.fl. = 0 treff, 019).
--   * Trigger `fase3_km_gjeldende` (032): BEFORE INSERT, sjekker KUN `erstattet_av`.
--   * `kompetansemaal.utgatt boolean not null default false` finnes (090 linje 42);
--     `erstattet_av` finnes (023). `import_kjoring` finnes (091).
--   * Move It bekreftet i Supabase 3. sep: `egnet_kategori` id 5 = 'Move it',
--     `kategorier` id 1 = 'Move it'. Frontend sender OGSÅ «Move it» (SkoleHjem.jsx:80,
--     SkoleAktiviteter.jsx:16, dagens bygg dist/: 8x «Move it», 0x «Move It») — nettside
--     og base MATCHER i dag. Rettingen til «Move It» er konsistens mot eksport, ikke feil.
--
-- EGENSKAPER: Additiv · Idempotent (if not exists / do-block-CHECK / drop+create
--      policy+trigger / id- og navn-vilkår på UPDATE) · ÉN transaksjon.
-- MØNSTER: følger 090/091 som formmal (RLS/GRANT som huset, do-block-CHECK som 090).
-- NB: kontrollrunde (uavhengig verifikasjon) skrives IKKE her — den er kontrollørens
--      (regel 4).
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) KOBLINGSTILSTANDER på ressurs_kompetansemaal (ALTER, additivt)
-- ----------------------------------------------------------------------------
-- satt_av: 'maskin' (importen fant den) eller 'menneske' (default, håndsatt/godkjent).
alter table ressurs_kompetansemaal add column if not exists satt_av text not null default 'menneske';
-- tillit: maskinens likhetsskår; tom for menneskesatte (CHECK under krever den for maskin).
alter table ressurs_kompetansemaal add column if not exists tillit numeric(4,3);
alter table ressurs_kompetansemaal add column if not exists satt_at timestamptz not null default now();
-- bekreftet_*: en maskinkobling kan «forfremmes» uten å miste at maskinen fant den.
-- Bekreftelse endrer IKKE satt_av; bekreftet_at is not null = «et menneske har sett den».
alter table ressurs_kompetansemaal add column if not exists bekreftet_av uuid references profiles(id);
alter table ressurs_kompetansemaal add column if not exists bekreftet_at timestamptz;
-- import_kjoring_id: så maskinkoblinger fra én kjøring kan rulles tilbake som ett grep.
-- ON DELETE RESTRICT (som 091, F3): en kjøringsrad kan ikke slettes mens koblinger peker
-- på den; angre er eksplisitt (delete where import_kjoring_id = X), aldri en bivirkning.
alter table ressurs_kompetansemaal add column if not exists import_kjoring_id uuid references import_kjoring(id) on delete restrict;
-- erstatter_kilde_tid: Drupal-tid for det UTGÅTTE målet maskinen erstattet (etterprøvbart).
alter table ressurs_kompetansemaal add column if not exists erstatter_kilde_tid integer;

-- CHECK 1: satt_av er ett av de to lovlige. (do-block så den er idempotent — mønster fra 090.)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rk_satt_av_gyldig'
      and conrelid = 'public.ressurs_kompetansemaal'::regclass
  ) then
    alter table ressurs_kompetansemaal
      add constraint rk_satt_av_gyldig check (satt_av in ('maskin','menneske'));
  end if;
end $$;

-- CHECK 2: en maskinsatt kobling MÅ ha tillit. (satt_av='maskin' ⇒ tillit is not null)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rk_maskin_har_tillit'
      and conrelid = 'public.ressurs_kompetansemaal'::regclass
  ) then
    alter table ressurs_kompetansemaal
      add constraint rk_maskin_har_tillit check (satt_av <> 'maskin' or tillit is not null);
  end if;
end $$;

-- Indeks for angre (delete ... where import_kjoring_id = X), jf. 091-mønsteret.
create index if not exists idx_rk_import_kjoring on ressurs_kompetansemaal (import_kjoring_id);

-- ----------------------------------------------------------------------------
-- 2) NY TABELL: ressurs_kompetansemaal_forslag (usikre/tomme — egen kø)
-- ----------------------------------------------------------------------------
-- «Usikker og tom» betyr per definisjon at det IKKE finnes en kobling. Legges usikre
-- forslag i ressurs_kompetansemaal, forurenser de fagutledningen (punkt 3) og
-- visningen med mål ingen har godkjent. Derfor egen tabell.
create table if not exists ressurs_kompetansemaal_forslag (
  ressurs_id          uuid    not null references ressurser(id)      on delete cascade,
  kompetansemaal_id   integer not null references kompetansemaal(id) on delete cascade,
  skaar               numeric(4,3),
  erstatter_kilde_tid integer,
  import_kjoring_id   uuid    references import_kjoring(id) on delete restrict,
  status              text    not null default 'ny' check (status in ('ny','godkjent','avvist')),
  behandlet_av        uuid    references profiles(id),       -- FK lagt til (kontrollør: spec-glipp; symmetrisk med bekreftet_av)
  behandlet_at        timestamptz,
  primary key (ressurs_id, kompetansemaal_id)
);
create index if not exists idx_rkf_import_kjoring on ressurs_kompetansemaal_forslag (import_kjoring_id);

-- Rettigheter + RLS. Forslag er UBEHANDLEDE interne rader — skal ikke vises til lærere
-- (selv for publiserte ressurser), derfor intern-lesing (ikke fase3_ressurs_synlig).
grant select, insert, update, delete on ressurs_kompetansemaal_forslag to authenticated, service_role;

alter table ressurs_kompetansemaal_forslag enable row level security;

drop policy if exists p_les on ressurs_kompetansemaal_forslag;
create policy p_les on ressurs_kompetansemaal_forslag
  for select to authenticated
  using (fase3_intern());

drop policy if exists p_skriv on ressurs_kompetansemaal_forslag;
create policy p_skriv on ressurs_kompetansemaal_forslag
  for all to authenticated
  using (fase3_intern())
  with check (fase3_intern());

-- ----------------------------------------------------------------------------
-- 3) TRIGGER-UTVIDELSE: stopp også kobling til UTGÅTTE mål (utgatt = true)
-- ----------------------------------------------------------------------------
-- Beholder den eksisterende erstattet_av-sjekken (032) og legger utgatt ved siden av.
create or replace function fase3_km_gjeldende() returns trigger language plpgsql as $$
declare
  v_erstattet integer;
  v_utgatt    boolean;
begin
  select erstattet_av, utgatt
    into v_erstattet, v_utgatt
  from kompetansemaal
  where id = new.kompetansemaal_id;

  if v_erstattet is not null then
    raise exception 'Kompetansemaal % er erstattet - koble til gjeldende term', new.kompetansemaal_id;
  end if;

  if v_utgatt then
    raise exception 'Kompetansemaal % er utgaatt (utgatt=true) - koble til gjeldende term', new.kompetansemaal_id;
  end if;

  return new;
end $$;

-- Re-fest triggeren (idempotent; identisk med 032s BEFORE INSERT-feste).
drop trigger if exists trg_km_gjeldende on ressurs_kompetansemaal;
create trigger trg_km_gjeldende
  before insert on ressurs_kompetansemaal
  for each row execute function fase3_km_gjeldende();

-- ----------------------------------------------------------------------------
-- 4) NAVNERETTING «Move it» -> «Move It» (Kjartans beslutning 3. sep)
--    !!! MÅ IKKE KJØRES ALENE — se ADVARSEL i toppteksten. !!!
-- ----------------------------------------------------------------------------
-- KONSISTENS-endring, IKKE en feilretting. I dag MATCHER nettside og base hverandre:
-- frontend sender «Move it» (liten i) — SkoleHjem.jsx:80, SkoleAktiviteter.jsx:16, og
-- dagens bygg (dist/: 8x «Move it», 0x «Move It») — og basen har «Move it». Filteret
-- VIRKER. Grunnen til å rette til «Move It» er at eksportfila fra gamle siden bruker
-- «Move It» (tid 578), så import/re-import matcher på navn. Derfor MÅ SkoleHjem.jsx:80 og
-- SkoleAktiviteter.jsx:16 endres til «Move It» og deployes i SAMME vending — ellers gir
-- Move it-boksen 0 treff (base «Move It» vs frontend «Move it»).
-- Idempotent: id- og navn-vilkåret gjør at en ny kjøring ikke treffer noe.
update egnet_kategori set navn = 'Move It' where id = 5 and navn = 'Move it';
update kategorier      set navn = 'Move It' where id = 1 and navn = 'Move it';

commit;

-- ----------------------------------------------------------------------------
-- KVITTERING (F2): vis navnet i BEGGE tabeller ETTER rettingen. Gikk rettingen stille
-- forbi (id 5/1 het noe annet enn ventet), ser du det her — forvent begge = 'Move It'.
-- ----------------------------------------------------------------------------
select 'egnet_kategori' as tabell, id, navn from egnet_kategori where id = 5
union all
select 'kategorier'     as tabell, id, navn from kategorier      where id = 1;
