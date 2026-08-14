-- =====================================================================
-- 037_tl_hjul_fri_kategori.sql
-- TL-hjulet: kakestykker kan være LEK (peker) ELLER FRI TEKST
--   (klasseliste, trivselsutfordringer, personalet ...).
-- + redigerbar hjultype/kategori pr skole (NULL skole = global standard)
-- + sortering: skolen ordner egne hjul først/sist på Min side.
-- + standard skriftstørrelse 20 (som dagens side).
-- Additiv. Forutsetter 033/036 kjørt.
-- =====================================================================

-- 1) Kakestykker: tillat fri tekst ------------------------------------
alter table tl_hjul_lek
  alter column ressurs_id drop not null;
alter table tl_hjul_lek
  add column if not exists tekst text;
alter table tl_hjul_lek
  add column if not exists type text not null default 'lek'
    check (type in ('lek','fri'));

-- et stykke er enten en gyldig lek-peker ELLER en fri tekst
alter table tl_hjul_lek drop constraint if exists tl_hjul_lek_innhold_chk;
alter table tl_hjul_lek add constraint tl_hjul_lek_innhold_chk
  check (
    (type = 'lek' and ressurs_id is not null) or
    (type = 'fri' and tekst is not null and length(btrim(tekst)) > 0)
  );

-- 2) Redigerbar hjultype / kategori -----------------------------------
create table if not exists tl_hjul_kategori (
  id            uuid primary key default gen_random_uuid(),
  skole_id      uuid references skoler(id) on delete cascade,
  navn          text not null,
  sortering     int  not null default 0,
  opprettet_at  timestamptz not null default now(),
  unique (skole_id, navn)
);
create index if not exists idx_tl_hjul_kategori_skole on tl_hjul_kategori(skole_id);
-- globale standardtyper er unike på navn (NULL-skole)
create unique index if not exists ux_tl_hjul_kategori_global
  on tl_hjul_kategori (navn) where skole_id is null;

alter table tl_hjul_kategori enable row level security;

drop policy if exists tl_hjul_kategori_les on tl_hjul_kategori;
create policy tl_hjul_kategori_les on tl_hjul_kategori for select
  using (skole_id is null or fase3_har_skole(skole_id) or fase3_intern());

drop policy if exists tl_hjul_kategori_skriv on tl_hjul_kategori;
create policy tl_hjul_kategori_skriv on tl_hjul_kategori for all
  using (
    fase3_intern() or
    (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
  )
  with check (
    fase3_intern() or
    (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
  );

grant select, insert, update, delete on tl_hjul_kategori to authenticated, service_role;
grant select on tl_hjul_kategori to anon;

-- Forslag til standardtyper (skolen kan legge til / endre / bruke egne).
insert into tl_hjul_kategori (skole_id, navn, sortering) values
  (null, 'Move it', 10),
  (null, 'Klassemiljø', 20),
  (null, 'Trinn', 30),
  (null, 'Personalet', 40),
  (null, 'Trivselsutfordringer', 50),
  (null, 'Klasseliste', 60),
  (null, 'Type leker', 70)
on conflict (navn) where skole_id is null do nothing;

-- 3) tl_hjul: kategori + sortering + font-standard --------------------
alter table tl_hjul
  add column if not exists kategori_id uuid references tl_hjul_kategori(id) on delete set null;
alter table tl_hjul
  add column if not exists sortering int not null default 0;
alter table tl_hjul
  alter column skriftstorrelse set default 20;
create index if not exists idx_tl_hjul_kategori on tl_hjul(kategori_id);
