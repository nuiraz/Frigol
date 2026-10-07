import { getSupabase } from './supabase';
import type { Category } from './types';

type Row = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  tracks: Category['tracks'];
  sources: Category['sources'];
  position: number;
};

function toCategory(r: Row): Category {
  return { id: r.id, name: r.name, emoji: r.emoji, color: r.color, tracks: r.tracks ?? [], sources: r.sources ?? [] };
}

function toRow(c: Category, position: number): Row {
  return {
    id: c.id,
    name: c.name || 'Sans nom',
    emoji: c.emoji,
    color: c.color,
    tracks: c.tracks,
    sources: c.sources,
    position,
  };
}

/** Catégories publiées par l'administrateur (lisibles par tous, sans compte). */
export async function fetchCatalog(): Promise<Category[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('catalog_categories').select('*').order('position');
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toCategory);
}

/** Envoie les catégories modifiées et supprime celles retirées (administrateur uniquement). */
export async function pushCatalog(all: Category[], changed: Category[], removedIds: string[]) {
  const sb = getSupabase();
  if (!sb) return;
  if (changed.length) {
    const rows = changed.map((c) =>
      toRow(
        c,
        all.findIndex((x) => x.id === c.id),
      ),
    );
    const { error } = await sb
      .from('catalog_categories')
      .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
    if (error) throw new Error(error.message);
  }
  if (removedIds.length) {
    const { error } = await sb.from('catalog_categories').delete().in('id', removedIds);
    if (error) throw new Error(error.message);
  }
}

/** Catégories personnelles de l'utilisateur connecté (synchronisées entre ses appareils). */
export async function fetchLibrary(userId: string): Promise<Category[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('user_libraries').select('categories').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return ((data?.categories as Category[] | undefined) ?? []).filter((c) => c && c.id);
}

export async function pushLibrary(userId: string, categories: Category[]) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from('user_libraries')
    .upsert({ user_id: userId, categories, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
