-- ============================================================================
-- 140_f6_pakkebilder_storage.sql — F6: skriv til pakkebilder krever ansatt/superadmin
-- ============================================================================
-- KILDE (fasit): Fable F6 via OPPDRAG-CODE-HUBSPOT-OG-TILGANG-17sep.md, DEL 3.
--   Bygger på PRODS MÅLTE storage-policyer (DEL 0 / resultat-hubspot-tilgang-prod.md
--   §5) — disse finnes IKKE i noen migrasjonsfil (satt i Supabase-UI en gang), så
--   den avleste teksten ER fasit her:
--     «Last opp pakkebilder»  INSERT authenticated       check (bucket_id='pakkebilder')
--     «Les pakkebilder»       SELECT anon,authenticated   using (bucket_id='pakkebilder')
--     «Oppdater pakkebilder»  UPDATE authenticated        using (bucket_id='pakkebilder')
--     «Slett pakkebilder»     DELETE authenticated        using (bucket_id='pakkebilder')
--
-- PROBLEM: enhver innlogget bruker (også en skoleansatt) kunne laste opp, endre og
--   slette filer i bøtta «pakkebilder». Bare Trivselsleder AS skal forvalte pakkebilder.
--
-- HVA: insert/update/delete krever nå også public.get_min_rolle() in ('ansatt','superadmin').
--   LES-policyen røres IKKE — bøtta er public (bildene vises uinnlogget). get_min_rolle
--   kalles skjemakvalifisert (public.) siden policyen står i storage-skjemaet.
--
-- NEGATIV TEST (scripts/rigg/test-140-pakkebilder-storage.sql): en skoleansatt
--   (get_min_rolle()='skoleansatt') får ikke insert/update/delete i bøtta.
-- POSITIV TEST: en ansatt (get_min_rolle()='ansatt') får insert/update/delete; alle
--   (også anon) beholder SELECT.
-- TILBAKERULLING: drop+create de tre policyene uten get_min_rolle-leddet (kun bucket_id).
-- ============================================================================

begin;

drop policy if exists "Last opp pakkebilder" on storage.objects;
create policy "Last opp pakkebilder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pakkebilder'
    and public.get_min_rolle() = any (array['ansatt','superadmin'])
  );

drop policy if exists "Oppdater pakkebilder" on storage.objects;
create policy "Oppdater pakkebilder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'pakkebilder'
    and public.get_min_rolle() = any (array['ansatt','superadmin'])
  )
  with check (
    bucket_id = 'pakkebilder'
    and public.get_min_rolle() = any (array['ansatt','superadmin'])
  );

drop policy if exists "Slett pakkebilder" on storage.objects;
create policy "Slett pakkebilder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'pakkebilder'
    and public.get_min_rolle() = any (array['ansatt','superadmin'])
  );

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: de tre skrivepolicyene har get_min_rolle-leddet; les-policyen urørt.
-- ----------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('Last opp pakkebilder','Oppdater pakkebilder','Slett pakkebilder')
     and coalesce(with_check, qual) like '%get_min_rolle%';
  if n <> 3 then
    raise exception 'STOPP 140 (etter): % av 3 skrivepolicyer krever ansatt/superadmin, forventet 3.', n;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
      and policyname='Les pakkebilder' and cmd='SELECT'
  ) then
    raise exception 'STOPP 140 (etter): les-policyen «Les pakkebilder» mangler — skal være urørt.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING.
-- ----------------------------------------------------------------------------
select string_agg(policyname || ' (' || cmd || ') → ' || coalesce(with_check, qual), E'\n' order by policyname) as kvittering
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like '%pakkebilder%';

commit;
