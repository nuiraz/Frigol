import { supabase } from './supabase';

export type Platform = 'steam' | 'psn' | 'xbox';

export type Game = {
  id: string;
  platform: Platform;
  name: string;
  cover_url: string | null;
  header_url: string | null;
  description: string | null;
  genres: string[];
  release_date: string | null;
  developer: string | null;
};

export type Rating = { game_id: string; average: number; reviews: number };

export type Author = { id: string; username: string; avatar: string; is_admin: boolean };

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  unlocked: boolean;
  unlocked_at?: string | null;
};

export type Post = {
  id: string;
  user_id: string;
  game_id: string;
  kind: 'review' | 'discussion' | 'achievement';
  rating: number | null;
  body: string;
  achievement: Achievement | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  profiles: Author | null;
  games: Pick<Game, 'id' | 'name' | 'cover_url' | 'header_url' | 'platform'> | null;
};

export type Comment = { id: number; post_id: string; user_id: string; body: string; created_at: string; profiles: Author | null };

export type LibraryEntry = {
  user_id: string;
  game_id: string;
  playtime_minutes: number;
  last_played: string | null;
  achievements_unlocked: number;
  achievements_total: number;
  platinum: boolean;
  achievements: Achievement[];
  games: Game | null;
};

export type LinkedAccount = {
  user_id: string;
  platform: Platform;
  external_id: string;
  display_name: string;
  avatar_url: string | null;
  profile_url: string | null;
  last_sync: string | null;
  sync_error: string | null;
};

const POST_SELECT = '*,profiles(id,username,avatar,is_admin),games(id,name,cover_url,header_url,platform)';

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Jeux & notes ----------
export async function getGame(id: string) {
  return check(await supabase.from('games').select('*').eq('id', id).maybeSingle()) as Game | null;
}

export async function getRatings(ids: string[]) {
  if (!ids.length) return new Map<string, Rating>();
  const rows = check(await supabase.from('game_ratings').select('*').in('game_id', ids)) as Rating[];
  return new Map(rows.map((r) => [r.game_id, r]));
}

/** Jeux les mieux notés par la communauté (au moins `min` avis). */
export async function topRated(min = 1, limit = 24) {
  const rows = check(
    await supabase.from('game_ratings').select('*').gte('reviews', min).order('average', { ascending: false }).order('reviews', { ascending: false }).limit(limit),
  ) as Rating[];
  if (!rows.length) return [];
  const games = check(await supabase.from('games').select('*').in('id', rows.map((r) => r.game_id))) as Game[];
  const byId = new Map(games.map((g) => [g.id, g]));
  return rows.map((r) => ({ game: byId.get(r.game_id)!, rating: r })).filter((x) => x.game);
}

/** Répartition des notes d'un jeu (1 à 10). */
export async function ratingDistribution(gameId: string) {
  const rows = check(await supabase.from('posts').select('rating').eq('game_id', gameId).eq('kind', 'review')) as { rating: number }[];
  const counts = Array.from({ length: 10 }, () => 0);
  for (const r of rows) counts[r.rating - 1]++;
  return counts;
}

export async function searchKnownGames(term: string) {
  return check(await supabase.from('games').select('*').ilike('name', `%${term}%`).limit(20)) as Game[];
}

// ---------- Publications ----------
export async function listPosts(opts: { order?: 'recent' | 'popular'; gameId?: string; userId?: string; kind?: Post['kind']; limit?: number } = {}) {
  let q = supabase
    .from('posts')
    .select(POST_SELECT)
    .order(opts.order === 'popular' ? 'likes_count' : 'created_at', { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.gameId) q = q.eq('game_id', opts.gameId);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.kind) q = q.eq('kind', opts.kind);
  return check(await q) as unknown as Post[];
}

export async function getPost(id: string) {
  return check(await supabase.from('posts').select(POST_SELECT).eq('id', id).maybeSingle()) as unknown as Post | null;
}

export async function myReview(userId: string, gameId: string) {
  return check(
    await supabase.from('posts').select(POST_SELECT).eq('user_id', userId).eq('game_id', gameId).eq('kind', 'review').maybeSingle(),
  ) as unknown as Post | null;
}

/** Crée ou met à jour l'avis noté de l'utilisateur sur un jeu. */
export async function saveReview(userId: string, gameId: string, rating: number, body: string) {
  const existing = await myReview(userId, gameId);
  if (existing) {
    check(await supabase.from('posts').update({ rating, body, updated_at: new Date().toISOString() }).eq('id', existing.id));
    return existing.id;
  }
  const row = check(await supabase.from('posts').insert({ game_id: gameId, kind: 'review', rating, body }).select('id').single()) as { id: string };
  return row.id;
}

export async function createPost(p: { game_id: string; kind: 'discussion' | 'achievement'; body: string; achievement?: Achievement }) {
  return (check(await supabase.from('posts').insert(p).select('id').single()) as { id: string }).id;
}

export async function deletePost(id: string) {
  check(await supabase.from('posts').delete().eq('id', id));
}

export async function likedSet(userId: string, postIds: string[]) {
  if (!postIds.length) return new Set<string>();
  const rows = check(await supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds)) as { post_id: string }[];
  return new Set(rows.map((r) => r.post_id));
}

export async function setLike(postId: string, userId: string, on: boolean) {
  if (on) check(await supabase.from('post_likes').insert({ post_id: postId }));
  else check(await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId));
}

export async function listComments(postId: string) {
  return check(
    await supabase.from('post_comments').select('*,profiles(id,username,avatar,is_admin)').eq('post_id', postId).order('created_at'),
  ) as unknown as Comment[];
}

export async function addComment(postId: string, body: string) {
  check(await supabase.from('post_comments').insert({ post_id: postId, body }));
}

export async function deleteComment(id: number) {
  check(await supabase.from('post_comments').delete().eq('id', id));
}

export async function reportPost(postId: string, reason: string) {
  check(await supabase.from('post_reports').insert({ post_id: postId, reason }));
}

// ---------- Profils, comptes liés et bibliothèques ----------
export async function profileByUsername(username: string) {
  return check(await supabase.from('profiles').select('*').ilike('username', username).maybeSingle()) as
    | (Author & { bio: string; created_at: string })
    | null;
}

export async function linkedAccounts(userId: string) {
  return check(await supabase.from('linked_accounts').select('*').eq('user_id', userId)) as LinkedAccount[];
}

export async function library(userId: string, platform?: Platform) {
  let q = supabase
    .from('user_games')
    .select('user_id,game_id,playtime_minutes,last_played,achievements_unlocked,achievements_total,platinum,achievements,games(*)')
    .eq('user_id', userId)
    .order('last_played', { ascending: false, nullsFirst: false })
    .limit(2000);
  if (platform) q = q.like('game_id', `${platform}:%`);
  return check(await q) as unknown as LibraryEntry[];
}

export async function libraryEntry(userId: string, gameId: string) {
  return check(
    await supabase.from('user_games').select('*,games(*)').eq('user_id', userId).eq('game_id', gameId).maybeSingle(),
  ) as unknown as LibraryEntry | null;
}

/** Membres qui possèdent ce jeu (pour « Ils y jouent »). */
export async function players(gameId: string, limit = 12) {
  return check(
    await supabase.from('user_games').select('user_id,achievements_unlocked,achievements_total,profiles(id,username,avatar,is_admin)').eq('game_id', gameId).limit(limit),
  ) as unknown as { user_id: string; achievements_unlocked: number; achievements_total: number; profiles: Author | null }[];
}
