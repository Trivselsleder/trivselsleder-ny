-- Migrér eksisterende data til nye rollenavn
UPDATE profiles    SET rolle = 'skoleadmin'  WHERE rolle IN ('administrator', 'HTLA');
UPDATE bruker_skole SET rolle = 'skoleadmin'  WHERE rolle IN ('administrator', 'HTLA');
UPDATE bruker_skole SET rolle = 'skoleansatt' WHERE rolle = 'ansatt';

-- Oppdater CHECK-constraint på profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_rolle_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_rolle_check
  CHECK (rolle IN ('superadmin', 'ansatt', 'skoleadmin', 'skoleansatt', 'feide'));

-- Oppdater CHECK-constraint på bruker_skole
ALTER TABLE bruker_skole DROP CONSTRAINT IF EXISTS bruker_skole_rolle_check;
ALTER TABLE bruker_skole ADD CONSTRAINT bruker_skole_rolle_check
  CHECK (rolle IN ('skoleadmin', 'skoleansatt'));
