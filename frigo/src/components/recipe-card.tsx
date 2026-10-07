import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Match } from '@/lib/matching';
import { colors, fonts, radius, tint } from '@/lib/theme';
import type { Recipe } from '@/lib/types';

import { Icon } from './ui';

export const formatTime = (min?: number) =>
  min == null ? undefined : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

const open = (id: string) => router.push({ pathname: '/recette/[id]', params: { id } });

/** Photo de la recette, ou illustration (emoji sur fond coloré) pour les recettes locales. */
export function RecipeVisual({
  recipe,
  style,
  emojiSize = 56,
}: {
  recipe: Pick<Recipe, 'image' | 'emoji' | 'category'>;
  style?: StyleProp<ViewStyle>;
  emojiSize?: number;
}) {
  return (
    <View style={[styles.visual, { backgroundColor: tint(recipe.category) }, style]}>
      {recipe.image ? (
        <Image source={recipe.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ fontSize: emojiSize }}>{recipe.emoji}</Text>
      )}
    </View>
  );
}

/** « Tout est là » ou « Il manque 2 ingrédients ». */
export function MissingBadge({ match }: { match: Match }) {
  const n = match.missing.length;
  return (
    <View style={[styles.badge, n === 0 ? styles.badgeOk : styles.badgeWarn]}>
      <Icon name={n === 0 ? 'check' : 'shopping-bag'} size={12} color={n === 0 ? colors.accent : colors.warning} />
      <Text style={[styles.badgeText, { color: n === 0 ? colors.accent : colors.warning }]}>
        {n === 0 ? 'Tout est là' : `Il manque ${n}`}
      </Text>
    </View>
  );
}

function Meta({ recipe }: { recipe: Recipe }) {
  const parts = [
    formatTime(recipe.time),
    recipe.difficulty === 'moyen' ? 'Moyen' : recipe.time ? 'Facile' : undefined,
    recipe.category,
  ];
  return (
    <Text style={styles.meta} numberOfLines={1}>
      {parts.filter(Boolean).join(' · ')}
    </Text>
  );
}

/** Carte verticale pour les carrousels. */
export function RecipeCard({ recipe, match, width = 180 }: { recipe: Recipe; match?: Match; width?: number }) {
  return (
    <Pressable onPress={() => open(recipe.id)} style={({ pressed }) => [{ width }, pressed && styles.pressed]}>
      <RecipeVisual recipe={recipe} style={{ height: width * 0.78 }} />
      {match && (
        <View style={styles.badgeFloat}>
          <MissingBadge match={match} />
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {recipe.title}
      </Text>
      <Meta recipe={recipe} />
    </Pressable>
  );
}

/** Ligne de liste, avec la liste des ingrédients manquants. */
export function RecipeRow({ recipe, match }: { recipe: Recipe; match?: Match }) {
  return (
    <Pressable onPress={() => open(recipe.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <RecipeVisual recipe={recipe} style={styles.rowVisual} emojiSize={34} />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Meta recipe={recipe} />
        {match && (
          <View style={styles.rowMatch}>
            <MissingBadge match={match} />
            {match.missing.length > 0 && (
              <Text style={styles.missingText} numberOfLines={1}>
                {match.missing.map((m) => m.name.toLowerCase()).join(', ')}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Carte simple pour les résultats TheMealDB pas encore chargés en détail. */
export function MealTile({ id, title, image, width }: { id: string; title: string; image: string; width?: number }) {
  return (
    <Pressable
      onPress={() => open(id)}
      style={({ pressed }) => [width ? { width } : styles.fill, pressed && styles.pressed]}>
      <RecipeVisual recipe={{ image, emoji: '🍽️', category: '' }} style={styles.tileVisual} />
      <Text style={styles.cardTitle} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  fill: { width: '100%' },
  tileVisual: { width: '100%', aspectRatio: 1.28 },
  visual: { borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15, marginTop: 9, lineHeight: 20 },
  meta: { fontFamily: fonts.regular, color: colors.muted, fontSize: 13, marginTop: 2 },
  badgeFloat: { position: 'absolute', top: 8, left: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeOk: { backgroundColor: colors.accentSoft },
  badgeWarn: { backgroundColor: colors.warningSoft },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
  row: {
    flexDirection: 'row',
    gap: 14,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowVisual: { width: 84, height: 84, borderRadius: radius.md },
  rowBody: { flex: 1, justifyContent: 'center', gap: 2 },
  rowTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 16, lineHeight: 21 },
  rowMatch: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  missingText: { flex: 1, fontFamily: fonts.regular, color: colors.muted, fontSize: 12.5 },
});
