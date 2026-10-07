import { identifyIngredient } from './matching';
import type { Recipe } from './types';

/**
 * TheMealDB : base de recettes gratuite (clé de test publique « 1 »), en anglais.
 * https://www.themealdb.com/api.php
 */
const API = 'https://www.themealdb.com/api/json/v1/1';

type Meal = Record<string, string | null> & { idMeal: string; strMeal: string; strMealThumb: string };
type MealSummary = { idMeal: string; strMeal: string; strMealThumb: string };

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}/${path}`);
  if (!res.ok) throw new Error(`TheMealDB : erreur ${res.status}`);
  return (await res.json()) as T;
}

const CATEGORY_FR: Record<string, string> = {
  Beef: 'Bœuf',
  Chicken: 'Poulet',
  Dessert: 'Dessert',
  Lamb: 'Agneau',
  Miscellaneous: 'Divers',
  Pasta: 'Pâtes',
  Pork: 'Porc',
  Seafood: 'Poisson',
  Side: 'Accompagnement',
  Starter: 'Entrée',
  Vegan: 'Vegan',
  Vegetarian: 'Végétarien',
  Breakfast: 'Petit-déjeuner',
  Goat: 'Chèvre',
};

export const MEALDB_CATEGORIES = Object.keys(CATEGORY_FR);
export const categoryLabel = (c: string) => CATEGORY_FR[c] ?? c;

/** Découpe les instructions en étapes lisibles. */
function splitSteps(text: string): string[] {
  const lines = text
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, '').trim())
    .filter((l) => l.length > 3 && !/^step\s*\d+$/i.test(l));
  if (lines.length > 1) return lines;
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toRecipe(m: Meal): Recipe {
  const ingredients = [];
  for (let n = 1; n <= 20; n++) {
    const name = m[`strIngredient${n}`]?.trim();
    if (!name) continue;
    ingredients.push({
      id: identifyIngredient(name),
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: m[`strMeasure${n}`]?.trim() || undefined,
    });
  }
  const steps = splitSteps(m.strInstructions ?? '');
  return {
    id: `m-${m.idMeal}`,
    source: 'mealdb',
    title: m.strMeal,
    image: m.strMealThumb,
    emoji: '🍽️',
    servings: 4,
    category: categoryLabel(m.strCategory ?? ''),
    tags: [m.strArea, ...(m.strTags?.split(',') ?? [])].filter((t): t is string => !!t?.trim()).map((t) => t.trim()),
    description: m.strArea ? `Cuisine ${m.strArea}` : undefined,
    ingredients,
    steps,
  };
}

/** Résumé affiché dans les listes (avant de charger la fiche complète). */
export type MealCard = { id: string; title: string; image: string };
const toCard = (m: MealSummary): MealCard => ({ id: `m-${m.idMeal}`, title: m.strMeal, image: m.strMealThumb });

export async function lookupMeal(id: string): Promise<Recipe | null> {
  const { meals } = await get<{ meals: Meal[] | null }>(`lookup.php?i=${encodeURIComponent(id.replace(/^m-/, ''))}`);
  return meals?.[0] ? toRecipe(meals[0]) : null;
}

export async function searchMeals(query: string): Promise<Recipe[]> {
  const { meals } = await get<{ meals: Meal[] | null }>(`search.php?s=${encodeURIComponent(query.trim())}`);
  return (meals ?? []).map(toRecipe);
}

export async function mealsByCategory(category: string): Promise<MealCard[]> {
  const { meals } = await get<{ meals: MealSummary[] | null }>(`filter.php?c=${encodeURIComponent(category)}`);
  return (meals ?? []).map(toCard);
}

/** Recettes contenant un ingrédient (nom anglais TheMealDB, ex : « chicken_breast »). */
export async function mealsByIngredient(ingredient: string): Promise<MealCard[]> {
  const { meals } = await get<{ meals: MealSummary[] | null }>(
    `filter.php?i=${encodeURIComponent(ingredient.replace(/\s+/g, '_'))}`,
  );
  return (meals ?? []).map(toCard);
}

export async function randomMeal(): Promise<Recipe | null> {
  const { meals } = await get<{ meals: Meal[] | null }>('random.php');
  return meals?.[0] ? toRecipe(meals[0]) : null;
}
