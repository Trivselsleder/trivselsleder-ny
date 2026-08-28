-- ============================================================================
-- MIGRASJON 074: brukslogg — INSERT-grant + hendelsestype «tu_rapport_generert»
-- Trivselsleder-ny · 28. aug 2026 · Retter FUNN 2 fra uavhengig Fable-kontroll
-- (KONTROLL-fable-TU-steg5-28aug.md).
--
-- FUNN: `insert into brukslogg` fra klienten (useBrukslogg) feilet stille på
-- to ting: (1) rollen authenticated manglet INSERT-grant (RLS-policyen
-- «Bruker kan logge egne hendelser» fantes, men GRANT gjorde ikke), og
-- (2) CHECK-constrainten tillot ikke verdien 'tu_rapport_generert'.
-- Tabellen hadde 0 rader — hele appens brukslogg har vært død. (Den bredere
-- loggingen er en egen sak for Kjartan; denne migrasjonen gjør bare det som
-- trengs for at innsettinger kan lykkes + steg 5-hendelsen.)
--
-- RLS er uendret: policyen krever fortsatt auth.uid() = bruker_id.
-- Ingen SELECT-grant gis her (skoleadmin/superadmin-lesing er egen policy og
-- egen vurdering). Idempotent. Kjøres i Supabase SQL-editor som én transaksjon.
-- ============================================================================

grant insert on public.brukslogg to authenticated;

alter table public.brukslogg drop constraint if exists brukslogg_hendelse_type_check;
alter table public.brukslogg add constraint brukslogg_hendelse_type_check
  check (hendelse_type in ('innlogging','sidevisning','ressurs_apnet','nedlasting','sok','tu_rapport_generert'));
