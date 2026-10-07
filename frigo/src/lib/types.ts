export type IngredientCategory = 'feculents' | 'proteines' | 'legumes' | 'cremerie' | 'placard' | 'epices';

/** Ingrédient du catalogue (ce qu'on peut cocher dans son frigo). */
export type Ingredient = {
  id: string;
  name: string;
  emoji: string;
  category: IngredientCategory;
  /** Autres façons de l'écrire, pour la recherche. */
  aliases?: string[];
  /** Noms anglais utilisés par TheMealDB. */
  en?: string[];
  /** Ingrédients qui le remplacent (ex : tomates fraîches ↔ tomates en boîte). */
  alts?: string[];
  /** Toujours dans la cuisine (sel, huile…) : jamais compté comme manquant. */
  staple?: boolean;
};

export type RecipeIngredient = {
  /** Identifiant du catalogue, quand l'ingrédient est reconnu. */
  id?: string;
  name: string;
  quantity?: string;
  optional?: boolean;
};

export type Recipe = {
  /** « l-… » pour les recettes locales, « m-… » pour TheMealDB. */
  id: string;
  source: 'local' | 'mealdb';
  title: string;
  description?: string;
  image?: string;
  emoji: string;
  /** Temps total en minutes (inconnu pour certaines recettes TheMealDB). */
  time?: number;
  difficulty?: 'facile' | 'moyen';
  servings: number;
  category: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
};
