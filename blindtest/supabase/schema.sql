-- =============================================================
-- Blind Test : base de données Supabase
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Le script peut être relancé sans risque.
-- =============================================================

-- ---------- Profils joueurs ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (char_length(username) between 3 and 20 and username ~ '^[A-Za-z0-9_.-]+$'),
  avatar text not null default '🎧' check (char_length(avatar) <= 8),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profils publics" on public.profiles;
create policy "profils publics" on public.profiles for select using (true);
drop policy if exists "profil modifiable par son propriétaire" on public.profiles;
create policy "profil modifiable par son propriétaire" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Création automatique du profil à l'inscription (pseudo et avatar passés en métadonnées).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), 'joueur_' || substr(new.id::text, 1, 8)),
    coalesce(nullif(new.raw_user_meta_data->>'avatar', ''), '🎧')
  );
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Vérifie qu'un pseudo est libre (appelée avant l'inscription).
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where lower(username) = lower(p_username));
$$;

-- Suppression de compte (droit à l'effacement RGPD) : supprime l'utilisateur et toutes ses données.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Scores (classement mondial) ----------
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  score int not null check (score between 0 and 30000),
  difficulty text not null check (char_length(difficulty) <= 20),
  category text not null default '' check (char_length(category) <= 80),
  correct int not null check (correct >= 0),
  rounds int not null check (rounds between 1 and 50 and correct <= rounds),
  created_at timestamptz not null default now()
);
create index if not exists scores_difficulty_idx on public.scores (difficulty, score desc);
alter table public.scores enable row level security;
drop policy if exists "scores publics" on public.scores;
create policy "scores publics" on public.scores for select using (true);
drop policy if exists "un joueur enregistre ses scores" on public.scores;
create policy "un joueur enregistre ses scores" on public.scores
  for insert to authenticated with check (auth.uid() = user_id);

create or replace function public.get_leaderboard(p_difficulty text default null, p_since timestamptz default null)
returns table (user_id uuid, username text, avatar text, best int, games bigint)
language sql stable set search_path = public as $$
  select p.id, p.username, p.avatar, max(s.score)::int as best, count(*) as games
  from scores s join profiles p on p.id = s.user_id
  where (p_difficulty is null or s.difficulty = p_difficulty)
    and (p_since is null or s.created_at >= p_since)
  group by p.id, p.username, p.avatar
  order by best desc, games desc
  limit 100;
$$;

-- ---------- Hub communautaire : playlists partagées ----------
create table if not exists public.shared_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  description text not null default '' check (char_length(description) <= 300),
  emoji text not null default '🎵' check (char_length(emoji) <= 8),
  color text not null default '#FF4FD8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  tracks jsonb not null check (jsonb_typeof(tracks) = 'array' and jsonb_array_length(tracks) between 4 and 500),
  track_count int generated always as (jsonb_array_length(tracks)) stored,
  likes_count int not null default 0,
  plays_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shared_playlists_likes_idx on public.shared_playlists (likes_count desc);
alter table public.shared_playlists enable row level security;
drop policy if exists "playlists publiques" on public.shared_playlists;
create policy "playlists publiques" on public.shared_playlists for select using (true);
drop policy if exists "partage par un membre" on public.shared_playlists;
create policy "partage par un membre" on public.shared_playlists
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "modifiable par son auteur" on public.shared_playlists;
create policy "modifiable par son auteur" on public.shared_playlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "supprimable par son auteur" on public.shared_playlists;
create policy "supprimable par son auteur" on public.shared_playlists
  for delete using (auth.uid() = user_id);
-- Les compteurs ne sont modifiables que par les fonctions ci-dessous.
revoke update on public.shared_playlists from authenticated, anon;
grant update (title, description, emoji, color, tracks) on public.shared_playlists to authenticated;

create table if not exists public.playlist_likes (
  playlist_id uuid not null references public.shared_playlists (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (playlist_id, user_id)
);
alter table public.playlist_likes enable row level security;
drop policy if exists "likes publics" on public.playlist_likes;
create policy "likes publics" on public.playlist_likes for select using (true);
drop policy if exists "liker" on public.playlist_likes;
create policy "liker" on public.playlist_likes for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "retirer son like" on public.playlist_likes;
create policy "retirer son like" on public.playlist_likes for delete using (auth.uid() = user_id);

create or replace function public.sync_likes_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update shared_playlists set likes_count = (
    select count(*) from playlist_likes where playlist_id = coalesce(new.playlist_id, old.playlist_id)
  ) where id = coalesce(new.playlist_id, old.playlist_id);
  return null;
end $$;
drop trigger if exists playlist_likes_count on public.playlist_likes;
create trigger playlist_likes_count after insert or delete on public.playlist_likes
  for each row execute function public.sync_likes_count();

create or replace function public.count_play(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update shared_playlists set plays_count = plays_count + 1 where id = p_id;
$$;

-- Signalements (modération depuis le tableau de bord Supabase).
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  playlist_id uuid not null references public.shared_playlists (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 300),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "signaler" on public.reports;
create policy "signaler" on public.reports for insert to authenticated with check (auth.uid() = user_id);
