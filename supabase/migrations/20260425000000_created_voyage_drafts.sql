-- Brouillons « Préparer → ébauche » : source de vérité côté serveur (Vercel + appareil fiable)
create table if not exists public.created_voyage_drafts (
  user_id text not null,
  id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists created_voyage_drafts_user_updated
  on public.created_voyage_drafts (user_id, updated_at desc);

alter table public.created_voyage_drafts enable row level security;

comment on table public.created_voyage_drafts is
  'Voyages created-* (ébauche) ; accès via API (service role), pas en direct client.';
