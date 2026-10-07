import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useAuth } from '@/lib/auth';
import { fetchCatalog, fetchLibrary, pushCatalog, pushLibrary } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import type { Category } from '@/lib/types';

export type SyncStatus = 'off' | 'loading' | 'synced' | 'saving' | 'error';

// État partagé de la synchronisation, lu par l'écran d'administration.
let status: SyncStatus = 'off';
const listeners = new Set<() => void>();
function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l());
}
export function useSyncStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => 'off' as SyncStatus,
  );
}

const fingerprint = (c: Category, i: number) => JSON.stringify([i, c.name, c.emoji, c.color, c.tracks, c.sources]);

type Synced = { catalog: Map<string, string>; catalogIds: Set<string>; library: string };

/**
 * Synchronisation des catégories avec la base de données :
 * - le catalogue de l'administrateur est téléchargé par tout le monde ;
 * - les catégories d'un joueur connecté sont sauvegardées dans sa bibliothèque et
 *   retrouvées sur tous ses appareils ;
 * - l'administrateur publie automatiquement ses modifications dans le catalogue.
 */
export function CatalogSync() {
  const store = useStore();
  const auth = useAuth();
  const synced = useRef<Synced | null>(null);
  const merge = useRef(store.mergeCatalog);
  useEffect(() => {
    merge.current = store.mergeCatalog;
  });

  const userId = auth.session?.user.id;
  const isAdmin = !!auth.profile?.is_admin;
  const ready = store.loaded && auth.ready && auth.enabled;

  // 1. Téléchargement du catalogue et de la bibliothèque personnelle.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    synced.current = null;
    setStatus('loading');
    Promise.all([fetchCatalog(), userId ? fetchLibrary(userId) : Promise.resolve([])])
      .then(([catalog, library]) => {
        if (cancelled || !catalog) return;
        const catalogIds = new Set(catalog.map((c) => c.id));
        const personal = library.filter((c) => !catalogIds.has(c.id));
        merge.current([...catalog, ...personal]);
        synced.current = {
          catalog: new Map(catalog.map((c, i) => [c.id, fingerprint(c, i)])),
          catalogIds,
          library: JSON.stringify(personal),
        };
        setStatus('synced');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  // 2. Envoi des modifications (regroupées toutes les 1,5 s).
  const categories = store.data.categories;
  useEffect(() => {
    if (!userId || !synced.current) return;
    const id = setTimeout(async () => {
      const state = synced.current;
      if (!state) return;
      try {
        if (isAdmin) {
          const changed = categories.filter((c, i) => state.catalog.get(c.id) !== fingerprint(c, i));
          const current = new Set(categories.map((c) => c.id));
          const removed = [...state.catalog.keys()].filter((k) => !current.has(k));
          if (!changed.length && !removed.length) return;
          setStatus('saving');
          await pushCatalog(categories, changed, removed);
          state.catalog = new Map(categories.map((c, i) => [c.id, fingerprint(c, i)]));
          state.catalogIds = current;
        } else {
          const personal = categories.filter((c) => !state.catalogIds.has(c.id));
          const json = JSON.stringify(personal);
          if (json === state.library) return;
          setStatus('saving');
          await pushLibrary(userId, personal);
          state.library = json;
        }
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [categories, isAdmin, userId]);

  return null;
}
