-- 026_fase3_medier_dokumenter.sql
create table if not exists medier (
  id uuid primary key default gen_random_uuid(),
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  type text not null check (type in ('bilde','video','pdf')),
  bunny_video_id text,
  storage_sti text,
  original_filnavn text,
  alt_tekst text,
  rekkefolge smallint not null default 0
);
create index if not exists idx_medier_ressurs on medier (ressurs_id);

create table if not exists dokumenter (
  id uuid primary key default gen_random_uuid(),
  tittel text not null,
  type text,
  storage_sti text,
  status text not null default 'utkast' check (status in ('utkast','publisert','arkivert')),
  ressurs_id uuid references ressurser(id) on delete cascade,
  opprettet_av uuid references profiles(id),
  opprettet_at timestamptz not null default now(),
  endret_av uuid references profiles(id),
  endret_at timestamptz not null default now()
);
create index if not exists idx_dokumenter_ressurs on dokumenter (ressurs_id);

create table if not exists dokument_fag (
  dokument_id uuid not null references dokumenter(id) on delete cascade,
  fag_id integer not null references fag(id) on delete cascade,
  primary key (dokument_id, fag_id)
);
