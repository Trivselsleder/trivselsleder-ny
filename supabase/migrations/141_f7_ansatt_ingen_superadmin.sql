-- ============================================================================
-- 141_f7_ansatt_ingen_superadmin.sql — F7: ansatt kan ikke eskalere til superadmin
-- ============================================================================
-- KILDE (fasit): Fable F7 via OPPDRAG-CODE-HUBSPOT-OG-TILGANG-17sep.md, DEL 3.
--   Bygger på PRODS MÅLTE policytekst (DEL 0 / resultat-hubspot-tilgang-prod.md §4):
--     «Ansatt administrerer alle profiler»  ALL  to public  using (get_min_rolle()='ansatt')
--     (ingen WITH CHECK — da brukes USING også som check).
--
-- PROBLEM: en ansatt (Trivselsleder AS) med full skrivetilgang til profiles kunne
--   sette rolle = 'superadmin' på en rad (egen eller andres), eller endre en
--   eksisterende superadmin-rad → uønsket rettighetseskalering.
--
-- HVA: policyen får et ledd som (a) i USING skjuler/beskytter superadmin-rader mot
--   ansatt (kan ikke oppdatere/slette dem via denne policyen), og (b) i WITH CHECK
--   hindrer at en rad skrives/endres til rolle = 'superadmin'. «is distinct from»
--   håndterer NULL trygt (en rad med rolle IS NULL regnes ikke som superadmin).
--
--   Egen-profil-redigering er upåvirket: policyen «Bruker kan oppdatere egen profil»
--   (using auth.uid()=id, uten with_check → USING brukes som check) er en egen
--   PERMISSIVE policy og OR-es inn, så en bruker kan fortsatt oppdatere sin egen rad.
--   Superadmin har sin egen policy. Måling 4. sep: prod har 0 ansatt-rader i dag, så
--   ingen live bruker påvirkes — dette er en fremtidsvakt.
--
-- API-SIDE (samme leveranse): api/auth/inviter-bruker.js hvitelister `rolle` og
--   tillater KUN superadmin å invitere superadmin/ansatt (kode, ikke migrasjon).
--
-- NEGATIV TEST (scripts/rigg/test-141-ansatt-ingen-superadmin.sql): en ansatt prøver
--   å sette inn/oppdatere en profil til rolle='superadmin' → RLS avviser; en ansatt
--   prøver å endre en superadmin-rad → 0 rader truffet (USING skjuler den).
-- POSITIV TEST: en ansatt kan fortsatt sette inn/endre en skoleadmin-profil.
-- TILBAKERULLING: drop+create policyen med kun using (get_min_rolle()='ansatt'), uten with check.
-- ============================================================================

begin;

drop policy if exists "Ansatt administrerer alle profiler" on public.profiles;
create policy "Ansatt administrerer alle profiler" on public.profiles
  as permissive for all to public
  using (
    get_min_rolle() = 'ansatt'
    and rolle is distinct from 'superadmin'
  )
  with check (
    get_min_rolle() = 'ansatt'
    and rolle is distinct from 'superadmin'
  );

-- ----------------------------------------------------------------------------
-- SPERRE ETTER: policyen har nå både using OG with_check som nevner superadmin-vakten.
-- ----------------------------------------------------------------------------
do $$
declare v_using text; v_check text;
begin
  select qual, with_check into v_using, v_check from pg_policies
   where schemaname='public' and tablename='profiles'
     and policyname='Ansatt administrerer alle profiler';
  if v_using is null or v_check is null then
    raise exception 'STOPP 141 (etter): policyen mangler USING eller WITH CHECK.';
  end if;
  if v_using not like '%superadmin%' or v_check not like '%superadmin%' then
    raise exception 'STOPP 141 (etter): superadmin-vakten mangler i USING (%) eller WITH CHECK (%).', v_using, v_check;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- KVITTERING.
-- ----------------------------------------------------------------------------
select 'using: ' || qual || '  |  with check: ' || with_check as kvittering
from pg_policies
where schemaname='public' and tablename='profiles'
  and policyname='Ansatt administrerer alle profiler';

commit;
