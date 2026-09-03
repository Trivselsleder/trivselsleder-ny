-- 088_brukslogg_treff_og_anonymisering.sql  (ETTERREGISTRERING 3. sep 2026)
-- ============================================================================
-- ETTERREGISTRERING AV EN MIGRASJON SOM ALLEREDE ER KJØRT
-- ============================================================================
-- HVORFOR DENNE FILA FINNES: migrasjon 088 ble kjørt i Supabase 2. sep 2026, men
--   ble aldri lagret som fil. Mappa hoppet fra 087 til 089, så basen inneholdt
--   endringer repoet ikke kjente — og en gjenoppbygging fra 019 ville hoppet over
--   dem. Denne fila lukker hullet: den beskriver NØYAKTIG det som allerede står i
--   basen, hentet ut av den ekte databasen. Ingen nye ideer, ingen forbedringer.
--
-- STATUS: Innholdet er ALLEREDE i basen. Fila er idempotent (if not exists /
--   or replace overalt) og kan kjøres mot dagens base uten å feile og uten å
--   endre data — den beskriver en tilstand som allerede finnes. Trenger du å
--   bygge basen opp igjen fra 019, gjenskaper denne fila 088-tilstanden.
--
-- HVA 088 GJORDE (mot tabellen `bruk_hendelse`, opprettet i migr 028 —
--   IKKE `brukslogg`, som er en annen tabell):
--   (1) la til kolonnen `treff_antall integer` (nullable, ingen default);
--   (2) to CHECK-regler som holder kolonnen ærlig: aldri negativ, og kun satt
--       for søk (`hendelse = 'sok'`);
--   (3) en partiell indeks for raske søk-uttrekk (kun søk-rader);
--   (4) funksjonen `public.anonymiser_bruk_hendelse()` — personvernrutinen som
--       kobler gamle søk fra person/skole (30 dager) og fjerner rå søketekst
--       (24 måneder), og returnerer hvor mange rader hvert steg berørte.
--
-- OPPFØLGING (bygget etterpå, se claude_NULLTREFF-OG-ANONYMISERING-2sep.md):
--   `treff_antall` fylles nå ved søk (src/lib/leker.js), og funksjonen kalles av
--   en nattlig Vercel-cron kl. 03 norsk tid (api/brukslogg/cron-anonymiser.js).
--   Ingenting av det er en databaseendring — det ligger ikke her.
--
-- RETTIGHETER: verifisert mot information_schema.routine_privileges 3. sep 2026.
-- Basen har execute kun for postgres (eier) og service_role. Verken anon eller
-- authenticated har execute. Dette er gjengitt nederst i fila (revoke + grant),
-- så migrasjonen speiler basen fullstendig.
--
-- EGENSKAPER: Additiv · Idempotent · ÉN transaksjon.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) NY KOLONNE: treff_antall (antall treff et søk ga der og da)
-- ----------------------------------------------------------------------------
-- integer, NULLABLE, ingen default.
--   0    = null-treff (søket ga ingenting — grunnlag for «hva mangler innholdet»).
--   NULL = raden er ikke et søk (alle andre hendelser).
alter table public.bruk_hendelse add column if not exists treff_antall integer;

-- ----------------------------------------------------------------------------
-- 2) CHECK-REGLER (idempotent via pg_constraint-oppslag, jf. 090)
-- ----------------------------------------------------------------------------

-- CHECK 1: et treff-tall kan aldri være negativt.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bruk_hendelse_treff_ikke_negativ'
      and conrelid = 'public.bruk_hendelse'::regclass
  ) then
    alter table public.bruk_hendelse
      add constraint bruk_hendelse_treff_ikke_negativ
      check (treff_antall >= 0);
  end if;
end $$;

-- CHECK 2: treff_antall settes KUN på søk. Er hendelsen noe annet, må feltet være tomt.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bruk_hendelse_treff_kun_sok'
      and conrelid = 'public.bruk_hendelse'::regclass
  ) then
    alter table public.bruk_hendelse
      add constraint bruk_hendelse_treff_kun_sok
      check (treff_antall is null or hendelse = 'sok');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) PARTIELL INDEKS: raske uttrekk av søk, nyeste først
-- ----------------------------------------------------------------------------
-- Kun søk-rader indekseres (WHERE hendelse = 'sok') — mindre indeks, raskere
-- «siste søk»-lister og null-treff-analyse.
create index if not exists idx_bruk_sok_tid
  on public.bruk_hendelse
  using btree (tidspunkt desc)
  where (hendelse = 'sok');

-- ----------------------------------------------------------------------------
-- 4) PERSONVERNRUTINE: anonymiser_bruk_hendelse()
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER + SET search_path = '' (husets oppskrift; alt skjemakvalifisert).
-- To lovpålagte frister, hver returnerer hvor mange rader den berørte så kjøringen
-- kan etterprøves:
--   Steg 1 (30 dager): koble søk fra BÅDE person og skole.
--   Steg 2 (24 måneder): fjern rå søketekst og bruker fra alle rader.
-- Guarden «minst ett felt er satt» gjør at tallene teller reelle endringer, ikke
-- rader som allerede var anonymisert.
create or replace function public.anonymiser_bruk_hendelse()
returns table (koblet_fra_person bigint, tekst_fjernet bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Steg 1: søk eldre enn 30 dager kobles fra person og skole.
  update public.bruk_hendelse
     set bruker_id = null,
         skole_id  = null
   where hendelse = 'sok'
     and tidspunkt < now() - interval '30 days'
     and (bruker_id is not null or skole_id is not null);
  get diagnostics koblet_fra_person = row_count;

  -- Steg 2: alt eldre enn 24 måneder mister rå søketekst og bruker.
  update public.bruk_hendelse
     set sok_tekst = null,
         bruker_id = null
   where tidspunkt < now() - interval '24 months'
     and (sok_tekst is not null or bruker_id is not null);
  get diagnostics tekst_fjernet = row_count;

  return next;
end;
$$;

-- Kun service_role (cron) kan kjøre denne. anon og authenticated har bevisst IKKE
-- execute — funksjonen masse-anonymiserer logger.
-- Verifisert mot information_schema.routine_privileges 3. sep 2026.
-- (postgres er eieren og har execute implisitt — ingen egen grant trengs for den.)
revoke all on function public.anonymiser_bruk_hendelse() from public;
grant execute on function public.anonymiser_bruk_hendelse() to service_role;

commit;

-- ============================================================================
-- VERIFISERING (les-only + rullede-tilbake negative tester, jf. 090).
-- Alt under er trygt å kjøre mot dagens base: ingenting lagres.
-- ============================================================================

-- V1) Kolonnen finnes og er nullable uten default. Forvent: integer, YES, (tom).
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'bruk_hendelse'
  and column_name = 'treff_antall';

-- V2) Begge CHECK-ene finnes. Forvent to rader:
--     bruk_hendelse_treff_ikke_negativ  (treff_antall >= 0)
--     bruk_hendelse_treff_kun_sok       (treff_antall IS NULL OR hendelse = 'sok')
select conname, pg_get_constraintdef(oid) as definisjon
from pg_constraint
where conrelid = 'public.bruk_hendelse'::regclass and contype = 'c'
  and conname in ('bruk_hendelse_treff_ikke_negativ', 'bruk_hendelse_treff_kun_sok')
order by conname;

-- V3) Den partielle indeksen finnes. Forvent: indexdef slutter med WHERE (hendelse = 'sok').
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'bruk_hendelse'
  and indexname = 'idx_bruk_sok_tid';

-- V4) Funksjonen finnes med riktig retur. Forvent: én rad,
--     TABLE(koblet_fra_person bigint, tekst_fjernet bigint), security definer.
select p.proname,
       pg_get_function_result(p.oid) as returnerer,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'anonymiser_bruk_hendelse';

-- V5) CHECK-ene BITER. Forvent: "Success" (ingen rader). Begge testradene
--     forventes avvist, så ingenting lagres.
do $$
begin
  begin
    insert into public.bruk_hendelse (hendelse, treff_antall) values ('sok', -1);
    raise exception 'FEIL: bruk_hendelse_treff_ikke_negativ stoppet IKKE et negativt treff-tall';
  exception when check_violation then
    null; -- riktig: CHECK-en stoppet raden
  end;
  begin
    insert into public.bruk_hendelse (hendelse, treff_antall) values ('visning', 5);
    raise exception 'FEIL: bruk_hendelse_treff_kun_sok stoppet IKKE treff-tall paa en ikke-sok-rad';
  exception when check_violation then
    null; -- riktig
  end;
end $$;
