-- Hjelpefunksjoner med SECURITY DEFINER unngår rekursiv RLS-evaluering

-- Returnerer skole-ID-ene til innlogget bruker (bypasser RLS)
CREATE OR REPLACE FUNCTION get_mine_skole_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT skole_id FROM bruker_skole WHERE bruker_id = auth.uid(); $$;

-- Returnerer rollen til innlogget bruker (bypasser RLS)
CREATE OR REPLACE FUNCTION get_min_rolle()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT rolle FROM profiles WHERE id = auth.uid(); $$;

-- Skoleadmin kan se alle bruker_skole-rader for sin/sine skole(r)
CREATE POLICY "Skoleadmin ser ansatte paa sin skole"
  ON bruker_skole FOR SELECT
  USING (
    get_min_rolle() = 'skoleadmin'
    AND skole_id IN (SELECT get_mine_skole_ids())
  );

-- Skoleadmin kan se profiler til ansatte på sin skole
CREATE POLICY "Skoleadmin ser profiler til skoleansatte"
  ON profiles FOR SELECT
  USING (
    get_min_rolle() = 'skoleadmin'
    AND id IN (
      SELECT bruker_id FROM bruker_skole
      WHERE skole_id IN (SELECT get_mine_skole_ids())
    )
  );
