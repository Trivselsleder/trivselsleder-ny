-- 059: B14 (høring) – fritekst-notat per skole.
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne). Idempotent.
--
-- RA trenger et sted å skrive korte notater om en skole («kan ikke være vertskap,
-- lang reisevei» o.l.). Notatet hører til skolen og vises der vertskap bestemmes
-- (Se svar). Ansatte har allerede update-rett på skoler (RLS «Ansatt administrerer
-- skoler»), så ingen ny policy trengs.

begin;

alter table public.skoler
  add column if not exists notat text;

commit;
