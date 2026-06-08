-- Lagrer HubSpot Company-ID direkte på skolen for å unngå navnesøk
ALTER TABLE skoler
  ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT;
