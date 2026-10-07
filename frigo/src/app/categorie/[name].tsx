import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { RecipeRow } from '@/components/recipe-card';
import { Empty, Screen, Txt } from '@/components/ui';
import { LOCAL_CATEGORIES } from '@/data/categories';
import { LOCAL_RECIPES } from '@/data/recipes';
import { matchRecipe } from '@/lib/matching';
import { useStorage } from '@/lib/storage';

export default function CategoryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { fridge } = useStorage();
  const fridgeSet = useMemo(() => new Set(fridge), [fridge]);
  const recipes = LOCAL_RECIPES.filter((r) => r.category === name);
  // Les recettes réalisables avec le frigo d'abord.
  const sorted = fridge.length
    ? recipes.map((r) => matchRecipe(r, fridgeSet)).sort((a, b) => a.missing.length - b.missing.length)
    : recipes.map((r) => ({ recipe: r, match: undefined }));

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <Txt variant="muted">
        {recipes.length} recette{recipes.length > 1 ? 's' : ''}
        {fridge.length ? ', triées selon ce que tu as' : ''}
      </Txt>
      {recipes.length === 0 ? (
        <Empty icon="search" title="Catégorie introuvable" />
      ) : (
        <View style={styles.list}>
          {sorted.map((m) =>
            'missing' in m ? (
              <RecipeRow key={m.recipe.id} recipe={m.recipe} match={m} />
            ) : (
              <RecipeRow key={m.recipe.id} recipe={m.recipe} />
            ),
          )}
        </View>
      )}
    </Screen>
  );
}

export function generateStaticParams() {
  return LOCAL_CATEGORIES.map((c) => ({ name: c.name }));
}

const styles = StyleSheet.create({ list: { gap: 10 } });
