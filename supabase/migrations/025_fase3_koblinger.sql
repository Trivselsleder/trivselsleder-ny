-- 025_fase3_koblinger.sql
-- Mange-til-mange-koblinger mellom ressurser og taksonomi.
create table if not exists ressurs_kategori (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  kategori_id integer not null references kategorier(id) on delete cascade,
  primary key (ressurs_id, kategori_id)
);
create table if not exists ressurs_utstyr (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  utstyr_id integer not null references utstyr(id) on delete cascade,
  primary key (ressurs_id, utstyr_id)
);
create table if not exists ressurs_egnet (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  egnet_id smallint not null references egnet_kategori(id) on delete cascade,
  primary key (ressurs_id, egnet_id)
);
create table if not exists ressurs_fag (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  fag_id integer not null references fag(id) on delete cascade,
  primary key (ressurs_id, fag_id)
);
create table if not exists ressurs_kompetansemaal (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  kompetansemaal_id integer not null references kompetansemaal(id) on delete cascade,
  primary key (ressurs_id, kompetansemaal_id)
);
create table if not exists ressurs_sesong (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  sesong_id smallint not null references sesong(id) on delete cascade,
  primary key (ressurs_id, sesong_id)
);
create table if not exists ressurs_trinn (
  ressurs_id uuid not null references ressurser(id) on delete cascade,
  trinn_id smallint not null references trinn(id) on delete cascade,
  primary key (ressurs_id, trinn_id)
);
create table if not exists ressurs_trinn_innhold (
  ressurs_id uuid not null,
  trinn_id smallint not null,
  sprak text not null default 'nb',
  variant text,
  primary key (ressurs_id, trinn_id, sprak),
  foreign key (ressurs_id, trinn_id) references ressurs_trinn(ressurs_id, trinn_id) on delete cascade
);
create index if not exists idx_rk_kategori on ressurs_kategori (kategori_id);
create index if not exists idx_ru_utstyr on ressurs_utstyr (utstyr_id);
create index if not exists idx_re_egnet on ressurs_egnet (egnet_id);
create index if not exists idx_rt_trinn on ressurs_trinn (trinn_id);
