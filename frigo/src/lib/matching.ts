import { INGREDIENT_BY_ID, INGREDIENTS } from '@/data/ingredients';

import { normalize } from './text';
import type { Ingredient, Recipe, RecipeIngredient } from './types';

export type Match = {
  recipe: Recipe;
  /** Ingrédients indispensables que l'on n'a pas. */
  missing: RecipeIngredient[];
  /** Nombre d'ingrédients indispensables que l'on a. */
  have: number;
  /** Nombre total d'ingrédients indispensables (hors sel, huile…). */
  needed: number;
};

/** Vrai si l'ingrédient (ou un de ses remplaçants) est dans le frigo. */
export function hasIngredient(fridge: Set<string>, id: string | undefined) {
  if (!id) return false;
  if (fridge.has(id)) return true;
  return INGREDIENT_BY_ID.get(id)?.alts?.some((alt) => fridge.has(alt)) ?? false;
}

function isStaple(line: RecipeIngredient) {
  return !!line.id && !!INGREDIENT_BY_ID.get(line.id)?.staple;
}

/** Compare une recette au contenu du frigo. */
export function matchRecipe(recipe: Recipe, fridge: Set<string>): Match {
  const essentials = recipe.ingredients.filter((l) => !l.optional && !isStaple(l));
  const missing = essentials.filter((l) => !hasIngredient(fridge, l.id));
  return { recipe, missing, have: essentials.length - missing.length, needed: essentials.length };
}

/**
 * Classe les recettes selon ce qu'on a : d'abord celles qui ne demandent rien d'autre,
 * puis celles où il manque le moins de choses, à égalité celles qui utilisent le plus d'ingrédients du frigo.
 */
export function rankRecipes(recipes: Recipe[], fridge: Set<string>, maxMissing = Infinity): Match[] {
  return recipes
    .map((r) => matchRecipe(r, fridge))
    .filter((m) => m.have > 0 && m.missing.length <= maxMissing)
    .sort(
      (a, b) => a.missing.length - b.missing.length || b.have - a.have || (a.recipe.time ?? 99) - (b.recipe.time ?? 99),
    );
}

const index = INGREDIENTS.map((ing) => ({
  ing,
  keys: [ing.name, ...(ing.aliases ?? []), ...(ing.en ?? [])].map(normalize),
}));

/** Suggestions pendant la saisie : « tom » → Tomates, Tomates en boîte… */
export function searchIngredients(query: string, limit = 8): Ingredient[] {
  const q = normalize(query);
  if (!q) return [];
  return index
    .map(({ ing, keys }) => {
      const best = Math.min(...keys.map((k) => (k === q ? 0 : k.startsWith(q) ? 1 : k.includes(q) ? 2 : 9)));
      return { ing, best };
    })
    .filter((x) => x.best < 9)
    .sort((a, b) => a.best - b.best || a.ing.name.localeCompare(b.ing.name))
    .slice(0, limit)
    .map((x) => x.ing);
}

/** Retrouve l'ingrédient du catalogue correspondant à un nom libre (souvent anglais pour TheMealDB). */
export function identifyIngredient(name: string): string | undefined {
  const n = normalize(name);
  if (!n) return undefined;
  const exact = index.find(({ keys }) => keys.includes(n));
  if (exact) return exact.ing.id;
  // « chopped onion » → oignon ; on cherche le nom connu le plus long contenu dans le texte.
  let best: { id: string; len: number } | undefined;
  for (const { ing, keys } of index) {
    for (const k of keys) {
      if (k.length >= 4 && (` ${n} `.includes(` ${k} `) || n.endsWith(k)) && (!best || k.length > best.len)) {
        best = { id: ing.id, len: k.length };
      }
    }
  }
  return best?.id;
}
