import { useEffect, useRef, useState } from 'react';

import { useStorage } from './storage';
import { applyTranslation, translateMany, translateRecipe } from './translate';
import type { Recipe } from './types';

/**
 * Version affichée d'une recette TheMealDB : traduite en français si l'utilisateur l'a demandé
 * (ou si la traduction automatique est activée), sinon l'originale en anglais.
 */
export function useTranslatedRecipe(recipe: Recipe | null) {
  const { translations, saveTranslation, autoTranslate } = useStorage();
  const [original, setOriginal] = useState(false);
  const [status, setStatus] = useState<{ id: string; state: 'loading' | 'error' } | null>(null);
  // Référence stable : l'enregistrement d'autres données ne doit pas relancer la traduction.
  const save = useRef(saveTranslation);
  useEffect(() => {
    save.current = saveTranslation;
  });

  const id = recipe?.id;
  const translatable = recipe?.source === 'mealdb';
  const translation = id ? translations[id] : undefined;
  const loading = status?.id === id && status?.state === 'loading';
  const failed = status?.id === id && status?.state === 'error';

  const translate = async () => {
    if (!recipe || !translatable) return;
    setOriginal(false);
    if (translations[recipe.id]) return;
    setStatus({ id: recipe.id, state: 'loading' });
    try {
      saveTranslation(recipe.id, await translateRecipe(recipe));
      setStatus(null);
    } catch {
      setStatus({ id: recipe.id, state: 'error' });
    }
  };

  // Traduction automatique à l'ouverture, si l'option est activée.
  const shouldAuto = autoTranslate && translatable && !translation && !status;
  useEffect(() => {
    if (!shouldAuto || !recipe) return;
    let cancelled = false;
    translateRecipe(recipe)
      .then((t) => !cancelled && save.current(recipe.id, t))
      .catch(() => !cancelled && setStatus({ id: recipe.id, state: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [shouldAuto, recipe]);

  const display = recipe && translation && !original ? applyTranslation(recipe, translation) : recipe;
  return {
    display,
    translatable,
    translated: !!translation && !original,
    hasTranslation: !!translation,
    loading: loading || (shouldAuto && !failed),
    failed,
    translate,
    showOriginal: () => setOriginal(true),
  };
}

const titleCache = new Map<string, string>();

/** Titres français pour une liste de recettes TheMealDB (si la traduction automatique est activée). */
export function useTranslatedTitles(cards: { id: string; title: string }[] | null) {
  const { autoTranslate, translations } = useStorage();
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!autoTranslate || !cards?.length) return;
    const todo = cards.filter((c) => !titleCache.has(c.id) && !translations[c.id]).slice(0, 40);
    if (!todo.length) return;
    let cancelled = false;
    translateMany(todo.map((c) => c.title))
      .then((out) => {
        todo.forEach((c, i) => titleCache.set(c.id, out[i]));
        if (!cancelled) setVersion((v) => v + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [autoTranslate, cards, translations]);

  return (id: string, title: string) =>
    autoTranslate ? (translations[id]?.title ?? titleCache.get(id) ?? title) : (translations[id]?.title ?? title);
}
