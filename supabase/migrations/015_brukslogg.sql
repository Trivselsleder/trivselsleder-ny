CREATE TABLE brukslogg (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  skole_id      UUID        REFERENCES skoler(id) ON DELETE SET NULL,
  bruker_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  hendelse_type TEXT        NOT NULL CHECK (hendelse_type IN (
                              'innlogging', 'sidevisning', 'ressurs_apnet',
                              'nedlasting', 'sok'
                            )),
  ressurs_id    TEXT,
  ressurs_navn  TEXT,
  side          TEXT,
  tidspunkt     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX brukslogg_skole_idx    ON brukslogg (skole_id, tidspunkt DESC);
CREATE INDEX brukslogg_bruker_idx   ON brukslogg (bruker_id, tidspunkt DESC);
CREATE INDEX brukslogg_hendelse_idx ON brukslogg (hendelse_type, tidspunkt DESC);

ALTER TABLE brukslogg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bruker kan logge egne hendelser"
  ON brukslogg FOR INSERT
  WITH CHECK (auth.uid() = bruker_id);

CREATE POLICY "Superadmin og ansatt ser alle logger"
  ON brukslogg FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.rolle IN ('superadmin', 'ansatt')
  ));

CREATE POLICY "Skoleadmin ser sin skoles logger"
  ON brukslogg FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bruker_skole bs
    WHERE bs.bruker_id = auth.uid()
      AND bs.skole_id  = brukslogg.skole_id
      AND bs.rolle     = 'skoleadmin'
      AND bs.aktiv     = true
  ));
