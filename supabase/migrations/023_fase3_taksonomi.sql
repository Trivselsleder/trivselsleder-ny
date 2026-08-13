-- 023_fase3_taksonomi.sql
-- Fase 3 datamodell (steg 2): taksonomi-tabeller + frødata. Additiv, trygg.

create table if not exists egnet_kategori (
  id smallint primary key generated always as identity,
  navn text not null unique,
  rekkefolge smallint not null default 0,
  ikon text
);

create table if not exists kategorier (
  id integer primary key generated always as identity,
  navn text not null,
  forelder_id integer references kategorier(id),
  rekkefolge smallint not null default 0
);

create table if not exists utstyr (
  id integer primary key generated always as identity,
  navn text not null unique
);

create table if not exists sesong (
  id smallint primary key generated always as identity,
  navn text not null unique,
  rekkefolge smallint not null default 0
);

create table if not exists trinn (
  id smallint primary key generated always as identity,
  land text not null default 'NO',
  kode text not null,
  navn text not null,
  rekkefolge smallint not null default 0,
  unique (land, kode)
);

create table if not exists fag (
  id integer primary key generated always as identity,
  navn text not null unique
);

create table if not exists kompetansemaal (
  id integer primary key generated always as identity,
  kode text,
  tekst text not null,
  fag_id integer references fag(id),
  trinn_id smallint references trinn(id),
  ukoblet boolean not null default false,
  erstattet_av integer references kompetansemaal(id)
);

-- Frødata
insert into egnet_kategori (navn, rekkefolge) values
 ('Friminutt',1),('Kroppsøving',2),('SFO/AKS',3),('Aktiv læring',4),
 ('Aktive pauser',5),('FYSAK',6),('Bli kjent / klassemiljø',7),('Aktivitetsdager',8)
on conflict (navn) do nothing;

insert into sesong (navn, rekkefolge) values
 ('Vinter',1),('Vår',2),('Sommer',3),('Høst',4)
on conflict (navn) do nothing;

insert into trinn (land, kode, navn, rekkefolge) values
 ('NO','bhg','Barnehage',0),
 ('NO','1','1. trinn',1),('NO','2','2. trinn',2),('NO','3','3. trinn',3),
 ('NO','4','4. trinn',4),('NO','5','5. trinn',5),('NO','6','6. trinn',6),
 ('NO','7','7. trinn',7),('NO','8','8. trinn',8),('NO','9','9. trinn',9),
 ('NO','10','10. trinn',10),
 ('SE','forskola','Förskola',0),('SE','f-3','F-3',1),('SE','4-6','4-6',2),('SE','7-9','7-9',3)
on conflict (land, kode) do nothing;

insert into kategorier (navn, rekkefolge) values
 ('Move it',10),('Barnehage',20)
on conflict do nothing;
