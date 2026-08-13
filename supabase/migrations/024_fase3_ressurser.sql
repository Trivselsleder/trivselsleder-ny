-- 024_fase3_ressurser.sql
-- Kjerne-innhold + fulltekstsøk per språk (FTS + pg_trgm).
create extension if not exists pg_trgm;

create table if not exists ressurser (
  id uuid primary key default gen_random_uuid(),
  ressurstype text not null default 'lek' check (ressurstype in ('lek','aktiv_laering')),
  sted text check (sted in ('inne','ute','begge')),
  antall_min integer,
  antall_maks integer,
  kan_ledes_av_elever boolean not null default false,
  redaksjonell_rating numeric(3,2),
  status text not null default 'utkast' check (status in ('utkast','publisert','arkivert')),
  opprettet_av uuid references profiles(id),
  opprettet_at timestamptz not null default now(),
  endret_av uuid references profiles(id),
  endret_at timestamptz not null default now()
);

create table if not exists ressurs_innhold (
  id uuid primary key default gen_random_uuid(),
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  sprak text not null default 'nb' check (sprak in ('nb','nn','sv','is','en')),
  tittel text,
  forberedelse text,
  inndeling text,
  utgangsposisjon text,
  formaal text,
  kronologi text,
  regler text,
  variasjoner text,
  instruktoernotat text,
  sokevektor tsvector,
  ferskhet text not null default 'mangler' check (ferskhet in ('gjeldende','utdatert','mangler')),
  oppdatert_at timestamptz not null default now(),
  unique (ressurs_id, sprak)
);

create or replace function fase3_oppdater_sokevektor() returns trigger
language plpgsql as $$
declare cfg regconfig;
begin
  cfg := case new.sprak when 'sv' then 'swedish'::regconfig
                        when 'en' then 'english'::regconfig
                        else 'norwegian'::regconfig end;
  new.sokevektor :=
    setweight(to_tsvector(cfg, coalesce(new.tittel,'')), 'A') ||
    setweight(to_tsvector(cfg, coalesce(new.formaal,'')), 'B') ||
    setweight(to_tsvector(cfg, coalesce(new.forberedelse,'') || ' ' ||
      coalesce(new.kronologi,'') || ' ' || coalesce(new.regler,'') || ' ' ||
      coalesce(new.variasjoner,'') || ' ' || coalesce(new.inndeling,'') || ' ' ||
      coalesce(new.utgangsposisjon,'') || ' ' || coalesce(new.instruktoernotat,'')), 'C');
  new.oppdatert_at := now();
  return new;
end $$;

drop trigger if exists trg_sokevektor on ressurs_innhold;
create trigger trg_sokevektor before insert or update on ressurs_innhold
  for each row execute function fase3_oppdater_sokevektor();

create index if not exists idx_ressurs_innhold_fts on ressurs_innhold using gin (sokevektor);
create index if not exists idx_ressurs_innhold_tittel_trgm on ressurs_innhold using gin (tittel gin_trgm_ops);
create index if not exists idx_ressurs_innhold_ressurs on ressurs_innhold (ressurs_id);
create index if not exists idx_ressurser_status on ressurser (status);
