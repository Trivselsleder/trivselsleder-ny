-- ============================================================================
-- TRIVSELSUNDERSØKELSEN — BYGGETRINN 1: SIKKERHETSKJERNE (migrasjon) — KORRIGERT
-- Trivselsleder-ny · 16. aug 2026 · Model B · bygges i hovedbasen «bak lås»
--
-- KORRIGERT etter skjema-bekreftelse mot hovedbasen (zpirjbrcbeubwpmtncxx), 16. aug:
--   FIX A  tu_er_ansatt:        'administrator' finnes IKKE i profiles_rolle_check.
--          Etablert intern-rolle = 'ansatt' (28 authz-treff) + 'superadmin' (29).
--          ('administrator','superadmin')  →  ('ansatt','superadmin')
--   FIX B  tu_har_tilgang_skole: 'HTLA' finnes IKKE som rolle. Skole-siden = 'skoleadmin'
--          (23 authz-treff). superadmin dekkes av egen klausul over.
--          ('HTLA','skoleadmin')  →  ('skoleadmin')
--   FIX C  tu_har_tilgang_skole: get_mine_skole_ids() RETURNS SETOF uuid (ikke array).
--          `= any(...)` gir ERROR 42809 (bevist i editor). →  `in (select ...)`
--
-- Bekreftet skjema: profiles(id,rolle text, CHECK superadmin/skoleadmin/skoleansatt/ansatt),
--   get_mine_skole_ids()->SETOF uuid = SELECT skole_id FROM bruker_skole WHERE bruker_id=auth.uid(),
--   skoler.nettverk finnes (text), extensions.digest finnes (bytea,text + text,text).
--   tu_* tabeller finnes ikke fra før (ren base).
--
-- KJØRES i Supabase SQL-editor (hele skriptet = én implisitt transaksjon → alt-eller-ingenting).
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- 1) TABELLER  (B2: kode_hash globalt unik; B1: unik runde per skole/trinn/år/semester)
-- ---------------------------------------------------------------------------
create table if not exists public.tu_sporsmal (
  id        uuid primary key default gen_random_uuid(),
  nummer    int  not null,
  kategori  text not null check (kategori in
            ('trivsel','aktivitet','vennskap','alenegang','laeringsmiljo','mobbing')),
  i18n_tekst text not null,
  svarskala jsonb not null,
  versjon   int  not null default 1,
  land      text not null default 'NO',
  unique (versjon, land, nummer)
);

create table if not exists public.tu_runder (
  id            uuid primary key default gen_random_uuid(),
  skole_id      uuid not null references public.skoler(id) on delete cascade,
  trinn         int  not null check (trinn between 5 and 10),  -- B1: ÉN verdi (én runde per trinn)
  skoleaar      text not null,
  semester      text check (semester in ('host','var')),
  status        text not null default 'utkast' check (status in ('utkast','apen','lukket')),
  sporsmalversjon int not null default 1,
  land          text not null default 'NO',
  opprettet_av  uuid references public.profiles(id),
  frist         date,
  opprettet_at  timestamptz not null default now()
);
create index if not exists tu_runder_skole_idx on public.tu_runder(skole_id);
-- B1 håndhevet: maks én runde per (skole, trinn, skoleår, semester)
create unique index if not exists tu_runder_unik_trinn
  on public.tu_runder (skole_id, trinn, skoleaar, coalesce(semester,''));

create table if not exists public.tu_koder (
  id        uuid primary key default gen_random_uuid(),
  runde_id  uuid not null references public.tu_runder(id) on delete cascade,
  kode_hash text not null,
  brukt     boolean not null default false,
  unique (kode_hash)                        -- B2: globalt unik blant ALLE runder
);

create table if not exists public.tu_svar (
  id        uuid primary key default gen_random_uuid(),  -- tilfeldig, ikke løpenr
  runde_id  uuid not null references public.tu_runder(id) on delete cascade,
  svar      jsonb not null
);
-- MERK: tu_svar har INGEN kolonne mot tu_koder, ingen bruker-id, INGEN tidsstempel.

create table if not exists public.tu_innstillinger (
  nokkel text primary key,
  verdi  text not null
);
insert into public.tu_innstillinger (nokkel, verdi) values
  ('k_terskel', '7'), ('min_skoler_nasjonalt', '5'),
  ('dominansgrense', '50'), ('standard_frist_dager', '14')
on conflict (nokkel) do nothing;

-- ---------------------------------------------------------------------------
-- 2) SEED av de 13 spørsmålene (ASCII-kategorier; i18n-nøkler; ORDER BY for skala-rekkefølge)
-- ---------------------------------------------------------------------------
insert into public.tu_sporsmal (nummer, kategori, i18n_tekst, svarskala) values
 (1 ,'trivsel'      ,'tu.sp.1.tekst' , (select jsonb_agg('tu.sp.1.svar.'||g  order by g) from generate_series(0,4) g)),
 (2 ,'trivsel'      ,'tu.sp.2.tekst' , (select jsonb_agg('tu.sp.2.svar.'||g  order by g) from generate_series(0,4) g)),
 (3 ,'trivsel'      ,'tu.sp.3.tekst' , (select jsonb_agg('tu.sp.3.svar.'||g  order by g) from generate_series(0,4) g)),
 (4 ,'aktivitet'    ,'tu.sp.4.tekst' , (select jsonb_agg('tu.sp.4.svar.'||g  order by g) from generate_series(0,2) g)),
 (5 ,'aktivitet'    ,'tu.sp.5.tekst' , (select jsonb_agg('tu.sp.5.svar.'||g  order by g) from generate_series(0,5) g)),
 (6 ,'vennskap'     ,'tu.sp.6.tekst' , (select jsonb_agg('tu.sp.6.svar.'||g  order by g) from generate_series(0,3) g)),
 (7 ,'vennskap'     ,'tu.sp.7.tekst' , (select jsonb_agg('tu.sp.7.svar.'||g  order by g) from generate_series(0,2) g)),
 (8 ,'alenegang'    ,'tu.sp.8.tekst' , (select jsonb_agg('tu.sp.8.svar.'||g  order by g) from generate_series(0,4) g)),
 (9 ,'alenegang'    ,'tu.sp.9.tekst' , (select jsonb_agg('tu.sp.9.svar.'||g  order by g) from generate_series(0,3) g)),
 (10,'laeringsmiljo','tu.sp.10.tekst', (select jsonb_agg('tu.sp.10.svar.'||g order by g) from generate_series(0,4) g)),
 (11,'mobbing'      ,'tu.sp.11.tekst', (select jsonb_agg('tu.sp.11.svar.'||g order by g) from generate_series(0,4) g)),
 (12,'mobbing'      ,'tu.sp.12.tekst', (select jsonb_agg('tu.sp.12.svar.'||g order by g) from generate_series(0,4) g)),
 (13,'mobbing'      ,'tu.sp.13.tekst', (select jsonb_agg('tu.sp.13.svar.'||g order by g) from generate_series(0,4) g))
on conflict (versjon, land, nummer) do nothing;

-- ---------------------------------------------------------------------------
-- 3) HJELPEFUNKSJONER (opprettes FØR policyene som bruker dem — rekkefølge!)
-- ---------------------------------------------------------------------------
create or replace function public.tu_er_ansatt()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.rolle in ('ansatt','superadmin'));  -- FIX A
$$;

create or replace function public.tu_har_tilgang_skole(p_skole uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'superadmin')
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid()
                   and p.rolle = 'skoleadmin'                             -- FIX B (HTLA finnes ikke)
                   and p_skole in (select bs.skole_id from public.bruker_skole bs
                                   where bs.bruker_id = auth.uid()));      -- FIX E: inline + kvalifisert.
                   -- FIX C var `= any(get_mine_skole_ids())` → 42809. FIX E: get_mine_skole_ids() bruker
                   -- UKVALIFISERT bruker_skole uten egen search_path → 42P01 under vaar search_path=''.
                   -- Inlinet fullkvalifisert public.bruker_skole (bevist via RLS-simulering som skoleadmin).
$$;

create or replace function public.tu_aggreger(p_runde uuid)
returns table(sporsmal int, fordeling jsonb, antall int)
language sql stable security definer set search_path = '' as $$
  with utpakket as (
    select (kv.key)::int sp, (kv.value)::int verdi
    from public.tu_svar s, lateral jsonb_each_text(s.svar) kv
    where s.runde_id = p_runde
  ), teller as (select sp, verdi, count(*)::int antall from utpakket group by sp, verdi)
  select sp, jsonb_object_agg(verdi::text, antall order by verdi), sum(antall)::int
  from teller group by sp;
$$;

-- Model B (skole/nettverk/nasjonalt).
create or replace function public.tu_aggreger_filtrert(
  p_skole uuid, p_nettverk text, p_skoleaar text, p_trinn int, p_land text,
  v_k int, v_minsk int, v_dom int)
returns table(sporsmal int, fordeling jsonb, antall int)
language plpgsql stable security definer set search_path = '' as $$
declare v_flerskole boolean := (p_skole is null);   -- funn 5: gjelder nettverk OG nasjonalt
        v_total int; v_distinkte int; v_maxandel numeric;
begin
  select count(*), count(distinct r.skole_id) into v_total, v_distinkte
  from public.tu_svar s
  join public.tu_runder r on r.id = s.runde_id
  join public.skoler   sk on sk.id = r.skole_id
  where (p_skole    is null or r.skole_id = p_skole)
    and (p_nettverk is null or sk.nettverk = p_nettverk)
    and (p_skoleaar is null or r.skoleaar = p_skoleaar)
    and (p_trinn    is null or r.trinn    = p_trinn)
    and (p_land     is null or r.land     = p_land);

  if v_total < v_k then return; end if;

  if v_flerskole then
    if v_distinkte < v_minsk then return; end if;              -- ≥5 skoler
    select max(andel) into v_maxandel from (
      select count(*)::numeric / v_total * 100 andel
      from public.tu_svar s
      join public.tu_runder r on r.id = s.runde_id
      join public.skoler   sk on sk.id = r.skole_id
      where (p_nettverk is null or sk.nettverk = p_nettverk)
        and (p_skoleaar is null or r.skoleaar = p_skoleaar)
        and (p_trinn    is null or r.trinn    = p_trinn)
        and (p_land     is null or r.land     = p_land)
      group by r.skole_id) q;
    if v_maxandel > v_dom then return; end if;                 -- ingen skole > 50 %
  end if;

  return query
  with rel as (
    select s.svar
    from public.tu_svar s
    join public.tu_runder r on r.id = s.runde_id
    join public.skoler   sk on sk.id = r.skole_id
    where (p_skole    is null or r.skole_id = p_skole)
      and (p_nettverk is null or sk.nettverk = p_nettverk)
      and (p_skoleaar is null or r.skoleaar = p_skoleaar)
      and (p_trinn    is null or r.trinn    = p_trinn)
      and (p_land     is null or r.land     = p_land)
  ), utpakket as (
    select (kv.key)::int sp, (kv.value)::int verdi from rel, lateral jsonb_each_text(svar) kv
  ), teller as (select sp, verdi, count(*)::int ant from utpakket group by sp, verdi)
  select sp, jsonb_object_agg(verdi::text, ant order by verdi), sum(ant)::int
  from teller group by sp having sum(ant) >= v_k;
end $$;

-- ---------------------------------------------------------------------------
-- 4) RLS på ALLE fem tabellene (B3) + policyer (etter at hjelperne finnes)
-- ---------------------------------------------------------------------------
alter table public.tu_svar          enable row level security;
alter table public.tu_koder         enable row level security;
alter table public.tu_runder        enable row level security;
alter table public.tu_sporsmal      enable row level security;
alter table public.tu_innstillinger enable row level security;
-- tu_svar/tu_koder/tu_innstillinger: INGEN policyer → ingen rolle kan liste rader.

drop policy if exists tu_runder_egen_skole_sel on public.tu_runder;
create policy tu_runder_egen_skole_sel on public.tu_runder for select to authenticated
  using (public.tu_har_tilgang_skole(skole_id));
drop policy if exists tu_runder_egen_skole_ins on public.tu_runder;
create policy tu_runder_egen_skole_ins on public.tu_runder for insert to authenticated
  with check (public.tu_har_tilgang_skole(skole_id));
drop policy if exists tu_runder_egen_skole_upd on public.tu_runder;
create policy tu_runder_egen_skole_upd on public.tu_runder for update to authenticated
  using (public.tu_har_tilgang_skole(skole_id)) with check (public.tu_har_tilgang_skole(skole_id));

drop policy if exists tu_sporsmal_les on public.tu_sporsmal;
create policy tu_sporsmal_les on public.tu_sporsmal for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 5) RPC-ene
-- ---------------------------------------------------------------------------
create or replace function public.tu_lever_svar(p_kode text, p_svar jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_hash text := encode(extensions.digest(p_kode, 'sha256'), 'hex');
        v_runde uuid;
begin
  if jsonb_typeof(p_svar) <> 'object' or p_svar = '{}'::jsonb then
    raise exception 'Tomt eller ugyldig svar'; end if;
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
   where k.kode_hash = v_hash and k.brukt = false
     and r.id = k.runde_id and r.status = 'apen'
     and r.sporsmalversjon = 1 and r.land = 'NO'
  returning k.runde_id into v_runde;
  if v_runde is null then raise exception 'Ugyldig eller brukt kode'; end if;

  insert into public.tu_svar (runde_id, svar) values (v_runde, p_svar);
end $$;

create or replace function public.tu_skole_resultat(p_runde uuid)
returns table(sporsmal int, fordeling jsonb, antall int)
language plpgsql stable security definer set search_path = '' as $$
declare v_k int := (select verdi::int from public.tu_innstillinger where nokkel='k_terskel');
        v_skole uuid; v_n int;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  select count(*) into v_n from public.tu_svar where runde_id = p_runde;
  if v_n < v_k then return; end if;
  return query select a.sporsmal, a.fordeling, a.antall
               from public.tu_aggreger(p_runde) a where a.antall >= v_k;
end $$;

create or replace function public.tu_aggregat(
  p_skole uuid default null, p_nettverk text default null,
  p_skoleaar text default null, p_trinn int default null, p_land text default 'NO')
returns table(sporsmal int, fordeling jsonb, antall int)
language plpgsql stable security definer set search_path = '' as $$
declare v_k int := (select verdi::int from public.tu_innstillinger where nokkel='k_terskel');
        v_msk int := (select verdi::int from public.tu_innstillinger where nokkel='min_skoler_nasjonalt');
        v_dom int := (select verdi::int from public.tu_innstillinger where nokkel='dominansgrense');
begin
  if not public.tu_er_ansatt() then raise exception 'Kun ansatt'; end if;
  return query select * from public.tu_aggreger_filtrert(
    p_skole, p_nettverk, p_skoleaar, p_trinn, p_land, v_k, v_msk, v_dom);
end $$;

create or replace function public.tu_folg_med(p_runde uuid)
returns table(utdelt int, brukt int)
language plpgsql stable security definer set search_path = '' as $$
declare v_skole uuid;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  return query select count(*)::int, count(*) filter (where k.brukt)::int      -- FIX D: kvalifiser (OUT-param 'brukt' kolliderte med tu_koder.brukt)
               from public.tu_koder k where k.runde_id = p_runde;
end $$;

create or replace function public.tu_lukk_runde(p_runde uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_skole uuid;
begin
  select skole_id into v_skole from public.tu_runder where id = p_runde;
  if v_skole is null then raise exception 'Ukjent runde'; end if;
  if not public.tu_har_tilgang_skole(v_skole) then raise exception 'Ingen tilgang'; end if;
  update public.tu_runder set status = 'lukket' where id = p_runde;
  update public.tu_svar set svar = svar where runde_id = p_runde;  -- felles xmin på alle svar
end $$;

-- ---------------------------------------------------------------------------
-- 6) GRANT / REVOKE (B4 — funksjoner får EXECUTE til PUBLIC som default)
-- ---------------------------------------------------------------------------
grant select, insert, update on public.tu_runder   to authenticated;
grant select                 on public.tu_sporsmal to authenticated;
-- tu_svar, tu_koder, tu_innstillinger: INGEN grant.

revoke execute on function public.tu_er_ansatt()                                            from public, anon, authenticated;
revoke execute on function public.tu_har_tilgang_skole(uuid)                                from public, anon, authenticated;
grant  execute on function public.tu_har_tilgang_skole(uuid)                                to authenticated;
revoke execute on function public.tu_aggreger(uuid)                                         from public, anon, authenticated;
revoke execute on function public.tu_aggreger_filtrert(uuid,text,text,int,text,int,int,int) from public, anon, authenticated;

revoke execute on function public.tu_lever_svar(text,jsonb) from public;
grant  execute on function public.tu_lever_svar(text,jsonb) to anon, authenticated, service_role;

revoke execute on function public.tu_skole_resultat(uuid) from public, anon;
grant  execute on function public.tu_skole_resultat(uuid) to authenticated, service_role;

revoke execute on function public.tu_aggregat(uuid,text,text,int,text) from public, anon;
grant  execute on function public.tu_aggregat(uuid,text,text,int,text) to authenticated, service_role;

revoke execute on function public.tu_folg_med(uuid)  from public, anon;
grant  execute on function public.tu_folg_med(uuid)  to authenticated, service_role;

revoke execute on function public.tu_lukk_runde(uuid) from public, anon;
grant  execute on function public.tu_lukk_runde(uuid) to authenticated, service_role;

-- ============================================================================
-- SLUTT. Kjør TU-byggetrinn1-verifisering.sql for å BEVISE egenskapene.
-- ============================================================================
