-- Profiler knyttet til Supabase auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  navn TEXT,
  rolle TEXT NOT NULL CHECK (rolle IN ('superadmin', 'administrator', 'ansatt')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skoler (opprettes av superadmin, støtter fremtidig bulk-import)
CREATE TABLE skoler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn TEXT NOT NULL,
  org_nr TEXT UNIQUE,        -- idempotent nøkkel for Excel/CSV-import: INSERT … ON CONFLICT (org_nr) DO UPDATE
  kommunenr TEXT,
  kommunenavn TEXT,
  fylke TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bruker tilknyttet skole(r) med rolle
CREATE TABLE bruker_skole (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bruker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skole_id UUID REFERENCES skoler(id) ON DELETE CASCADE,
  rolle TEXT NOT NULL CHECK (rolle IN ('administrator', 'ansatt')),
  aktiv BOOLEAN DEFAULT TRUE,
  UNIQUE(bruker_id, skole_id)
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bruker ser sin profil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Superadmin administrerer alle profiler"
  ON profiles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.rolle = 'superadmin'
  ));

ALTER TABLE skoler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Innloggede ser skoler"
  ON skoler FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Superadmin administrerer skoler"
  ON skoler FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.rolle = 'superadmin'
  ));

ALTER TABLE bruker_skole ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bruker ser egne skoletilknytninger"
  ON bruker_skole FOR SELECT
  USING (auth.uid() = bruker_id);
CREATE POLICY "Superadmin administrerer bruker_skole"
  ON bruker_skole FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.rolle = 'superadmin'
  ));

-- Første superadmin settes manuelt etter at brukeren er opprettet i Supabase Auth:
-- INSERT INTO profiles (id, navn, rolle) VALUES ('<uuid fra auth.users>', 'Navn Navnesen', 'superadmin');
