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
  owner_id?: string | null;
};

function toCategory(r: Row): Category {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    color: r.color,
    tracks: r.tracks ?? [],
    sources: r.sources ?? [],
    // Chaîne vide : catégorie publiée sans auteur connu (seul un administrateur peut la modifier).
    ownerId: r.owner_id ?? '',
  };
}

/** Catalogue commun : toutes les catégories publiées par les joueurs (lisible sans compte). */
export async function fetchCatalog(): Promise<Category[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('catalog_categories').select('*').order('position');
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toCategory);
}

/** Publie les catégories modifiées et supprime celles retirées. */
export async function pushCatalog(all: Category[], changed: Category[], removedIds: string[], userId: string) {
  const sb = getSupabase();
  if (!sb) return;
  if (changed.length) {
    const rows = changed.map((c) => ({
      id: c.id,
      name: c.name || 'Sans nom',
      emoji: c.emoji,
      color: c.color,
      // L'état « bloqué » dépend de l'appareil : il n'est pas publié.
      tracks: c.tracks.map(({ blocked: _blocked, ...t }) => t),
      sources: c.sources,
      position: all.findIndex((x) => x.id === c.id),
      // Une nouvelle catégorie appartient à celui qui la publie ; sinon l'auteur d'origine est conservé.
      owner_id: c.ownerId === undefined ? userId : c.ownerId || null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await sb.from('catalog_categories').upsert(rows);
    if (error) throw new Error(error.message);
  }
  if (removedIds.length) {
    const { error } = await sb.from('catalog_categories').delete().in('id', removedIds);
    if (error) throw new Error(error.message);
  }
}

/** Ancienne bibliothèque personnelle : récupérée une fois pour être publiée dans le catalogue commun. */
export async function fetchLegacyLibrary(userId: string): Promise<Category[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('user_libraries').select('categories').eq('user_id', userId).maybeSingle();
  return ((data?.categories as Category[] | undefined) ?? [])
    .filter((c) => c && c.id)
    .map(({ ownerId: _ownerId, ...c }) => c);
}
