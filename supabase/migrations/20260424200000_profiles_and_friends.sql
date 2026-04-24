-- Profils (liés à auth.users) + arêtes d’amitié (request → acceptation).
-- Exécuter sur Supabase (SQL) après l’auth par e-mail est activée.

-- Profil applicatif
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- Amis : (user_low, user_high) uniques, user_low < user_high
create table if not exists public.friend_edges (
  id uuid primary key default gen_random_uuid (),
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  requested_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now (),
  check (user_low < user_high),
  unique (user_low, user_high)
);

create index if not exists friend_edges_user_low on public.friend_edges (user_low);
create index if not exists friend_edges_user_high on public.friend_edges (user_high);

create or replace function public.set_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data->>'display_name')::text,
      split_part(new.email, '@', 1),
      'Voyageur'
    )
  )
  on conflict (id) do update set
    display_name = excluded.display_name
    where public.profiles.display_name = '';
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.set_profile_on_signup();

-- Mettre à jour les comptes déjà créés (optionnel) :
-- insert into public.profiles (id, display_name) select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)) from auth.users on conflict do nothing;

comment on table public.profiles is 'Profil Viago, lié à auth.users (connexion e-mail, etc.)';
comment on table public.friend_edges is 'Demande (pending) et amitié acceptée ; user_low < user_high.';

-- RLS (optionnel) : ici l’app passe par l’API Next + service_role ; on peut activer RLS + deny.
alter table public.profiles enable row level security;
alter table public.friend_edges enable row level security;

-- Pas de policy “publique” = refus côté PostgREST sauf service_role côté serveur.
-- Exemple (plus tard) : select sur profiles id = auth.uid(), etc.
