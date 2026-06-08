-- Lagrer HubSpot Company-ID for å kunne oppdatere selskapet ved godkjenning
ALTER TABLE paameldinger
  ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;
