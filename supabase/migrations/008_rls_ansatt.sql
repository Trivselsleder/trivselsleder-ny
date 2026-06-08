-- Ansatt-rollen får full lese- og skrivetilgang til paameldinger, skoler og profiles.
-- /admin/brukere er kun for superadmin – håndheves av ProtectedRoute i frontenden.
-- Bruker get_min_rolle() (SECURITY DEFINER fra 007) for å unngå rekursiv RLS på profiles.

-- paameldinger
CREATE POLICY "Ansatt administrerer paameldinger"
  ON paameldinger FOR ALL
  USING (get_min_rolle() = 'ansatt')
  WITH CHECK (get_min_rolle() = 'ansatt');

-- skoler (SELECT er allerede åpent for alle innloggede via "Innloggede ser skoler")
CREATE POLICY "Ansatt administrerer skoler"
  ON skoler FOR ALL
  USING (get_min_rolle() = 'ansatt')
  WITH CHECK (get_min_rolle() = 'ansatt');

-- profiles
CREATE POLICY "Ansatt administrerer alle profiler"
  ON profiles FOR ALL
  USING (get_min_rolle() = 'ansatt')
  WITH CHECK (get_min_rolle() = 'ansatt');
