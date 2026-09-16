-- ============================================================================
-- 129_slett_skole_ved_uttreden.sql
-- SLETTERUTINE NÅR EN SKOLE TRER UT AV TRIVSELSPROGRAMMET (DBA 11.2 / 11.6)
-- ============================================================================
-- KILDE (fasit): Databehandleravtalen v5 (claude_DBA-v5-16sep.md) 11.2 / 11.6, og
--   Kjartans beslutning 16. sep (innsnevret omfang) + Fables kontroll
--   (claude_KONTROLL-fable-129-16sep.md: F1, F3, F4, K4, K5 rettet).
--
-- ── OMFANG (Kjartans beslutning 16. sep) ────────────────────────────────────
--   Rutinen sletter KUN det Trivselsleder behandler PÅ VEGNE AV skoleeier (DBA 11.2):
--     1) Trivselsundersøkelsen: tu_runder (+tu_koder +tu_svar) + tu_arkiv for skolen.
--     2) Periodeplaner og TL-hjul: periodeplan (+periodeplan_rad), tl_hjul (+tl_hjul_lek),
--        tl_hjul_kategori (denne skolens skole_id), tl_deltaker (navneliste = elevnavn).
--     3) Lærernes innloggingskontoer: bruker_skole-koblingene for skolen, og
--        profiles + auth.users for personer som blir FORELDRELØSE (se under).
--   ALT ANNET BEHOLDES OG RØRES IKKE — verken sletting, frakobling eller anonymisering:
--     * skoler-raden slettes IKKE. status settes til 'Tidligere' (lovlig verdi i
--       skoler_status_check, verifisert i prod-tro mal 16. sep). Kontaktfelt
--       (rektor_*/htla_*/hktl_*) beholdes.
--     * kurs_skole (+mottaker +evalueringer), skoleus_mottaker/-svar, webinar_*,
--       nyhetsbrev_mottakere, epost_logg, bruk_hendelse, brukslogg, vurderinger,
--       popularitet_snapshot, paameldinger, kulturkort_bestillinger: RØRES IKKE.
--     Begrunnelse (Kjartan, DBA 2.4 / Vedlegg 1 pkt 1.4): kontaktdata og
--     kundehistorikk er Trivselsleders EGNE data (Databehandler er selv
--     behandlingsansvarlig). Skoler som har sagt opp ønsker ofte å bli kontaktet
--     igjen. epost_logg ryddes allerede etter 12 mnd av migrasjon 127.
--     HubSpot røres ALDRI (eget CRM, ingen HubSpot-kall her).
--
-- ── FORELDRELØS BRUKER (F1 + K10-rettet) ────────────────────────────────────
--   En person regnes som foreldreløs (profil + innlogging slettes) KUN hvis hun:
--     (1) har en bruker_skole-kobling til DENNE skolen,
--     (2) IKKE har bruker_skole til noen ANNEN skole (K6: aktiv-flagget ignoreres
--         bevisst — en inaktiv kobling til en annen skole holder personen i live;
--         konservativt valg, vi sletter heller for lite enn for mye),
--     (3) IKKE er intern TL AS-konto (profiles.rolle in ('ansatt','superadmin')),
--     (4) IKKE eier periodeplan, tl_hjul eller vurderinger med skole_id som er SATT
--         og ULIK denne skolen.
--   (4) er F1-rettingen: periodeplan/tl_hjul/vurderinger har on delete cascade mot
--   profiles (migr 033), så en `delete from profiles` ville ellers tatt med en ANNEN
--   skoles planer/hjul som personen fortsatt eier. K10 (Kjartan 16. sep): innhold med
--   skole_id NULL holder IKKE personen i live — det kan trygt kaskadere bort med
--   profilen (bl.a. vurderinger.skole_id har on delete set null og kan bli NULL).
--   Beholdes profilen, slettes likevel koblingen til denne skolen. Samme funksjon
--   brukes av endepunktet → begge dekket.
--
-- ── K5/R1: RESTRICT-BLOKKERING FANGES FØR SLETTING ──────────────────────────
--   11 fremmednøkler mot profiles har NO ACTION (blokkerer delete): dokumenter,
--   ressurser, samlinger, redaksjonell_ko, ressurs_kompetansemaal(_forslag),
--   import_kjoring, tu_runder.opprettet_av (kun ANNEN skoles runder — denne skolens
--   slettes her). R1: i tillegg fanger vi kurs_skole.svar_registrert_av → auth.users
--   (eneste FK mot auth.users utenom profiles): `delete from profiles` går fint, men
--   endepunktets auth.admin.deleteUser ville feilet etterpå. Normalt bare interne
--   (aldri foreldreløse), men en nedgradert ansatt kan blokkere. Vi sjekker FØR
--   sletting og stopper med klartekst: hvem (R2: coalesce navn) og hvorfor — i stedet
--   for en rå FK-feil.
--
-- ── K11 / K12 ───────────────────────────────────────────────────────────────
--   K11: for foreldreløse nulles bruker_id i bruk_hendelse, brukslogg og skoleus_svar
--   (on delete set null fra profiles). Radene beholdes, men vises som egne tellerader
--   — ikke framstilt som «urørt». K12: en tl_hjul_kategori på denne skolen som et hjul
--   på en ANNEN skole peker på, slettes IKKE (hoppes over, egen rad i rapporten).
--
-- ── ROLLEVAKT (099 V2-form, F3-rettet) ──────────────────────────────────────
--   Positiv boolean testet med `is not true` (så NULL fra auth.role() ikke slipper
--   gjennom). Tillatt: service_role (endepunkt), superadmin (get_min_rolle), eller
--   superbruker-/postgres-sesjon (SQL-editor). GRANTS: revoke fra public/anon/
--   authenticated; grant KUN service_role. Eier (postgres) kjører i SQL-editoren.
--
-- SPERRER: forutsetning FØR (skoler + de berørte tabellene MÅ finnes, og 'Tidligere'
--   MÅ være lovlig status) · verifisering ETTER (begge funksjoner + secdef +
--   search_path + anon/auth uten execute + service_role med) · kvittering før commit.
-- EGENSKAPER: lager ingen tabeller/sekvenser. Additiv (kun to NYE funksjoner —
--   104-fellen: ingen eksisterende funksjon røres). ÉN transaksjon.
--
-- TILBAKERULLING (etter commit): begin;
--   drop function if exists public.slett_skole(uuid, boolean);
--   drop function if exists public.slett_skole_foreldrelose_uid(uuid); commit;
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- FORUTSETNING-SPERRE (raise FØR skriving)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  mangler text := '';
  forventet text[] := array[
    'skoler','bruker_skole','profiles','periodeplan','periodeplan_rad',
    'tl_hjul','tl_hjul_lek','tl_hjul_kategori','tl_deltaker',
    'tu_runder','tu_koder','tu_svar','tu_arkiv',
    'favoritter','vurderinger','nettverk_ansvarlig',
    'bruk_hendelse','brukslogg','skoleus_svar','kurs_skole',
    'dokumenter','ressurser','samlinger','redaksjonell_ko',
    'ressurs_kompetansemaal','ressurs_kompetansemaal_forslag','import_kjoring'
  ];
begin
  foreach t in array forventet loop
    if to_regclass('public.' || t) is null then
      mangler := mangler || ' ' || t;
    end if;
  end loop;
  if mangler <> '' then
    raise exception 'STOPP 129: mangler tabell(er):%. Kjør forutsetningsmigrasjonene først.', mangler;
  end if;
  -- 'Tidligere' MÅ være en lovlig status-verdi i NETTOPP skoler_status_check
  -- (ikke i en hvilken som helst annen CHECK på skoler) — ellers kan vi ikke merke skolen.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.skoler'::regclass and contype = 'c'
      and conname = 'skoler_status_check'
      and pg_get_constraintdef(oid) like '%''Tidligere''%'
  ) then
    raise exception 'STOPP 129: skoler_status_check tillater ikke ''Tidligere'' — avklar riktig status for tidligere skole før du bygger videre.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- HJELPEFUNKSJON: hvilke brukere blir foreldreløse? (F1-rettet)
-- ----------------------------------------------------------------------------
create or replace function public.slett_skole_foreldrelose_uid(p_skole_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct bs.bruker_id
  from public.bruker_skole bs
  join public.profiles p on p.id = bs.bruker_id
  where bs.skole_id = p_skole_id
    and coalesce(p.rolle, '') not in ('ansatt', 'superadmin')          -- aldri interne kontoer
    and not exists (select 1 from public.bruker_skole bs2               -- ingen ANNEN skole (K6: aktiv ignoreres bevisst)
                    where bs2.bruker_id = bs.bruker_id and bs2.skole_id is distinct from p_skole_id)
    -- K10 (Kjartan 16. sep): kun innhold med skole_id SATT og ULIK denne skolen holder personen
    -- i live. Innhold med skole_id NULL kan trygt kaskadere bort med profilen.
    and not exists (select 1 from public.periodeplan pp                 -- eier ikke plan på annen skole
                    where pp.bruker_id = bs.bruker_id and pp.skole_id is not null and pp.skole_id <> p_skole_id)
    and not exists (select 1 from public.tl_hjul th                     -- eier ikke hjul på annen skole
                    where th.bruker_id = bs.bruker_id and th.skole_id is not null and th.skole_id <> p_skole_id)
    and not exists (select 1 from public.vurderinger v                  -- ingen vurdering på annen skole
                    where v.bruker_id = bs.bruker_id and v.skole_id is not null and v.skole_id <> p_skole_id);
$$;

-- ----------------------------------------------------------------------------
-- HOVEDFUNKSJON: slett_skole()
-- ----------------------------------------------------------------------------
create or replace function public.slett_skole(
  p_skole_id uuid,
  p_torrkjoring boolean default true
)
returns table (tabell text, rader bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_torr    constant boolean := coalesce(p_torrkjoring, true);
  v_tillatt boolean;
  v_orphans uuid[];
  v_blokk   text;
  v_n       bigint;
  v_uid     uuid;
begin
  -- ── ROLLEVAKT (F3: positiv boolean, is not true) ──
  v_tillatt :=
       coalesce(auth.role(), '') = 'service_role'
    or coalesce(public.get_min_rolle(), '') = 'superadmin'
    or session_user in ('postgres', 'supabase_admin')
    or coalesce((select rolsuper from pg_catalog.pg_roles where rolname = session_user), false);
  if v_tillatt is not true then
    raise exception 'Ingen tilgang: slett_skole krever superadmin eller service_role';
  end if;

  -- ── SKOLEN MÅ FINNES (et tomt no-op skal ikke se ut som suksess) ──
  if not exists (select 1 from public.skoler where id = p_skole_id) then
    raise exception 'STOPP: ukjent skole_id % — ingen slik rad i public.skoler', p_skole_id;
  end if;

  -- ── Foreldreløse brukere MÅ beregnes FØR bruker_skole slettes ──
  v_orphans := array(select public.slett_skole_foreldrelose_uid(p_skole_id));

  -- ── K5: fang RESTRICT-blokkeringer FØR sletting, med klartekst ──
  select string_agg(coalesce(p.navn, '(uten navn)') || ' (' || o.uid::text || '): ' || x.blk, '; ' order by coalesce(p.navn, ''))
    into v_blokk
  from unnest(v_orphans) as o(uid)
  join public.profiles p on p.id = o.uid
  cross join lateral (
    select concat_ws(', ',
      case when exists (select 1 from public.dokumenter d where d.opprettet_av=o.uid or d.endret_av=o.uid) then 'dokumenter' end,
      case when exists (select 1 from public.ressurser r where r.opprettet_av=o.uid or r.endret_av=o.uid) then 'ressurser' end,
      case when exists (select 1 from public.samlinger s where s.opprettet_av=o.uid or s.endret_av=o.uid) then 'samlinger' end,
      case when exists (select 1 from public.redaksjonell_ko k where k.ansvarlig=o.uid or k.lost_av=o.uid) then 'redaksjonell_ko' end,
      case when exists (select 1 from public.ressurs_kompetansemaal rk where rk.bekreftet_av=o.uid) then 'ressurs_kompetansemaal' end,
      case when exists (select 1 from public.ressurs_kompetansemaal_forslag rf where rf.behandlet_av=o.uid) then 'ressurs_kompetansemaal_forslag' end,
      case when exists (select 1 from public.import_kjoring ik where ik.utfort_av=o.uid) then 'import_kjoring' end,
      case when exists (select 1 from public.tu_runder r where r.opprettet_av=o.uid and r.skole_id is distinct from p_skole_id) then 'tu_runder (annen skole)' end,
      -- R1: eneste FK mot auth.users utenom profiles. delete from profiles går fint, men
      -- endepunktets auth.admin.deleteUser ville feilet etterpå — så vi stopper her.
      case when exists (select 1 from public.kurs_skole ks where ks.svar_registrert_av=o.uid) then 'kurs_skole (svar registrert på vegne — null ut svar_registrert_av først)' end
    ) as blk
  ) x
  where x.blk <> '';   -- kun brukere som faktisk blokkeres (R2: coalesce navn så meldingen aldri blir NULL)
  if v_blokk is not null and v_blokk <> '' then
    raise exception 'STOPP: kan ikke slette skolen — disse brukerne ville blitt foreldreløse, men er knyttet til delt/globalt innhold og må håndteres manuelt først (endre eierskap eller behold kontoen): %', v_blokk;
  end if;

  -- Header-rad som viser hvilken modus som kjørte.
  tabell := case when v_torr then '(TØRRKJØRING — ingenting slettet)'
                 else '(SKARP KJØRING — data slettet)' end;
  rader := 0; return next;

  -- ── 1) Trivselsundersøkelsen ──
  select count(*) into v_n
  from public.tu_svar sv join public.tu_runder r on r.id = sv.runde_id
  where r.skole_id = p_skole_id;
  tabell := 'tu_svar (råsvar, cascade)'; rader := v_n; return next;

  select count(*) into v_n
  from public.tu_koder k join public.tu_runder r on r.id = k.runde_id
  where r.skole_id = p_skole_id;
  tabell := 'tu_koder (cascade)'; rader := v_n; return next;

  select count(*) into v_n from public.tu_runder where skole_id = p_skole_id;
  if not v_torr then delete from public.tu_runder where skole_id = p_skole_id; end if;
  tabell := 'tu_runder'; rader := v_n; return next;

  select count(*) into v_n from public.tu_arkiv where skole_id = p_skole_id;
  if not v_torr then delete from public.tu_arkiv where skole_id = p_skole_id; end if;
  tabell := 'tu_arkiv (skjermet aggregat)'; rader := v_n; return next;

  -- ── 2) Periodeplaner (+ rader cascade) ──
  select count(*) into v_n
  from public.periodeplan_rad pr join public.periodeplan pp on pp.id = pr.plan_id
  where pp.skole_id = p_skole_id;
  tabell := 'periodeplan_rad (cascade)'; rader := v_n; return next;

  select count(*) into v_n from public.periodeplan where skole_id = p_skole_id;
  if not v_torr then delete from public.periodeplan where skole_id = p_skole_id; end if;
  tabell := 'periodeplan'; rader := v_n; return next;

  -- ── 3) TL-hjul (+ leker cascade) + kategori (kun denne skolens, ikke felles) ──
  select count(*) into v_n
  from public.tl_hjul_lek hl join public.tl_hjul h on h.id = hl.hjul_id
  where h.skole_id = p_skole_id;
  tabell := 'tl_hjul_lek (cascade)'; rader := v_n; return next;

  select count(*) into v_n from public.tl_hjul where skole_id = p_skole_id;
  if not v_torr then delete from public.tl_hjul where skole_id = p_skole_id; end if;
  tabell := 'tl_hjul'; rader := v_n; return next;

  -- K12: en tl_hjul_kategori på DENNE skolen som et hjul på en ANNEN skole peker på
  -- (skole_id ulik/ null) skal IKKE slettes (ellers ville det hjulet fått kategori_id null).
  -- Hopp over den, vis den som egen rad. (Bruker skole_id-vilkåret så tallet er likt i
  -- tørr og skarp — denne skolens egne hjul telles ikke som «bruk».)
  select count(*) into v_n from public.tl_hjul_kategori k
  where k.skole_id = p_skole_id
    and exists (select 1 from public.tl_hjul h where h.kategori_id = k.id and h.skole_id is distinct from p_skole_id);
  tabell := 'tl_hjul_kategori (hoppet over — brukt av hjul på annen skole)'; rader := v_n; return next;

  select count(*) into v_n from public.tl_hjul_kategori k
  where k.skole_id = p_skole_id
    and not exists (select 1 from public.tl_hjul h where h.kategori_id = k.id and h.skole_id is distinct from p_skole_id);
  if not v_torr then
    delete from public.tl_hjul_kategori k
    where k.skole_id = p_skole_id
      and not exists (select 1 from public.tl_hjul h where h.kategori_id = k.id and h.skole_id is distinct from p_skole_id);
  end if;
  tabell := 'tl_hjul_kategori (slettet)'; rader := v_n; return next;

  -- ── 4) Registrerte trivselsledere (fornavn + klasse = de eneste navngitte elevene) ──
  select count(*) into v_n from public.tl_deltaker where skole_id = p_skole_id;
  if not v_torr then delete from public.tl_deltaker where skole_id = p_skole_id; end if;
  tabell := 'tl_deltaker'; rader := v_n; return next;

  -- ── 5) Bruker-skole-koblinger for skolen ──
  select count(*) into v_n from public.bruker_skole where skole_id = p_skole_id;
  if not v_torr then delete from public.bruker_skole where skole_id = p_skole_id; end if;
  tabell := 'bruker_skole'; rader := v_n; return next;

  -- ── 6) Kaskade fra profiles for foreldreløse (K4: tell det som faktisk forsvinner) ──
  select count(*) into v_n from public.favoritter where bruker_id = any(v_orphans);
  tabell := 'favoritter (foreldreløse, cascade)'; rader := v_n; return next;

  select count(*) into v_n from public.vurderinger where bruker_id = any(v_orphans);
  tabell := 'vurderinger (foreldreløse, cascade)'; rader := v_n; return next;

  select count(*) into v_n from public.nettverk_ansvarlig where bruker_id = any(v_orphans);
  tabell := 'nettverk_ansvarlig (foreldreløse, cascade)'; rader := v_n; return next;

  -- K11: ON DELETE SET NULL fra profiles — radene BEHOLDES, men bruker_id nulles.
  -- Telles så rapporten ikke feilaktig framstiller dem som «urørt».
  select count(*) into v_n from public.bruk_hendelse where bruker_id = any(v_orphans);
  tabell := 'bruk_hendelse (foreldreløse, bruker_id → null)'; rader := v_n; return next;

  select count(*) into v_n from public.brukslogg where bruker_id = any(v_orphans);
  tabell := 'brukslogg (foreldreløse, bruker_id → null)'; rader := v_n; return next;

  select count(*) into v_n from public.skoleus_svar where bruker_id = any(v_orphans);
  tabell := 'skoleus_svar (foreldreløse, bruker_id → null)'; rader := v_n; return next;

  -- ── 7) Brukerkontoer (profiles) for foreldreløse. auth.users tas av endepunktet. ──
  v_n := coalesce(array_length(v_orphans, 1), 0);
  if not v_torr and v_n > 0 then
    delete from public.profiles where id = any(v_orphans);
  end if;
  tabell := 'profiles (foreldreløse — auth.users slettes av endepunkt)'; rader := v_n; return next;

  -- F4: uid-ene MÅ alltid være i rapporten (så de ikke går tapt om et separat oppslag mislykkes)
  foreach v_uid in array coalesce(v_orphans, array[]::uuid[]) loop
    tabell := 'foreldrelos_uid: ' || v_uid::text; rader := 1; return next;
  end loop;

  -- ── 8) Selve skoleraden: BEHOLDES, status → 'Tidligere' ──
  select count(*) into v_n from public.skoler where id = p_skole_id and status is distinct from 'Tidligere';
  if not v_torr then update public.skoler set status = 'Tidligere' where id = p_skole_id; end if;
  tabell := 'skoler (status → Tidligere)'; rader := v_n; return next;

  return;
end;
$$;

-- ----------------------------------------------------------------------------
-- RETTIGHETER: kun service_role (endepunktet). Eieren (postgres) kjører i SQL-editoren.
-- ----------------------------------------------------------------------------
revoke execute on function public.slett_skole(uuid, boolean)          from public, anon, authenticated;
revoke execute on function public.slett_skole_foreldrelose_uid(uuid)  from public, anon, authenticated;
grant  execute on function public.slett_skole(uuid, boolean)          to service_role;
grant  execute on function public.slett_skole_foreldrelose_uid(uuid)  to service_role;

-- ----------------------------------------------------------------------------
-- SPERRER ETTER
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.slett_skole(uuid, boolean)') is null
     or to_regprocedure('public.slett_skole_foreldrelose_uid(uuid)') is null then
    raise exception 'STOPP 129 (etter): en av funksjonene ble ikke opprettet.';
  end if;
  if not exists (select 1 from pg_proc where proname='slett_skole' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%'))
     or not exists (select 1 from pg_proc where proname='slett_skole_foreldrelose_uid' and prosecdef
                 and exists (select 1 from unnest(proconfig) c where c like 'search_path=%')) then
    raise exception 'STOPP 129 (etter): en funksjon mangler SECURITY DEFINER / search_path-herding.';
  end if;
  if has_function_privilege('anon','public.slett_skole(uuid, boolean)','execute')
     or has_function_privilege('authenticated','public.slett_skole(uuid, boolean)','execute')
     or has_function_privilege('anon','public.slett_skole_foreldrelose_uid(uuid)','execute')
     or has_function_privilege('authenticated','public.slett_skole_foreldrelose_uid(uuid)','execute') then
    raise exception 'STOPP 129 (etter): anon/authenticated har execute — skal være revokert.';
  end if;
  if not has_function_privilege('service_role','public.slett_skole(uuid, boolean)','execute')
     or not has_function_privilege('service_role','public.slett_skole_foreldrelose_uid(uuid)','execute') then
    raise exception 'STOPP 129 (etter): service_role mangler execute.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit).
-- ----------------------------------------------------------------------------
select concat_ws(' · ',
  'slett_skole: ' || (to_regprocedure('public.slett_skole(uuid, boolean)') is not null),
  'foreldrelose_uid: ' || (to_regprocedure('public.slett_skole_foreldrelose_uid(uuid)') is not null),
  'begge secdef+search_path: ' || (
     exists(select 1 from pg_proc where proname='slett_skole' and prosecdef and exists(select 1 from unnest(proconfig) c where c like 'search_path=%'))
     and exists(select 1 from pg_proc where proname='slett_skole_foreldrelose_uid' and prosecdef and exists(select 1 from unnest(proconfig) c where c like 'search_path=%'))),
  'anon/auth execute (skal være NEI): ' || (has_function_privilege('anon','public.slett_skole(uuid, boolean)','execute') or has_function_privilege('authenticated','public.slett_skole(uuid, boolean)','execute')),
  'service_role execute: ' || (has_function_privilege('service_role','public.slett_skole(uuid, boolean)','execute'))
) as kvittering;

commit;
