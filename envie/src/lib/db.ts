import type { Profile } from './auth';
import { supabase } from './supabase';
import type { Item, MediaType } from './types';

export type Author = Pick<Profile, 'id' | 'username' | 'avatar' | 'is_admin'>;

export type Review = {
  id: string;
  user_id: string;
  item_id: string;
  item_type: MediaType;
  item_title: string;
  item_image: string | null;
  item_year: number | null;
  rating: number;
  body: string;
  likes: number;
  comments: number;
  created_at: string;
  updated_at: string;
  profiles: Author | null;
};

export type Comment = { id: string; review_id: string; user_id: string; body: string; created_at: string; profiles: Author | null };
export type Score = { item_id: string; average: number; reviews: number };

const REVIEW = '*,profiles(id,username,avatar,is_admin)';

/** Explique les erreurs de base les plus courantes (script SQL pas lancé, droits manquants…). */
export function dbError(e: { message?: string; code?: string; hint?: string | null } | null | undefined): string {
  const msg = e?.message ?? 'Erreur inconnue';
  if (e?.code === '42P01' || e?.code === 'PGRST205' || /does not exist|could not find the table/i.test(msg))
    return `La base n’est pas prête : lance supabase/schema.sql dans Supabase → SQL Editor. (${msg})`;
  if (e?.code === '42501' || /permission denied/i.test(msg))
    return `Droits manquants : relance supabase/schema.sql en entier dans Supabase → SQL Editor. (${msg})`;
  if (e?.code === 'PGRST200' || /relationship/i.test(msg))
    return `Lien entre tables introuvable : relance supabase/schema.sql. (${msg})`;
  if (/failed to fetch|network/i.test(msg)) return 'Pas de connexion au serveur Supabase. Vérifie ta connexion internet.';
  if (/invalid api key|no api key/i.test(msg)) return `Clé Supabase refusée : vérifie EXPO_PUBLIC_SUPABASE_ANON_KEY. (${msg})`;
  return msg;
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(dbError(res.error));
  return res.data;
}

// ------------------------------------------------------------------ Avis

export async function listReviews(opts: {
  order?: 'recent' | 'top';
  type?: MediaType | null;
  itemId?: string;
  userId?: string;
  limit?: number;
}): Promise<Review[]> {
  let q = supabase.from('reviews').select(REVIEW);
  if (opts.type) q = q.eq('item_type', opts.type);
  if (opts.itemId) q = q.eq('item_id', opts.itemId);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  q = opts.order === 'top' ? q.order('likes', { ascending: false }).order('created_at', { ascending: false }) : q.order('created_at', { ascending: false });
  return check(await q.limit(opts.limit ?? 40)) as Review[];
}

export async function getReview(id: string): Promise<Review | null> {
  return check(await supabase.from('reviews').select(REVIEW).eq('id', id).maybeSingle()) as Review | null;
}

export async function myReview(userId: string, itemId: string): Promise<Review | null> {
  return check(await supabase.from('reviews').select(REVIEW).eq('user_id', userId).eq('item_id', itemId).maybeSingle()) as Review | null;
}

/** Publie ou modifie l'avis du membre sur ce titre (un seul avis par titre). */
export async function saveReview(userId: string, item: Item, image: string | undefined, rating: number, body: string) {
  const existing = await myReview(userId, item.id);
  const img = image?.startsWith('https://') ? image : null;
  if (existing) {
    check(
      await supabase
        .from('reviews')
        .update({ rating, body: body.trim(), item_image: img ?? existing.item_image, updated_at: new Date().toISOString() })
        .eq('id', existing.id),
    );
    return existing.id;
  }
  const row = check(
    await supabase
      .from('reviews')
      .insert({
        item_id: item.id,
        item_type: item.type,
        item_title: item.title,
        item_image: img,
        item_year: item.year || null,
        rating,
        body: body.trim(),
      })
      .select('id')
      .single(),
  );
  return (row as { id: string }).id;
}

export async function deleteReview(id: string) {
  check(await supabase.from('reviews').delete().eq('id', id));
}

export async function reportReview(id: string, reason: string) {
  const res = await supabase.from('review_reports').insert({ review_id: id, reason: reason.trim() });
  if (res.error && !res.error.message.includes('duplicate')) throw new Error(res.error.message);
}

// ------------------------------------------------------------------ Likes et commentaires

export async function likedSet(userId: string | undefined, reviewIds: string[]): Promise<Set<string>> {
  if (!userId || !reviewIds.length) return new Set();
  const rows = check(await supabase.from('review_likes').select('review_id').eq('user_id', userId).in('review_id', reviewIds));
  return new Set((rows as { review_id: string }[]).map((r) => r.review_id));
}

export async function setLike(reviewId: string, on: boolean) {
  if (on) {
    const res = await supabase.from('review_likes').insert({ review_id: reviewId });
    if (res.error && !res.error.message.includes('duplicate')) throw new Error(res.error.message);
  } else {
    const { data } = await supabase.auth.getSession();
    check(await supabase.from('review_likes').delete().eq('review_id', reviewId).eq('user_id', data.session?.user.id ?? ''));
  }
}

export async function listComments(reviewId: string): Promise<Comment[]> {
  return check(
    await supabase.from('review_comments').select(REVIEW).eq('review_id', reviewId).order('created_at'),
  ) as unknown as Comment[];
}

export async function addComment(reviewId: string, body: string) {
  check(await supabase.from('review_comments').insert({ review_id: reviewId, body: body.trim() }));
}

export async function deleteComment(id: string) {
  check(await supabase.from('review_comments').delete().eq('id', id));
}

// ------------------------------------------------------------------ Notes de la communauté

export async function getScores(itemIds: string[]): Promise<Map<string, Score>> {
  if (!itemIds.length) return new Map();
  const rows = check(await supabase.from('item_scores').select('*').in('item_id', itemIds)) as Score[];
  return new Map(rows.map((r) => [r.item_id, r]));
}

/** Titres les mieux notés par la communauté. */
export async function topScores(limit = 30): Promise<Score[]> {
  return check(
    await supabase.from('item_scores').select('*').order('average', { ascending: false }).order('reviews', { ascending: false }).limit(limit),
  ) as Score[];
}

// ------------------------------------------------------------------ Profils

export async function profileByUsername(username: string): Promise<Profile | null> {
  return check(await supabase.from('profiles').select('*').ilike('username', username).maybeSingle()) as Profile | null;
}

// ------------------------------------------------------------------ Catalogue ajouté par l'admin

export async function fetchAddedItems(): Promise<Item[]> {
  const rows = check(await supabase.from('items').select('*').order('created_at', { ascending: false })) as (Item & {
    image: string | null;
    length: string | null;
    year: number | null;
  })[];
  return rows.map((r) => ({
    ...r,
    year: r.year ?? 0,
    image: r.image ?? undefined,
    length: r.length ?? undefined,
    platforms: r.platforms?.length ? r.platforms : undefined,
  }));
}

export async function addItem(item: Omit<Item, 'id'>) {
  check(
    await supabase.from('items').insert({
      type: item.type,
      title: item.title.trim(),
      year: item.year || null,
      creator: item.creator.trim(),
      genres: item.genres,
      moods: item.moods,
      platforms: item.platforms ?? [],
      summary: item.summary.trim(),
      image: item.image?.trim() || null,
      length: item.length?.trim() || null,
    }),
  );
}

export async function deleteItem(id: string) {
  check(await supabase.from('items').delete().eq('id', id));
}

// ------------------------------------------------------------------ Admin

export type Report = { id: string; reason: string; created_at: string; review_id: string; reviews: Review | null };

export async function listReports(): Promise<Report[]> {
  return check(
    await supabase.from('review_reports').select(`id,reason,created_at,review_id,reviews(${REVIEW})`).order('created_at', { ascending: false }),
  ) as unknown as Report[];
}

export async function dismissReport(id: string) {
  check(await supabase.from('review_reports').delete().eq('id', id));
}

export async function communityStats() {
  const [members, reviews, comments] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('reviews').select('id', { count: 'exact', head: true }),
    supabase.from('review_comments').select('id', { count: 'exact', head: true }),
  ]);
  return { members: members.count ?? 0, reviews: reviews.count ?? 0, comments: comments.count ?? 0 };
}

// ------------------------------------------------------------------ Ma liste

export type Saved = { item_id: string; status: 'todo' | 'done'; created_at?: string };

export async function fetchSaved(): Promise<Saved[]> {
  return check(await supabase.from('saved_items').select('item_id,status,created_at')) as Saved[];
}

export async function upsertSaved(rows: Saved[]) {
  if (!rows.length) return;
  check(await supabase.from('saved_items').upsert(rows.map((r) => ({ item_id: r.item_id, status: r.status }))));
}

export async function removeSaved(itemId: string) {
  check(await supabase.from('saved_items').delete().eq('item_id', itemId));
}
