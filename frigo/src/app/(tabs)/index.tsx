import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RecipeCard } from '@/components/recipe-card';
import { Chip, Icon, Screen, SectionTitle, Txt } from '@/components/ui';
import { EVERYDAY, INGREDIENT_BY_ID } from '@/data/ingredients';
import { LOCAL_RECIPES } from '@/data/recipes';
import { rankRecipes } from '@/lib/matching';
import { useStorage } from '@/lib/storage';
import { colors, fonts, radius } from '@/lib/theme';
import type { Recipe } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? 'Bonjour' : h < 17 ? 'Bon après-midi' : 'Bonsoir';
}

/** La même suggestion toute la journée, une nouvelle chaque jour. */
function dishOfTheDay(): Recipe {
  const day = Math.floor(Date.now() / 86_400_000);
  const mains = LOCAL_RECIPES.filter((r) => r.category !== 'Sucré');
  return mains[day % mains.length];
}

function Carousel({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
      {children}
    </ScrollView>
  );
}

export default function Home() {
  const { fridge, toggleFridge, favorites, history } = useStorage();
  const fridgeSet = useMemo(() => new Set(fridge), [fridge]);
  const matches = useMemo(() => rankRecipes(LOCAL_RECIPES, fridgeSet, 2).slice(0, 8), [fridgeSet]);
  const quick = useMemo(() => LOCAL_RECIPES.filter((r) => (r.time ?? 99) <= 15), []);
  const today = dishOfTheDay();

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Txt variant="muted">{greeting()},</Txt>
        <Txt variant="title">Qu’est-ce qu’on{'\n'}mange aujourd’hui ?</Txt>
      </View>

      <Pressable
        onPress={() => router.push('/frigo')}
        style={({ pressed }) => [styles.search, pressed && styles.pressed]}>
        <Icon name="search" color={colors.muted} />
        <Text style={styles.searchText}>Qu’as-tu dans ton frigo ?</Text>
      </Pressable>

      <View style={styles.block}>
        <Txt variant="label">J’ai sous la main…</Txt>
        <View style={styles.chips}>
          {EVERYDAY.map((id) => {
            const ing = INGREDIENT_BY_ID.get(id)!;
            return (
              <Chip
                key={id}
                label={ing.name}
                leading={ing.emoji}
                selected={fridge.includes(id)}
                onPress={() => toggleFridge(id)}
              />
            );
          })}
        </View>
      </View>

      {matches.length > 0 && (
        <View style={styles.block}>
          <SectionTitle title="Avec ce que tu as" action="Tout voir" onAction={() => router.push('/frigo')} />
          <Carousel>
            {matches.map((m) => (
              <RecipeCard key={m.recipe.id} recipe={m.recipe} match={m} />
            ))}
          </Carousel>
        </View>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/recette/[id]', params: { id: today.id } })}
        style={({ pressed }) => [styles.today, pressed && styles.pressed]}>
        <View style={styles.todayText}>
          <Txt variant="label" style={styles.todayLabel}>
            L’idée du jour
          </Txt>
          <Text style={styles.todayTitle}>{today.title}</Text>
          <Text style={styles.todayMeta}>
            {today.time} min · {today.description}
          </Text>
        </View>
        <Text style={styles.todayEmoji}>{today.emoji}</Text>
      </Pressable>

      <View style={styles.block}>
        <SectionTitle title="Prêt en 15 minutes" />
        <Carousel>
          {quick.map((r) => (
            <RecipeCard key={r.id} recipe={r} width={150} />
          ))}
        </Carousel>
      </View>

      {favorites.length > 0 && (
        <View style={styles.block}>
          <SectionTitle title="Tes favoris" action="Tout voir" onAction={() => router.push('/favoris')} />
          <Carousel>
            {favorites.slice(0, 10).map((r) => (
              <RecipeCard key={r.id} recipe={r} width={150} />
            ))}
          </Carousel>
        </View>
      )}

      {history.length > 0 && (
        <View style={styles.block}>
          <SectionTitle title="Vu récemment" />
          <Carousel>
            {history.slice(0, 10).map((r) => (
              <RecipeCard key={r.id} recipe={r} width={130} />
            ))}
          </Carousel>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, paddingTop: 8 },
  pressed: { opacity: 0.85 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  searchText: { fontFamily: fonts.regular, color: colors.faint, fontSize: 16 },
  block: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  carousel: { gap: 14, paddingRight: 20 },
  today: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: 20,
  },
  todayText: { flex: 1, gap: 4 },
  todayLabel: { color: '#CFE8D6' },
  todayTitle: { fontFamily: fonts.title, color: '#fff', fontSize: 22, lineHeight: 28 },
  todayMeta: { fontFamily: fonts.regular, color: '#E2F1E7', fontSize: 14, lineHeight: 19 },
  todayEmoji: { fontSize: 54 },
});
