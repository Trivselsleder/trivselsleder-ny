-- ============================================================================
-- 109_storage_redaksjon.sql — Storage-policy: interne kan laste opp/fjerne bilder
-- under prefiksen redaksjon/ i bøtta importfiler, adskilt fra importens import/<id>/.
-- ============================================================================
-- MÅL (klartekst): en ansatt (Marielle) skal kunne legge inn og fjerne et bilde på
-- en lek uten å ringe noen. I dag kan bare service_role skrive til importfiler i det
-- hele tatt — det finnes INGEN policy på den bøtta, så RLS på storage.objects nekter
-- anon/authenticated all tilgang der. Denne migrasjonen åpner ett avgrenset skriverom.
--
-- HVORFOR get_min_rolle() OG IKKE fase3_intern():
--   fase3_intern() er en vanlig sql-funksjon UTEN egen search_path (proconfig NULL)
--   og kaller fase3_rolle() ukvalifisert — utrygt fra en kontekst uten sti. En
--   Storage-policy kjører ALLTID som anon/authenticated (aldri som eieren postgres),
--   så «SECURITY DEFINER eid av postgres med bypassrls»-argumentet som gjør de vanlige
--   RLS-policyene trygge gjelder IKKE her. get_min_rolle() er STABLE SECURITY DEFINER
--   SET search_path='public' og er trygg uansett kontekst. Samme valg som migr 107
--   (lagre_ressurs) tok, av samme grunn.
--   (Kilde: claude_108-SPESIFIKASJON-storage-policy-8sep.md §1.3.)
--
-- PREFIKS-ADSKILLELSE (bevisst): redaksjon/ er et HELT ANNET prefiks enn importens
--   import/<kjørings-id>/. FilOpplaster.slettPrefiks (lib/storage.mjs) rydder kun
--   import/<id>/ og kan aldri røre redaksjon/. Motsatt sletter frontend kun filer under
--   redaksjon/, aldri import/. De to skriveveiene tråkker aldri i hverandres filer.
--
-- RISIKOPROFIL LAV: bilder på leker/aktiv læring er offentlig innhold, ikke Trivsels-
--   undersøkelsen. Vi bygger ett bestemt, avgrenset skriverom for interne — ingen sele
--   mot en trussel som ikke finnes.
--
-- PAKKEBILDER-HURTIGFIKS: de tre skrive-policyene på bøtta pakkebilder står i dag
--   «to anon,authenticated» (målt i prod) — hvem som helst, innlogget eller ei, kan
--   skrive/endre/slette der. Opplasteren i AdminEvaluering.jsx bruker den INNLOGGEDE
--   supabase-klienten (src/pages/AdminEvaluering.jsx:2 + :123-125), så authenticated er
--   nok. Vi strammer de tre til «to authenticated» med ALTER POLICY (rører verken qual
--   eller with_check). «Les pakkebilder» røres IKKE — bøtta er public og leses uinnlogget
--   i butikken.
--
-- IDEMPOTENT: de nye med drop policy if exists + create; de tre gamle med alter policy
--   (trygt re-kjørbart). ÉN transaksjon.
-- ============================================================================

begin;

-- ── NYE: redaksjonell opplasting til importfiler/redaksjon/<ressurs_id>/<uuid>.<ext> ──
drop policy if exists "Redaksjon last opp" on storage.objects;
create policy "Redaksjon last opp" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'redaksjon'
    and coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
  );

drop policy if exists "Redaksjon slett" on storage.objects;
create policy "Redaksjon slett" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'importfiler'
    and (storage.foldername(name))[1] = 'redaksjon'
    and coalesce(public.get_min_rolle(), '') in ('ansatt', 'superadmin')
  );
-- INGEN UPDATE-policy: vi upserter aldri — en ny fil får alltid ny uuid.
-- INGEN SELECT-policy: importfiler er en public bøtte, så visning går utenom RLS.

-- ── HURTIGFIKS: stram pakkebilder-skriving fra anon,authenticated → authenticated ────
alter policy "Last opp pakkebilder"  on storage.objects to authenticated;
alter policy "Oppdater pakkebilder"  on storage.objects to authenticated;
alter policy "Slett pakkebilder"     on storage.objects to authenticated;
-- «Les pakkebilder» røres bevisst IKKE (public-lesing i butikken).


-- TILLEGG etter Fables kontroll 10. sep (F1 i claude_KONTROLL-fable-109-10sep.md):
-- Supabase Storage krever SELECT i tillegg til DELETE for å slette — remove() må finne
-- fila først, og gir ingen feil når RLS stopper den. Uten denne ville «Fjern bilde» stille
-- latt fila ligge. Smal: kun redaksjon/ i importfiler, kun innloggede. Bøtta er public.
drop policy if exists "Redaksjon les" on storage.objects;
create policy "Redaksjon les" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'importfiler' and (storage.foldername(name))[1] = 'redaksjon');

commit;

-- ── KVITTERING: alle policyer på storage.objects i ÉN rad (navn · cmd · roller) ──────
select string_agg(
         policyname || ' [' || cmd || '] ' || array_to_string(roles, ','),
         ' | ' order by policyname
       ) as policyer_paa_storage_objects
from pg_policies
where schemaname = 'storage' and tablename = 'objects';
