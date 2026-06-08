-- Telefon på skolen, nettverk, og nye kontaktpersoner (Hovedkontakt TL og TL-ansvarlig)
ALTER TABLE skoler
  ADD COLUMN IF NOT EXISTS telefon         TEXT,
  ADD COLUMN IF NOT EXISTS nettverk        TEXT,
  ADD COLUMN IF NOT EXISTS rektor_telefon  TEXT,
  ADD COLUMN IF NOT EXISTS hktl_navn       TEXT,
  ADD COLUMN IF NOT EXISTS hktl_epost      TEXT,
  ADD COLUMN IF NOT EXISTS hktl_telefon    TEXT,
  ADD COLUMN IF NOT EXISTS tla_navn        TEXT,
  ADD COLUMN IF NOT EXISTS tla_epost       TEXT,
  ADD COLUMN IF NOT EXISTS tla_telefon     TEXT;
