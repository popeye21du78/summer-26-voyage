-- Migration : ajouter photo_url à itinerary pour le cache Unsplash
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

ALTER TABLE itinerary
ADD COLUMN IF NOT EXISTS photo_url TEXT;
