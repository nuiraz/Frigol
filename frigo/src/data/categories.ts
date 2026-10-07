import { LOCAL_RECIPES } from './recipes';

export const CATEGORY_EMOJI: Record<string, string> = {
  Pâtes: '🍝',
  'Riz & céréales': '🍚',
  Viandes: '🍗',
  Œufs: '🍳',
  Légumes: '🥦',
  Soupes: '🥣',
  Poisson: '🐟',
  'Sur le pouce': '🥪',
  Sucré: '🥞',
};

/** Catégories des recettes de l'app, dans l'ordre d'apparition, avec leur nombre de recettes. */
export const LOCAL_CATEGORIES = [...new Set(LOCAL_RECIPES.map((r) => r.category))].map((name) => ({
  name,
  emoji: CATEGORY_EMOJI[name] ?? '🍽️',
  count: LOCAL_RECIPES.filter((r) => r.category === name).length,
}));
