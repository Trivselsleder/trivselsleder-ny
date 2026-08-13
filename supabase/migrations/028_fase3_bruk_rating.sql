-- 028_fase3_bruk_rating.sql
create table if not exists bruk_hendelse (
  id bigint primary key generated always as identity,
  bruker_id uuid references profiles(id) on delete set null,
  skole_id uuid references skoler(id) on delete set null,
  ressurs_id uuid references ressurser(id) on delete cascade,
  hendelse text not null check (hendelse in ('visning','video_spilt','pdf_nedlastet','sok','favoritt')),
  sok_tekst text,
  operator_land text default 'NO',
  tidspunkt timestamptz not null default now()
);
create index if not exists idx_bruk_ressurs_tid on bruk_hendelse (ressurs_id, tidspunkt);
create index if not exists idx_bruk_bruker on bruk_hendelse (bruker_id);

create table if not exists favoritter (
  bruker_id uuid not null references profiles(id) on delete cascade,
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  opprettet_at timestamptz not null default now(),
  primary key (bruker_id, ressurs_id)
);

create table if not exists vurderinger (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  bruker_id uuid not null references profiles(id) on delete cascade,
  skole_id uuid references skoler(id) on delete set null,
  stjerner smallint not null check (stjerner between 1 and 5),
  tidspunkt timestamptz not null default now(),
  primary key (ressurs_id, bruker_id)
);
create index if not exists idx_vurderinger_ressurs on vurderinger (ressurs_id);

create table if not exists popularitet_snapshot (
  id bigint primary key generated always as identity,
  periode_type text not null check (periode_type in ('maaned','uke')),
  periode text not null,
  ressurs_id uuid references ressurser(id) on delete cascade,
  skole_id uuid references skoler(id) on delete cascade,
  antall integer not null default 0,
  rang smallint,
  laget_at timestamptz not null default now()
);
create index if not exists idx_popsnap on popularitet_snapshot (periode_type, periode, skole_id);
