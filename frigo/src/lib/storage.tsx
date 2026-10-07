import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { RecipeTranslation } from './translate';
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
  /** Traductions françaises des recettes TheMealDB, par identifiant. */
  translations: Record<string, RecipeTranslation>;
  /** Traduire automatiquement les recettes TheMealDB. */
  autoTranslate: boolean;
  shopping: ShoppingItem[];
};

export type ShoppingItem = { id: string; name: string; quantity?: string; recipe?: string; done: boolean };

type Storage = Saved & {
  loaded: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (recipe: Recipe) => void;
  addToHistory: (recipe: Recipe) => void;
  clearHistory: () => void;
  toggleFridge: (id: string) => void;
  setFridge: (ids: string[]) => void;
  saveTranslation: (id: string, t: RecipeTranslation) => void;
  setAutoTranslate: (on: boolean) => void;
  /** Ajoute des articles à la liste de courses (sans doublon) ; renvoie le nombre ajouté. */
  addShopping: (items: Omit<ShoppingItem, 'id' | 'done'>[]) => number;
  toggleShopping: (id: string) => void;
  removeShopping: (ids: string[]) => void;
};

const empty: Saved = { favorites: [], history: [], fridge: [], translations: {}, autoTranslate: false, shopping: [] };
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
      saveTranslation: (id, t) => setSaved((s) => ({ ...s, translations: { ...s.translations, [id]: t } })),
      setAutoTranslate: (on) => setSaved((s) => ({ ...s, autoTranslate: on })),
      addShopping: (items) => {
        const known = new Set(saved.shopping.filter((x) => !x.done).map((x) => x.name.toLowerCase()));
        const fresh = items.filter((x) => !known.has(x.name.toLowerCase()));
        if (fresh.length)
          setSaved((s) => ({
            ...s,
            shopping: [
              ...s.shopping,
              ...fresh.map((x) => ({
                ...x,
                id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
                done: false,
              })),
            ],
          }));
        return fresh.length;
      },
      toggleShopping: (id) =>
        setSaved((s) => ({ ...s, shopping: s.shopping.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) })),
      removeShopping: (ids) => setSaved((s) => ({ ...s, shopping: s.shopping.filter((x) => !ids.includes(x.id)) })),
    };
  }, [saved, loaded]);

  return <StorageContext value={value}>{children}</StorageContext>;
}

export function useStorage() {
  const s = use(StorageContext);
  if (!s) throw new Error('useStorage doit être utilisé dans <StorageProvider>');
  return s;
}
