-- Kontaktinfo og adresse lagres direkte på skolen (master for disse dataene)
ALTER TABLE skoler
  ADD COLUMN IF NOT EXISTS gateadresse   TEXT,
  ADD COLUMN IF NOT EXISTS postnummer    TEXT,
  ADD COLUMN IF NOT EXISTS poststed      TEXT,
  ADD COLUMN IF NOT EXISTS antall_elever INTEGER,
  ADD COLUMN IF NOT EXISTS rektor_navn   TEXT,
  ADD COLUMN IF NOT EXISTS rektor_epost  TEXT,
  ADD COLUMN IF NOT EXISTS htla_navn     TEXT,
  ADD COLUMN IF NOT EXISTS htla_epost    TEXT;
