-- Migration : ajout de la table itinerary (à exécuter si book_sections existe déjà)
-- Supabase → SQL Editor → New query → coller → Run

CREATE TABLE IF NOT EXISTS itinerary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  date_prevue DATE,
  description_culture TEXT DEFAULT '',
  budget_prevu NUMERIC(10,2) DEFAULT 0,
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
