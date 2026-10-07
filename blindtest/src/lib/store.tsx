import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { createDefaultData } from './seed';
import type { AppData, BestScore, Category, PlaylistSource, Settings, Track } from './types';

const STORAGE_KEY = 'blindtest:data:v1';

type Store = {
  data: AppData;
  loaded: boolean;
  addCategory: (c: Omit<Category, 'id' | 'sources' | 'tracks'>) => string;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  /** Ajoute des pistes en ignorant les doublons ; renvoie le nombre réellement ajouté. */
  addTracks: (categoryId: string, tracks: Track[]) => number;
  updateTrack: (categoryId: string, trackId: string, patch: Partial<Track>) => void;
  /** Mémorise (ou met à jour) la playlist d'origine d'une catégorie. */
  addSource: (categoryId: string, source: PlaylistSource) => void;
  deleteTrack: (categoryId: string, trackId: string) => void;
  moveTrack: (fromId: string, toId: string, trackId: string) => void;
  markBlocked: (trackId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  submitScore: (key: string, score: BestScore) => boolean;
  replaceAll: (data: AppData) => void;
  /** Fusionne le catalogue en ligne : il remplace les catégories du même identifiant, les autres sont gardées. */
  mergeCatalog: (remote: Category[]) => void;
  resetToDemo: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function isValidData(value: unknown): value is AppData {
  const v = value as AppData;
  return !!v && Array.isArray(v.categories) && typeof v.settings === 'object';
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createDefaultData);
  const [loaded, setLoaded] = useState(false);
  // Évite d'écraser la sauvegarde avec les données par défaut avant le chargement.
  const ready = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isValidData(parsed)) {
          const defaults = createDefaultData();
          setData({
            ...defaults,
            ...parsed,
            settings: { ...defaults.settings, ...parsed.settings },
            bestScores: parsed.bestScores ?? {},
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        ready.current = true;
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const mapCategory = useCallback((id: string, fn: (c: Category) => Category) => {
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? fn(c) : c)),
    }));
  }, []);

  const addCategory = useCallback<Store['addCategory']>((c) => {
    const id = newId();
    setData((d) => ({
      ...d,
      categories: [...d.categories, { ...c, id, sources: [], tracks: [] }],
    }));
    return id;
  }, []);

  const addTracks = useCallback<Store['addTracks']>(
    (categoryId, tracks) => {
      const category = data.categories.find((c) => c.id === categoryId);
      const existing = new Set(category?.tracks.map((t) => t.id));
      const fresh = tracks.filter((t) => {
        if (existing.has(t.id)) return false;
        existing.add(t.id);
        return true;
      });
      if (fresh.length)
        mapCategory(categoryId, (c) => ({
          ...c,
          tracks: [...c.tracks, ...fresh],
        }));
      return fresh.length;
    },
    [data.categories, mapCategory],
  );

  const store = useMemo<Store>(
    () => ({
      data,
      loaded,
      addCategory,
      addTracks,
      updateCategory: (id, patch) => mapCategory(id, (c) => ({ ...c, ...patch })),
      deleteCategory: (id) =>
        setData((d) => ({
          ...d,
          categories: d.categories.filter((c) => c.id !== id),
        })),
      updateTrack: (categoryId, trackId, patch) =>
        mapCategory(categoryId, (c) => ({
          ...c,
          tracks: c.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
        })),
      addSource: (categoryId, source) =>
        mapCategory(categoryId, (c) => ({
          ...c,
          sources: [...c.sources.filter((x) => x.listId !== source.listId), source],
        })),
      deleteTrack: (categoryId, trackId) =>
        mapCategory(categoryId, (c) => ({
          ...c,
          tracks: c.tracks.filter((t) => t.id !== trackId),
        })),
      moveTrack: (fromId, toId, trackId) =>
        setData((d) => {
          const track = d.categories.find((c) => c.id === fromId)?.tracks.find((t) => t.id === trackId);
          if (!track || fromId === toId) return d;
          return {
            ...d,
            categories: d.categories.map((c) => {
              if (c.id === fromId) return { ...c, tracks: c.tracks.filter((t) => t.id !== trackId) };
              if (c.id === toId && !c.tracks.some((t) => t.id === trackId))
                return { ...c, tracks: [...c.tracks, track] };
              return c;
            }),
          };
        }),
      markBlocked: (trackId) =>
        setData((d) => ({
          ...d,
          categories: d.categories.map((c) => ({
            ...c,
            tracks: c.tracks.map((t) => (t.id === trackId ? { ...t, blocked: true } : t)),
          })),
        })),
      updateSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      submitScore: (key, score) => {
        const previous = data.bestScores[key];
        if (previous && previous.score >= score.score) return false;
        setData((d) => ({
          ...d,
          bestScores: { ...d.bestScores, [key]: score },
        }));
        return true;
      },
      replaceAll: (next) => setData(next),
      mergeCatalog: (remote) =>
        setData((d) => {
          const ids = new Set(remote.map((c) => c.id));
          // On garde les catégories locales pas encore publiées ; celles retirées du catalogue disparaissent,
          // et la démo s'efface dès qu'un vrai catalogue existe.
          const local = d.categories.filter(
            (c) => !ids.has(c.id) && c.ownerId === undefined && !(remote.length && c.id.startsWith('demo-')),
          );
          return { ...d, categories: [...remote, ...local] };
        }),
      resetToDemo: () => setData((d) => ({ ...createDefaultData(), settings: d.settings })),
    }),
    [data, loaded, addCategory, addTracks, mapCategory],
  );

  return <StoreContext value={store}>{children}</StoreContext>;
}

export function useStore() {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return store;
}

/** Pistes jouables d'une catégorie (ni désactivées ni bloquées). */
export function playableTracks(c: Category) {
  return c.tracks.filter((t) => !t.disabled && !t.blocked);
}
