import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RecipeRow } from '@/components/recipe-card';
import { Empty, Screen, Txt } from '@/components/ui';
import { matchRecipe } from '@/lib/matching';
import { useStorage } from '@/lib/storage';
import { colors, fonts, radius } from '@/lib/theme';

export default function Favorites() {
  const { favorites, history, fridge, clearHistory } = useStorage();
  const [tab, setTab] = useState<'favoris' | 'historique'>('favoris');
  const fridgeSet = useMemo(() => new Set(fridge), [fridge]);
  const list = tab === 'favoris' ? favorites : history;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Txt variant="title">Mes recettes</Txt>
      </View>

      <View style={styles.tabs}>
        {(['favoris', 'historique'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'favoris' ? `Favoris · ${favorites.length}` : 'Vu récemment'}
            </Text>
          </Pressable>
        ))}
      </View>

      {list.length === 0 ? (
        tab === 'favoris' ? (
          <Empty
            icon="heart"
            title="Pas encore de favoris"
            hint="Touche le cœur sur une recette pour la retrouver ici, même hors ligne."
          />
        ) : (
          <Empty icon="clock" title="Aucune recette consultée" />
        )
      ) : (
        <View style={styles.list}>
          {list.map((r) => (
            <RecipeRow key={r.id} recipe={r} match={fridge.length ? matchRecipe(r, fridgeSet) : undefined} />
          ))}
          {tab === 'historique' && (
            <Pressable onPress={clearHistory} style={styles.clear} hitSlop={8}>
              <Text style={styles.clearText}>Effacer l’historique</Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabOn: { backgroundColor: colors.surface },
  tabText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  tabTextOn: { fontFamily: fonts.bold, color: colors.text },
  list: { gap: 10 },
  clear: { alignSelf: 'center', padding: 10 },
  clearText: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
});
