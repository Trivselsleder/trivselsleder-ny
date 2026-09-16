-- ============================================================================
-- 133_minside_mest_kjopt.sql
-- MIN SIDE (D): «Mest kjøpte leker» — TL legger inn fem leker per måned
-- ============================================================================
-- KILDE: byggeoppdrag «Min side» 16. sep, punkt D + design 4f (skjema).
--   Fem rader per måned: navn, pris, førpris (valgfri), bilde (lastes opp til EGEN
--   Storage-mappe, ALDRI hentet fra klubben.no), lenke til Klubben, rekkefølge.
--   Bildebeskrivelse = leknavn (settes i frontend fra `navn`, egen kolonne trengs ikke).
--   Hele raden klikkbar → åpner Klubben i ny fane (rel="noopener"), ingen synlig lenketekst.
--   Klikk logges i bruk_hendelse (ny hendelsestype 'klubb_klikk', se migr 134).
--
-- MODELL: maaned = 'YYYY-MM'. rekkefolge 1–5, unik per måned (DEFERRABLE-constraint, se K2)
--   → maks fem per måned uten en egen teller. Datamodellen tåler at en Klubben-API kobles
--   på senere uten ombygging (kilde-agnostisk: bilde ligger i vår Storage, ikke ekstern URL).
--
-- KONTROLLRETTINGER (16. sep): K2 deferrable unik (bytt plass i én transaksjon), K3 skoler
--   leser kun synlige rader, K5 oppdatert_av on delete set null, K6 lenke må være https.
--
-- RETTIGHETER (CLAUDE.md): grant authenticated+service_role, revoke anon, RLS PÅ.
--   Skoler LESER; TL-ansatte SKRIVER. Storage: minside-mest-kjopt/ — ansatt skriver, innlogget leser.
-- SPERRER: idempotens FØR · verifisering ETTER · kvittering. Én transaksjon.
-- TILBAKERULLING (etter commit): begin;
--   drop policy if exists "Minside mestkjopt les"     on storage.objects;
--   drop policy if exists "Minside mestkjopt last opp" on storage.objects;
--   drop policy if exists "Minside mestkjopt slett"    on storage.objects;
--   drop table if exists public.minside_mest_kjopt; commit;
-- ============================================================================

begin;

do $$
begin
  if to_regclass('public.minside_mest_kjopt') is not null then
    raise exception 'STOPP 133 (allerede kjørt): public.minside_mest_kjopt finnes allerede.';
  end if;
end $$;

create table public.minside_mest_kjopt (
  id           uuid primary key default gen_random_uuid(),
  maaned       text not null check (maaned ~ '^\d{4}-\d{2}$'),   -- 'YYYY-MM'
  navn         text not null,
  pris         numeric(10,2) not null check (pris >= 0),
  forpris      numeric(10,2) check (forpris is null or forpris >= 0),
  bilde_sti    text,
  lenke        text not null check (lenke like 'https://%'),        -- K6: klikkbar rad, må åpne https
  rekkefolge   integer not null check (rekkefolge between 1 and 5),
  synlig       boolean not null default true,
  oppdatert_av uuid references public.profiles(id) on delete set null,  -- K5
  oppdatert_at timestamptz not null default now(),
  -- K2: DEFERRABLE INITIALLY DEFERRED så TL kan bytte plass på to leker (f.eks. rad 1↔2) i
  --     ÉN transaksjon uten at det første update-et bryter unikheten. Sjekkes ved commit.
  --     Valgt framfor en swap-RPC: ingen ny SECURITY DEFINER-flate å herde/vedlikeholde, og
  --     invarianten «maks fem per måned, unik rekkefølge» bevares deklarativt. 4f MÅ gjøre
  --     byttet i én transaksjon (én UPDATE ... CASE eller en tynn RPC) — to uavhengige
  --     supabase-js-kall er to transaksjoner og hjelpes ikke av deferringen.
  constraint minside_mest_kjopt_maaned_rekkefolge_uniq
    unique (maaned, rekkefolge) deferrable initially deferred
);

-- ── RLS + policyer ──
alter table public.minside_mest_kjopt enable row level security;

-- K3: skoler ser kun synlige rader (samme mønster som 131); TL-ansatte ser alt for redigering.
create policy p_les on public.minside_mest_kjopt
  for select to authenticated
  using (synlig = true or coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'));

create policy p_skriv on public.minside_mest_kjopt
  for all to authenticated
  using (coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'))
  with check (coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin'));

-- ── Rettigheter ──
grant select, insert, update, delete on public.minside_mest_kjopt to authenticated, service_role;
revoke all on public.minside_mest_kjopt from anon;

-- ── Storage-policyer (bøtta importfiler, prefiks minside-mest-kjopt/) ──
drop policy if exists "Minside mestkjopt last opp" on storage.objects;
create policy "Minside mestkjopt last opp" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'minside-mest-kjopt'
    and coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
  );

drop policy if exists "Minside mestkjopt slett" on storage.objects;
create policy "Minside mestkjopt slett" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'minside-mest-kjopt'
    and coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
  );

drop policy if exists "Minside mestkjopt les" on storage.objects;
create policy "Minside mestkjopt les" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'minside-mest-kjopt'
  );

-- ── Verifisering ETTER ──
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.minside_mest_kjopt'::regclass) then
    raise exception 'STOPP 133 (etter): RLS er ikke slått på.';
  end if;
  if has_table_privilege('anon', 'public.minside_mest_kjopt', 'select') then
    raise exception 'STOPP 133 (etter): anon har select — skal være revokert.';
  end if;
  -- maks fem per måned: sjette rekkefolge-verdi skal avvises av CHECK.
  begin
    insert into public.minside_mest_kjopt (maaned, navn, pris, lenke, rekkefolge)
    values ('2026-01', 'x', 10, 'https://klubben.no/x', 6);
    raise exception 'STOPP 133 (etter): rekkefolge 6 ble tillatt — CHECK (1..5) biter ikke.';
  exception when check_violation then null;
  end;
  -- K6: lenke uten https skal avvises.
  begin
    insert into public.minside_mest_kjopt (maaned, navn, pris, lenke, rekkefolge)
    values ('2026-01', 'x', 10, 'http://klubben.no/x', 1);
    raise exception 'STOPP 133 (etter): http-lenke ble tillatt — https-CHECK biter ikke.';
  exception when check_violation then null;
  end;
end $$;

-- ── Kvittering ──
select concat_ws(' · ',
  'minside_mest_kjopt: ' || (to_regclass('public.minside_mest_kjopt') is not null),
  'RLS: ' || (select relrowsecurity from pg_class where oid = 'public.minside_mest_kjopt'::regclass),
  'anon select (skal være NEI): ' || has_table_privilege('anon', 'public.minside_mest_kjopt', 'select'),
  'storage-policyer: ' || (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'Minside mestkjopt%')
) as kvittering;

commit;
