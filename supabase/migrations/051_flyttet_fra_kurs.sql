-- 051: B4b (høring) – egen invitasjon for flyttede skoler.
-- KJØRT LIVE i Supabase 19. aug 2026 (arkiv; basen er allerede endret). Idempotent.
--
-- Én kolonne: hvilket kurs skolen ble flyttet FRA (fri tekst «Navn (dato)»).
-- Settes av «Flytt til annet kurs» i Se svar; leses av send-invitasjon.js som
-- setter en «dere er flyttet hit fra …»-merknad øverst i invitasjonen.

begin;

alter table public.kurs_skole
  add column if not exists flyttet_fra_kurs text;

commit;
