import { getSupabase } from './supabase';
import type { Track } from './types';

export type LeaderboardRow = { user_id: string; username: string; avatar: string; best: number; games: number };

export type SharedPlaylist = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  tracks: Track[];
  track_count: number;
  likes_count: number;
  plays_count: number;
  created_at: string;
  profiles?: { username: string; avatar: string } | null;
};

function sb() {
  const client = getSupabase();
  if (!client) throw new Error('Le service en ligne n’est pas configuré.');
  return client;
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data;
}

export async function submitOnlineScore(entry: {
  score: number;
  difficulty: string;
  category: string;
  correct: number;
  rounds: number;
}) {
  check(await sb().from('scores').insert(entry));
}

export async function fetchLeaderboard(difficulty: string | null, since: Date | null) {
  return check(
    await sb().rpc('get_leaderboard', { p_difficulty: difficulty, p_since: since?.toISOString() ?? null }),
  ) as LeaderboardRow[];
}

const LIST_COLUMNS =
  'id,user_id,title,description,emoji,color,track_count,likes_count,plays_count,created_at,profiles(username,avatar)';

export async function listSharedPlaylists(order: 'likes' | 'recent', search: string) {
  let query = sb()
    .from('shared_playlists')
    .select(LIST_COLUMNS)
    .order(order === 'likes' ? 'likes_count' : 'created_at', { ascending: false })
    .limit(60);
  const q = search.trim().replace(/[%,()]/g, ' ');
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  return check(await query) as unknown as Omit<SharedPlaylist, 'tracks'>[];
}

export async function getSharedPlaylist(id: string) {
  return check(
    await sb().from('shared_playlists').select('*,profiles(username,avatar)').eq('id', id).single(),
  ) as unknown as SharedPlaylist;
}

export async function sharePlaylist(p: Pick<SharedPlaylist, 'title' | 'description' | 'emoji' | 'color' | 'tracks'>) {
  const tracks = p.tracks.slice(0, 500).map(({ id, title, artist, start }) => ({ id, title, artist, start }));
  return check(
    await sb()
      .from('shared_playlists')
      .insert({ ...p, tracks })
      .select('id')
      .single(),
  ) as { id: string };
}

export async function deleteSharedPlaylist(id: string) {
  check(await sb().from('shared_playlists').delete().eq('id', id));
}

export async function hasLiked(id: string, userId: string) {
  const data = check(
    await sb().from('playlist_likes').select('playlist_id').eq('playlist_id', id).eq('user_id', userId).maybeSingle(),
  );
  return !!data;
}

export async function setLike(id: string, userId: string, liked: boolean) {
  if (liked) check(await sb().from('playlist_likes').insert({ playlist_id: id }));
  else check(await sb().from('playlist_likes').delete().eq('playlist_id', id).eq('user_id', userId));
}

export async function reportPlaylist(id: string, reason: string) {
  check(await sb().from('reports').insert({ playlist_id: id, reason }));
}

export async function countPlay(id: string) {
  await sb().rpc('count_play', { p_id: id });
}
