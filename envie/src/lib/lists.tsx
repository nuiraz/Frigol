import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { fetchSaved, removeSaved, upsertSaved, type Saved } from './db';

export type Status = 'todo' | 'done';

type Lists = {
  /** item_id → statut, du plus récent au plus ancien. */
  saved: Map<string, Status>;
  setStatus: (itemId: string, status: Status | null) => void;
  /** Titres déjà proposés pendant cette visite (pour ne pas les reproposer tout de suite). */
  seen: Set<string>;
  markSeen: (itemId: string) => void;
};

const KEY = 'liste1';
const ListsContext = createContext<Lists | null>(null);

/**
 * « Ma liste » : enregistrée sur l'appareil, et dans le compte quand on est connecté
 * (on la retrouve alors sur téléphone comme sur ordinateur).
 */
export function ListsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [saved, setSaved] = useState<Map<string, Status>>(new Map());
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const loaded = useRef(false);

  // Liste locale au démarrage.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSaved(new Map(JSON.parse(raw) as [string, Status][]));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  // À la connexion : on fusionne la liste de l'appareil avec celle du compte.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY).catch(() => null);
        const local: [string, Status][] = raw ? JSON.parse(raw) : [];
        const remote = await fetchSaved();
        const remoteIds = new Set(remote.map((r) => r.item_id));
        const toPush: Saved[] = local.filter(([id]) => !remoteIds.has(id)).map(([item_id, status]) => ({ item_id, status }));
        await upsertSaved(toPush);
        const merged = [...remote.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')), ...toPush];
        if (alive) setSaved(new Map(merged.map((r) => [r.item_id, r.status])));
      } catch {
        // Base indisponible : on garde la liste locale.
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify([...saved])).catch(() => {});
  }, [saved]);

  const setStatus = useCallback(
    (itemId: string, status: Status | null) => {
      setSaved((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        if (status) return new Map([[itemId, status], ...next]);
        return next;
      });
      if (userId) {
        (status ? upsertSaved([{ item_id: itemId, status }]) : removeSaved(itemId)).catch(() => {});
      }
    },
    [userId],
  );

  const markSeen = useCallback((itemId: string) => setSeen((prev) => new Set(prev).add(itemId)), []);

  const value = useMemo(() => ({ saved, setStatus, seen, markSeen }), [saved, setStatus, seen, markSeen]);
  return <ListsContext.Provider value={value}>{children}</ListsContext.Provider>;
}

export function useLists() {
  const ctx = useContext(ListsContext);
  if (!ctx) throw new Error('useLists doit être utilisé dans <ListsProvider>');
  return ctx;
}
