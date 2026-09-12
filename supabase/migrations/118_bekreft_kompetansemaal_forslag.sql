-- ============================================================================
-- 118_bekreft_kompetansemaal_forslag.sql
-- ============================================================================
-- HVA: én ny RPC `public.bekreft_kompetansemaal_forslag(p_ko_id uuid)` som lar en
--   intern (ansatt/superadmin) bekrefte et usikkert kompetansemål-forslag fra
--   redaksjonskøen. Bekreftelse betyr: koble ressursen til det foreslåtte målet som
--   en MENNESKESATT kobling, marker forslagsraden som godkjent, og lukk kø-raden.
--
-- BAKGRUNN: en `usikker_maalkobling`-kø-rad (093) peker via (ressurs_id, kompetansemaal_id)
--   til en forslagsrad i `ressurs_kompetansemaal_forslag` (092). Importen la forslaget der
--   (aktivlaering.mjs) fordi tillit/fag/trinn ikke nådde terskel — et menneske må avgjøre.
--   Frontenden viste tidligere «Bekreft forslag (kommer)» fordi trigger-funksjonen
--   `fase3_km_gjeldende` manglet search_path (42P01 ved insert). Migr 112 (10. sep) festet
--   search_path, så koblingen kan nå settes trygt. Denne RPC-en er handlingen.
--
-- MODELL (målt i base 11. sep, prod-tro lokal 116_tmpl):
--   * redaksjonell_ko (093): id, type, ressurs_id, kompetansemaal_id, status, lost_at, lost_av.
--   * ressurs_kompetansemaal (025+092): PK (ressurs_id, kompetansemaal_id); satt_av
--     default 'menneske'; bekreftet_av/at = «et menneske har sett den». CHECK
--     rk_maskin_har_tillit krever tillit KUN når satt_av='maskin' → menneske uten tillit er lovlig.
--   * ressurs_kompetansemaal_forslag (092): PK (ressurs_id, kompetansemaal_id); status
--     ('ny','godkjent','avvist'); behandlet_av/at. 092 ga bevisst status+behandlet_* nettopp
--     for at et forslag skal MARKERES (revisjonsspor), ikke slettes. Derfor: status='godkjent'.
--   * trigger trg_km_gjeldende (092, herdet 112): BEFORE INSERT på ressurs_kompetansemaal,
--     stopper kobling til erstattede/utgåtte mål. Vi lar den virke — utgått mål ⇒ hele
--     transaksjonen ruller tilbake, ingenting endret.
--
-- ROLLEVAKT: get_min_rolle() in ('ansatt','superadmin') — «kun folk som jobber hos
--   Trivselsleder AS» (CLAUDE.md). IKKE fase3_intern() (oppdragskrav; get_min_rolle leser
--   profiles.rolle, som er det interne nivået).
--
-- IDEMPOTENS / ÉN TRANSAKSJON: kø-raden låses (FOR UPDATE). Et andre kall ser status≠'ny'
--   og gir forståelig feil — ingen dobbeltkobling. insert ... on conflict do nothing hindrer
--   dublett i koblingstabellen om en maskinkobling for samme par alt finnes.
--
-- RETTIGHETER (form som 098/099): revoke fra public/anon/authenticated + grant til
--   authenticated, service_role. Vakten i kroppen stopper ikke-interne authenticated.
--
-- SPERRER:
--   * FØR: funksjonen finnes ikke fra før med ANNEN signatur (ville gitt overload — 104-regel).
--   * KVITTERING: én rad (finnes, security definer, search_path tom, execute-bildet) før commit.
--
-- TILBAKERULLING (etter commit, hvis nødvendig):
--   drop function if exists public.bekreft_kompetansemaal_forslag(uuid);
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- SPERRE FØR: ingen eksisterende variant med annen signatur (unngå overload).
-- pg_get_function_identity_arguments gir typer uten navn/defaults → vår = 'uuid'.
-- ----------------------------------------------------------------------------
do $$
declare v_annen text;
begin
  select string_agg(pg_get_function_identity_arguments(p.oid), ' | ')
    into v_annen
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'bekreft_kompetansemaal_forslag'
    and pg_get_function_identity_arguments(p.oid) is distinct from 'uuid';
  if v_annen is not null then
    raise exception 'STOPP 118: bekreft_kompetansemaal_forslag finnes med annen signatur (%). Slett den i samme transaksjon og sett GRANT på nytt (RPC-utvidelsesregel).', v_annen;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- RPC
-- ----------------------------------------------------------------------------
create or replace function public.bekreft_kompetansemaal_forslag(p_ko_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_ressurs uuid;
  v_maal    integer;
  v_type    text;
  v_status  text;
begin
  -- Rollevakt: kun interne (ansatt/superadmin). Kroppen utleverer/endrer data.
  if coalesce(public.get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;

  -- Les og LÅS kø-raden (serialiserer samtidige bekreftelser → idempotent).
  select ressurs_id, kompetansemaal_id, type, status
    into v_ressurs, v_maal, v_type, v_status
  from public.redaksjonell_ko
  where id = p_ko_id
  for update;

  if not found then
    raise exception 'Kø-rad % finnes ikke.', p_ko_id using errcode = 'P0002';
  end if;
  if v_type is distinct from 'usikker_maalkobling' then
    raise exception 'Kø-rad % har type «%» — bekreftelse gjelder kun usikker_maalkobling.', p_ko_id, v_type;
  end if;
  if v_status is distinct from 'ny' then
    raise exception 'Kø-rad % er allerede behandlet (status «%»).', p_ko_id, v_status;
  end if;
  if v_maal is null then
    raise exception 'Kø-rad % mangler kompetansemaal_id — kan ikke bekreftes.', p_ko_id;
  end if;

  -- 1) Menneskesatt kobling. satt_av='menneske' (riktig kolonne for menneske-merking) +
  --    bekreftet_av/at = hvem/når. Triggeren fase3_km_gjeldende stopper utgåtte/erstattede mål.
  --    on conflict do nothing: en eksisterende (maskin)kobling for samme par røres ikke.
  insert into public.ressurs_kompetansemaal
    (ressurs_id, kompetansemaal_id, satt_av, bekreftet_av, bekreftet_at)
  values
    (v_ressurs, v_maal, 'menneske', auth.uid(), now())
  on conflict (ressurs_id, kompetansemaal_id) do nothing;

  -- 2) Rydd forslagsraden slik 092 tilsier: MARKER godkjent (revisjonsspor), ikke slett.
  update public.ressurs_kompetansemaal_forslag
     set status = 'godkjent', behandlet_av = auth.uid(), behandlet_at = now()
   where ressurs_id = v_ressurs and kompetansemaal_id = v_maal;

  -- 3) Lukk kø-raden — mønster fra 113/114.
  update public.redaksjonell_ko
     set status = 'lost', lost_at = now(), lost_av = auth.uid()
   where id = p_ko_id;
end;
$function$;

revoke execute on function public.bekreft_kompetansemaal_forslag(uuid) from public, anon, authenticated;
grant  execute on function public.bekreft_kompetansemaal_forslag(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad): funksjonen finnes, security definer, search_path tom (""),
-- execute for anon=false, authenticated=true, service_role=true.
-- ----------------------------------------------------------------------------
select
  p.proname,
  p.prosecdef                                                    as security_definer,
  p.proconfig                                                    as config,
  has_function_privilege('anon',          p.oid, 'execute')      as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute')      as authenticated_execute,
  has_function_privilege('service_role',  p.oid, 'execute')      as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'bekreft_kompetansemaal_forslag';

commit;
