-- Utvid profiles.rolle til å inkludere HTLA
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_rolle_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_rolle_check
    CHECK (rolle IN ('superadmin', 'administrator', 'HTLA', 'ansatt'));

-- Utvid bruker_skole.rolle til å inkludere HTLA
ALTER TABLE bruker_skole
  DROP CONSTRAINT IF EXISTS bruker_skole_rolle_check;

ALTER TABLE bruker_skole
  ADD CONSTRAINT bruker_skole_rolle_check
    CHECK (rolle IN ('administrator', 'HTLA', 'ansatt'));
