-- ============================================================================
-- 131_minside_aktuelt.sql
-- MIN SIDE (B): «Aktuelt» — fritt redigerbar innholdsblokk fra TL-ansatte
-- ============================================================================
-- KILDE: byggeoppdrag «Min side» 16. sep, punkt B + design 4d (Aktuelt-redigering).
--   TL-ansatte legger inn overskrift, tekst, valgfritt bilde (med OBLIGATORISK
--   bildebeskrivelse når bilde finnes — WCAG 1.1.1), knappetekst, lenke, synlig/skjult.
--   Flere blokker støttes (rekkefolge); skoler ser kun de synlige.
--
-- BILDE: lastes opp til Supabase Storage (bøtta 'importfiler', prefiks
--   'minside-aktuelt/…', samme mønster/adskillelse som migr 109 redaksjon/). bilde_sti
--   lagrer objektnavnet. INTEGRITET: CHECK sikrer at bilde ALDRI kan finnes uten
--   bildebeskrivelse (obligatorisk alt-tekst).
--
-- RETTIGHETER (CLAUDE.md): eksplisitt grant authenticated+service_role, revoke anon.
--   RLS PÅ. Skoler LESER kun synlige blokker; TL-ansatte ser alt og SKRIVER.
--   Storage: kun ansatt/superadmin kan laste opp/slette under minside-aktuelt/;
--   innloggede kan lese (bildet vises på skolens arbeidsbenk).
-- SPERRER: idempotens FØR · verifisering ETTER · kvittering. Én transaksjon.
-- TILBAKERULLING (etter commit): begin;
--   drop policy if exists "Minside aktuelt les"     on storage.objects;
--   drop policy if exists "Minside aktuelt last opp" on storage.objects;
--   drop policy if exists "Minside aktuelt slett"    on storage.objects;
--   drop table if exists public.minside_aktuelt; commit;
-- ============================================================================

begin;

do $$
begin
  if to_regclass('public.minside_aktuelt') is not null then
    raise exception 'STOPP 131 (allerede kjørt): public.minside_aktuelt finnes allerede.';
  end if;
end $$;

create table public.minside_aktuelt (
  id                uuid primary key default gen_random_uuid(),
  overskrift        text not null,
  tekst             text,
  bilde_sti         text,
  bilde_beskrivelse text,
  knapp_tekst       text,
  knapp_lenke       text,
  synlig            boolean not null default true,
  rekkefolge        integer not null default 0,
  oppdatert_av      uuid references public.profiles(id) on delete set null,  -- K5: sletting av profil nuller stempelet, blokkerer den ikke
  oppdatert_at      timestamptz not null default now(),
  -- WCAG: et bilde MÅ ha en bildebeskrivelse (alt-tekst). Ingen bilde → ingen krav.
  constraint minside_aktuelt_bilde_alt_tekst
    check (bilde_sti is null or (bilde_beskrivelse is not null and btrim(bilde_beskrivelse) <> ''))
);

-- ── RLS + policyer ──
alter table public.minside_aktuelt enable row level security;

-- Skoler ser kun synlige blokker; TL-ansatte ser alt (for redigering/forhåndsvisning).
create policy p_les on public.minside_aktuelt
  for select to authenticated
  using (synlig = true or coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'));

create policy p_skriv on public.minside_aktuelt
  for all to authenticated
  using (coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'))
  with check (coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'));

-- ── Rettigheter ──
grant select, insert, update, delete on public.minside_aktuelt to authenticated, service_role;
revoke all on public.minside_aktuelt from anon;

-- ── Storage-policyer (bøtta importfiler, prefiks minside-aktuelt/) ──
drop policy if exists "Minside aktuelt last opp" on storage.objects;
create policy "Minside aktuelt last opp" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'minside-aktuelt'
    and coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
  );

drop policy if exists "Minside aktuelt slett" on storage.objects;
create policy "Minside aktuelt slett" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'minside-aktuelt'
    and coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
  );

drop policy if exists "Minside aktuelt les" on storage.objects;
create policy "Minside aktuelt les" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'minside-aktuelt'
  );

-- ── Verifisering ETTER ──
do $$
begin
  if to_regclass('public.minside_aktuelt') is null then
    raise exception 'STOPP 131 (etter): tabellen ble ikke opprettet.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.minside_aktuelt'::regclass) then
    raise exception 'STOPP 131 (etter): RLS er ikke slått på.';
  end if;
  if has_table_privilege('anon', 'public.minside_aktuelt', 'select') then
    raise exception 'STOPP 131 (etter): anon har select — skal være revokert.';
  end if;
  -- CHECK-en må faktisk bite: bilde uten beskrivelse skal avvises.
  begin
    insert into public.minside_aktuelt (overskrift, bilde_sti) values ('x', 'minside-aktuelt/test.jpg');
    raise exception 'STOPP 131 (etter): bilde uten bildebeskrivelse ble tillatt — CHECK biter ikke.';
  exception when check_violation then null;
  end;
end $$;

-- ── Kvittering ──
select concat_ws(' · ',
  'minside_aktuelt: ' || (to_regclass('public.minside_aktuelt') is not null),
  'RLS: ' || (select relrowsecurity from pg_class where oid = 'public.minside_aktuelt'::regclass),
  'anon select (skal være NEI): ' || has_table_privilege('anon', 'public.minside_aktuelt', 'select'),
  'storage-policyer: ' || (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'Minside aktuelt%')
) as kvittering;

commit;
