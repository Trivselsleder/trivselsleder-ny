-- 058: Fjern ubrukt kolonne haller.pris.
-- KJØRES LIVE i Supabase 19. aug 2026 (arkiv; basen endres av denne).
--
-- «pris» hører ikke hjemme på en hall (Kjartan 19. aug). Kolonnen var aldri
-- eksponert i UI-et og brukes ingen steder i kode eller databasefunksjoner
-- (alle «pris»-referanser gjelder evaluerings-pakkene, ikke haller). Droppes.

begin;

alter table public.haller drop column if exists pris;

commit;
