-- ============================================================================
-- 132_favoritter_dokument.sql
-- MIN SIDE (C): favoritter kan peke på ENTEN en ressurs (lek) ELLER et dokument
-- ============================================================================
-- KILDE: byggeoppdrag «Min side» 16. sep, punkt C. Samme hjerte/mønster som
--   favorittleker, men på dokumentkort. I dag har favoritter PK (bruker_id, ressurs_id)
--   og ressurs_id NOT NULL — den kan bare peke på leker.
--
-- ENDRING (bevarer eksisterende lekefavoritter uendret):
--   * ressurs_id gjøres nullbar.
--   * ny kolonne dokument_id → dokumenter(id) on delete cascade.
--   * CHECK: nøyaktig ÉN av (ressurs_id, dokument_id) er satt (ENTEN/ELLER).
--   * PK (bruker_id, ressurs_id) erstattes av to DELVISE unike indekser
--     (én per peker-type) — så samme bruker ikke kan favorittmerke samme lek/dokument to ganger.
--   * RLS (p_egne: bruker_id = auth.uid(), ALL) dekker begge peker-typer uendret.
--
-- ADVARSEL (K8) — ALDRI upsert med onConflict mot favoritter: de to unike indeksene er
--   DELVISE (where ressurs_id/dokument_id is not null). PostgREST/`upsert(..., { onConflict:
--   'bruker_id,ressurs_id' })` krever et TOTALT unikt constraint og feiler med «no unique or
--   exclusion constraint matching the ON CONFLICT specification». Riktig mønster er insert +
--   ignorer 23505 (slik lib/favoritter.js allerede gjør for både lek og dokument).
--
-- PK-NAVN (F2): fila leser primærnøkkelens FAKTISKE navn før den fjernes, og stopper med
--   klartekst hvis ingen PK finnes. Prod er bygget over 019 live_schema med håndrettinger, så
--   navnet antas ALDRI å være «favoritter_pkey».
--
-- RETTIGHETER: favoritter har allerede grant til authenticated (select/insert/update/
--   delete) og RLS på; den nye kolonnen arver tabellens grants. anon har ingen
--   rad-tilgang (kun default-søppel) — uendret.
-- SPERRER: idempotens FØR (dokument_id finnes ⇒ stopp) · verifisering ETTER (CHECK
--   biter begge veier) · kvittering. Én transaksjon.
-- TILBAKERULLING (etter commit): begin;
--   drop index if exists public.favoritter_dokument_uniq;
--   drop index if exists public.favoritter_ressurs_uniq;
--   alter table public.favoritter drop constraint if exists favoritter_enten_eller;
--   delete from public.favoritter where dokument_id is not null;   -- må være tomt for ressurs
--   alter table public.favoritter drop column if exists dokument_id;
--   alter table public.favoritter alter column ressurs_id set not null;
--   alter table public.favoritter add primary key (bruker_id, ressurs_id); commit;
-- ============================================================================

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='favoritter' and column_name='dokument_id') then
    raise exception 'STOPP 132 (allerede kjørt): favoritter.dokument_id finnes allerede.';
  end if;
end $$;

-- PK bort, ressurs_id nullbar, ny peker, ENTEN/ELLER-CHECK, delvise unike indekser.
-- F2: les PK-navnet ut av katalogen (ikke anta «favoritter_pkey») og stopp med klartekst
--     hvis favoritter ikke har noen primærnøkkel å fjerne.
do $$
declare v_pk text;
begin
  select conname into v_pk
  from pg_constraint
  where conrelid = 'public.favoritter'::regclass and contype = 'p';
  if v_pk is null then
    raise exception 'STOPP 132: favoritter har ingen primærnøkkel å fjerne — skjemaet avviker fra det forventede. Sjekk manuelt før du kjører videre.';
  end if;
  execute format('alter table public.favoritter drop constraint %I', v_pk);
end $$;
alter table public.favoritter alter column ressurs_id drop not null;
alter table public.favoritter
  add column dokument_id uuid references public.dokumenter(id) on delete cascade;
alter table public.favoritter
  add constraint favoritter_enten_eller
  check (num_nonnulls(ressurs_id, dokument_id) = 1);

create unique index favoritter_ressurs_uniq  on public.favoritter (bruker_id, ressurs_id)  where ressurs_id  is not null;
create unique index favoritter_dokument_uniq on public.favoritter (bruker_id, dokument_id) where dokument_id is not null;

-- ── Verifisering ETTER ──
do $$
declare v_bruker uuid; v_dok uuid; v_res uuid;
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='favoritter' and column_name='dokument_id') then
    raise exception 'STOPP 132 (etter): dokument_id ble ikke lagt til.';
  end if;
  if (select is_nullable from information_schema.columns
      where table_schema='public' and table_name='favoritter' and column_name='ressurs_id') <> 'YES' then
    raise exception 'STOPP 132 (etter): ressurs_id er fortsatt NOT NULL.';
  end if;
  -- CHECK må bite: begge NULL og begge satt skal avvises. Bruk ekte rader hvis de finnes.
  select id into v_bruker from public.profiles limit 1;
  select id into v_res from public.ressurser limit 1;
  select id into v_dok from public.dokumenter limit 1;
  if v_bruker is not null then
    begin
      insert into public.favoritter (bruker_id) values (v_bruker);  -- begge NULL
      raise exception 'STOPP 132 (etter): rad uten peker ble tillatt — CHECK biter ikke.';
    exception when check_violation then null;
    end;
    if v_res is not null and v_dok is not null then
      begin
        insert into public.favoritter (bruker_id, ressurs_id, dokument_id) values (v_bruker, v_res, v_dok); -- begge satt
        raise exception 'STOPP 132 (etter): rad med BEGGE pekere ble tillatt — CHECK biter ikke.';
      exception when check_violation then null;
      end;
    end if;
  end if;
end $$;

-- ── Kvittering ──
select concat_ws(' · ',
  'dokument_id: ' || exists (select 1 from information_schema.columns where table_schema='public' and table_name='favoritter' and column_name='dokument_id'),
  'ressurs_id nullbar: ' || (select is_nullable from information_schema.columns where table_schema='public' and table_name='favoritter' and column_name='ressurs_id'),
  'enten_eller-CHECK: ' || exists (select 1 from pg_constraint where conname='favoritter_enten_eller'),
  'delvise unike indekser: ' || (select count(*) from pg_indexes where schemaname='public' and indexname in ('favoritter_ressurs_uniq','favoritter_dokument_uniq'))
) as kvittering;

commit;
