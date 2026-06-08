-- Legg til e-post og aktiv-flagg på profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS epost TEXT,
  ADD COLUMN IF NOT EXISTS aktiv BOOLEAN NOT NULL DEFAULT TRUE;
