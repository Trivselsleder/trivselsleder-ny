-- 076_skoler_oppstart_aar.sql
-- Legger til profilfeltet oppstart_aar på skoler (skolens oppstartsår i
-- Trivselsprogrammet). Grunnlag: forsjekk/gate 30. aug 2026 — feltet var
-- forutsatt «hentet fra profil» av skoleundersøkelsen, men fantes ikke.
-- Beslutning (Kjartan): legg feltet på skoler FØR skoleundersøkelsen bygges,
-- så v1-spørsmålssettet står uendret og oppstartsår forblir KUTTET fra selve
-- undersøkelsen (hentes herfra).
--
-- Skoleundersøkelsens datamodell (tidligere planlagt som 076) rykker til 077.
--
-- IKKE KJØRT ENNÅ. Additiv, idempotent. Rører KUN skoler — ett nytt felt.
--
--   * oppstart_aar er NULLABLE og står tom for alle eksisterende skoler til den
--     fylles via HubSpot-import senere. Ingen backfill her.
--   * CHECK holder verdien i et fornuftig intervall (typo-vern), men tillater NULL.
--     Postgres CHECK kan ikke bruke now()/current_date (ikke immutable), så øvre
--     grense er en fast, romslig takhøyde (2100) i stedet for «inneværende år» —
--     ellers ville en hardkodet 2026 avvise et legitimt fremtidig oppstartsår
--     til neste år og bli en vedlikeholdsfelle. 1990–2100 fanger tastefeil trygt.

begin;

alter table public.skoler
  add column if not exists oppstart_aar integer;

comment on column public.skoler.oppstart_aar is
  'Skolens oppstartsår i Trivselsprogrammet. Nullable — tom til HubSpot-import fyller den. Kuttet fra skoleundersøkelsen (hentes herfra).';

-- Idempotent CHECK: tillater NULL, ellers 1990..2100 (typo-vern).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skoler_oppstart_aar_check'
  ) then
    alter table public.skoler
      add constraint skoler_oppstart_aar_check
      check (oppstart_aar is null or oppstart_aar between 1990 and 2100);
  end if;
end $$;

commit;
