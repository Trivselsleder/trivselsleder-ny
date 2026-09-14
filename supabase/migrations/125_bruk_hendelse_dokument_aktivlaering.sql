-- ============================================================================
-- 125_bruk_hendelse_dokument_aktivlaering.sql — utvid bruksloggen til dokumenter
--   og aktiv læring-opplegg
-- ============================================================================
-- KILDE (fasit): Kjartans beslutning 14. sep 2026 — måle hvilke DOKUMENTER og hvilke
--   AKTIV LÆRING-opplegg som faktisk brukes, ikke bare leker.
--
-- KARTLAGT FØR (målt i klone av prod-skjemaet 001–124):
--   * bruk_hendelse (028+088): id, bruker_id→profiles, skole_id→skoler, ressurs_id→ressurser
--     (on delete cascade), hendelse (CHECK 5 verdier), sok_tekst, operator_land, tidspunkt,
--     treff_antall. CHECK heter bruk_hendelse_hendelse_check.
--   * AKTIV LÆRING-opplegg ER ressurser (ressurstype='aktiv_laering', migr 024) → de trenger
--     INGEN ny kolonne; de bruker ressurs_id. Opplegg åpnes via lek-siden (SkoleLek), som i dag
--     logger 'visning'. Frontend forgrener nå på ressurstype: aktiv_laering → 'aktiv_laering_apnet'.
--   * DOKUMENTER ligger i tabellen `dokumenter`, IKKE i `ressurser`. ressurs_id kan derfor ikke
--     peke på et dokument. Uten en peker vet vi bare AT et dokument ble åpnet, ikke HVILKET —
--     verdiløst. LØSNING: ny nullbar kolonne dokument_id uuid → dokumenter(id) on delete cascade.
--
-- HVA 125 GJØR:
--   1) Utvider CHECK-en med to nye typer i samme stil som de eksisterende (verb/handling):
--        'dokument_apnet'        (et dokument ble åpnet)
--        'aktiv_laering_apnet'   (et aktiv læring-opplegg ble åpnet)
--   2) Legger til dokument_id (nullbar, FK→dokumenter, on delete cascade) — pekeren til HVILKET.
--   3) Integritet: CHECK bruk_hendelse_dokument_peker — dokument_apnet HAR alltid dokument_id,
--      og dokument_id settes ALDRI på andre hendelser (biimplikasjon). Sikrer at signalet er nyttig.
--   4) RLS/policy: p_ins (121) er hendelse-AGNOSTISK (with_check gjelder skole_id uansett type),
--      så skole-vernet omfatter de nye typene automatisk. Migrasjonen RØRER IKKE policyen, men
--      verifiserer at RLS er på og at p_ins fortsatt har bruker_skole-vernet (sperre etter).
--   5) RETTIGHETER (lærdom 12. sep — prods default privileges gir anon et ÅPENT sett på
--      framtidige objekter/kolonner): anon har i dag Dxtm-residuum (REFERENCES/TRIGGER/TRUNCATE)
--      på bruk_hendelse. Vi REVOKER alt fra anon eksplisitt — den nye kolonnen skal ikke arve
--      noen anon-tilgang, og anon skal ikke kunne TRUNCATE tabellen.
--
-- PERSONVERN / ANONYMISERING: bruk_hendelse anonymiseres av public.anonymiser_bruk_hendelse
--   (migr 088), steg 2: alle rader eldre enn 24 mnd får bruker_id = null — UTEN hendelse-filter,
--   så de to nye typene er allerede omfattet (bruker_id er det eneste personfeltet; dokument_id/
--   ressurs_id er innhold, skole_id er organisasjonsnivå). Ingen fritekst logges for de nye typene.
--   (MERK: anonymiser_brukslogg (096, 12 mnd) gjelder en ANNEN tabell, `brukslogg` — ikke denne.)
--   Ingen anonymiserings-endring er derfor nødvendig; verifisert ved lesing av 088-funksjonen.
--
-- SPERRER: idempotens FØR (dokument_id finnes ⇒ stopp) · verifisering ETTER (kolonne + begge
--   nye CHECK-verdier + peker-CHECK + RLS + p_ins-skolevern + anon uten select/insert/truncate) ·
--   kvittering på én rad før commit. EGENSKAPER: ÉN transaksjon · additiv · idempotent stopp.
--
-- TILBAKERULLING (etter commit): begin;
--   alter table public.bruk_hendelse drop constraint bruk_hendelse_dokument_peker;
--   alter table public.bruk_hendelse drop column dokument_id;
--   alter table public.bruk_hendelse drop constraint bruk_hendelse_hendelse_check;
--   alter table public.bruk_hendelse add constraint bruk_hendelse_hendelse_check
--     check (hendelse in ('visning','video_spilt','pdf_nedlastet','sok','favoritt')); commit;
--   (Forutsetter at ingen rad har en av de nye typene / dokument_id satt.)
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- IDEMPOTENS-SPERRE (raise FØR skriving)
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='bruk_hendelse' and column_name='dokument_id') then
    raise exception 'STOPP 125 (allerede kjørt): bruk_hendelse.dokument_id finnes allerede.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) Utvid hendelse-CHECK med de to nye typene
-- ----------------------------------------------------------------------------
alter table public.bruk_hendelse drop constraint bruk_hendelse_hendelse_check;
alter table public.bruk_hendelse add constraint bruk_hendelse_hendelse_check
  check (hendelse in ('visning','video_spilt','pdf_nedlastet','sok','favoritt',
                      'dokument_apnet','aktiv_laering_apnet'));

-- ----------------------------------------------------------------------------
-- 2) dokument_id: pekeren til HVILKET dokument (nullbar; FK; cascade som ressurs_id)
-- ----------------------------------------------------------------------------
alter table public.bruk_hendelse
  add column dokument_id uuid references dokumenter(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 3) Integritet: dokument_apnet ⟺ dokument_id er satt
-- ----------------------------------------------------------------------------
alter table public.bruk_hendelse add constraint bruk_hendelse_dokument_peker
  check ((hendelse = 'dokument_apnet') = (dokument_id is not null));

-- ----------------------------------------------------------------------------
-- 5) RETTIGHETER: fjern anons Dxtm-residuum (lærdom 12. sep). Ingen ny anon-tilgang.
--    authenticated/service_role beholder sine (satt av 093B/030); RLS + p_ins (121) styrer skriv.
-- ----------------------------------------------------------------------------
revoke all on public.bruk_hendelse from anon;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
declare v_check text;
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='bruk_hendelse' and column_name='dokument_id') then
    raise exception 'STOPP 125 (etter): dokument_id ble ikke opprettet.';
  end if;

  select pg_get_constraintdef(oid) into v_check from pg_constraint
   where conrelid='public.bruk_hendelse'::regclass and conname='bruk_hendelse_hendelse_check';
  if v_check not like '%dokument_apnet%' or v_check not like '%aktiv_laering_apnet%' then
    raise exception 'STOPP 125 (etter): hendelse-CHECK mangler de nye typene: %', v_check;
  end if;

  if not exists (select 1 from pg_constraint
                 where conrelid='public.bruk_hendelse'::regclass and conname='bruk_hendelse_dokument_peker') then
    raise exception 'STOPP 125 (etter): peker-CHECK (dokument_apnet ⟺ dokument_id) mangler.';
  end if;

  if not exists (select 1 from pg_class where oid='public.bruk_hendelse'::regclass and relrowsecurity) then
    raise exception 'STOPP 125 (etter): RLS er ikke aktivert på bruk_hendelse.';
  end if;

  if not exists (select 1 from pg_policies
                 where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins'
                   and cmd='INSERT' and with_check like '%bruker_skole%') then
    raise exception 'STOPP 125 (etter): p_ins-skolevernet fra 121 mangler — nye typer ville ikke vært vernet.';
  end if;

  if has_table_privilege('anon','public.bruk_hendelse','SELECT')
     or has_table_privilege('anon','public.bruk_hendelse','INSERT')
     or has_table_privilege('anon','public.bruk_hendelse','TRUNCATE') then
    raise exception 'STOPP 125 (etter): anon har fortsatt select/insert/truncate på bruk_hendelse.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit)
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'dokument_id-kolonne: ' || exists(select 1 from information_schema.columns
     where table_name='bruk_hendelse' and column_name='dokument_id'),
  'nye CHECK-verdier: ' || (
     (select pg_get_constraintdef(oid) from pg_constraint
       where conrelid='public.bruk_hendelse'::regclass and conname='bruk_hendelse_hendelse_check')
     like '%dokument_apnet%aktiv_laering_apnet%'),
  'peker-CHECK: ' || exists(select 1 from pg_constraint
     where conrelid='public.bruk_hendelse'::regclass and conname='bruk_hendelse_dokument_peker'),
  'p_ins skole-vern (121): ' || exists(select 1 from pg_policies
     where schemaname='public' and tablename='bruk_hendelse' and policyname='p_ins' and with_check like '%bruker_skole%'),
  'anon select: ' || has_table_privilege('anon','public.bruk_hendelse','SELECT'),
  'anon truncate: ' || has_table_privilege('anon','public.bruk_hendelse','TRUNCATE')
) as kvittering;

commit;
