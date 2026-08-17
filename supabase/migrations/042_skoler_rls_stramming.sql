-- ============================================================================
-- skoler-SELECT strammet (17. aug 2026) — personvern: hindre kryss-kunde lesing
-- av kontakt-PII (rektor/HTLA/hovedkontakt e-post/telefon, adresse, tla_kontakter).
-- KJoRT + VERIFISERT LIVE i hovedbasen (zpirjbrcbeubwpmtncxx). MAA pushes til repo.
-- Bevist: skoleadmin ser kun egne skoler (2 av 17, 0 fremmede rader); superadmin ser alle 17.
-- superadmin/ansatt beholder full tilgang via sine egne [ALL]-policyer (permissive OR).
-- MERK: DB er allerede oppdatert — IKKE kjor pa nytt via `supabase db push`; dette er kun
-- for a holde migrasjonsmappa i sync (idempotent hvis den likevel kjores).
-- ============================================================================
begin;
drop policy if exists "Innloggede ser skoler" on public.skoler;
create policy "Bruker ser egne skoler" on public.skoler
  for select to authenticated
  using (id in (select public.get_mine_skole_ids()));
commit;
