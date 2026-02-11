-- Migration : table city_sections pour les textes générés par IA (page ville)
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

CREATE TABLE IF NOT EXISTS city_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id TEXT NOT NULL,
  section_type TEXT NOT NULL,
  content TEXT DEFAULT '',
  place_rating INTEGER CHECK (place_rating IN (1, 2, 3, 4)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(step_id, section_type)
);

CREATE INDEX IF NOT EXISTS city_sections_step_id ON city_sections(step_id);

DROP TRIGGER IF EXISTS city_sections_updated_at ON city_sections;
CREATE TRIGGER city_sections_updated_at
  BEFORE UPDATE ON city_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE city_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture publique city_sections" ON city_sections;
CREATE POLICY "Lecture publique city_sections" ON city_sections
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert autorisé city_sections" ON city_sections;
CREATE POLICY "Insert autorisé city_sections" ON city_sections
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update autorisé city_sections" ON city_sections;
CREATE POLICY "Update autorisé city_sections" ON city_sections
  FOR UPDATE USING (true);
