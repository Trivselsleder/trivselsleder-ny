ALTER TABLE skoler
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Potensielle',
  ADD COLUMN IF NOT EXISTS ansvarlig TEXT;

ALTER TABLE skoler
  ADD CONSTRAINT skoler_status_check
    CHECK (status IN ('Påmeldt', 'Aktiv', 'Aktiv sagt opp', 'Pause', 'Tidligere', 'Potensielle'));
