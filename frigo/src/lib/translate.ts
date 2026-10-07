import { INGREDIENT_BY_ID } from '@/data/ingredients';

import type { Recipe } from './types';

/** Version française d'une recette TheMealDB (mise en cache dans le stockage local). */
export type RecipeTranslation = {
  title: string;
  description?: string;
  steps: string[];
  ingredients: { name: string; quantity?: string }[];
};

const GOOGLE = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=';
const MYMEMORY = 'https://api.mymemory.translated.net/get?langpair=en|fr&q=';

async function viaGoogle(text: string) {
  const res = await fetch(GOOGLE + encodeURIComponent(text));
  if (!res.ok) throw new Error(String(res.status));
  const data = (await res.json()) as [[string, string][]];
  return data[0].map((part) => part[0]).join('');
}

/** Service de secours (limité à ~500 caractères par requête : on découpe par phrases). */
async function viaMyMemory(text: string) {
  const chunks: string[] = [];
  let current = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if ((current + ' ' + sentence).length > 450 && current) {
      chunks.push(current);
      current = sentence;
    } else current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) chunks.push(current);
  const out: string[] = [];
  for (const chunk of chunks) {
    const res = await fetch(MYMEMORY + encodeURIComponent(chunk));
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: number };
    if (!data.responseData?.translatedText || (data.responseStatus && data.responseStatus !== 200))
      throw new Error('MyMemory');
    out.push(data.responseData.translatedText);
  }
  return out.join(' ');
}

export async function translateText(text: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    return await viaGoogle(text);
  } catch {
    return viaMyMemory(text);
  }
}

/** Français → anglais, pour interroger TheMealDB avec une recherche tapée en français. */
export async function translateToEnglish(text: string): Promise<string> {
  try {
    const res = await fetch(GOOGLE.replace('sl=en&tl=fr', 'sl=fr&tl=en') + encodeURIComponent(text));
    const data = (await res.json()) as [[string, string][]];
    return data[0].map((part) => part[0]).join('');
  } catch {
    const res = await fetch(MYMEMORY.replace('en|fr', 'fr|en') + encodeURIComponent(text));
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    return data.responseData?.translatedText ?? text;
  }
}

/** Traduit une liste de textes avec quelques requêtes en parallèle. */
export async function translateMany(texts: string[], concurrency = 5): Promise<string[]> {
  const out = new Array<string>(texts.length);
  let next = 0;
  async function worker() {
    while (next < texts.length) {
      const i = next++;
      out[i] = await translateText(texts[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, texts.length) }, worker));
  return out;
}

const UNITS: [RegExp, string][] = [
  [/\btbsp?s?\b|\btablespoons?\b|\btbls?\b/gi, 'c. à soupe'],
  [/\btsp?s?\b|\bteaspoons?\b/gi, 'c. à café'],
  [/\bcups?\b/gi, 'tasse(s)'],
  [/\bpinch(es)?\b/gi, 'pincée(s)'],
  [/\bcloves?\b/gi, 'gousse(s)'],
  [/\bslices?\b/gi, 'tranche(s)'],
  [/\bcans?\b|\btins?\b/gi, 'boîte(s)'],
  [/\bto taste\b/gi, 'selon le goût'],
  [/\bto serve\b/gi, 'pour servir'],
  [/\bchopped\b/gi, 'haché'],
  [/\bsliced\b/gi, 'émincé'],
  [/\bdiced\b/gi, 'en dés'],
  [/\bgrated\b/gi, 'râpé'],
  [/\bminced\b/gi, 'haché'],
  [/\blarge\b/gi, 'gros'],
  [/\bsmall\b/gi, 'petit'],
  [/\bmedium\b/gi, 'moyen'],
  [/\bhandful\b/gi, 'poignée'],
  [/\bdash\b/gi, 'trait'],
  [/\bsprinkling\b/gi, 'un peu'],
  [/\band\b/gi, 'et'],
  [/\bof\b/gi, 'de'],
];

/** Unités de mesure anglaises → françaises (« 2 tbsp » → « 2 c. à soupe »), sans appel réseau. */
export function translateMeasure(q?: string) {
  if (!q) return q;
  let s = q;
  for (const [re, fr] of UNITS) s = s.replace(re, fr);
  return s.replace(/(\d)\.(\d)/g, '$1,$2');
}

export async function translateRecipe(recipe: Recipe): Promise<RecipeTranslation> {
  // Les ingrédients reconnus prennent directement leur nom du catalogue ; on ne traduit que les autres.
  const unknown = recipe.ingredients.filter((l) => !(l.id && INGREDIENT_BY_ID.get(l.id)));
  const texts = [recipe.title, ...recipe.steps, ...unknown.map((l) => l.name)];
  const done = await translateMany(texts);
  const title = done[0];
  const steps = done.slice(1, 1 + recipe.steps.length);
  const unknownNames = new Map(unknown.map((l, i) => [l, done[1 + recipe.steps.length + i]]));
  return {
    title,
    steps,
    ingredients: recipe.ingredients.map((l) => ({
      name: (l.id && INGREDIENT_BY_ID.get(l.id)?.name) || unknownNames.get(l) || l.name,
      quantity: translateMeasure(l.quantity),
    })),
  };
}

/** Applique une traduction à une recette (pour l'affichage). */
export function applyTranslation(recipe: Recipe, t: RecipeTranslation): Recipe {
  return {
    ...recipe,
    title: t.title,
    steps: t.steps,
    ingredients: recipe.ingredients.map((l, i) => ({
      ...l,
      name: t.ingredients[i]?.name ?? l.name,
      quantity: t.ingredients[i]?.quantity ?? l.quantity,
    })),
  };
}
