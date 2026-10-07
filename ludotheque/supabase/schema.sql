-- =============================================================
-- Ludothèque : base de données Supabase
-- Supabase → SQL Editor → New query → coller ce fichier → Run.
-- Le script peut être relancé sans risque.
-- =============================================================

-- ---------- Profils ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_.-]+$'),
  avatar text not null default '🎮',
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (char_length(avatar) <= 300);
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (char_length(bio) <= 200);
alter table public.profiles enable row level security;
drop policy if exists "profils publics" on public.profiles;
create policy "profils publics" on public.profiles for select using (true);
drop policy if exists "profil modifiable par son propriétaire" on public.profiles;
create policy "profil modifiable par son propriétaire" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
revoke update on public.profiles from authenticated, anon;
grant update (username, avatar, bio) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  name text := coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'joueur_' || substr(new.id::text, 1, 8));
begin
  insert into public.profiles (id, username, avatar, is_admin)
  values (new.id, name, coalesce(nullif(new.raw_user_meta_data->>'avatar', ''), '🎮'), lower(name) = 'nuiraz');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where lower(username) = lower(p_username));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Comptes de jeu liés (Steam, PlayStation, Xbox) ----------
create table if not exists public.linked_accounts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('steam', 'psn', 'xbox')),
  external_id text not null,
  display_name text not null default '',
  avatar_url text,
  profile_url text,
  last_sync timestamptz,
  sync_error text,
  primary key (user_id, platform)
);
alter table public.linked_accounts enable row level security;
drop policy if exists "comptes publics" on public.linked_accounts;
create policy "comptes publics" on public.linked_accounts for select using (true);
drop policy if exists "délier son compte" on public.linked_accounts;
create policy "délier son compte" on public.linked_accounts for delete using (auth.uid() = user_id);
-- Ajout et mise à jour : uniquement par la fonction serveur « api » (clé service_role).

-- Jetons des plateformes : jamais lisibles depuis l'application (aucune règle = accès serveur uniquement).
create table if not exists public.platform_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);
alter table public.platform_tokens enable row level security;

-- ---------- Jeux ----------
create table if not exists public.games (
  id text primary key,                -- « steam:570 », « psn:NPWR12345_00 », « xbox:1234567 »
  platform text not null check (platform in ('steam', 'psn', 'xbox')),
  name text not null,
  cover_url text,
  header_url text,
  description text,
  genres text[] not null default '{}',
  release_date text,
  developer text,
  updated_at timestamptz not null default now()
);
create index if not exists games_name_idx on public.games using gin (to_tsvector('simple', name));
alter table public.games enable row level security;
drop policy if exists "jeux publics" on public.games;
create policy "jeux publics" on public.games for select using (true);

-- Bibliothèque de chaque joueur (remplie par la synchronisation).
create table if not exists public.user_games (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  playtime_minutes int not null default 0,
  last_played timestamptz,
  achievements_unlocked int not null default 0,
  achievements_total int not null default 0,
  platinum boolean not null default false,
  achievements jsonb not null default '[]',   -- [{ id, name, description, icon, unlocked, unlocked_at }]
  primary key (user_id, game_id)
);
create index if not exists user_games_game_idx on public.user_games (game_id);
alter table public.user_games enable row level security;
drop policy if exists "bibliothèques publiques" on public.user_games;
create policy "bibliothèques publiques" on public.user_games for select using (true);

-- ---------- Hub communautaire : avis notés et discussions ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  kind text not null default 'review' check (kind in ('review', 'discussion', 'achievement')),
  rating int check (rating between 1 and 10),
  body text not null default '' check (char_length(body) <= 4000),
  achievement jsonb,
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_has_rating check (kind <> 'review' or rating is not null)
);
-- Un seul avis noté par joueur et par jeu (il peut le modifier).
create unique index if not exists posts_one_review on public.posts (user_id, game_id) where kind = 'review';
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_game_idx on public.posts (game_id, created_at desc);
alter table public.posts enable row level security;
drop policy if exists "publications publiques" on public.posts;
create policy "publications publiques" on public.posts for select using (true);
drop policy if exists "publier" on public.posts;
create policy "publier" on public.posts for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "modifier sa publication" on public.posts;
create policy "modifier sa publication" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "supprimer sa publication" on public.posts;
create policy "supprimer sa publication" on public.posts for delete using (auth.uid() = user_id or public.is_admin());
revoke update on public.posts from authenticated, anon;
grant update (rating, body, updated_at) on public.posts to authenticated;

-- Note moyenne de la communauté pour chaque jeu.
create or replace view public.game_ratings with (security_invoker = true) as
  select game_id, round(avg(rating)::numeric, 1) as average, count(*)::int as reviews
  from public.posts where kind = 'review' group by game_id;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "likes publics" on public.post_likes;
create policy "likes publics" on public.post_likes for select using (true);
drop policy if exists "aimer" on public.post_likes;
create policy "aimer" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "ne plus aimer" on public.post_likes;
create policy "ne plus aimer" on public.post_likes for delete using (auth.uid() = user_id);

create table if not exists public.post_comments (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.post_comments enable row level security;
drop policy if exists "commentaires publics" on public.post_comments;
create policy "commentaires publics" on public.post_comments for select using (true);
drop policy if exists "commenter" on public.post_comments;
create policy "commenter" on public.post_comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "supprimer son commentaire" on public.post_comments;
create policy "supprimer son commentaire" on public.post_comments for delete using (auth.uid() = user_id or public.is_admin());

create or replace function public.sync_post_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.post_id, old.post_id);
begin
  update posts set
    likes_count = (select count(*) from post_likes where post_id = pid),
    comments_count = (select count(*) from post_comments where post_id = pid)
  where id = pid;
  return null;
end $$;
drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count after insert or delete on public.post_likes for each row execute function public.sync_post_counts();
drop trigger if exists post_comments_count on public.post_comments;
create trigger post_comments_count after insert or delete on public.post_comments for each row execute function public.sync_post_counts();

create table if not exists public.post_reports (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 300),
  created_at timestamptz not null default now()
);
alter table public.post_reports enable row level security;
drop policy if exists "signaler" on public.post_reports;
create policy "signaler" on public.post_reports for insert to authenticated with check (auth.uid() = user_id);
