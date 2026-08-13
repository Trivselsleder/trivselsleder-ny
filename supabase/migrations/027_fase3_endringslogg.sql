-- 027_fase3_endringslogg.sql
-- Append-only endringslogg + generisk audit-trigger + ferskhetsflagg.
create table if not exists endringslogg (
  id bigint primary key generated always as identity,
  tabell text not null,
  rad_id text,
  handling text not null check (handling in ('opprett','endre','arkiver','slett')),
  endringer jsonb,
  full_rad jsonb,
  endret_av uuid,
  endret_at timestamptz not null default now()
);
create index if not exists idx_endringslogg_rad on endringslogg (tabell, rad_id);

create or replace function fase3_logg_endring() returns trigger
language plpgsql security definer as $$
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
    if (to_jsonb(new) ? 'status') and (to_jsonb(new)->>'status') = 'arkivert'
       and coalesce(to_jsonb(old)->>'status','') <> 'arkivert' then
      v_handling := 'arkiver'; v_full := to_jsonb(old);
    else v_handling := 'endre'; end if;
    for k in select jsonb_object_keys(to_jsonb(new)) loop
      if (to_jsonb(new)->k) is distinct from (to_jsonb(old)->k) then
        v_endringer := v_endringer || jsonb_build_object(k, jsonb_build_object('gammel', to_jsonb(old)->k, 'ny', to_jsonb(new)->k));
      end if;
    end loop;
  end if;
  insert into endringslogg (tabell, rad_id, handling, endringer, full_rad, endret_av)
  values (tg_table_name, v_radid, v_handling,
          case when v_endringer = '{}'::jsonb then null else v_endringer end, v_full, v_bruker);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

create or replace function fase3_ferskhet() returns trigger
language plpgsql as $$
begin
  if new.sprak in ('nb','nn') then
    update ressurs_innhold set ferskhet = 'utdatert'
     where ressurs_id = new.ressurs_id and sprak not in ('nb','nn') and ferskhet = 'gjeldende';
  end if;
  return new;
end $$;

drop trigger if exists trg_ferskhet on ressurs_innhold;
create trigger trg_ferskhet after insert or update of tittel,forberedelse,inndeling,utgangsposisjon,formaal,kronologi,regler,variasjoner,instruktoernotat
  on ressurs_innhold for each row execute function fase3_ferskhet();

-- Audit-triggere paa alt innhold + taksonomi
drop trigger if exists trg_logg on ressurser;
create trigger trg_logg after insert or update or delete on ressurser for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on ressurs_innhold;
create trigger trg_logg after insert or update or delete on ressurs_innhold for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on dokumenter;
create trigger trg_logg after insert or update or delete on dokumenter for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on kategorier;
create trigger trg_logg after insert or update or delete on kategorier for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on utstyr;
create trigger trg_logg after insert or update or delete on utstyr for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on sesong;
create trigger trg_logg after insert or update or delete on sesong for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on trinn;
create trigger trg_logg after insert or update or delete on trinn for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on fag;
create trigger trg_logg after insert or update or delete on fag for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on kompetansemaal;
create trigger trg_logg after insert or update or delete on kompetansemaal for each row execute function fase3_logg_endring();
drop trigger if exists trg_logg on egnet_kategori;
create trigger trg_logg after insert or update or delete on egnet_kategori for each row execute function fase3_logg_endring();
