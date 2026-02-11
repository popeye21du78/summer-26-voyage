-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

-- Table des sections Book par ville
CREATE TABLE IF NOT EXISTS book_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id TEXT UNIQUE NOT NULL,
  texte TEXT DEFAULT '',
  photos TEXT[] DEFAULT '{}',
  police_titre TEXT DEFAULT 'serif' CHECK (police_titre IN ('serif', 'sans')),
  police_sous_titre TEXT DEFAULT 'sans' CHECK (police_sous_titre IN ('serif', 'sans')),
  gras BOOLEAN DEFAULT true,
  italique BOOLEAN DEFAULT false,
  layout TEXT DEFAULT 'single' CHECK (layout IN ('single', 'grid2', 'grid3')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS book_sections_updated_at ON book_sections;
CREATE TRIGGER book_sections_updated_at
  BEFORE UPDATE ON book_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Politique RLS : lecture publique, écriture autorisée (à affiner si auth)
ALTER TABLE book_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique" ON book_sections;
CREATE POLICY "Lecture publique" ON book_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert autorisé" ON book_sections;
CREATE POLICY "Insert autorisé" ON book_sections
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update autorisé" ON book_sections;
CREATE POLICY "Update autorisé" ON book_sections
  FOR UPDATE USING (true);

-- Bucket Storage pour les photos
-- Dans Supabase : Storage → New bucket → nom "photos" → Public bucket ✓

-- Table itinerary : étapes du voyage (ordre, dates, nuitée, budgets) – éditable via /planning
CREATE TABLE IF NOT EXISTS itinerary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  date_prevue DATE,
  date_depart DATE,
  description_culture TEXT DEFAULT '',
  budget_prevu NUMERIC(10,2) DEFAULT 0,
  nuitee_type TEXT CHECK (nuitee_type IN ('van', 'passage', 'airbnb')),
  budget_culture NUMERIC(10,2) DEFAULT 0,
  budget_nourriture NUMERIC(10,2) DEFAULT 0,
  budget_nuitee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS itinerary_updated_at ON itinerary;
CREATE TRIGGER itinerary_updated_at
  BEFORE UPDATE ON itinerary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE itinerary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique itinerary" ON itinerary;
CREATE POLICY "Lecture publique itinerary" ON itinerary
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert autorisé itinerary" ON itinerary;
CREATE POLICY "Insert autorisé itinerary" ON itinerary
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update autorisé itinerary" ON itinerary;
CREATE POLICY "Update autorisé itinerary" ON itinerary
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Delete autorisé itinerary" ON itinerary;
CREATE POLICY "Delete autorisé itinerary" ON itinerary
  FOR DELETE USING (true);
