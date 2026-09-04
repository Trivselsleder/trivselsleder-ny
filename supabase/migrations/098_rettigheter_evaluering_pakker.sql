-- 098_rettigheter_evaluering_pakker.sql
-- ============================================================================
-- SIKKERHET: rollesjekk + execute-stramming paa fire evaluering/pakke-funksjoner
-- ============================================================================
-- HVA: fire SECURITY DEFINER-funksjoner er i dag anon-kallbare i prod (og aapne for
--   enhver innlogget bruker, siden de mangler rollesjekk). oppdater_pakke er en AAPEN
--   skriveoperasjon (anon kan endre navn/pris/bilde-URL paa hvilken som helst pakke);
--   hent_evalueringer_admin og _eksport gir ut fritekst med laerernavn og kjoepsinteresse
--   med telefonnumre; hent_pakker_admin gir ogsaa inaktive pakker.
--
-- KILDE: _kontroll-017-019/prod/prod_funksjonsdef.csv (prods FAKTISKE definisjoner —
--   prod har driftet fra filene, saa filene er IKKE fasit her). Kroppene er prods,
--   uendret, bortsett fra rollesjekken som settes inn som aller foerste setning.
--
-- TO av de fire er LANGUAGE sql i prod (hent_evalueringer_admin, hent_evalueringer_eksport).
--   En plpgsql-vakt (if/raise) kan ikke staa i en sql-funksjon, saa de er KONVERTERT til
--   LANGUAGE plpgsql: samme signatur, samme RETURNS, samme SELECT (uendret) via 'return
--   query'. Signatur/RETURNS er urort; kun sprakbryteren endres for aa kunne baere vakten.
--
-- search_path: alle fire har 'SET search_path TO ''public''' i prod — beholdt uendret.
--   INGEN mangler den, saa 099 trenger ikke roere search_path paa disse fire.
--
-- Rettigheter (formen fra 041/093C): revoke fra public, anon, authenticated; grant til
--   authenticated (ansatt-sjekk skjer i kroppen) + service_role. anon mister execute.
--
-- EGENSKAPER: Idempotent (create or replace + revoke/grant) · ÉN transaksjon.
--   Rekkefoelge: oppdater_pakke, hent_evalueringer_admin, hent_pakker_admin, hent_evalueringer_eksport.
--   Kun disse fire — meld_paa_webinar og de elleve skrivende hoerer til 099.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- oppdater_pakke  [plpgsql]  (prod-md5 foer: 3a316cf041ddb397bc04c9a568e6e44a)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oppdater_pakke(p_id uuid, p_navn text, p_pris integer, p_beskrivelse text, p_bilde_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.get_min_rolle(),'') not in ('ansatt','superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  update eval_pakker
  set navn = p_navn,
      pris = p_pris,
      beskrivelse = p_beskrivelse,
      bilde_url = p_bilde_url
  where id = p_id;
end;
$function$
;

revoke execute on function public.oppdater_pakke(uuid, text, integer, text, text) from public, anon, authenticated;
grant  execute on function public.oppdater_pakke(uuid, text, integer, text, text) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- hent_evalueringer_admin  [sql->plpgsql (KONVERTERT)]  (prod-md5 foer: 29494a13e948e835e1e04bb7e6f7d012)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hent_evalueringer_admin()
 RETURNS TABLE(evaluering_id uuid, kurs_navn text, kurs_dato date, skole_navn text, vurd_gjennomforing integer, vurd_info integer, vurd_aktiviteter integer, gullkorn text, forbedring text, kjopsinteresse text, svart_tidspunkt timestamp with time zone, valgt_pakke_id uuid, valgt_pakke_navn text, valgt_pakke_pris numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.get_min_rolle(),'') not in ('ansatt','superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  return query
  select e.id, k.navn, k.dato, s.navn, e.vurd_gjennomforing, e.vurd_info, e.vurd_aktiviteter,
         -- ::numeric paa siste kolonne: plpgsql 'return query' krever EKSAKT type; kolonnen
         -- evalueringer.valgt_pakke_pris er integer, mens RETURNS TABLE sier numeric (arvet fra
         -- prods sql-versjon, som castet implisitt). Uten castet: 'Returned type integer does not
         -- match expected type numeric'. Rad-for-rad identisk med prod med castet.
         e.gullkorn, e.forbedring, e.kjopsinteresse, e.svart_tidspunkt, e.valgt_pakke_id, e.valgt_pakke_navn, e.valgt_pakke_pris::numeric
  from evalueringer e
  join kurs_skole ks on e.kurs_skole_id = ks.id
  join kurs k on ks.kurs_id = k.id
  left join skoler s on ks.skole_id = s.id
  where e.svart_tidspunkt is not null
  order by e.svart_tidspunkt desc;
end;
$function$;

revoke execute on function public.hent_evalueringer_admin() from public, anon, authenticated;
grant  execute on function public.hent_evalueringer_admin() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- hent_pakker_admin  [plpgsql]  (prod-md5 foer: 8e34f136d95da676f9aa10d7e83ce9c2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hent_pakker_admin()
 RETURNS TABLE(id uuid, navn text, pris integer, beskrivelse text, bilde_url text, semester_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.get_min_rolle(),'') not in ('ansatt','superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  return query
  select p.id, p.navn, p.pris, p.beskrivelse, p.bilde_url, p.semester_id
  from eval_pakker p
  join eval_semester s on s.id = p.semester_id
  where s.aktiv = true
  order by p.pris asc;
end;
$function$
;

revoke execute on function public.hent_pakker_admin() from public, anon, authenticated;
grant  execute on function public.hent_pakker_admin() to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- hent_evalueringer_eksport  [sql->plpgsql (KONVERTERT)]  (prod-md5 foer: f64c67af21d4a8bba166fc45d69ef281)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hent_evalueringer_eksport()
 RETURNS TABLE(skole_navn text, kommune text, fylke text, nettverk text, kurs_navn text, kurs_dato date, kurs_uke integer, gjennomforing integer, info integer, aktiviteter integer, gullkorn text, kjopsinteresse text, valgt_pakke text, valgt_pakke_pris integer, svart_tidspunkt timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(public.get_min_rolle(),'') not in ('ansatt','superadmin') then
    raise exception 'Ingen tilgang';
  end if;
  return query
  SELECT
    s.navn,
    s.kommunenavn,
    s.fylke,
    s.nettverk,
    k.navn,
    k.dato,
    k.uke,
    e.vurd_gjennomforing,
    e.vurd_info,
    e.vurd_aktiviteter,
    e.gullkorn,
    e.kjopsinteresse,
    e.valgt_pakke_navn,
    e.valgt_pakke_pris,
    e.svart_tidspunkt
  FROM evalueringer e
  JOIN kurs_skole ks ON ks.id = e.kurs_skole_id
  JOIN skoler s ON s.id = ks.skole_id
  JOIN kurs k ON k.id = ks.kurs_id
  WHERE e.svart_tidspunkt IS NOT NULL
  ORDER BY k.dato DESC, s.navn;
end;
$function$;

revoke execute on function public.hent_evalueringer_eksport() from public, anon, authenticated;
grant  execute on function public.hent_evalueringer_eksport() to authenticated, service_role;

commit;

-- ============================================================================
-- KVITTERING (les etter kjoering). Forventet for ALLE fire:
--   anon = false, authenticated = true, service_role = true, vakt = true
-- ============================================================================
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute')  as service_role,
       position('Ingen tilgang' in p.prosrc) > 0                 as vakt
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('oppdater_pakke','hent_evalueringer_admin','hent_pakker_admin','hent_evalueringer_eksport')
order by p.proname;
