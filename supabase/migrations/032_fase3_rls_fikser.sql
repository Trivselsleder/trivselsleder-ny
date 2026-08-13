-- 032_fase3_rls_fikser.sql — retter kontrollfunn (RLS eksplisitt, append-only, search_path, m.m.)

-- Funn 1: skru PÅ RLS eksplisitt paa alle Fase 3-tabeller (idempotent; gjør oppskriften komplett)
do $$ declare t text; begin
  foreach t in array array[
    'egnet_kategori','kategorier','utstyr','sesong','trinn','fag','kompetansemaal',
    'ressurser','ressurs_innhold','ressurs_kategori','ressurs_utstyr','ressurs_egnet',
    'ressurs_fag','ressurs_kompetansemaal','ressurs_sesong','ressurs_trinn','ressurs_trinn_innhold',
    'medier','dokumenter','dokument_fag','endringslogg','bruk_hendelse','favoritter',
    'vurderinger','popularitet_snapshot','samlinger','samling_innhold','samling_ressurs'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Funn 2: endringslogg append-only — fjern skriverett, tving RLS ogsaa for eier
revoke insert, update, delete on endringslogg from authenticated;
alter table endringslogg force row level security;

-- Funn 3: hard search_path paa audit-triggeren (security definer)
create or replace function fase3_logg_endring() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_handling text; v_endringer jsonb := '{}'::jsonb; v_full jsonb;
  v_radid text; v_bruker uuid; k text;
begin
  begin v_bruker := auth.uid(); exception when others then v_bruker := null; end;
  if (tg_op = 'INSERT') then
    v_handling := 'opprett'; v_radid := (to_jsonb(new)->>'id'); v_full := to_jsonb(new);
  elsif (tg_op = 'DELETE') then
    v_handling := 'slett'; v_radid := (to_jsonb(old)->>'id'); v_full := to_jsonb(old);
  else
    v_radid := (to_jsonb(new)->>'id');
    if (to_jsonb(new) ? 'status') and (to_jsonb(new)->>'status') = 'arkivert' and coalesce(to_jsonb(old)->>'status','') <> 'arkivert' then
      v_handling := 'arkiver'; v_full := to_jsonb(old);
    else v_handling := 'endre'; end if;
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if (to_jsonb(new)->k) is distinct from (to_jsonb(old)->k) then
        v_endringer := v_endringer || jsonb_build_object(k, jsonb_build_object('gammel', to_jsonb(old)->k, 'ny', to_jsonb(new)->k));
      end if;
    end loop;
  end if;
  insert into endringslogg (tabell, rad_id, handling, endringer, full_rad, endret_av)
  values (tg_table_name, v_radid, v_handling, case when v_endringer = '{}'::jsonb then null else v_endringer end, v_full, v_bruker);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

-- Funn 5: kategorier unik navn (idempotent)
do $$ begin
  if not exists (select 1 from pg_constraint where conname='kategorier_navn_key') then
    alter table kategorier add constraint kategorier_navn_key unique (navn);
  end if;
end $$;

-- Funn 4: hindre kobling til erstattet kompetansemaal
create or replace function fase3_km_gjeldende() returns trigger language plpgsql as $$
begin
  if (select erstattet_av from kompetansemaal where id = new.kompetansemaal_id) is not null then
    raise exception 'Kompetansemaal % er erstattet - koble til gjeldende term', new.kompetansemaal_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_km_gjeldende on ressurs_kompetansemaal;
create trigger trg_km_gjeldende before insert on ressurs_kompetansemaal for each row execute function fase3_km_gjeldende();

-- Funn 8: stram lese-policyer paa barn-tabeller
drop policy if exists p_les on samling_innhold;
create policy p_les on samling_innhold for select to authenticated using (exists (select 1 from samlinger s where s.id=samling_innhold.samling_id and (s.synlig or fase3_intern())));
drop policy if exists p_les on samling_ressurs;
create policy p_les on samling_ressurs for select to authenticated using (exists (select 1 from samlinger s where s.id=samling_ressurs.samling_id and (s.synlig or fase3_intern())));
drop policy if exists p_les on dokument_fag;
create policy p_les on dokument_fag for select to authenticated using (exists (select 1 from dokumenter d where d.id=dokument_fag.dokument_id and (d.status='publisert' or fase3_intern())));
