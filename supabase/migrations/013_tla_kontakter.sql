-- Støtte for flere TL-ansvarlige per skole (JSONB-array)
ALTER TABLE skoler
  ADD COLUMN IF NOT EXISTS tla_kontakter JSONB DEFAULT '[]'::jsonb;

-- Migrer eksisterende enkelt-TLA over i den nye arrayen
UPDATE skoler
SET tla_kontakter = jsonb_build_array(
  jsonb_build_object('navn', tla_navn, 'epost', tla_epost, 'telefon', tla_telefon)
)
WHERE tla_epost IS NOT NULL AND tla_epost <> '';
