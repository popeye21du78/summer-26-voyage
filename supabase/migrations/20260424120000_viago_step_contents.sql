-- Contenu Viago par étape (hors gros binaires : URLs Storage uniquement).
-- Exécuter sur le projet Supabase (SQL editor) si la table n’existe pas encore.
-- Prérequis : extension "uuid-ossp" ou gen_random_uuid() (Postgres 13+).

create table if not exists public.viago_step_contents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  voyage_id text not null,
  step_id text not null,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, voyage_id, step_id)
);

create index if not exists viago_step_contents_user_voyage
  on public.viago_step_contents (user_id, voyage_id);

comment on table public.viago_step_contents is
  'Métadonnées Viago (JSON) ; les photos pointent vers le bucket Storage, pas de data URL.';

-- RLS : sans policy, anon/authenticated n’ont pas d’accès direct (bien en prod).
-- L’app utilise la service_role côté API Next → contourne RLS, comportement voulu.
-- Plus tard : policies (ex. user_id = auth.uid()::text) si client Supabase direct.
alter table public.viago_step_contents enable row level security;
