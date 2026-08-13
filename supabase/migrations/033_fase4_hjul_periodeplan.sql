-- =====================================================================
-- 033_fase4_hjul_periodeplan.sql
-- Fase 4: TL-hjulet + Periodeplanen
-- Brukereide arbeidsflater som PEKER på leker i biblioteket (ingen kopier).
-- Eierskap: skole + bruker. RLS: HTLA (skoleadmin) = skole-scope,
--           skoleansatt/feide = egen-scope, intern (superadmin/ansatt) = alt.
-- Forutsetter: 023-032 kjørt. Hjelpere fase3_rolle(), fase3_intern() finnes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Ny hjelpefunksjon: har brukeren tilgang til denne skolen?
--    (aktiv kobling i bruker_skole)
-- ---------------------------------------------------------------------
create or replace function fase3_har_skole(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from bruker_skole bs
    where bs.bruker_id = auth.uid()
      and bs.skole_id  = sid
      and bs.aktiv = true
  );
$$;

grant execute on function fase3_har_skole(uuid) to authenticated, service_role;

-- =====================================================================
-- 1) TL-HJULET
-- =====================================================================
create table if not exists tl_hjul (
  id            uuid primary key default gen_random_uuid(),
  skole_id      uuid references skoler(id) on delete cascade,
  bruker_id     uuid not null references profiles(id) on delete cascade default auth.uid(),
  navn          text not null,
  beskrivelse   text,
  status        text not null default 'aktiv' check (status in ('aktiv','arkivert')),
  opprettet_at  timestamptz not null default now(),
  endret_at     timestamptz not null default now()
);
create index if not exists idx_tl_hjul_bruker on tl_hjul(bruker_id);
create index if not exists idx_tl_hjul_skole  on tl_hjul(skole_id);

-- Kakestykker: hvert stykke PEKER på en lek (ressurs). Ingen kopi av innhold.
create table if not exists tl_hjul_lek (
  id          uuid primary key default gen_random_uuid(),
  hjul_id     uuid not null references tl_hjul(id) on delete cascade,
  ressurs_id  uuid not null references ressurser(id) on delete cascade,
  rekkefolge  int not null default 0,
  unique (hjul_id, ressurs_id)
);
create index if not exists idx_tl_hjul_lek_hjul on tl_hjul_lek(hjul_id);

-- =====================================================================
-- 2) PERIODEPLANEN
-- =====================================================================
create table if not exists periodeplan (
  id            uuid primary key default gen_random_uuid(),
  skole_id      uuid references skoler(id) on delete cascade,
  bruker_id     uuid not null references profiles(id) on delete cascade default auth.uid(),
  navn          text not null,
  beskrivelse   text,
  status        text not null default 'aktiv' check (status in ('aktiv','arkivert')),
  opprettet_at  timestamptz not null default now(),
  endret_at     timestamptz not null default now()
);
create index if not exists idx_periodeplan_bruker on periodeplan(bruker_id);
create index if not exists idx_periodeplan_skole  on periodeplan(skole_id);

-- Oppføringer: ressurs_id er nullbar (fri linje uten lek er lov).
-- ON DELETE SET NULL: slettes leken, blir linja stående med tekst men uten peker.
create table if not exists periodeplan_oppforing (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references periodeplan(id) on delete cascade,
  ressurs_id    uuid references ressurser(id) on delete set null,
  dato          date,
  uke           int,
  sted          text,
  ansvarlige    text,
  notat         text,
  rekkefolge    int not null default 0
);
create index if not exists idx_pp_oppforing_plan on periodeplan_oppforing(plan_id);

-- =====================================================================
-- 3) endret_at-trigger (gjenbruk generisk)
-- =====================================================================
create or replace function fase4_sett_endret_at()
returns trigger
language plpgsql
as $$
begin
  new.endret_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tl_hjul_endret on tl_hjul;
create trigger trg_tl_hjul_endret before update on tl_hjul
  for each row execute function fase4_sett_endret_at();

drop trigger if exists trg_periodeplan_endret on periodeplan;
create trigger trg_periodeplan_endret before update on periodeplan
  for each row execute function fase4_sett_endret_at();

-- =====================================================================
-- 4) RLS
-- =====================================================================
alter table tl_hjul                  enable row level security;
alter table tl_hjul_lek              enable row level security;
alter table periodeplan              enable row level security;
alter table periodeplan_oppforing    enable row level security;

grant select, insert, update, delete on tl_hjul, tl_hjul_lek, periodeplan, periodeplan_oppforing
  to authenticated;
grant all on tl_hjul, tl_hjul_lek, periodeplan, periodeplan_oppforing to service_role;

-- Tilgangsuttrykk (gjenbrukt i policies via inline):
--   egen  : bruker_id = auth.uid()
--   skole : fase3_rolle()='skoleadmin' and fase3_har_skole(skole_id)
--   intern: fase3_intern()

-- ---- tl_hjul ----
drop policy if exists tl_hjul_les on tl_hjul;
create policy tl_hjul_les on tl_hjul for select to authenticated
  using (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists tl_hjul_ins on tl_hjul;
create policy tl_hjul_ins on tl_hjul for insert to authenticated
  with check (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists tl_hjul_upd on tl_hjul;
create policy tl_hjul_upd on tl_hjul for update to authenticated
  using (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  )
  with check (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists tl_hjul_del on tl_hjul;
create policy tl_hjul_del on tl_hjul for delete to authenticated
  using (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

-- ---- tl_hjul_lek: arver tilgang fra foreldre-hjulet ----
drop policy if exists tl_hjul_lek_alle on tl_hjul_lek;
create policy tl_hjul_lek_alle on tl_hjul_lek for all to authenticated
  using (
    exists (
      select 1 from tl_hjul h
      where h.id = tl_hjul_lek.hjul_id
        and ( h.bruker_id = auth.uid()
              or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(h.skole_id))
              or fase3_intern() )
    )
  )
  with check (
    exists (
      select 1 from tl_hjul h
      where h.id = tl_hjul_lek.hjul_id
        and ( h.bruker_id = auth.uid()
              or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(h.skole_id))
              or fase3_intern() )
    )
  );

-- ---- periodeplan ----
drop policy if exists periodeplan_les on periodeplan;
create policy periodeplan_les on periodeplan for select to authenticated
  using (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists periodeplan_ins on periodeplan;
create policy periodeplan_ins on periodeplan for insert to authenticated
  with check (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists periodeplan_upd on periodeplan;
create policy periodeplan_upd on periodeplan for update to authenticated
  using (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  )
  with check (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

drop policy if exists periodeplan_del on periodeplan;
create policy periodeplan_del on periodeplan for delete to authenticated
  using (
    bruker_id = auth.uid()
    or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(skole_id))
    or fase3_intern()
  );

-- ---- periodeplan_oppforing: arver tilgang fra foreldre-planen ----
drop policy if exists pp_oppforing_alle on periodeplan_oppforing;
create policy pp_oppforing_alle on periodeplan_oppforing for all to authenticated
  using (
    exists (
      select 1 from periodeplan p
      where p.id = periodeplan_oppforing.plan_id
        and ( p.bruker_id = auth.uid()
              or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(p.skole_id))
              or fase3_intern() )
    )
  )
  with check (
    exists (
      select 1 from periodeplan p
      where p.id = periodeplan_oppforing.plan_id
        and ( p.bruker_id = auth.uid()
              or (fase3_rolle() = 'skoleadmin' and fase3_har_skole(p.skole_id))
              or fase3_intern() )
    )
  );
