-- ============================================================================
-- 127_anonymiser_epostlogg_endringslogg.sql
-- PERSONVERN: TIDSBASERT ANONYMISERING AV `epost_logg` og `endringslogg` (12 MND)
-- ============================================================================
-- KILDE (fasit): personvernerklæringen (claude_PERSONVERNERKLARING-14sep.md, punkt 7 +
--   Del B3) lover at navn/e-post i e-postloggen og koblingen til person i endringsloggen
--   fjernes etter 12 måneder. Ingen kode gjorde det → et løfte uten dekning. Erklæringen
--   kan ikke publiseres før denne er kjørt og kontrollert. Kjartans beslutning 14. sep:
--   bygg det, etter SAMME mønster som migr 096 (anonymiser_brukslogg).
--
-- ── TO FUNKSJONER (avidentifisering, IKKE sletting — statistikken består) ──
--   public.anonymiser_epost_logg()   — 12 mnd. Nuller mottaker_epost, mottaker_navn og
--       kurs_skole_mottaker_id (peker på en person i kursoppsettet). BEHOLDER type, status,
--       resend_id, feilmelding, kurs_skole_id (skole = organisasjon) og opprettet_at — det
--       er logg-/statistikkverdien.
--   public.anonymiser_endringslogg() — 12 mnd. Nuller topp-nivå endret_av OG stripper
--       person-uuid-nøklene ut av jsonb-feltene (se neste avsnitt).
--
-- ── JSONB-FUNNET (undersøkt FØR bygging, jf. varselet) ──
--   Triggeren fase3_logg_endring() (migr 027/029/104) henger KUN på innholds-/taksonomi-
--   tabeller: ressurser, ressurs_innhold, dokumenter, kategorier, utstyr, sesong, trinn,
--   fag, kompetansemaal, egnet_kategori, samlinger, kompetansemaal_trinn. INGEN persontabell.
--   MEN `full_rad`/`endringer` = to_jsonb(raden), og ressurser/dokumenter/samlinger har
--   kolonnene `opprettet_av` og `endret_av` (uuid MED FK til profiles = en person). Disse
--   havner dermed inne i jsonb. Derfor er det ikke nok å nulle topp-nivå endret_av — vi
--   stripper også nøklene `endret_av` og `opprettet_av` ut av full_rad og endringer.
--   `import_kjoring_id` og `ressurs_id` i jsonb er IKKE person (import-batch/innholds-id)
--   og beholdes. Innholdet ellers (tittel, beskrivelse, kategorinavn …) er redaksjonelt
--   innhold, ikke persondata.
--
-- ── FORM (speiler 096/088) ──
--   SECURITY DEFINER, search_path='', returnerer antall berørte rader (get diagnostics).
--   Guarden i WHERE («… is not null / ?| …») gjør at telletallet reflekterer REELLE
--   endringer og at gjentatte kjøringer er trygge (idempotent — en alt-vasket rad matcher
--   ikke igjen). Execute KUN for service_role: Supabase gir anon/authenticated execute som
--   standard, så de MÅ navngis i revoke (12.-sep-lærdom om åpne default privileges; her lager
--   vi ingen tabeller/sekvenser, men funksjons-execute strammes eksplisitt).
--
-- TRIGGES AV: den EKSISTERENDE nattlige cron-ruta (api/brukslogg/cron-anonymiser.js) som TO
--   ekstra rpc-kall ved siden av anonymiser_bruk_hendelse og anonymiser_brukslogg. Ingen ny
--   fil i vercel.json. Kode-endringen er en egen utrulling (api/), ikke del av migrasjonen.
--
-- 104-FELLEN: ingen EKSISTERENDE funksjon røres (kun to NYE opprettes); cron-fila UTVIDES.
-- SPERRER: forutsetning FØR (begge tabeller + de faktiske kolonnene MÅ finnes) · verifisering
--   ETTER (begge funksjoner + secdef + search_path + anon uten execute + service_role med) ·
--   kvittering på én rad før commit.
-- EGENSKAPER: Additiv · idempotent (create or replace + revoke/grant) · ÉN transaksjon.
--
-- TILBAKERULLING (etter commit): begin;
--   drop function if exists public.anonymiser_epost_logg();
--   drop function if exists public.anonymiser_endringslogg(); commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- FORUTSETNING-SPERRE (raise FØR skriving): tabellene og de FAKTISKE kolonnene vi rører
-- MÅ finnes — ellers ville en funksjon truffet 0 rader (eller feil kolonne) i stillhet.
-- ----------------------------------------------------------------------------
do $$
declare
  v_mangler text := '';
begin
  if to_regclass('public.epost_logg') is null then v_mangler := v_mangler || ' epost_logg(019)'; end if;
  if to_regclass('public.endringslogg') is null then v_mangler := v_mangler || ' endringslogg(027)'; end if;
  if v_mangler <> '' then
    raise exception 'STOPP 127: mangler tabell(er):%. Kjør forutsetningsmigrasjonene først.', v_mangler;
  end if;
  -- epost_logg-kolonner
  if not (exists (select 1 from information_schema.columns where table_schema='public' and table_name='epost_logg' and column_name='mottaker_epost')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='epost_logg' and column_name='mottaker_navn')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='epost_logg' and column_name='kurs_skole_mottaker_id')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='epost_logg' and column_name='opprettet_at')) then
    raise exception 'STOPP 127: epost_logg mangler en forventet kolonne (mottaker_epost/mottaker_navn/kurs_skole_mottaker_id/opprettet_at).';
  end if;
  -- endringslogg-kolonner
  if not (exists (select 1 from information_schema.columns where table_schema='public' and table_name='endringslogg' and column_name='endret_av')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='endringslogg' and column_name='full_rad')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='endringslogg' and column_name='endringer')
      and exists (select 1 from information_schema.columns where table_schema='public' and table_name='endringslogg' and column_name='endret_at')) then
    raise exception 'STOPP 127: endringslogg mangler en forventet kolonne (endret_av/full_rad/endringer/endret_at).';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- FUNKSJON 1: anonymiser_epost_logg()  — 12 måneder
-- ----------------------------------------------------------------------------
create or replace function public.anonymiser_epost_logg()
returns table (frakoblet_person bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.epost_logg
     set mottaker_epost = null,
         mottaker_navn = null,
         kurs_skole_mottaker_id = null
   where opprettet_at < now() - interval '12 months'
     and (mottaker_epost is not null or mottaker_navn is not null or kurs_skole_mottaker_id is not null);
  get diagnostics frakoblet_person = row_count;
  return next;
end;
$$;

-- ----------------------------------------------------------------------------
-- FUNKSJON 2: anonymiser_endringslogg()  — 12 måneder (topp-nivå + jsonb)
-- ----------------------------------------------------------------------------
create or replace function public.anonymiser_endringslogg()
returns table (frakoblet_person bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nuller topp-nivå endret_av, OG stripper person-uuid-nøklene (endret_av, opprettet_av) ut
  -- av full_rad/endringer-jsonb. import_kjoring_id / ressurs_id / innholdet ellers er ikke
  -- person og beholdes. Guarden matcher bare rader som fortsatt HAR persondata.
  update public.endringslogg
     set endret_av = null,
         full_rad  = case when full_rad  is not null then full_rad  - 'endret_av' - 'opprettet_av' else null end,
         endringer = case when endringer is not null then endringer - 'endret_av' - 'opprettet_av' else null end
   where endret_at < now() - interval '12 months'
     and (endret_av is not null
          or (full_rad  is not null and full_rad  ?| array['endret_av','opprettet_av'])
          or (endringer is not null and endringer ?| array['endret_av','opprettet_av']));
  get diagnostics frakoblet_person = row_count;
  return next;
end;
$$;

-- ----------------------------------------------------------------------------
-- RETTIGHETER: kun service_role (cron). anon/authenticated navngis eksplisitt i revoke.
-- ----------------------------------------------------------------------------
revoke execute on function public.anonymiser_epost_logg()   from public, anon, authenticated;
revoke execute on function public.anonymiser_endringslogg() from public, anon, authenticated;
grant  execute on function public.anonymiser_epost_logg()   to service_role;
grant  execute on function public.anonymiser_endringslogg() to service_role;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.anonymiser_epost_logg()') is null
     or to_regprocedure('public.anonymiser_endringslogg()') is null then
    raise exception 'STOPP 127 (etter): en av funksjonene ble ikke opprettet.';
  end if;
  if not exists (select 1 from pg_proc where proname='anonymiser_epost_logg' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%'))
     or not exists (select 1 from pg_proc where proname='anonymiser_endringslogg' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')) then
    raise exception 'STOPP 127 (etter): en funksjon mangler SECURITY DEFINER / search_path-herding.';
  end if;
  if has_function_privilege('anon','public.anonymiser_epost_logg()','execute')
     or has_function_privilege('anon','public.anonymiser_endringslogg()','execute') then
    raise exception 'STOPP 127 (etter): anon har execute på en anonymiseringsfunksjon — skal være revokert.';
  end if;
  if not has_function_privilege('service_role','public.anonymiser_epost_logg()','execute')
     or not has_function_privilege('service_role','public.anonymiser_endringslogg()','execute') then
    raise exception 'STOPP 127 (etter): service_role mangler execute.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'anonymiser_epost_logg: ' || (to_regprocedure('public.anonymiser_epost_logg()') is not null),
  'anonymiser_endringslogg: ' || (to_regprocedure('public.anonymiser_endringslogg()') is not null),
  'begge secdef+search_path: ' || (
     exists(select 1 from pg_proc where proname='anonymiser_epost_logg' and prosecdef and exists(select 1 from unnest(proconfig) c where c like 'search_path=%'))
     and exists(select 1 from pg_proc where proname='anonymiser_endringslogg' and prosecdef and exists(select 1 from unnest(proconfig) c where c like 'search_path=%'))),
  'anon execute (skal være NEI): ' || (has_function_privilege('anon','public.anonymiser_epost_logg()','execute') or has_function_privilege('anon','public.anonymiser_endringslogg()','execute')),
  'service_role execute: ' || (has_function_privilege('service_role','public.anonymiser_epost_logg()','execute') and has_function_privilege('service_role','public.anonymiser_endringslogg()','execute'))
) as kvittering;

commit;
