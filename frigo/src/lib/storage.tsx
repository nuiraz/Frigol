import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Recipe } from './types';

const KEY = 'frigo:v1';
const HISTORY_SIZE = 20;

type Saved = {
  /** Recettes favorites (copie complète, pour les consulter hors ligne). */
  favorites: Recipe[];
  /** Dernières recettes consultées, la plus récente en premier. */
  history: Recipe[];
  /** Ingrédients cochés dans « Mon frigo ». */
  fridge: string[];
};

type Storage = Saved & {
  loaded: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (recipe: Recipe) => void;
  addToHistory: (recipe: Recipe) => void;
  clearHistory: () => void;
  toggleFridge: (id: string) => void;
  setFridge: (ids: string[]) => void;
};

const empty: Saved = { favorites: [], history: [], fridge: [] };
const StorageContext = createContext<Storage | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Saved>(empty);
  const [loaded, setLoaded] = useState(false);
  const ready = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSaved({ ...empty, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => {
        ready.current = true;
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (ready.current) AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved]);

  const value = useMemo<Storage>(() => {
    const favoriteIds = new Set(saved.favorites.map((r) => r.id));
    return {
      ...saved,
      loaded,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite: (recipe) =>
        setSaved((s) => ({
          ...s,
          favorites: s.favorites.some((r) => r.id === recipe.id)
            ? s.favorites.filter((r) => r.id !== recipe.id)
            : [recipe, ...s.favorites],
        })),
      addToHistory: (recipe) =>
        setSaved((s) =>
          s.history[0]?.id === recipe.id
            ? s
            : { ...s, history: [recipe, ...s.history.filter((r) => r.id !== recipe.id)].slice(0, HISTORY_SIZE) },
        ),
      clearHistory: () => setSaved((s) => ({ ...s, history: [] })),
      toggleFridge: (id) =>
        setSaved((s) => ({
          ...s,
          fridge: s.fridge.includes(id) ? s.fridge.filter((x) => x !== id) : [...s.fridge, id],
        })),
      setFridge: (ids) => setSaved((s) => ({ ...s, fridge: [...new Set(ids)] })),
    };
  }, [saved, loaded]);

  return <StorageContext value={value}>{children}</StorageContext>;
}

export function useStorage() {
  const s = use(StorageContext);
  if (!s) throw new Error('useStorage doit être utilisé dans <StorageProvider>');
  return s;
}
