import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { MealTile, RecipeRow } from '@/components/recipe-card';
import { Button, Chip, Empty, Icon, Input, Screen, SectionTitle, Txt } from '@/components/ui';
import { LOCAL_RECIPES } from '@/data/recipes';
import {
  categoryLabel,
  MEALDB_CATEGORIES,
  mealsByCategory,
  randomMeal,
  searchMeals,
  type MealCard,
} from '@/lib/mealdb';
import { rememberRecipes } from '@/lib/recipes';
import { normalize } from '@/lib/text';
import { colors, radius } from '@/lib/theme';

export default function Explorer() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Chicken');
  // Résultats rangés par requête : pas besoin de les « vider » à chaque nouvelle recherche.
  const [response, setResponse] = useState<{ key: string; items?: MealCard[]; error?: string } | null>(null);
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);

  const q = normalize(query);
  const local = useMemo(
    () => (q ? LOCAL_RECIPES.filter((r) => normalize(`${r.title} ${r.category} ${r.tags.join(' ')}`).includes(q)) : []),
    [q],
  );

  // Recherche TheMealDB (par nom si on tape quelque chose, sinon par catégorie), avec un petit délai.
  useEffect(() => {
    let cancelled = false;
    const key = q ? `q:${q}` : `c:${category}`;
    const id = setTimeout(
      () => {
        const request = q
          ? searchMeals(query).then((recipes) => {
              rememberRecipes(recipes);
              return recipes.map((r) => ({ id: r.id, title: r.title, image: r.image! }));
            })
          : mealsByCategory(category);
        request
          .then((items) => !cancelled && setResponse({ key, items }))
          .catch(
            () =>
              !cancelled &&
              setResponse({ key, error: 'Pas de connexion : seules les recettes de l’app sont disponibles.' }),
          );
      },
      q ? 450 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, query, category]);

  const current = response?.key === (q ? `q:${q}` : `c:${category}`) ? response : null;
  const results = current?.items ?? null;
  const shownError = current?.error ?? error;

  const surprise = async () => {
    setRolling(true);
    try {
      const r = await randomMeal();
      if (r) {
        rememberRecipes([r]);
        router.push({ pathname: '/recette/[id]', params: { id: r.id } });
      }
    } catch {
      setError('Pas de connexion pour le moment.');
    } finally {
      setRolling(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Txt variant="title">Explorer</Txt>
        <Txt variant="muted">Des centaines de recettes du monde entier, en plus des nôtres.</Txt>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" color={colors.muted} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Lasagne, curry, crêpes…"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      <Button label="Surprends-moi" icon="shuffle" variant="secondary" loading={rolling} onPress={surprise} />

      {local.length > 0 && (
        <View style={styles.block}>
          <SectionTitle title="Dans l’app" />
          {local.map((r) => (
            <RecipeRow key={r.id} recipe={r} />
          ))}
        </View>
      )}

      <View style={styles.block}>
        {!q && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {MEALDB_CATEGORIES.map((c) => (
              <Chip key={c} label={categoryLabel(c)} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        )}
        <SectionTitle title={q ? 'Du monde entier' : categoryLabel(category)} />
        <Txt variant="small">Source : TheMealDB (recettes en anglais)</Txt>
        {shownError ? (
          <Empty icon="wifi-off" title="Hors ligne" hint={shownError} />
        ) : !results ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : results.length === 0 ? (
          <Empty icon="search" title="Aucun résultat" hint="Essaie en anglais : « chicken », « soup », « cake »…" />
        ) : (
          <View style={styles.grid}>
            {results.slice(0, 40).map((m) => (
              <View key={m.id} style={styles.cell}>
                <MealTile {...m} />
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
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
  block: { gap: 10 },
  chips: { gap: 8, paddingRight: 20 },
  loader: { marginVertical: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cell: { width: '47%', flexGrow: 1 },
});
