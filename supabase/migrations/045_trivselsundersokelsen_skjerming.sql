-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — MIGRASJON 045: SKJERMINGSREVISJON + TO UTGANGER
--                        + HMAC-KODER + ARKIV/SLETTING
-- Trivselsleder-ny · 17. aug 2026 · Model B · hovedbasen «bak lås»
--
-- Overstyrer delplanen der de er uenige (juridisk kvalitetssjekk 17. aug):
--   * k=7 UTGÅTT. Nå per-kategori-terskel: standard 10, mobbing/alenegang 15.
--   * «homogene celler aksepteres» UTGÅTT → homogen-sperre (aldri «7 av 7»).
--   * Ordet «anonym» brukes ikke i logikken; skjerming er teknisk, ikke lovnad.
--
-- FORUTSETNING: migrasjon 041 er kjørt live (5 tabeller, hjelpere tu_er_ansatt,
--   tu_har_tilgang_skole, tu_aggreger finnes og er korrekte — røres ikke her).
--   Ingen ekte data finnes ennå → strukturendringer er trygge.
--
-- HMAC-KODER: rå-koden når ALDRI databasen. API-serveren (Vercel) beregner
--   HMAC(kode, hemmelig_nøkkel) og sender kun HMAC-verdien hit. Databasen lagrer
--   og sammenligner bare HMAC. (Vault-variant = endre tu_lever_svar til å hashe
--   selv; da må nøkkelen leses fra vault.decrypted_secrets.)
--
-- KJØRES i Supabase SQL-editor som ÉN transaksjon (alt-eller-ingenting).
-- Idempotent der det er mulig (IF NOT EXISTS / IF EXISTS / on conflict).
-- Alle funksjoner: SECURITY DEFINER + SET search_path='' + fullt skjemakvalifisert.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) INNSTILLINGER — terskler PER KATEGORI + skjermings- og retensjonsparametre
--    (delplanens globale k=7 fjernes; alt hentes herfra, aldri hardkodet)
-- ---------------------------------------------------------------------------
delete from public.tu_innstillinger
 where nokkel in ('k_terskel','min_skoler_nasjonalt');   -- utgåtte nøkler

insert into public.tu_innstillinger (nokkel, verdi) values
  -- Terskel = minste antall svar på ET spørsmål før tallet vises (per kategori).
  -- 10/15 er JURIDISKE MINSTEKRAV. Å gå lavere er en personvernbeslutning med
  -- jurist, ikke en driftsendring. Å gå høyere er trygt og kan gjøres her.
  ('terskel.standard'     , '10'),
  ('terskel.trivsel'      , '10'),
  ('terskel.aktivitet'    , '10'),
  ('terskel.vennskap'     , '10'),
  ('terskel.alenegang'    , '15'),
  ('terskel.laeringsmiljo', '10'),
  ('terskel.mobbing'      , '15'),
  -- Celle-skjerming: en enkelt svarkategori vises kun ved >= celle_min svar
  -- (dvs. 1–3 svar skjules), selv om totalen er over terskelen.
  ('celle_min'            , '4'),
  -- Homogen-sperre: holder én svarkategori >= homogen_grense_pct % av alle
  -- svarene, skjules den eksakte fordelingen (vises som bredt bånd av UI-et).
  ('homogen_grense_pct'   , '90'),
  -- Utgang 2 (tverr-skole): bånd-bredde i prosentpoeng for grovkorning.
  ('sentral_band_pct'     , '5'),
  -- Utgang 2: rund totalantall til nærmeste N (sløring av gruppestørrelse).
  ('sentral_antall_rund'  , '10'),
  -- Utgang 2: minst antall DISTINKTE skoler i en tverr-skole-gruppe.
  ('min_skoler'           , '5'),
  -- Utgang 2: én skole kan ikke utgjøre > dominansgrense % av svarene.
  ('dominansgrense'       , '50'),
  -- Sletting av RÅSVAR: N dager etter at runden er lukket OG arkivert.
  ('retensjon_dager'      , '90')
on conflict (nokkel) do update set verdi = excluded.verdi;

-- behold standard_frist_dager fra 041 (opprettes hvis den mangler)
insert into public.tu_innstillinger (nokkel, verdi) values ('standard_frist_dager','14')
on conflict (nokkel) do nothing;

-- ---------------------------------------------------------------------------
-- 2) STRUKTUR — HMAC-kolonne, lukket-tidspunkt, arkivtabell
-- ---------------------------------------------------------------------------
-- 2a) tu_koder: rå hash → HMAC. Døp om kolonnen (unik-indeksen følger med).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='tu_koder'
               and column_name='kode_hash') then
    alter table public.tu_koder rename column kode_hash to kode_hmac;
  end if;
end $$;

-- 2b) tidspunkt for lukking (styrer 90-dagers retensjon)
alter table public.tu_runder add column if not exists lukket_at timestamptz;

-- 2c) ARKIV: ferdig skjermet aggregat per lukket runde. Tidsserien leses HERFRA,
--     aldri fra råsvar. Skrives FØR råsvar noen gang slettes (se tu_lukk_runde).
create table if not exists public.tu_arkiv (
  id              uuid primary key default gen_random_uuid(),
  runde_id        uuid,            -- kan bli NULL hvis runden slettes; serien bevares
  skole_id        uuid not null,
  trinn           int  not null,
  skoleaar        text not null,
  semester        text,
  land            text not null default 'NO',
  sporsmalversjon int  not null default 1,
  antall_totalt   int,             -- antall innsendte skjema (grovt mål på deltakelse)
  resultat        jsonb not null,  -- ferdig skjermet utgang-1-resultat per spørsmål
  arkivert_at     timestamptz not null default now()
);
create index if not exists tu_arkiv_skole_trinn_idx
  on public.tu_arkiv(skole_id, trinn, skoleaar);

alter table public.tu_arkiv enable row level security;
-- INGEN policyer → ingen rolle kan liste arkivet direkte; lesing kun via funksjon.

-- ---------------------------------------------------------------------------
-- 3) SKJERMINGS-HJELPERE (rene funksjoner, ingen tabelltilgang)
-- ---------------------------------------------------------------------------
-- 3a) Skjerm én fordeling: homogen-sperre + celle-skjerming (1–3) + komplementær.
--     Inn: {"0":12,"1":8,"2":5,"3":2,"4":1}, antall=28.
--     Ut : { homogen, dominans_verdi?, fordeling, skjulte, antall }.
create or replace function public.tu_skjerm_fordeling(
  p_fordeling jsonb, p_antall int, p_homogen_grense int, p_celle_min int)
returns jsonb
language plpgsql immutable set search_path = '' as $$
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

  -- største svarkategori (for homogenitet)
  for v_key, v_val in select key, value::int from jsonb_each_text(p_fordeling) loop
    if v_val > v_maxcount then v_maxcount := v_val; v_maxkey := v_key; end if;
  end loop;

  -- HOMOGEN / nesten-homogen: aldri eksakt «alle svarte likt». Vis som bånd.
  if v_maxcount * 100 >= p_homogen_grense * p_antall then
    return jsonb_build_object('homogen', true, 'dominans_verdi', v_maxkey,
                              'fordeling', null, 'skjulte', null, 'antall', p_antall);
  end if;

  -- CELLE-SKJERMING: skjul svarkategorier med 1..(celle_min-1) svar.
  for v_key, v_val in select key, value::int from jsonb_each_text(p_fordeling) loop
    if v_val < p_celle_min then
      v_skjulte := array_append(v_skjulte, v_key);
    else
      v_visible := v_visible || jsonb_build_object(v_key, v_val);
    end if;
  end loop;

  -- KOMPLEMENTÆR SKJERMING: skjules nøyaktig én celle, kan den regnes ut fra
  -- totalen. Skjul da også den minste synlige, så minst to er skjult.
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
end $$;

-- 3b) Grovkorn en (allerede skjermet) fordeling til prosent-bånd. KUN utgang 2.
--     {"0":12,"2":8} , antall=20 , band=5  →  {"0":"60-65%","2":"40-45%"}
create or replace function public.tu_band_fordeling(
  p_fordeling jsonb, p_antall int, p_band int)
returns jsonb
language plpgsql immutable set search_path = '' as $$
declare v_key text; v_val int; v_pct numeric; v_lo int; v_out jsonb := '{}'::jsonb;
begin
  if p_fordeling is null or p_antall is null or p_antall = 0 then
    return p_fordeling;
  end if;
  for v_key, v_val in select key, value::int from jsonb_each_text(p_fordeling) loop
    v_pct := v_val::numeric / p_antall * 100;
    v_lo  := (floor(v_pct / p_band) * p_band)::int;
    v_out := v_out || jsonb_build_object(v_key, (v_lo::text || '-' || (v_lo + p_band)::text || '%'));
  end loop;
  return v_out;
end $$;

-- ---------------------------------------------------------------------------
-- 4) INTERN SKJERMINGSPIPELINE for én runde (ingen authz — kun kalt av
--    SECURITY DEFINER-funksjonene under). Deles av utgang 1 OG arkivering,
--    slik at arkivet er nøyaktig det skolen så.
-- ---------------------------------------------------------------------------
create or replace function public.tu_skjermet_runde(p_runde uuid)
returns table(sporsmal int, kategori text, antall int, fordeling jsonb,
              homogen boolean, skjult boolean)
language plpgsql stable security definer set search_path = '' as $$
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
         -- homogen ELLER skjult → SQL-NULL (ikke JSON-null): rent for UI og arkiv
         case when b.skjult or coalesce((b.res->>'homogen')::boolean, false)
              then null else b.res->'fordeling' end,
         case when b.skjult then false
              else coalesce((b.res->>'homogen')::boolean, false) end,
         b.skjult
  from beregnet b
  order by b.sporsmal;
end $$;

-- ---------------------------------------------------------------------------
-- 5) UTGANG 1 — SKOLERAPPORT (skolens egne tall, kun skolen ser dem)
--    Presise tall. Vakter: per-kategori-terskel + homogen-sperre + celle/komplementær.
--    INGEN grovkorning her (skolen skal se reell utvikling over tid).
-- ---------------------------------------------------------------------------
drop function if exists public.tu_skole_resultat(uuid);
create function public.tu_skole_resultat(p_runde uuid)
returns table(sporsmal int, kategori text, antall int, fordeling jsonb,
              homogen boolean, skjult boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_skole uuid;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  return query select * from public.tu_skjermet_runde(p_runde);
end $$;

-- ---------------------------------------------------------------------------
-- 6) UTGANG 2 — STATISTIKKDATASETT for Trivselsleder AS (eget formål)
--    KUN fler-skole-aggregat. ALDRI p_skole (ingen drilldown til enkeltskole).
--    Sterkere skjermet: min. antall skoler + dominans + prosent-bånd (grovkorning).
--    Faste grupperingsdimensjoner (nettverk/skoleår/trinn/land) — ingen
--    brukerdefinerte skolelister → subtraksjon mellom vilkårlige grupper er umulig.
-- ---------------------------------------------------------------------------
drop function if exists public.tu_aggregat(uuid,text,text,int,text);
drop function if exists public.tu_aggreger_filtrert(uuid,text,text,int,text,int,int,int);

create or replace function public.tu_statistikk(
  p_nettverk text default null, p_skoleaar text default null,
  p_trinn int default null, p_land text default 'NO')
returns table(sporsmal int, kategori text, antall_ca int,
              fordeling_band jsonb, homogen boolean)
language plpgsql stable security definer set search_path = '' as $$
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

  -- Antall svar + distinkte skoler i gruppen (alltid fler-skole)
  select count(*), count(distinct r.skole_id) into v_total, v_distinkte
  from public.tu_svar s
  join public.tu_runder r on r.id = s.runde_id
  join public.skoler   sk on sk.id = r.skole_id
  where (p_nettverk is null or sk.nettverk = p_nettverk)
    and (p_skoleaar is null or r.skoleaar  = p_skoleaar)
    and (p_trinn    is null or r.trinn     = p_trinn)
    and (p_land     is null or r.land      = p_land);

  if v_total = 0 or v_distinkte < v_min_sk then return; end if;   -- for få skoler → ingenting

  -- Dominans: ingen enkeltskole > dominansgrense % av svarene
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
  if v_maxandel > v_dom then return; end if;                      -- én skole dominerer → ingenting

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
    where mk.antall >= mk.terskel                                 -- kategori-terskel
  )
  select sk.sp, sk.kategori,
         (round(sk.antall::numeric / v_rund) * v_rund)::int as antall_ca,   -- grovt antall
         case when (sk.res->>'homogen')::boolean then null                  -- homogen → intet eksakt
              else public.tu_band_fordeling(sk.res->'fordeling', sk.antall, v_band) end,
         coalesce((sk.res->>'homogen')::boolean, false)
  from skjermet sk
  order by sk.sp;
end $$;

-- ---------------------------------------------------------------------------
-- 7) KODER — mottak (HMAC) + oppretting (server sender ferdig HMAC)
-- ---------------------------------------------------------------------------
-- 7a) Elevens innsending. Rå-koden hashes i API-serveren; hit kommer kun HMAC.
--     Reserverer kode + lagrer svar atomisk. Ingen kobling kode↔svar lagres.
--     (041 hadde parameter p_kode → navnebytte krever DROP før CREATE.)
drop function if exists public.tu_lever_svar(text,jsonb);
create or replace function public.tu_lever_svar(p_kode_hmac text, p_svar jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_runde uuid;
begin
  if jsonb_typeof(p_svar) <> 'object' or p_svar = '{}'::jsonb then
    raise exception 'Tomt eller ugyldig svar'; end if;
  -- kun spørsmålsnummer 1–13
  if exists (select 1 from jsonb_each_text(p_svar) kv where kv.key !~ '^([1-9]|1[0-3])$') then
    raise exception 'Ugyldig svar'; end if;
  -- hver verdi må være heltall innenfor spørsmålets skala
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

  insert into public.tu_svar (runde_id, svar) values (v_runde, p_svar);  -- ingen kode-id
end $$;

-- 7b) Oppretting av koder. Serveren genererer høy-entropi-koder, beregner HMAC,
--     og sender KUN HMAC-listen hit. Rå-kodene returneres til lærerens utskrift
--     av serveren og lagres aldri.
create or replace function public.tu_opprett_koder(p_runde uuid, p_hmacs text[])
returns int language plpgsql security definer set search_path = '' as $$
declare v_skole uuid; v_status text; v_antall int;
begin
  select skole_id, status into v_skole, v_status from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  if v_status not in ('utkast','apen') then raise exception 'Runden er lukket'; end if;
  insert into public.tu_koder(runde_id, kode_hmac)
    select p_runde, h from unnest(p_hmacs) h
  on conflict (kode_hmac) do nothing;     -- globalt unik; kollisjon (usannsynlig) hoppes over
  get diagnostics v_antall = row_count;
  return v_antall;
end $$;

-- ---------------------------------------------------------------------------
-- 8) LUKKING + ARKIV + SLETTING
-- ---------------------------------------------------------------------------
-- 8a) Lukk runde. KRITISK REKKEFØLGE: arkiver skjermet aggregat FØR noe slettes.
create or replace function public.tu_lukk_runde(p_runde uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_r public.tu_runder%rowtype; v_resultat jsonb; v_total int;
begin
  select * into v_r from public.tu_runder where id = p_runde;
  if v_r.id is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_r.skole_id) then raise exception 'Ingen tilgang'; end if;

  -- (1) lukk
  update public.tu_runder set status='lukket', lukket_at = coalesce(lukket_at, now())
   where id = p_runde;

  -- (2) ARKIVER FØR SLETTING — ferdig skjermet utgang-1-resultat
  select count(*) into v_total from public.tu_svar where runde_id = p_runde;
  select jsonb_agg(to_jsonb(t)) into v_resultat
    from public.tu_skjermet_runde(p_runde) t;
  if not exists (select 1 from public.tu_arkiv a where a.runde_id = p_runde) then
    insert into public.tu_arkiv(runde_id, skole_id, trinn, skoleaar, semester,
                                land, sporsmalversjon, antall_totalt, resultat)
    values (p_runde, v_r.skole_id, v_r.trinn, v_r.skoleaar, v_r.semester,
            v_r.land, v_r.sporsmalversjon, v_total, coalesce(v_resultat, '[]'::jsonb));
  end if;

  -- (3) slett kodehasher (runden er lukket → kodene skal aldri virke igjen)
  delete from public.tu_koder where runde_id = p_runde;

  -- (4) re-stemple svar (felles xmin → bryter transaksjonstids-tråden)
  update public.tu_svar set svar = svar where runde_id = p_runde;

  -- MERK: råsvar (tu_svar) slettes IKKE her. tu_slett_utgatte_raasvar() gjør det
  --       etter 'retensjon_dager', og KUN når arkivraden finnes.
end $$;

-- 8b) Retensjon: slett RÅSVAR for runder lukket for > retensjon_dager siden,
--     men ALDRI uten at arkivraden finnes (tidsserien må aldri tapes).
--     Kjøres av cron (byggetrinn 2). Kun service_role.
create or replace function public.tu_slett_utgatte_raasvar()
returns int language plpgsql security definer set search_path = '' as $$
declare v_dager int := (select verdi::int from public.tu_innstillinger where nokkel='retensjon_dager');
        v_slettet int;
begin
  with kandidater as (
    select r.id
    from public.tu_runder r
    where r.status = 'lukket'
      and r.lukket_at is not null
      and r.lukket_at < now() - make_interval(days => v_dager)
      and exists (select 1 from public.tu_arkiv a where a.runde_id = r.id)  -- aldri uten arkiv
  ), slett as (
    delete from public.tu_svar s using kandidater k where s.runde_id = k.id returning 1
  )
  select count(*) into v_slettet from slett;
  return v_slettet;
end $$;

-- 8c) Tidsserie for skolen — leses fra ARKIV, aldri fra råsvar.
create or replace function public.tu_skole_utvikling(p_skole uuid, p_trinn int)
returns table(skoleaar text, semester text, antall_totalt int,
              resultat jsonb, arkivert_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tu_har_tilgang_skole(p_skole) then raise exception 'Ingen tilgang'; end if;
  return query
    select a.skoleaar, a.semester, a.antall_totalt, a.resultat, a.arkivert_at
    from public.tu_arkiv a
    where a.skole_id = p_skole and a.trinn = p_trinn
    order by a.skoleaar, a.semester;
end $$;

-- ---------------------------------------------------------------------------
-- 9) GRANT / REVOKE  (funksjoner får EXECUTE til PUBLIC som default → strammes)
--    Nøstede kall inne i SECURITY DEFINER kjøres som eier → revoke bryter dem ikke.
-- ---------------------------------------------------------------------------
-- interne / rene hjelpere: ingen direkte kallere
revoke execute on function public.tu_skjerm_fordeling(jsonb,int,int,int) from public, anon, authenticated;
revoke execute on function public.tu_band_fordeling(jsonb,int,int)        from public, anon, authenticated;
revoke execute on function public.tu_skjermet_runde(uuid)                 from public, anon, authenticated;

-- utgang 1 + tidsserie + kodeoppretting + lukking: innlogget skole/ansatt
revoke execute on function public.tu_skole_resultat(uuid)      from public, anon;
grant  execute on function public.tu_skole_resultat(uuid)      to authenticated, service_role;
revoke execute on function public.tu_skole_utvikling(uuid,int) from public, anon;
grant  execute on function public.tu_skole_utvikling(uuid,int) to authenticated, service_role;
revoke execute on function public.tu_opprett_koder(uuid,text[]) from public, anon;
grant  execute on function public.tu_opprett_koder(uuid,text[]) to authenticated, service_role;
revoke execute on function public.tu_lukk_runde(uuid)         from public, anon;
grant  execute on function public.tu_lukk_runde(uuid)         to authenticated, service_role;

-- utgang 2 (statistikk): kun ansatt/superadmin — REVOKE anon, håndhev i kropp
revoke execute on function public.tu_statistikk(text,text,int,text) from public, anon;
grant  execute on function public.tu_statistikk(text,text,int,text) to authenticated, service_role;

-- elev-innsending: går via API-serveren (service_role). Rå-anon kaller IKKE DB direkte.
revoke execute on function public.tu_lever_svar(text,jsonb) from public, anon, authenticated;
grant  execute on function public.tu_lever_svar(text,jsonb) to service_role;

-- retensjonsjobb: kun service_role (cron)
revoke execute on function public.tu_slett_utgatte_raasvar() from public, anon, authenticated;
grant  execute on function public.tu_slett_utgatte_raasvar() to service_role;

-- ============================================================================
-- SLUTT MIGRASJON 045. Kjør deretter TU-045-verifisering.sql for BEVIS.
-- ============================================================================
