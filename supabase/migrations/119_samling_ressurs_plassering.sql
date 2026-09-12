-- ============================================================================
-- 119_samling_ressurs_plassering.sql — grupper (seksjoner) i samlinger
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning 11. sep 2026 (kveld). En samling skal kunne
--   vises i GRUPPER (seksjoner) med hver sin overskrift. En lek som i den gamle
--   Drupal-samlingen sto under flere kategorier skal vises under ALLE de kategoriene
--   (13 leker i «Tipsliste til SFO/AKS»). Derav: en lek kan ha FLERE plasseringer i
--   samme samling — derfor er «seksjon» en del av primærnøkkelen.
--
-- HVA JEG BYGGER PÅ (kilde-migrasjon i parentes):
--   samling_ressurs(samling_id, ressurs_id, rekkefolge)  PK (samling_id, ressurs_id) (029).
--   samling_ressurs.seksjon (text, ubrukt, NULL overalt) (094) — se KOMMENTAR under.
--   samlinger(id, synlig) (029) + public.fase3_intern() (030) — for lese-/skrivevakt.
--
-- HVA (én ny tabell):
--   public.samling_ressurs_plassering — én rad per (samling, lek, seksjon). Fyller
--   IKKE data her (besluttet): plasseringene kommer i en SENERE migrasjon fra et
--   uttrekk som er under arbeid. Denne migrasjonen lager kun strukturen.
--
-- KOMMENTAR OM samling_ressurs.seksjon (094): den ENKELT-verdi-kolonnen kan ikke
--   uttrykke «samme lek i flere seksjoner» og er derfor ERSTATTET av denne tabellen.
--   Den røres ikke (ligger igjen som NULL) — fjerning tas evt. i en egen ryddejobb.
--
-- AUDIT: BEVISST ingen audit-trigger nå. Audit-triggere på samlingstabellene tas
--   SAMLET før D6 (Kjartans beslutning 11. sep). Legges til der, ikke her.
--
-- RLS (speiler samling_ressurs, målt i 030/032):
--   LES  — authenticated ser en plassering hvis den tilhørende samlingen er synlig
--          ELLER brukeren er intern (fase3_intern): exists-sjekk mot samlinger, akkurat
--          som p_les på samling_ressurs (032, funn 8).
--   SKRIV— kun intern (fase3_intern) — som barn-tabellene i 030.
--   GRANT/REVOKE etter husregelen (093B/099-formen): authenticated + service_role får
--          select/insert/update/delete; anon revokes. Ingen sekvens (PK er sammensatt av
--          eksisterende kolonner — ingen identity/serial), så ingen sekvens-grant.
--
-- SPERRER: idempotens FØR (tabellen finnes alt ⇒ stopp rent, ingenting committes) ·
--   verifisering ETTER (tabell + RLS på + begge policyer + anon uten tilgang) ·
--   kvittering på én rad før commit.
--
-- EGENSKAPER: Additiv (kun en ny tabell) · idempotent stopp ved re-kjøring · ÉN transaksjon.
--
-- TILBAKERULLING (etter commit, hvis nødvendig):
--   begin; drop table if exists public.samling_ressurs_plassering; commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- IDEMPOTENS-SPERRE (raise FØR enhver skriving): en re-kjøring stopper rent.
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.samling_ressurs_plassering') is not null then
    raise exception 'STOPP 119 (allerede kjørt): tabellen public.samling_ressurs_plassering finnes allerede.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- TABELL: én rad per (samling, lek, seksjon). En lek kan stå i FLERE seksjoner
-- (derfor seksjon i PK). FK (samling_id, ressurs_id) → samling_ressurs med CASCADE:
-- fjernes en lek fra samlingen, forsvinner alle dens plasseringer automatisk.
-- ----------------------------------------------------------------------------
create table public.samling_ressurs_plassering (
  samling_id          uuid     not null,
  ressurs_id          uuid     not null,
  seksjon             text     not null,
  seksjon_rekkefolge  smallint not null default 0,
  rekkefolge          smallint not null default 0,
  primary key (samling_id, ressurs_id, seksjon),
  foreign key (samling_id, ressurs_id)
    references public.samling_ressurs (samling_id, ressurs_id) on delete cascade,
  constraint srp_seksjon_ikke_tom check (btrim(seksjon) <> '')
);

comment on table  public.samling_ressurs_plassering is
  'Grupper (seksjoner) i en samling (119). Én rad per (samling, lek, seksjon); samme lek kan stå i flere seksjoner. Data fylles i senere migrasjon.';
comment on column public.samling_ressurs.seksjon is
  'ERSTATTET av samling_ressurs_plassering (119): en lek kan stå i flere seksjoner, som en enkelt-verdi-kolonne ikke kan uttrykke. Røres ikke (NULL, fra 094).';

-- Oppslag per samling i visningsrekkefølge (seksjon, deretter lek).
create index idx_srp_samling
  on public.samling_ressurs_plassering (samling_id, seksjon_rekkefolge, rekkefolge);

-- ----------------------------------------------------------------------------
-- RLS + rettigheter (husregelen). Ingen sekvens å granta (sammensatt PK).
-- ----------------------------------------------------------------------------
alter table public.samling_ressurs_plassering enable row level security;

grant select, insert, update, delete on public.samling_ressurs_plassering
  to authenticated, service_role;
revoke all on public.samling_ressurs_plassering from anon;

-- LES: samme gate som samling_ressurs (032, funn 8) — synlig samling eller intern.
create policy p_les on public.samling_ressurs_plassering
  for select to authenticated
  using (exists (
    select 1 from public.samlinger s
    where s.id = samling_ressurs_plassering.samling_id
      and (s.synlig or public.fase3_intern())
  ));

-- SKRIV: kun intern (som barn-tabellene i 030).
create policy p_skriv on public.samling_ressurs_plassering
  for all to authenticated
  using (public.fase3_intern())
  with check (public.fase3_intern());

-- ----------------------------------------------------------------------------
-- SPERRER ETTER (verifiser at strukturen ble som forventet).
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  if to_regclass('public.samling_ressurs_plassering') is null then
    raise exception 'STOPP 119 (etter): tabellen ble ikke opprettet.';
  end if;

  -- RLS må være på.
  if not exists (
    select 1 from pg_class where oid = 'public.samling_ressurs_plassering'::regclass and relrowsecurity
  ) then
    raise exception 'STOPP 119 (etter): RLS er ikke aktivert på samling_ressurs_plassering.';
  end if;

  -- Begge policyene finnes.
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = 'samling_ressurs_plassering'
     and policyname in ('p_les', 'p_skriv');
  if n <> 2 then
    raise exception 'STOPP 119 (etter): forventet 2 policyer (p_les, p_skriv), fant %.', n;
  end if;

  -- anon skal ikke ha noen tabellrettigheter (heller ikke truncate).
  if has_table_privilege('anon', 'public.samling_ressurs_plassering', 'SELECT')
     or has_table_privilege('anon', 'public.samling_ressurs_plassering', 'INSERT')
     or has_table_privilege('anon', 'public.samling_ressurs_plassering', 'UPDATE')
     or has_table_privilege('anon', 'public.samling_ressurs_plassering', 'DELETE')
     or has_table_privilege('anon', 'public.samling_ressurs_plassering', 'TRUNCATE') then
    raise exception 'STOPP 119 (etter): anon har tabellrettigheter — skal være revokert.';
  end if;

  -- authenticated skal ha de fire DML-rettighetene.
  if not (has_table_privilege('authenticated', 'public.samling_ressurs_plassering', 'SELECT')
      and has_table_privilege('authenticated', 'public.samling_ressurs_plassering', 'INSERT')
      and has_table_privilege('authenticated', 'public.samling_ressurs_plassering', 'UPDATE')
      and has_table_privilege('authenticated', 'public.samling_ressurs_plassering', 'DELETE')) then
    raise exception 'STOPP 119 (etter): authenticated mangler en eller flere DML-rettigheter.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'tabell opprettet: '  || (to_regclass('public.samling_ressurs_plassering') is not null),
  'rader (skal være 0): ' || (select count(*) from public.samling_ressurs_plassering),
  'policyer: '          || (select count(*) from pg_policies
                            where schemaname='public' and tablename='samling_ressurs_plassering'),
  'indeks: '            || (select count(*) from pg_indexes
                            where schemaname='public' and indexname='idx_srp_samling')
) as kvittering;

commit;
