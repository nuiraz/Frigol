import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MealTile, RecipeRow } from '@/components/recipe-card';
import { Chip, Empty, Icon, Input, Screen, SectionTitle, Txt } from '@/components/ui';
import { CATEGORY_LABELS, EVERYDAY, INGREDIENT_BY_ID, INGREDIENTS } from '@/data/ingredients';
import { LOCAL_RECIPES } from '@/data/recipes';
import { rankRecipes, searchIngredients } from '@/lib/matching';
import { mealsByIngredient, type MealCard } from '@/lib/mealdb';
import { useStorage } from '@/lib/storage';
import { useTranslatedTitles } from '@/lib/use-translation';
import { colors, fonts, radius } from '@/lib/theme';
import type { IngredientCategory } from '@/lib/types';

const MISSING_FILTERS = [
  { value: 0, label: 'Tout est là' },
  { value: 1, label: '1 manquant max' },
  { value: 3, label: '3 max' },
  { value: Infinity, label: 'Tout' },
];

const CATEGORIES = Object.keys(CATEGORY_LABELS) as IngredientCategory[];

export default function Fridge() {
  const { fridge, toggleFridge, setFridge } = useStorage();
  const [query, setQuery] = useState('');
  const [maxMissing, setMaxMissing] = useState(3);
  const [quickOnly, setQuickOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fridgeSet = useMemo(() => new Set(fridge), [fridge]);
  // Le filtrage suit la saisie sans jamais bloquer le clavier.
  const deferredFridge = useDeferredValue(fridgeSet);
  const suggestions = useMemo(() => searchIngredients(query), [query]);

  const matches = useMemo(() => {
    const pool = quickOnly ? LOCAL_RECIPES.filter((r) => (r.time ?? 99) <= 20) : LOCAL_RECIPES;
    return rankRecipes(pool, deferredFridge, maxMissing);
  }, [deferredFridge, maxMissing, quickOnly]);

  const add = (id: string) => {
    if (!fridgeSet.has(id)) toggleFridge(id);
    setQuery('');
  };

  const picker = showAll ? null : EVERYDAY;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Txt variant="title">Mon frigo</Txt>
        <Txt variant="muted">Ajoute ce que tu as : les recettes se trient toutes seules.</Txt>
      </View>

      <View>
        <View style={styles.searchBox}>
          <Icon name="search" color={colors.muted} />
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Tomates, riz, œufs…"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => suggestions[0] && add(suggestions[0].id)}
            style={styles.searchInput}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer">
              <Icon name="x" color={colors.muted} />
            </Pressable>
          )}
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((ing) => {
              const on = fridgeSet.has(ing.id);
              return (
                <Pressable
                  key={ing.id}
                  onPress={() => (on ? toggleFridge(ing.id) : add(ing.id))}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.surfaceAlt }]}>
                  <Text style={styles.suggestionEmoji}>{ing.emoji}</Text>
                  <Text style={styles.suggestionText}>{ing.name}</Text>
                  <Icon name={on ? 'check' : 'plus'} color={on ? colors.accent : colors.muted} />
                </Pressable>
              );
            })}
          </View>
        )}
        {!!query && suggestions.length === 0 && (
          <Txt variant="small" style={styles.noSuggestion}>
            Ingrédient inconnu. Essaie un autre mot (ex : « lardons », « courgette »).
          </Txt>
        )}
      </View>

      {fridge.length > 0 && (
        <View style={styles.block}>
          <View style={styles.inFridgeHead}>
            <Txt variant="label">Dans ton frigo · {fridge.length}</Txt>
            <Pressable onPress={() => setFridge([])} hitSlop={8}>
              <Text style={styles.clear}>Tout retirer</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {fridge.map((id) => {
              const ing = INGREDIENT_BY_ID.get(id);
              if (!ing) return null;
              return (
                <Chip
                  key={id}
                  label={ing.name}
                  leading={ing.emoji}
                  selected
                  trailing="x"
                  onPress={() => toggleFridge(id)}
                />
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.block}>
        <Txt variant="label">{showAll ? 'Tous les ingrédients' : 'Les basiques'}</Txt>
        {picker ? (
          <View style={styles.chips}>
            {picker.map((id) => {
              const ing = INGREDIENT_BY_ID.get(id)!;
              return (
                <Chip
                  key={id}
                  label={ing.name}
                  leading={ing.emoji}
                  selected={fridgeSet.has(id)}
                  onPress={() => toggleFridge(id)}
                />
              );
            })}
          </View>
        ) : (
          CATEGORIES.map((cat) => (
            <View key={cat} style={styles.category}>
              <Text style={styles.categoryTitle}>{CATEGORY_LABELS[cat]}</Text>
              <View style={styles.chips}>
                {INGREDIENTS.filter((ing) => ing.category === cat && !ing.staple).map((ing) => (
                  <Chip
                    key={ing.id}
                    label={ing.name}
                    leading={ing.emoji}
                    selected={fridgeSet.has(ing.id)}
                    onPress={() => toggleFridge(ing.id)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
        <Pressable onPress={() => setShowAll(!showAll)} hitSlop={6} style={styles.toggleAll}>
          <Text style={styles.clear}>{showAll ? 'Afficher seulement les basiques' : 'Voir tous les ingrédients'}</Text>
          <Icon name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={colors.accent} />
        </Pressable>
        <Txt variant="small">Sel, poivre, huile et eau sont considérés comme toujours disponibles.</Txt>
      </View>

      <View style={styles.block}>
        <SectionTitle
          title={fridge.length ? `${matches.length} recette${matches.length > 1 ? 's' : ''}` : 'Recettes'}
        />
        {fridge.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {MISSING_FILTERS.map((f) => (
              <Chip
                key={f.label}
                label={f.label}
                selected={maxMissing === f.value}
                onPress={() => setMaxMissing(f.value)}
              />
            ))}
            <Chip label="≤ 20 min" leading="⏱" selected={quickOnly} onPress={() => setQuickOnly(!quickOnly)} />
          </ScrollView>
        )}
        {fridge.length === 0 ? (
          <Empty
            icon="box"
            title="Ton frigo est vide"
            hint="Ajoute au moins un ingrédient pour voir ce que tu peux cuisiner."
          />
        ) : matches.length === 0 ? (
          <Empty
            icon="search"
            title="Aucune recette"
            hint="Élargis le filtre des ingrédients manquants ou ajoute d’autres ingrédients."
          />
        ) : (
          <>
            {[
              {
                title: 'Prêt à cuisiner',
                hint: 'Tu as tout ce qu’il faut',
                items: matches.filter((m) => !m.missing.length),
              },
              {
                title: 'Il manque peu de choses',
                hint: 'Un passage à l’épicerie suffit',
                items: matches.filter((m) => m.missing.length),
              },
            ]
              .filter((g) => g.items.length)
              .map((g) => (
                <View key={g.title} style={styles.list}>
                  <View style={styles.groupHead}>
                    <Text style={styles.groupTitle}>{g.title}</Text>
                    <Text style={styles.groupCount}>{g.items.length}</Text>
                  </View>
                  {g.items.map((m) => (
                    <RecipeRow key={m.recipe.id} recipe={m.recipe} match={m} />
                  ))}
                </View>
              ))}
          </>
        )}
      </View>

      {fridge.length > 0 && <MoreIdeas fridge={fridge} />}
    </Screen>
  );
}

/** Recettes TheMealDB contenant le premier ingrédient du frigo (en ligne, en anglais). */
function MoreIdeas({ fridge }: { fridge: string[] }) {
  const main = fridge.map((id) => INGREDIENT_BY_ID.get(id)).find((ing) => ing?.en?.length && !ing.staple);
  const [meals, setMeals] = useState<MealCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const term = main?.en?.[0];
  const titleOf = useTranslatedTitles(meals);

  useEffect(() => {
    if (!term) return;
    let cancelled = false;
    const id = setTimeout(() => {
      mealsByIngredient(term)
        .then((m) => !cancelled && (setMeals(m.slice(0, 12)), setFailed(false)))
        .catch(() => !cancelled && setFailed(true));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [term]);

  if (!main || failed || !meals?.length) return null;
  return (
    <View style={styles.block}>
      <SectionTitle title={`Plus d’idées avec : ${main.name.toLowerCase()}`} />
      <Txt variant="small">Recettes du monde entier (TheMealDB)</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {meals.map((m) => (
          <MealTile key={m.id} {...m} title={titleOf(m.id, m.title)} width={150} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, paddingTop: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, borderWidth: 0, paddingHorizontal: 4, backgroundColor: 'transparent' },
  suggestions: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  suggestionEmoji: { fontSize: 20 },
  suggestionText: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 16 },
  noSuggestion: { marginTop: 8 },
  block: { gap: 10 },
  inFridgeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clear: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { gap: 8 },
  categoryTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14, marginTop: 4 },
  toggleAll: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  filters: { gap: 8, paddingRight: 20 },
  list: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  groupTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  groupCount: {
    fontFamily: fonts.bold,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
