import { normalize } from './text';
import type { Filters } from './intent';
import type { Item } from './types';

type Scored = { item: Item; score: number };

function score(item: Item, f: Filters): number | null {
  if (f.types.length && !f.types.includes(item.type)) return null;
  if (f.platforms.length && item.type === 'jeu' && !item.platforms?.some((p) => f.platforms.includes(p))) return null;
  const genreHits = f.genres.filter((g) => item.genres.includes(g)).length;
  const moodHits = f.moods.filter((m) => item.moods.includes(m)).length;
  return genreHits * 3 + moodHits * 2;
}

/** `exact` : faux quand rien ne correspond vraiment et qu'on propose un titre au hasard du type voulu. */
export type Pick = { item: Item; exact: boolean };

/**
 * Tire au hasard parmi les titres qui correspondent le mieux à l'envie.
 * `exclude` : titres déjà proposés ou déjà faits, évités tant qu'il reste autre chose.
 */
export function pickOne(items: Item[], f: Filters, exclude: Set<string>): Pick | null {
  const scored: Scored[] = [];
  for (const item of items) {
    const s = score(item, f);
    if (s !== null) scored.push({ item, score: s });
  }
  if (!scored.length) return null;

  const wanted = f.genres.length + f.moods.length;
  const fresh = scored.filter((x) => !exclude.has(x.item.id));
  const pool = fresh.length ? fresh : scored;
  const best = Math.max(...pool.map((x) => x.score));
  // On garde les meilleurs (et un peu de variété : ceux qui sont presque aussi bons).
  const top = pool.filter((x) => x.score >= Math.max(best - 1, best > 0 ? 1 : 0));
  const chosen = top[Math.floor(Math.random() * top.length)];
  return { item: chosen.item, exact: wanted === 0 || chosen.score > 0 };
}

/** Titres qui ressemblent à celui-ci (même type, genres communs). */
export function similar(items: Item[], item: Item, limit = 8): Item[] {
  return items
    .filter((x) => x.id !== item.id && x.type === item.type)
    .map((x) => ({
      x,
      s:
        x.genres.filter((g) => item.genres.includes(g)).length * 2 +
        x.moods.filter((m) => item.moods.includes(m)).length,
    }))
    .filter((r) => r.s > 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.x);
}

/** Recherche par titre ou créateur. */
export function searchItems(items: Item[], query: string, limit = 40): Item[] {
  const q = normalize(query);
  if (!q) return [];
  return items
    .map((item) => {
      const t = normalize(item.title);
      const c = normalize(item.creator);
      const rank = t === q ? 0 : t.startsWith(q) ? 1 : t.includes(q) ? 2 : c.includes(q) ? 3 : 9;
      return { item, rank };
    })
    .filter((r) => r.rank < 9)
    .sort((a, b) => a.rank - b.rank || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((r) => r.item);
}
