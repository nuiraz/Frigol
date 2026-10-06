import { useEffect, useRef, useSyncExternalStore } from 'react';

import { useAuth } from '@/lib/auth';
import { fetchCatalog, pushCatalog } from '@/lib/catalog';
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

/**
 * Récupère le catalogue en ligne au démarrage, puis, si l'utilisateur connecté est
 * administrateur, publie automatiquement chaque modification des catégories.
 */
export function CatalogSync() {
  const store = useStore();
  const auth = useAuth();
  const synced = useRef<Map<string, string> | null>(null);
  const merge = useRef(store.mergeCatalog);
  useEffect(() => {
    merge.current = store.mergeCatalog;
  });

  const isAdmin = !!auth.profile?.is_admin;
  const ready = store.loaded && auth.ready && auth.enabled;

  // 1. Téléchargement du catalogue.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setStatus('loading');
    fetchCatalog()
      .then((remote) => {
        if (cancelled || !remote) return;
        merge.current(remote);
        synced.current = new Map(remote.map((c, i) => [c.id, fingerprint(c, i)]));
        setStatus('synced');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [ready, auth.session?.user.id]);

  // 2. Publication des changements par l'administrateur (regroupés toutes les 1,5 s).
  const categories = store.data.categories;
  useEffect(() => {
    if (!isAdmin || !synced.current) return;
    const id = setTimeout(async () => {
      const previous = synced.current!;
      const changed = categories.filter((c, i) => previous.get(c.id) !== fingerprint(c, i));
      const current = new Set(categories.map((c) => c.id));
      const removed = [...previous.keys()].filter((k) => !current.has(k));
      if (!changed.length && !removed.length) return;
      setStatus('saving');
      try {
        await pushCatalog(categories, changed, removed);
        synced.current = new Map(categories.map((c, i) => [c.id, fingerprint(c, i)]));
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 1500);
    return () => clearTimeout(id);
  }, [categories, isAdmin]);

  return null;
}
