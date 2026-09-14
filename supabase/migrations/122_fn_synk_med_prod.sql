-- ============================================================================
-- 122_fn_synk_med_prod.sql — gjør migrasjonsfilene LIKE PROD for 15 funksjoner
-- ============================================================================
-- KILDE (fasit): prods faktiske funksjonstekst hentet ut av Kjartan 12. sep 2026,
--   _kontroll-import/fnrydding/prod-fn-kropper-12sep.csv (md5 a2e8c87d1eb283e33559c74bd59f3de7).
--   Hver definisjon under er prods EGEN pg_get_functiondef-tekst, uendret (ikke omskrevet).
--
-- HVORFOR: kartleggingen 12. sep (claude_FN-AVVIK-KARTLAGT-12sep.md) fant at 15 av 82
--   funksjoner har en ANNEN kropp i prod enn migrasjonsfilene sier. secdef og search_path er
--   identiske — forskjellen sitter i kroppsteksten. Da kan ikke basen gjenoppbygges fra
--   filene og bli lik prod (generalprøven brytes). Prod ER fasit; filene er utdaterte.
--   For 13 av 15 er koden IDENTISK og bare KOMMENTARENE strippet (TU-funksjonene ble
--   hånd-rettet direkte i prods SQL-editor gjennom august — bl.a. skjermingssaken 25. aug —
--   og editoren beholdt ikke fil-kommentarene). For 2 er det en adferdsbevarende
--   kropps-endring: anonymiser_bruk_hendelse (088) er omskrevet med lokale variabler og
--   return query, og meld_paa_webinar (039) har ASCII-ifiserte feilmeldinger.
--
-- RETNING: denne migrasjonen endrer INGENTING i prod — hver create or replace er byte-lik
--   det som allerede står der, så den er en ren NO-OP mot prod. Effekten er kun at en
--   gjenoppbygging FRA FILENE (001..122) gir samme fn-fingeravtrykk som prod
--   (44a4ab2ac99c3ee34f84eaea7fe42017).
--
-- TRYGGHET: create or replace bevarer eier, rettigheter (execute-grants fra opprinnelsesfila)
--   og er idempotent — trygg å kjøre i prod selv om funksjonene allerede er riktige. secdef
--   og search_path står i hver definisjon og bevares nøyaktig som i prod. Signaturene er
--   uendret (avviket var kun i kroppen), så create or replace kan ikke feile på returtype/args.
--   RØRER IKKE de gamle filene (039/041/045/046/055/061/068/088) — all retting skjer her.
--
-- EGENSKAPER: kun create-or-replace av 15 funksjoner · idempotent/no-op · ÉN transaksjon.
-- ============================================================================

begin;

-- ── anonymiser_bruk_hendelse (088) — omskrevet kropp i prod (lokale variabler a/b + return query, ombyttet where-rekkefolge; kommentarer strippet) — adferdsbevarende
CREATE OR REPLACE FUNCTION public.anonymiser_bruk_hendelse()
 RETURNS TABLE(koblet_fra_person bigint, tekst_fjernet bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a bigint;
  b bigint;
begin
  update public.bruk_hendelse
     set bruker_id = null,
         skole_id  = null
   where hendelse = 'sok'
     and (bruker_id is not null or skole_id is not null)
     and tidspunkt < now() - interval '30 days';
  get diagnostics a = row_count;

  update public.bruk_hendelse
     set sok_tekst = null,
         bruker_id = null
   where tidspunkt < now() - interval '24 months'
     and (sok_tekst is not null or bruker_id is not null);
  get diagnostics b = row_count;

  return query select a, b;
end;
$function$;

-- ── flytt_skole_til_kurs (061) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.flytt_skole_til_kurs(p_id uuid, p_nytt_kurs_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_skole uuid;
begin
  if coalesce(get_min_rolle(), '') not in ('superadmin','ansatt') then
    raise exception 'Bare ansatte kan flytte skoler mellom kurs.' using errcode = '42501';
  end if;
  select skole_id into v_skole from kurs_skole where id = p_id;
  if exists (
    select 1 from kurs_skole
    where skole_id = v_skole and kurs_id = p_nytt_kurs_id and id <> p_id
  ) then
    raise exception 'Skolen står allerede på det kurset.' using errcode = '23505';
  end if;
  update kurs_skole set
    kurs_id = p_nytt_kurs_id, svart = false, kommer = null, antall_tl = null,
    arsak_ikke_komme = null, er_vertskap = false, vertskap_bekreftet = null,
    arsak_ikke_vertskap = null, kommentar = null, apen_for_annet_kurs = false,
    onsket_kurs_id = null, melding_handtert = false, svart_dato = null,
    forste_utsending_at = null, purring_sendt_at = null, trinn3_sendt_at = null,
    paaminnelse_sendt_at = null, evaluering_sendt_at = null,
    onske_tekst = null, kvittering_sendt_at = null, eval_purring_sendt_at = null,
    ra_varslet_at = null, auto_purring_sist_at = null, auto_purring_skjermet = false,
    savnet_sendt_at = null
  where id = p_id;
end;
$function$;

-- ── hent_sendelogg_for_kurs (055) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.hent_sendelogg_for_kurs(p_kurs_id uuid)
 RETURNS TABLE(kurs_skole_id uuid, type text, mottaker_epost text, mottaker_navn text, status text, feilmelding text, opprettet_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(get_min_rolle(), '') not in ('ansatt', 'superadmin') then
    raise exception 'Ingen tilgang';
  end if;

  return query
  select el.kurs_skole_id,
         el.type,
         el.mottaker_epost,
         el.mottaker_navn,
         el.status,
         el.feilmelding,
         el.opprettet_at
    from epost_logg el
    join kurs_skole ks on ks.id = el.kurs_skole_id
   where ks.kurs_id = p_kurs_id
   order by el.opprettet_at asc;
end;
$function$;

-- ── meld_paa_webinar (039) — feilmeldinger ASCII-ifisert i prod (paakrevd/paa) + kommentarer strippet — adferdsbevarende
CREATE OR REPLACE FUNCTION public.meld_paa_webinar(p_webinar_id uuid, p_navn text, p_epost text, p_rolle text DEFAULT NULL::text, p_skole_id uuid DEFAULT NULL::uuid, p_nyhetsbrev_samtykke boolean DEFAULT false)
 RETURNS TABLE(status text, pamelding_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  w public.webinarer;
  v_navn text := nullif(btrim(p_navn), '');
  v_epost text := lower(nullif(btrim(p_epost), ''));
  v_kilde text;
  v_id uuid;
begin
  if v_navn is null or v_epost is null then
    raise exception 'Navn og e-post er paakrevd.' using errcode = 'check_violation';
  end if;
  if v_epost !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Ugyldig e-postadresse.' using errcode = 'check_violation';
  end if;

  select * into w from public.webinarer
    where webinarer.id = p_webinar_id and webinarer.status = 'publisert';
  if not found then
    raise exception 'Fant ikke webinaret, eller det er ikke publisert.' using errcode = 'no_data_found';
  end if;
  if now() > w.starter_at + make_interval(mins => coalesce(w.varighet_min, 45)) then
    raise exception 'Webinaret er allerede avsluttet.' using errcode = 'no_data_found';
  end if;

  if w.synlighet = 'offentlig' then
    v_kilde := 'offentlig';
    p_skole_id := null;
  else
    if auth.uid() is null then
      raise exception 'Interne webinarer krever innlogging.' using errcode = 'insufficient_privilege';
    end if;
    if not (public.er_ansatt() or (p_skole_id is not null and public.tilknyttet_skole(p_skole_id))) then
      raise exception 'Du har ikke tilgang til aa melde deg paa dette webinaret.' using errcode = 'insufficient_privilege';
    end if;
    v_kilde := 'min_side';
  end if;

  if w.maks_antall is not null then
    if (select count(*) from public.webinar_pameldinger pm
          where pm.webinar_id = w.id and pm.avmeldt_at is null) >= w.maks_antall
       and not exists (select 1 from public.webinar_pameldinger pm
          where pm.webinar_id = w.id and lower(pm.epost) = v_epost and pm.avmeldt_at is null) then
      return query select 'fullt'::text, null::uuid; return;
    end if;
  end if;

  insert into public.webinar_pameldinger
    (webinar_id, skole_id, navn, rolle, epost, kilde, nyhetsbrev_samtykke, samtykke_at)
  values
    (w.id, p_skole_id, v_navn, nullif(btrim(p_rolle), ''), v_epost, v_kilde,
     coalesce(p_nyhetsbrev_samtykke, false),
     case when coalesce(p_nyhetsbrev_samtykke, false) then now() else null end)
  on conflict (webinar_id, lower(epost)) do update
     set avmeldt_at = null,
         navn = excluded.navn,
         rolle = excluded.rolle,
         samtykke_at = case
           when excluded.nyhetsbrev_samtykke and webinar_pameldinger.samtykke_at is null then now()
           else webinar_pameldinger.samtykke_at end,
         nyhetsbrev_samtykke = webinar_pameldinger.nyhetsbrev_samtykke or excluded.nyhetsbrev_samtykke
  returning id into v_id;

  return query select 'ok'::text, v_id;
end;
$function$;

-- ── tu_auto_lukk_forfalne (068) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_auto_lukk_forfalne(p_idag_oslo date, p_utfor boolean DEFAULT false)
 RETURNS TABLE(kandidater integer, lukket integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_kand int := 0; v_lukket int := 0;
begin
  for v_id in
    select r.id from public.tu_runder r
    where r.status = 'apen'
      and r.frist is not null
      and r.frist < p_idag_oslo
  loop
    v_kand := v_kand + 1;
    if p_utfor then
      perform public.tu_lukk_runde_motor(v_id);
      v_lukket := v_lukket + 1;
    end if;
  end loop;
  return query select v_kand, v_lukket;
end $function$;

-- ── tu_er_ansatt (041) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_er_ansatt()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.rolle in ('ansatt','superadmin'));
$function$;

-- ── tu_folg_med (068) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_folg_med(p_runde uuid)
 RETURNS TABLE(utdelt integer, brukt integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_skole uuid;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not (public.tu_har_tilgang_skole(v_skole)
          or public.tu_er_htla_paa_skole(v_skole)) then
    raise exception 'Ingen tilgang';
  end if;
  return query select count(*)::int, count(*) filter (where k.brukt)::int
               from public.tu_koder k where k.runde_id = p_runde;
end $function$;

-- ── tu_har_tilgang_skole (041) — kommentarer strippet i prod (kode uendret; kort FIX E-kommentar beholdt)
CREATE OR REPLACE FUNCTION public.tu_har_tilgang_skole(p_skole uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'superadmin')
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid()
                   and p.rolle = 'skoleadmin'
                   and p_skole in (select bs.skole_id from public.bruker_skole bs
                                   where bs.bruker_id = auth.uid()));   -- FIX E: kvalifisert, ikke helper
$function$;

-- ── tu_lever_svar (046) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_lever_svar(p_kode_hmac text, p_svar jsonb, p_trinn integer, p_kjonn text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_runde uuid;
begin
  if jsonb_typeof(p_svar) <> 'object' or p_svar = '{}'::jsonb then
    raise exception 'Tomt eller ugyldig svar'; end if;
  if p_trinn is null or p_trinn < 5 or p_trinn > 10 then
    raise exception 'Ugyldig eller manglende trinn'; end if;
  if p_kjonn is null or p_kjonn not in ('jente','gutt','annet') then
    raise exception 'Ugyldig eller manglende kjonn'; end if;
  if exists (select 1 from jsonb_each_text(p_svar) kv where kv.key !~ '^([1-9]|1[0-3])$') then
    raise exception 'Ugyldig svar'; end if;
  if exists (
    select 1 from jsonb_each_text(p_svar) kv
    left join public.tu_sporsmal sp
      on sp.nummer = (kv.key)::int and sp.versjon = 1 and sp.land = 'NO'
    where sp.id is null
       or kv.value !~ '^[0-9]+$'
       or (case when kv.value ~ '^[0-9]+$' then (kv.value)::int else -1 end) < 0
       or (case when kv.value ~ '^[0-9]+$' then (kv.value)::int else -1 end)
            > jsonb_array_length(sp.svarskala) - 1
  ) then raise exception 'Ugyldig svar'; end if;

  update public.tu_koder k set brukt = true
    from public.tu_runder r
   where k.kode_hmac = p_kode_hmac and k.brukt = false
     and r.id = k.runde_id and r.status = 'apen'
  returning k.runde_id into v_runde;
  if v_runde is null then raise exception 'Ugyldig eller brukt kode'; end if;

  insert into public.tu_svar (runde_id, svar, trinn, kjonn)
  values (v_runde, p_svar, p_trinn, p_kjonn);
end $function$;

-- ── tu_lukk_runde_motor (068) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_lukk_runde_motor(p_runde uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_r public.tu_runder%rowtype; v_resultat jsonb; v_total int;
begin
  select * into v_r from public.tu_runder where id = p_runde for update;
  if v_r.id is null then raise exception 'Ukjent runde'; end if;
  if v_r.status = 'lukket' then return; end if;
  update public.tu_runder set status='lukket', lukket_at = coalesce(lukket_at, now())
   where id = p_runde;
  select count(*) into v_total from public.tu_svar where runde_id = p_runde;
  select jsonb_agg(to_jsonb(t)) into v_resultat
    from public.tu_skjermet_runde(p_runde) t;
  if not exists (select 1 from public.tu_arkiv a where a.runde_id = p_runde) then
    insert into public.tu_arkiv(runde_id, skole_id, trinn, skoleaar, semester,
                                land, sporsmalversjon, antall_totalt, resultat)
    values (p_runde, v_r.skole_id, v_r.trinn, v_r.skoleaar, v_r.semester,
            v_r.land, v_r.sporsmalversjon, v_total, coalesce(v_resultat, '[]'::jsonb));
  end if;
  delete from public.tu_koder where runde_id = p_runde;
  update public.tu_svar set svar = svar where runde_id = p_runde;
end $function$;

-- ── tu_opprett_koder (045) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_opprett_koder(p_runde uuid, p_hmacs text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_skole uuid; v_status text; v_antall int;
begin
  select skole_id, status into v_skole, v_status from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  if v_status not in ('utkast','apen') then raise exception 'Runden er lukket'; end if;
  insert into public.tu_koder(runde_id, kode_hmac)
    select p_runde, h from unnest(p_hmacs) h
  on conflict (kode_hmac) do nothing;
  get diagnostics v_antall = row_count;
  return v_antall;
end $function$;

-- ── tu_skjerm_fordeling (045) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_skjerm_fordeling(p_fordeling jsonb, p_antall integer, p_homogen_grense integer, p_celle_min integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_maxcount int := 0; v_maxkey text;
  v_key text; v_val int;
  v_visible jsonb := '{}'::jsonb;
  v_skjulte text[] := array[]::text[];
  v_min_key text;
begin
  if p_antall is null or p_antall = 0 then
    return jsonb_build_object('homogen', false, 'fordeling', '{}'::jsonb,
                              'skjulte', 0, 'antall', coalesce(p_antall,0));
  end if;

  for v_key, v_val in select key, value::int from jsonb_each_text(p_fordeling) loop
    if v_val > v_maxcount then v_maxcount := v_val; v_maxkey := v_key; end if;
  end loop;

  if v_maxcount * 100 >= p_homogen_grense * p_antall then
    return jsonb_build_object('homogen', true, 'dominans_verdi', v_maxkey,
                              'fordeling', null, 'skjulte', null, 'antall', p_antall);
  end if;

  for v_key, v_val in select key, value::int from jsonb_each_text(p_fordeling) loop
    if v_val < p_celle_min then
      v_skjulte := array_append(v_skjulte, v_key);
    else
      v_visible := v_visible || jsonb_build_object(v_key, v_val);
    end if;
  end loop;

  if coalesce(array_length(v_skjulte,1),0) = 1 then
    select key into v_min_key
      from jsonb_each_text(v_visible)
     order by value::int asc, key asc
     limit 1;
    if v_min_key is not null then
      v_visible := v_visible - v_min_key;
      v_skjulte := array_append(v_skjulte, v_min_key);
    end if;
  end if;

  return jsonb_build_object(
    'homogen', false,
    'fordeling', v_visible,
    'skjulte', coalesce(array_length(v_skjulte,1),0),
    'antall', p_antall);
end $function$;

-- ── tu_skjermet_runde (045) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_skjermet_runde(p_runde uuid)
 RETURNS TABLE(sporsmal integer, kategori text, antall integer, fordeling jsonb, homogen boolean, skjult boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_celle   int := (select verdi::int from public.tu_innstillinger where nokkel='celle_min');
  v_homogen int := (select verdi::int from public.tu_innstillinger where nokkel='homogen_grense_pct');
  v_versjon int; v_land text;
begin
  select sporsmalversjon, land into v_versjon, v_land
    from public.tu_runder where id = p_runde;

  return query
  with agg as (
    select a.sporsmal, a.fordeling, a.antall from public.tu_aggreger(p_runde) a
  ), medkat as (
    select ag.sporsmal, sp.kategori, ag.fordeling, ag.antall,
           coalesce(
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel = 'terskel.'||sp.kategori),
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel = 'terskel.standard')
           ) as terskel
    from agg ag
    join public.tu_sporsmal sp
      on sp.nummer = ag.sporsmal and sp.versjon = v_versjon and sp.land = v_land
  ), beregnet as (
    select m.sporsmal, m.kategori, m.antall, (m.antall < m.terskel) as skjult,
           case when m.antall < m.terskel then null
                else public.tu_skjerm_fordeling(m.fordeling, m.antall, v_homogen, v_celle)
           end as res
    from medkat m
  )
  select b.sporsmal, b.kategori,
         case when b.skjult then null else b.antall end,
         case when b.skjult or coalesce((b.res->>'homogen')::boolean, false)
              then null else b.res->'fordeling' end,
         case when b.skjult then false
              else coalesce((b.res->>'homogen')::boolean, false) end,
         b.skjult
  from beregnet b
  order by b.sporsmal;
end $function$;

-- ── tu_slett_utgatte_raasvar (045) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_slett_utgatte_raasvar()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_dager int := (select verdi::int from public.tu_innstillinger where nokkel='retensjon_dager');
        v_slettet int;
begin
  with kandidater as (
    select r.id
    from public.tu_runder r
    where r.status = 'lukket'
      and r.lukket_at is not null
      and r.lukket_at < now() - make_interval(days => v_dager)
      and exists (select 1 from public.tu_arkiv a where a.runde_id = r.id)
  ), slett as (
    delete from public.tu_svar s using kandidater k where s.runde_id = k.id returning 1
  )
  select count(*) into v_slettet from slett;
  return v_slettet;
end $function$;

-- ── tu_statistikk (045) — kommentarer strippet i prod (kode uendret)
CREATE OR REPLACE FUNCTION public.tu_statistikk(p_nettverk text DEFAULT NULL::text, p_skoleaar text DEFAULT NULL::text, p_trinn integer DEFAULT NULL::integer, p_land text DEFAULT 'NO'::text)
 RETURNS TABLE(sporsmal integer, kategori text, antall_ca integer, fordeling_band jsonb, homogen boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_min_sk  int := (select verdi::int from public.tu_innstillinger where nokkel='min_skoler');
  v_dom     int := (select verdi::int from public.tu_innstillinger where nokkel='dominansgrense');
  v_celle   int := (select verdi::int from public.tu_innstillinger where nokkel='celle_min');
  v_homogen int := (select verdi::int from public.tu_innstillinger where nokkel='homogen_grense_pct');
  v_band    int := (select verdi::int from public.tu_innstillinger where nokkel='sentral_band_pct');
  v_rund    int := (select verdi::int from public.tu_innstillinger where nokkel='sentral_antall_rund');
  v_total int; v_distinkte int; v_maxandel numeric;
begin
  if not public.tu_er_ansatt() then raise exception 'Kun ansatt'; end if;

  select count(*), count(distinct r.skole_id) into v_total, v_distinkte
  from public.tu_svar s
  join public.tu_runder r on r.id = s.runde_id
  join public.skoler   sk on sk.id = r.skole_id
  where (p_nettverk is null or sk.nettverk = p_nettverk)
    and (p_skoleaar is null or r.skoleaar  = p_skoleaar)
    and (p_trinn    is null or r.trinn     = p_trinn)
    and (p_land     is null or r.land      = p_land);

  if v_total = 0 or v_distinkte < v_min_sk then return; end if;

  select max(andel) into v_maxandel from (
    select count(*)::numeric / v_total * 100 as andel
    from public.tu_svar s
    join public.tu_runder r on r.id = s.runde_id
    join public.skoler   sk on sk.id = r.skole_id
    where (p_nettverk is null or sk.nettverk = p_nettverk)
      and (p_skoleaar is null or r.skoleaar  = p_skoleaar)
      and (p_trinn    is null or r.trinn     = p_trinn)
      and (p_land     is null or r.land      = p_land)
    group by r.skole_id) q;
  if v_maxandel > v_dom then return; end if;

  return query
  with rel as (
    select s.svar
    from public.tu_svar s
    join public.tu_runder r on r.id = s.runde_id
    join public.skoler   sk on sk.id = r.skole_id
    where (p_nettverk is null or sk.nettverk = p_nettverk)
      and (p_skoleaar is null or r.skoleaar  = p_skoleaar)
      and (p_trinn    is null or r.trinn     = p_trinn)
      and (p_land     is null or r.land      = p_land)
  ), utpakket as (
    select (kv.key)::int sp, (kv.value)::int verdi
    from rel, lateral jsonb_each_text(rel.svar) kv
  ), teller as (
    select sp, verdi, count(*)::int ant from utpakket group by sp, verdi
  ), perspm as (
    select sp, jsonb_object_agg(verdi::text, ant order by verdi) fordeling, sum(ant)::int antall
    from teller group by sp
  ), medkat as (
    select p.sp, sp2.kategori, p.fordeling, p.antall,
           coalesce(
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel='terskel.'||sp2.kategori),
             (select i.verdi::int from public.tu_innstillinger i where i.nokkel='terskel.standard')
           ) terskel
    from perspm p
    join public.tu_sporsmal sp2
      on sp2.nummer = p.sp and sp2.versjon = 1 and sp2.land = coalesce(p_land,'NO')
  ), skjermet as (
    select mk.sp, mk.kategori, mk.antall,
           public.tu_skjerm_fordeling(mk.fordeling, mk.antall, v_homogen, v_celle) res
    from medkat mk
    where mk.antall >= mk.terskel
  )
  select sk.sp, sk.kategori,
         (round(sk.antall::numeric / v_rund) * v_rund)::int as antall_ca,
         case when (sk.res->>'homogen')::boolean then null
              else public.tu_band_fordeling(sk.res->'fordeling', sk.antall, v_band) end,
         coalesce((sk.res->>'homogen')::boolean, false)
  from skjermet sk
  order by sk.sp;
end $function$;

-- ----------------------------------------------------------------------------
-- KVITTERING (én rad, les rett før commit): alle 15 finnes.
-- ----------------------------------------------------------------------------
select 'antall av de 15 som finnes (skal være 15): ' || count(*) as kvittering
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in (
  'anonymiser_bruk_hendelse','flytt_skole_til_kurs','hent_sendelogg_for_kurs','meld_paa_webinar',
  'tu_auto_lukk_forfalne','tu_er_ansatt','tu_folg_med','tu_har_tilgang_skole','tu_lever_svar',
  'tu_lukk_runde_motor','tu_opprett_koder','tu_skjerm_fordeling','tu_skjermet_runde',
  'tu_slett_utgatte_raasvar','tu_statistikk');

commit;
