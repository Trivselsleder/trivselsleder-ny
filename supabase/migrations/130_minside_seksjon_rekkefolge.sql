-- ============================================================================
-- 130_minside_seksjon_rekkefolge.sql
-- MIN SIDE (A): global rekkefølge + synlighet for radene 3–8 på skolens arbeidsbenk
-- ============================================================================
-- KILDE: byggeoppdrag «Min side» 16. sep, punkt A + design 4e (omrokering).
--   Rad 1 (hilsen/mine valg) og rad 2 (venter på svar) ligger FAST i frontend.
--   Radene 3–8 kan TL-ansatte (get_min_rolle() in ('ansatt','superadmin')) flytte opp/ned
--   og skjule/vise i ett panel. Innstillingen er GLOBAL (samme for alle skoler) — skoler
--   LESER den, endrer den ikke.
--
-- Én rad per «seksjon» (en hel rad i designet). rekkefolge styrer sortering (3–8),
-- synlig styrer vis/skjul. Frontend leser tabellen og ordner/skjuler radene deretter;
-- ukjente/manglende nøkler faller tilbake til seed-rekkefølgen.
--
-- RETTIGHETER (CLAUDE.md): ny tabell → eksplisitt grant til authenticated+service_role,
--   revoke fra anon. RLS PÅ. Alle innloggede LESER; kun ansatt/superadmin SKRIVER.
-- SPERRER: idempotens FØR (tabell finnes ⇒ stopp) · verifisering ETTER · kvittering.
-- EGENSKAPER: additiv, én transaksjon.
-- TILBAKERULLING (etter commit): begin;
--   drop table if exists public.minside_seksjon;
--   drop function if exists public.minside_seksjon_sett_oppdatert_at(); commit;
-- ============================================================================

begin;

do $$
begin
  if to_regclass('public.minside_seksjon') is not null then
    raise exception 'STOPP 130 (allerede kjørt): public.minside_seksjon finnes allerede.';
  end if;
end $$;

create table public.minside_seksjon (
  seksjon      text primary key,
  tittel       text not null,
  rekkefolge   integer not null,
  synlig       boolean not null default true,
  oppdatert_at timestamptz not null default now(),
  -- K4: to seksjoner kan ikke få samme rekkefølgetall. DEFERRABLE INITIALLY DEFERRED så en
  --     omrokering (bytt to seksjoners rekkefolge) går i ÉN transaksjon uten at det første
  --     update-et bryter unikheten; sjekkes ved commit. Frontend gjør byttet i én transaksjon.
  constraint minside_seksjon_rekkefolge_uniq unique (rekkefolge) deferrable initially deferred
);

-- Seed: radene 3–8 i designets rekkefølge. tittel er kun en intern etikett for
-- redigeringspanelet; den brukerrettede teksten kommer fra i18n i frontend.
insert into public.minside_seksjon (seksjon, tittel, rekkefolge) values
  ('aktuelt',       'Aktuelt',                       3),
  ('nominasjon',    'Nominasjon og TL-praten · Lekekurs', 4),
  ('tldans',        'TL-dans · Laginndeling',        5),
  ('brukt_naa',     'Dette bruker skolene nå',       6),
  ('klassetrivsel', 'Klassetrivsel · Tipslister',    7),
  ('mest_kjopt',    'Mest kjøpte leker · Webinarer',  8);

-- ── K4: oppdatert_at settes automatisk ved endring (trigger, ikke klienten) ──
-- Trigger-funksjon: rører kun NEW, leser ingen tabeller, egen search_path='' (herding).
-- Kalles kun av trigger-mekanismen (Postgres sjekker ikke EXECUTE for triggere), men vi
-- fjerner den implisitte PUBLIC-execute så den ikke kan kalles direkte via rpc/.
create or replace function public.minside_seksjon_sett_oppdatert_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.oppdatert_at := now();
  return new;
end;
$$;
revoke execute on function public.minside_seksjon_sett_oppdatert_at() from public, anon, authenticated;

create trigger trg_minside_seksjon_oppdatert_at
  before update on public.minside_seksjon
  for each row execute function public.minside_seksjon_sett_oppdatert_at();

-- ── RLS + policyer ──
alter table public.minside_seksjon enable row level security;

-- Alle innloggede leser (skolens arbeidsbenk krever innlogging).
create policy p_les on public.minside_seksjon
  for select to authenticated using (true);

-- Kun TL-ansatte endrer rekkefølge/synlighet.
create policy p_skriv on public.minside_seksjon
  for all to authenticated
  using (coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'))
  with check (coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'));

-- ── Rettigheter (minste privilegium; stol aldri på defaults) ──
grant select, insert, update, delete on public.minside_seksjon to authenticated, service_role;
revoke all on public.minside_seksjon from anon;

-- ── Verifisering ETTER ──
do $$
begin
  if to_regclass('public.minside_seksjon') is null then
    raise exception 'STOPP 130 (etter): tabellen ble ikke opprettet.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.minside_seksjon'::regclass) then
    raise exception 'STOPP 130 (etter): RLS er ikke slått på.';
  end if;
  if (select count(*) from public.minside_seksjon) <> 6 then
    raise exception 'STOPP 130 (etter): forventet 6 seed-rader, fant %', (select count(*) from public.minside_seksjon);
  end if;
  if has_table_privilege('anon', 'public.minside_seksjon', 'select') then
    raise exception 'STOPP 130 (etter): anon har select — skal være revokert.';
  end if;
  if not has_table_privilege('authenticated', 'public.minside_seksjon', 'select') then
    raise exception 'STOPP 130 (etter): authenticated mangler select.';
  end if;
  -- K4: to like rekkefølgetall skal avvises. Constraint er DEFERRABLE INITIALLY DEFERRED, så
  --     bruddet ville ellers først slått til ved COMMIT og veltet hele migrasjonen. Vi setter
  --     den IMMEDIATE lokalt for å fange det her; savepoint-tilbakerullingen i exception-blokken
  --     tilbakestiller både update-et OG constraint-modusen til DEFERRED.
  begin
    set constraints minside_seksjon_rekkefolge_uniq immediate;
    update public.minside_seksjon set rekkefolge = 3 where seksjon = 'nominasjon';  -- kolliderer med 'aktuelt' (3)
    raise exception 'STOPP 130 (etter): duplikat rekkefølge ble tillatt — unik-constraint biter ikke.';
  exception when unique_violation then null;   -- forventet
  end;
  -- K4: oppdatert_at-trigger finnes (BEFORE UPDATE). now() er konstant i én transaksjon, så
  --     et tidsstempel-bevis er umulig her — vi sjekker at triggeren faktisk er koblet på.
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.minside_seksjon'::regclass
      and tgname = 'trg_minside_seksjon_oppdatert_at'
      and not tgisinternal
  ) then
    raise exception 'STOPP 130 (etter): oppdatert_at-trigger mangler.';
  end if;
end $$;

-- ── Kvittering ──
select concat_ws(' · ',
  'minside_seksjon: ' || (to_regclass('public.minside_seksjon') is not null),
  'rader: ' || (select count(*) from public.minside_seksjon),
  'RLS: ' || (select relrowsecurity from pg_class where oid = 'public.minside_seksjon'::regclass),
  'anon select (skal være NEI): ' || has_table_privilege('anon', 'public.minside_seksjon', 'select'),
  'authenticated select: ' || has_table_privilege('authenticated', 'public.minside_seksjon', 'select')
) as kvittering;

commit;
