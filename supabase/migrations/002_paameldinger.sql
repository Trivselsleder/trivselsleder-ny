CREATE TABLE paameldinger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'påmeldt',

  -- Skole
  skolenavn TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('barnehage', 'barnetrinn', 'ungdomstrinn', 'kombinert', 'SFO')),
  antall_elever INTEGER,

  -- Adresse
  gateadresse TEXT NOT NULL,
  postnummer TEXT NOT NULL,
  poststed TEXT NOT NULL,
  kommune TEXT NOT NULL,
  fylke TEXT NOT NULL,
  hjemmeside TEXT,

  -- Faktura
  fakturaadresse TEXT,
  organisasjonsnummer TEXT NOT NULL,
  fakturareferanse TEXT,
  kontortelefon TEXT,

  -- Kontaktpersoner
  rektor_navn TEXT NOT NULL,
  rektor_epost TEXT NOT NULL,
  rektor_telefon TEXT,

  htla_navn TEXT,
  htla_epost TEXT,
  htla_telefon TEXT,

  tla_navn TEXT,
  tla_epost TEXT,
  tla_telefon TEXT,

  merknader TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paameldinger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin administrerer paameldinger"
  ON paameldinger FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.rolle = 'superadmin'
  ));
