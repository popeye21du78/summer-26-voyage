-- Validations de photos (remplace l’écriture seule sur le disque, compatible Vercel).
-- À exécuter dans le SQL Editor Supabase si la migration auto n’est pas utilisée.

create table if not exists public.photo_validations (
  slug text primary key,
  entry jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists photo_validations_updated_at_idx on public.photo_validations (updated_at desc);

comment on table public.photo_validations is 'Entrées maintenance photo-validations (slug → payload JSON)';

alter table public.photo_validations enable row level security;

-- Accès réservé au service role (côté app : SUPABASE_SERVICE_ROLE_KEY). L’anon n’a pas de policy.
