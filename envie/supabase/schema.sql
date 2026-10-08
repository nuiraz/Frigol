-- ============================================================================
-- Envie : base de données Supabase.
-- À coller dans Supabase → SQL Editor → Run. Le script peut être relancé sans risque.
-- ============================================================================

-- ---------------------------------------------------------------- Profils
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar text not null default '🍿',
  bio text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar text not null default '🍿';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[A-Za-z0-9_.-]{3,20}$') not valid;
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (char_length(avatar) <= 300);
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (char_length(bio) <= 200);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

alter table public.profiles enable row level security;
drop policy if exists "profils visibles" on public.profiles;
create policy "profils visibles" on public.profiles for select using (true);
drop policy if exists "je modifie mon profil" on public.profiles;
create policy "je modifie mon profil" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
-- Impossible de se donner les droits d'admin : seules ces colonnes sont modifiables.
revoke update on public.profiles from anon, authenticated;
grant update (username, avatar, bio) on public.profiles to authenticated;

-- Création automatique du profil à l'inscription. Le compte « nuiraz » est administrateur.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), 'membre_' || substr(new.id::text, 1, 6));
begin
  if exists (select 1 from public.profiles where lower(username) = lower(wanted)) then
    wanted := left(wanted, 13) || '_' || substr(new.id::text, 1, 6);
  end if;
  insert into public.profiles (id, username, is_admin)
  values (new.id, wanted, lower(wanted) = 'nuiraz')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------- Titres ajoutés par l'admin
create table if not exists public.items (
  id text primary key default ('ajout-' || substr(gen_random_uuid()::text, 1, 8)),
  type text not null check (type in ('film', 'serie', 'jeu', 'musique')),
  title text not null check (char_length(title) between 1 and 120),
  year int,
  creator text not null default '',
  genres text[] not null default '{}',
  moods text[] not null default '{}',
  platforms text[] not null default '{}',
  summary text not null default '' check (char_length(summary) <= 500),
  image text check (image is null or image ~ '^https://'),
  length text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.items enable row level security;
drop policy if exists "titres visibles" on public.items;
create policy "titres visibles" on public.items for select using (true);
drop policy if exists "admin gère les titres" on public.items;
create policy "admin gère les titres" on public.items for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- Jaquettes partagées
-- Quand un membre retrouve une jaquette (iTunes, TVmaze), elle sert à tout le monde.
create table if not exists public.artwork (
  item_id text primary key,
  image text,
  preview text,
  created_at timestamptz not null default now()
);
-- Seules les images des sources connues sont acceptées.
alter table public.artwork drop constraint if exists artwork_image_check;
alter table public.artwork add constraint artwork_image_check
  check (image is null or image ~ '^https://([a-z0-9-]+\.)*(mzstatic\.com|tvmaze\.com|wikimedia\.org)/');
alter table public.artwork drop constraint if exists artwork_preview_check;
alter table public.artwork add constraint artwork_preview_check
  check (preview is null or preview ~ '^https://([a-z0-9-]+\.)*(apple\.com|mzstatic\.com)/');
alter table public.artwork enable row level security;
drop policy if exists "jaquettes visibles" on public.artwork;
create policy "jaquettes visibles" on public.artwork for select using (true);
drop policy if exists "membres ajoutent une jaquette" on public.artwork;
create policy "membres ajoutent une jaquette" on public.artwork for insert to authenticated with check (true);
drop policy if exists "admin supprime une jaquette" on public.artwork;
create policy "admin supprime une jaquette" on public.artwork for delete using (public.is_admin());

-- ---------------------------------------------------------------- Avis (le hub)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_id text not null,
  item_type text not null check (item_type in ('film', 'serie', 'jeu', 'musique')),
  item_title text not null check (char_length(item_title) <= 160),
  item_image text check (item_image is null or item_image ~ '^https://'),
  item_year int,
  rating int not null check (rating between 1 and 10),
  body text not null default '' check (char_length(body) <= 2000),
  likes int not null default 0,
  comments int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists reviews_item on public.reviews (item_id);
create index if not exists reviews_recent on public.reviews (created_at desc);
alter table public.reviews enable row level security;
drop policy if exists "avis visibles" on public.reviews;
create policy "avis visibles" on public.reviews for select using (true);
drop policy if exists "je publie mes avis" on public.reviews;
create policy "je publie mes avis" on public.reviews for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "je modifie mes avis" on public.reviews;
create policy "je modifie mes avis" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "je supprime mes avis" on public.reviews;
create policy "je supprime mes avis" on public.reviews for delete using (user_id = auth.uid() or public.is_admin());
revoke update on public.reviews from anon, authenticated;
grant update (rating, body, item_image, updated_at) on public.reviews to authenticated;

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.review_likes enable row level security;
drop policy if exists "likes visibles" on public.review_likes;
create policy "likes visibles" on public.review_likes for select using (true);
drop policy if exists "je like" on public.review_likes;
create policy "je like" on public.review_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "je retire mon like" on public.review_likes;
create policy "je retire mon like" on public.review_likes for delete using (user_id = auth.uid());

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists review_comments_review on public.review_comments (review_id, created_at);
alter table public.review_comments enable row level security;
drop policy if exists "commentaires visibles" on public.review_comments;
create policy "commentaires visibles" on public.review_comments for select using (true);
drop policy if exists "je commente" on public.review_comments;
create policy "je commente" on public.review_comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "je supprime mes commentaires" on public.review_comments;
create policy "je supprime mes commentaires" on public.review_comments for delete using (user_id = auth.uid() or public.is_admin());

create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);
alter table public.review_reports enable row level security;
drop policy if exists "je signale" on public.review_reports;
create policy "je signale" on public.review_reports for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admin voit les signalements" on public.review_reports;
create policy "admin voit les signalements" on public.review_reports for select using (public.is_admin());
drop policy if exists "admin traite les signalements" on public.review_reports;
create policy "admin traite les signalements" on public.review_reports for delete using (public.is_admin());

-- Compteurs de likes et de commentaires tenus à jour automatiquement.
create or replace function public.sync_review_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid uuid := coalesce(new.review_id, old.review_id);
begin
  if tg_table_name = 'review_likes' then
    update public.reviews set likes = (select count(*) from public.review_likes where review_id = rid) where id = rid;
  else
    update public.reviews set comments = (select count(*) from public.review_comments where review_id = rid) where id = rid;
  end if;
  return null;
end $$;
drop trigger if exists review_likes_count on public.review_likes;
create trigger review_likes_count after insert or delete on public.review_likes
  for each row execute function public.sync_review_counts();
drop trigger if exists review_comments_count on public.review_comments;
create trigger review_comments_count after insert or delete on public.review_comments
  for each row execute function public.sync_review_counts();

-- Note moyenne de la communauté pour chaque titre.
create or replace view public.item_scores with (security_invoker = true) as
  select item_id, round(avg(rating)::numeric, 1)::float as average, count(*)::int as reviews
  from public.reviews group by item_id;
grant select on public.item_scores to anon, authenticated;

-- ---------------------------------------------------------------- Ma liste (synchronisée entre appareils)
create table if not exists public.saved_items (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_id text not null,
  status text not null default 'todo' check (status in ('todo', 'done')),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.saved_items enable row level security;
drop policy if exists "ma liste" on public.saved_items;
create policy "ma liste" on public.saved_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- Premium (3,99 €/mois, gratuit pour l'admin)
-- La date de fin d'abonnement n'est modifiable que par l'admin (ou le webhook Stripe), jamais par le membre.
alter table public.profiles add column if not exists premium_until timestamptz;

create or replace function public.is_premium(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin or coalesce(premium_until > now(), false) from public.profiles where id = p_user), false);
$$;
grant execute on function public.is_premium(uuid) to anon, authenticated;

-- L'admin offre ou retire le Premium : p_months = 0 pour le retirer.
create or replace function public.admin_set_premium(p_username text, p_months int) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare result timestamptz;
begin
  if not public.is_admin() then raise exception 'Réservé à l''administrateur'; end if;
  update public.profiles
     set premium_until = case when p_months <= 0 then null
                              else greatest(coalesce(premium_until, now()), now()) + make_interval(months => p_months) end
   where lower(username) = lower(trim(p_username))
  returning premium_until into result;
  if not found then raise exception 'Membre introuvable : %', p_username; end if;
  return result;
end $$;
grant execute on function public.admin_set_premium(text, int) to authenticated;

-- Appelée uniquement par le webhook Stripe (clé service), jamais par l'app.
create or replace function public.premium_from_stripe(p_email text, p_until timestamptz) returns void
language sql security definer set search_path = public as $$
  update public.profiles p set premium_until = greatest(coalesce(p.premium_until, now()), p_until)
  from auth.users u where u.id = p.id and lower(u.email) = lower(trim(p_email));
$$;
revoke execute on function public.premium_from_stripe(text, timestamptz) from public, anon, authenticated;
grant execute on function public.premium_from_stripe(text, timestamptz) to service_role;

-- ---------------------------------------------------------------- Collections (listes personnalisées)
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  emoji text not null default '📁' check (char_length(emoji) <= 8),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  item_id text not null,
  added_at timestamptz not null default now(),
  primary key (collection_id, item_id)
);
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
drop policy if exists "collections visibles" on public.collections;
create policy "collections visibles" on public.collections for select using (is_public or user_id = auth.uid());
drop policy if exists "mes collections" on public.collections;
create policy "mes collections" on public.collections for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "contenu visible" on public.collection_items;
create policy "contenu visible" on public.collection_items for select
  using (exists (select 1 from public.collections c where c.id = collection_id and (c.is_public or c.user_id = auth.uid())));
drop policy if exists "je remplis mes collections" on public.collection_items;
create policy "je remplis mes collections" on public.collection_items for all
  using (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid()));

-- Gratuit : 3 collections. Premium : illimité.
create or replace function public.check_collection_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_premium(new.user_id)
     and (select count(*) from public.collections where user_id = new.user_id) >= 3 then
    raise exception 'Limite de 3 collections atteinte : passe Premium pour en créer autant que tu veux.';
  end if;
  return new;
end $$;
drop trigger if exists collections_limit on public.collections;
create trigger collections_limit before insert on public.collections
  for each row execute function public.check_collection_limit();

-- ---------------------------------------------------------------- Journal privé (Premium)
alter table public.saved_items add column if not exists private_note text check (char_length(private_note) <= 1000);
alter table public.saved_items add column if not exists done_at date;

create or replace function public.check_private_note() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.private_note, '') <> '' and not public.is_premium(new.user_id) then
    raise exception 'Le journal privé est réservé aux membres Premium.';
  end if;
  return new;
end $$;
drop trigger if exists saved_items_note on public.saved_items;
create trigger saved_items_note before insert or update on public.saved_items
  for each row execute function public.check_private_note();

-- ---------------------------------------------------------------- Droits d'accès de l'app
-- Les projets Supabase récents n'ouvrent plus automatiquement les nouvelles tables à l'app :
-- on donne les droits explicitement (les règles RLS ci-dessus restent appliquées).
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.items, public.artwork, public.reviews, public.review_likes,
  public.review_comments, public.item_scores to anon, authenticated;
grant insert on public.artwork, public.reviews, public.review_likes, public.review_comments,
  public.review_reports to authenticated;
grant delete on public.reviews, public.review_likes, public.review_comments, public.review_reports,
  public.artwork to authenticated;
grant select on public.review_reports to authenticated;
grant select, insert, update, delete on public.items, public.saved_items to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant select, insert, update, delete on public.collections, public.collection_items to authenticated;
grant select on public.collections, public.collection_items to anon;

-- Recharge le schéma de l'API pour que les nouvelles tables soient visibles tout de suite.
notify pgrst, 'reload schema';
