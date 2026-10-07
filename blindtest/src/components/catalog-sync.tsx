import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/lib/auth';
import { fetchCatalog, fetchLegacyLibrary, pushCatalog } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import type { Category } from '@/lib/types';

export type SyncStatus = 'off' | 'loading' | 'synced' | 'saving' | 'error';

// État partagé de la synchronisation, affiché dans le compte et l'administration.
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

const REFRESH_MS = 90_000;

const fingerprint = (c: Category, i: number) =>
  JSON.stringify([i, c.name, c.emoji, c.color, c.tracks.map(({ blocked: _b, ...t }) => t), c.sources]);

type Synced = { prints: Map<string, string>; owners: Map<string, string> };

/**
 * Catalogue commun : toutes les catégories importées par les joueurs connectés sont publiées
 * dans la base et reçues par tout le monde, sur tous les appareils. Seul l'auteur (ou un
 * administrateur) peut modifier ou supprimer sa catégorie.
 */
export function CatalogSync() {
  const store = useStore();
  const auth = useAuth();
  const synced = useRef<Synced | null>(null);
  const actions = useRef(store);
  useEffect(() => {
    actions.current = store;
  });
  const [tick, setTick] = useState(0);
  const latest = useRef(store.data.categories);
  useEffect(() => {
    latest.current = store.data.categories;
  });

  const userId = auth.session?.user.id;
  const isAdmin = !!auth.profile?.is_admin;
  const ready = store.loaded && auth.ready && auth.enabled;

  // Rafraîchit régulièrement et au retour dans l'application, pour recevoir les ajouts des autres.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTick((t) => t + 1));
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [ready]);

  const canEdit = (c: Category) =>
    !c.id.startsWith('demo-') && (isAdmin || c.ownerId === undefined || c.ownerId === userId);

  // 1. Téléchargement du catalogue.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    if (!synced.current) setStatus('loading');
    Promise.all([fetchCatalog(), userId && tick === 0 ? fetchLegacyLibrary(userId) : Promise.resolve([])])
      .then(([catalog, legacy]) => {
        if (cancelled || !catalog) return;
        // Des modifications locales attendent d'être envoyées : on ne les écrase pas, on réessaiera.
        const state = synced.current;
        if (
          state &&
          userId &&
          latest.current.some((c, i) => canEdit(c) && state.prints.get(c.id) !== fingerprint(c, i))
        )
          return;
        const ids = new Set(catalog.map((c) => c.id));
        actions.current.mergeCatalog([...catalog, ...legacy.filter((c) => !ids.has(c.id))]);
        synced.current = {
          prints: new Map(catalog.map((c, i) => [c.id, fingerprint(c, i)])),
          owners: new Map(catalog.map((c) => [c.id, c.ownerId ?? ''])),
        };
        setStatus('synced');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, tick]);

  // 2. Publication des ajouts et modifications (regroupés toutes les 1,5 s).
  const categories = store.data.categories;
  useEffect(() => {
    if (!userId || !synced.current) return;
    const id = setTimeout(async () => {
      const state = synced.current;
      if (!state) return;
      const changed = categories.filter((c, i) => canEdit(c) && state.prints.get(c.id) !== fingerprint(c, i));
      const current = new Set(categories.map((c) => c.id));
      const removed = [...state.owners.entries()]
        .filter(([cid, owner]) => !current.has(cid) && (isAdmin || owner === userId))
        .map(([cid]) => cid);
      if (!changed.length && !removed.length) return;
      setStatus('saving');
      try {
        await pushCatalog(categories, changed, removed, userId);
        categories.forEach((c, i) => state.prints.set(c.id, fingerprint(c, i)));
        removed.forEach((cid) => {
          state.prints.delete(cid);
          state.owners.delete(cid);
        });
        for (const c of changed) {
          const owner = c.ownerId === undefined ? userId : c.ownerId;
          state.owners.set(c.id, owner);
          if (c.ownerId === undefined) actions.current.updateCategory(c.id, { ownerId: userId });
        }
        setStatus('synced');
      } catch {
        setStatus('error');
      }
    }, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, isAdmin, userId]);

  return null;
}
