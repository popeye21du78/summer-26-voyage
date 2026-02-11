-- Migration : nuitee_type, budget_culture, budget_nourriture sur itinerary
-- Supabase → SQL Editor → New query → coller → Run

ALTER TABLE itinerary
  ADD COLUMN IF NOT EXISTS nuitee_type TEXT CHECK (nuitee_type IN ('van', 'passage', 'airbnb'));

ALTER TABLE itinerary
  ADD COLUMN IF NOT EXISTS budget_culture NUMERIC(10,2) DEFAULT 0;

ALTER TABLE itinerary
  ADD COLUMN IF NOT EXISTS budget_nourriture NUMERIC(10,2) DEFAULT 0;

ALTER TABLE itinerary
  ADD COLUMN IF NOT EXISTS budget_nuitee NUMERIC(10,2) DEFAULT 0;

ALTER TABLE itinerary
  ADD COLUMN IF NOT EXISTS date_depart DATE;
