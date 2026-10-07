import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RecipeRow } from '@/components/recipe-card';
import { Empty, Icon, Input, Screen, Txt } from '@/components/ui';
import { matchRecipe } from '@/lib/matching';
import { useStorage } from '@/lib/storage';
import { colors, fonts, radius } from '@/lib/theme';
import { applyTranslation } from '@/lib/translate';

type Tab = 'favoris' | 'historique' | 'courses';

export default function MyRecipes() {
  const storage = useStorage();
  const { favorites, history, fridge, shopping, translations } = storage;
  const [tab, setTab] = useState<Tab>('favoris');
  const fridgeSet = useMemo(() => new Set(fridge), [fridge]);
  const list = (tab === 'favoris' ? favorites : history).map((r) =>
    translations[r.id] ? applyTranslation(r, translations[r.id]) : r,
  );
  const todo = shopping.filter((x) => !x.done).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'favoris', label: `Favoris${favorites.length ? ` · ${favorites.length}` : ''}` },
    { id: 'historique', label: 'Récents' },
    { id: 'courses', label: `Courses${todo ? ` · ${todo}` : ''}` },
  ];

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Txt variant="title">Mes recettes</Txt>
      </View>

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'courses' ? (
        <ShoppingList />
      ) : list.length === 0 ? (
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
            <Pressable onPress={storage.clearHistory} style={styles.clear} hitSlop={8}>
              <Text style={styles.clearText}>Effacer l’historique</Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  );
}

function ShoppingList() {
  const { shopping, addShopping, toggleShopping, removeShopping } = useStorage();
  const [text, setText] = useState('');
  const done = shopping.filter((x) => x.done);

  const add = () => {
    const name = text.trim();
    if (!name) return;
    addShopping([{ name }]);
    setText('');
  };

  return (
    <View style={styles.list}>
      <View style={styles.addRow}>
        <Input
          value={text}
          onChangeText={setText}
          placeholder="Ajouter un article"
          onSubmitEditing={add}
          returnKeyType="done"
          style={styles.flex}
        />
        <Pressable onPress={add} style={styles.addButton} accessibilityLabel="Ajouter">
          <Icon name="plus" color={colors.onAccent} />
        </Pressable>
      </View>

      {shopping.length === 0 ? (
        <Empty
          icon="shopping-cart"
          title="Ta liste est vide"
          hint="Sur une recette, touche « Ajouter les manquants à ma liste de courses »."
        />
      ) : (
        <View style={styles.card}>
          {shopping.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => toggleShopping(item.id)}
              style={[styles.item, i > 0 && styles.itemBorder]}>
              <View style={[styles.checkbox, item.done && styles.checkboxOn]}>
                {item.done && <Icon name="check" size={14} color={colors.onAccent} />}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.itemName, item.done && styles.itemDone]}>
                  {item.name}
                  {item.quantity ? <Text style={styles.itemQty}> · {item.quantity}</Text> : null}
                </Text>
                {!!item.recipe && <Text style={styles.itemRecipe}>Pour : {item.recipe}</Text>}
              </View>
              <Pressable onPress={() => removeShopping([item.id])} hitSlop={10} accessibilityLabel="Supprimer">
                <Icon name="x" size={16} color={colors.faint} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      {done.length > 0 && (
        <Pressable onPress={() => removeShopping(done.map((x) => x.id))} style={styles.clear} hitSlop={8}>
          <Text style={styles.clearText}>Retirer les {done.length} article(s) acheté(s)</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8 },
  tabs: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabOn: { backgroundColor: colors.surface, boxShadow: '0 1px 3px rgba(60,40,20,0.12)' },
  tabText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 14 },
  tabTextOn: { fontFamily: fonts.bold, color: colors.text },
  list: { gap: 10 },
  flex: { flex: 1 },
  clear: { alignSelf: 'center', padding: 10 },
  clearText: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
  addRow: { flexDirection: 'row', gap: 10 },
  addButton: {
    width: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  itemName: { fontFamily: fonts.medium, color: colors.text, fontSize: 15.5 },
  itemQty: { fontFamily: fonts.regular, color: colors.muted },
  itemDone: { color: colors.faint, textDecorationLine: 'line-through' },
  itemRecipe: { fontFamily: fonts.regular, color: colors.faint, fontSize: 12.5, marginTop: 1 },
});
