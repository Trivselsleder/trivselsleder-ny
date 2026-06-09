-- Fjerner de utgåtte enkeltkolonnene for TL-ansvarlig fra skoler.
-- Disse er erstattet av tla_kontakter (JSONB-array, lagt til i 013).
-- NB: paameldinger-tabellen beholder sine tla_-kolonner — de er fortsatt i bruk.
ALTER TABLE skoler
  DROP COLUMN IF EXISTS tla_navn,
  DROP COLUMN IF EXISTS tla_epost,
  DROP COLUMN IF EXISTS tla_telefon;
