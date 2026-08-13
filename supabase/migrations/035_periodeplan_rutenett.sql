-- =====================================================================
-- 035_periodeplan_rutenett.sql
-- Periodeplan v2 — UKERUTENETT (som dagens trivselsleder.no) + forbedringene
-- fra fremdriftsplan v38 §11.2. Erstatter den daterte lista fra Steg 5 v1.
--
--   Rutenett:  dager = valgbare ukedager (kolonner), rader = leker (PEKERE),
--              celle = TL-klasse/gruppe (fritekst el. fra skolens TL-liste),
--              ansvarlig per dag, uke(r) + år, orientering (liggende/stående).
--   Deling:    delingstoken + SECURITY DEFINER-RPC for skrivebeskyttet visning.
--   TL-liste:  tl_deltaker = skolens egen liste (ansvarlige/grupper).
--
-- Forutsetter 033 (periodeplan + hjelpere fase3_rolle/har_skole/intern).
-- Designvalg der planen er tynn (kan overstyres):
--   * Ferieuker: brukeren velger uker; generatoren i frontend foreslår vanlige
--     norske ferieuker som kan hukes av/på (varierer med region/år).
--   * «ansvarlige TL-elever fra skolens egen liste» = tl_deltaker (fritekst
--     fortsatt lov). Celle-innhold lagres som jsonb keyed på dagnavn (robust
--     mot at kolonner flyttes).
--   * «del lenke» = anon skrivebeskyttet via RPC på delingstoken (åpner IKKE
--     tabellen for anon).
-- =====================================================================

-- 1) Utvid periodeplan
alter table periodeplan
  add column if not exists aar          int,
  add column if not exists uker         int[]  not null default '{}',
  add column if not exists dager        text[] not null default '{MANDAG,TIRSDAG,ONSDAG,TORSDAG,FREDAG}',
  add column if not exists ansvarlige   jsonb  not null default '{}'::jsonb,   -- {dagnavn: ansvarlig}
  add column if not exists orientering  text   not null default 'landscape'
        check (orientering in ('landscape','portrait')),
  add column if not exists delingstoken uuid   not null default gen_random_uuid();

create unique index if not exists idx_periodeplan_delingstoken on periodeplan(delingstoken);

-- 2) Erstatt den daterte liste-tabellen (kun testdata – ingen ekte data enda)
drop table if exists periodeplan_oppforing cascade;

-- 3) Rader = leker (PEKERE). celler = jsonb keyed på dagnavn → TL-klasse/gruppe.
create table if not exists periodeplan_rad (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references periodeplan(id) on delete cascade,
  ressurs_id  uuid references ressurser(id) on delete set null,
  rekkefolge  int  not null default 0,
  celler      jsonb not null default '{}'::jsonb
);
create index if not exists idx_pp_rad_plan on periodeplan_rad(plan_id);

alter table periodeplan_rad enable row level security;
grant select, insert, update, delete on periodeplan_rad to authenticated;
grant all on periodeplan_rad to service_role;

drop policy if exists pp_rad_alle on periodeplan_rad;
create policy pp_rad_alle on periodeplan_rad for all to authenticated
  using (
    exists (select 1 from periodeplan p where p.id = periodeplan_rad.plan_id
      and ( p.bruker_id = auth.uid()
            or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(p.skole_id))
            or fase3_intern() ))
  )
  with check (
    exists (select 1 from periodeplan p where p.id = periodeplan_rad.plan_id
      and ( p.bruker_id = auth.uid()
            or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(p.skole_id))
            or fase3_intern() ))
  );

-- 4) Skolens TL-liste (ansvarlige / grupper som cellene og ansvarlig kan velges fra)
create table if not exists tl_deltaker (
  id           uuid primary key default gen_random_uuid(),
  skole_id     uuid not null references skoler(id) on delete cascade,
  navn         text not null,
  gruppe       text,
  aktiv        boolean not null default true,
  opprettet_at timestamptz not null default now()
);
create index if not exists idx_tl_deltaker_skole on tl_deltaker(skole_id);

alter table tl_deltaker enable row level security;
grant select, insert, update, delete on tl_deltaker to authenticated;
grant all on tl_deltaker to service_role;

-- lese: alle på skolen (eller intern); skrive: skoleadmin på egen skole (eller intern)
drop policy if exists tl_deltaker_les on tl_deltaker;
create policy tl_deltaker_les on tl_deltaker for select to authenticated
  using ( fase3_har_skole(skole_id) or fase3_intern() );

drop policy if exists tl_deltaker_ins on tl_deltaker;
create policy tl_deltaker_ins on tl_deltaker for insert to authenticated
  with check ( (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id)) or fase3_intern() );

drop policy if exists tl_deltaker_upd on tl_deltaker;
create policy tl_deltaker_upd on tl_deltaker for update to authenticated
  using ( (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id)) or fase3_intern() )
  with check ( (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id)) or fase3_intern() );

drop policy if exists tl_deltaker_del on tl_deltaker;
create policy tl_deltaker_del on tl_deltaker for delete to authenticated
  using ( (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id)) or fase3_intern() );

-- 5) Deling: skrivebeskyttet visning for hvem som helst med lenken (token).
--    SECURITY DEFINER slik at vi IKKE åpner tabellen for anon i RLS.
create or replace function hent_delt_periodeplan(token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'navn', p.navn,
    'aar', p.aar,
    'uker', p.uker,
    'dager', p.dager,
    'ansvarlige', p.ansvarlige,
    'orientering', p.orientering,
    'rader', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ressurs_id', r.ressurs_id,
        'rekkefolge', r.rekkefolge,
        'celler', r.celler,
        'tittel', (select i.tittel from ressurs_innhold i
                   where i.ressurs_id = r.ressurs_id
                   order by (i.sprak='nb') desc, (i.sprak='nn') desc limit 1)
      ) order by r.rekkefolge)
      from periodeplan_rad r where r.plan_id = p.id), '[]'::jsonb)
  )
  from periodeplan p
  where p.delingstoken = token and p.status = 'aktiv';
$$;

grant execute on function hent_delt_periodeplan(uuid) to anon, authenticated, service_role;
