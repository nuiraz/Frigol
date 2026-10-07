import { useEffect, useState } from 'react';

import { LOCAL_BY_ID } from '@/data/recipes';

import { lookupMeal } from './mealdb';
import { useStorage } from './storage';
import type { Recipe } from './types';

const cache = new Map<string, Recipe>();

/** Garde en mémoire les recettes TheMealDB déjà chargées (évite de les retélécharger). */
export function rememberRecipes(recipes: Recipe[]) {
  for (const r of recipes) cache.set(r.id, r);
}

/** Charge une recette, locale ou TheMealDB (avec repli sur les favoris/historique hors ligne). */
export function useRecipe(id: string) {
  const { favorites, history } = useStorage();
  const known = LOCAL_BY_ID.get(id) ?? cache.get(id) ?? [...favorites, ...history].find((r) => r.id === id);
  const [fetched, setFetched] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (known || !id.startsWith('m-')) return;
    let cancelled = false;
    lookupMeal(id)
      .then((r) => {
        if (cancelled) return;
        if (r) {
          cache.set(r.id, r);
          setFetched(r);
        } else setError('Recette introuvable.');
      })
      .catch(() => !cancelled && setError('Pas de connexion : impossible de charger cette recette.'));
    return () => {
      cancelled = true;
    };
  }, [id, known]);

  const recipe = known ?? (fetched?.id === id ? fetched : null);
  return {
    recipe,
    loading: !recipe && !error && id.startsWith('m-'),
    error: recipe ? null : (error ?? (id.startsWith('m-') ? null : 'Recette introuvable.')),
  };
}

/** Adapte une quantité au nombre de personnes : « 200 g » × 1,5 → « 300 g ». */
export function scaleQuantity(quantity: string | undefined, factor: number) {
  if (!quantity || factor === 1) return quantity;
  const m = quantity.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)(.*)$/);
  if (!m) return quantity;
  const [num, rest] = [m[1], m[2]];
  const value = num.includes('/')
    ? Number(num.split('/')[0]) / Number(num.split('/')[1])
    : Number(num.replace(',', '.'));
  const scaled = value * factor;
  // Au-delà de 10 on arrondit à l'unité, en dessous à la demie (« 1,5 œuf » reste lisible).
  const pretty =
    scaled >= 10 ? String(Math.round(scaled)) : String(Math.max(0.5, Math.round(scaled * 2) / 2)).replace('.', ',');
  return `${pretty}${rest}`;
}
