-- 029_fase3_samlinger.sql
create table if not exists samlinger (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'redaksjonell',
  synlig boolean not null default true,
  rekkefolge smallint not null default 0,
  opprettet_av uuid references profiles(id),
  opprettet_at timestamptz not null default now(),
  endret_av uuid references profiles(id),
  endret_at timestamptz not null default now()
);
create table if not exists samling_innhold (
  samling_id uuid not null references samlinger(id) on delete cascade,
  sprak text not null default 'nb',
  tittel text,
  beskrivelse text,
  primary key (samling_id, sprak)
);
create table if not exists samling_ressurs (
  samling_id uuid not null references samlinger(id) on delete cascade,
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  rekkefolge smallint not null default 0,
  primary key (samling_id, ressurs_id)
);
create index if not exists idx_samling_ressurs on samling_ressurs (ressurs_id);
drop trigger if exists trg_logg on samlinger;
create trigger trg_logg after insert or update or delete on samlinger for each row execute function fase3_logg_endring();
