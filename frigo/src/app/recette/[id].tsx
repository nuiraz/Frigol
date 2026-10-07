import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTime, RecipeVisual } from '@/components/recipe-card';
import { Button, Empty, Icon, IconButton, Txt } from '@/components/ui';
import { hasIngredient, matchRecipe } from '@/lib/matching';
import { LOCAL_RECIPES } from '@/data/recipes';
import { scaleQuantity, useRecipe } from '@/lib/recipes';
import { useTranslatedRecipe } from '@/lib/use-translation';
import { useStorage } from '@/lib/storage';
import { colors, fonts, radius } from '@/lib/theme';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipe: source, loading, error } = useRecipe(id);
  const tr = useTranslatedRecipe(source);
  const recipe = tr.display;
  const [added, setAdded] = useState<number | null>(null);
  const storage = useStorage();
  const insets = useSafeAreaInsets();
  const [servings, setServings] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const fridge = useMemo(() => new Set(storage.fridge), [storage.fridge]);
  const { addToHistory } = storage;
  useEffect(() => {
    if (source) addToHistory(source);
  }, [source, addToHistory]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBarStatic}>
          <IconButton icon="arrow-left" label="Retour" filled onPress={back} />
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : (
          <Empty icon="alert-circle" title={error ?? 'Recette introuvable'} />
        )}
      </SafeAreaView>
    );
  }

  const people = servings ?? recipe.servings;
  const factor = people / recipe.servings;
  const match = matchRecipe(recipe, fridge);
  const favorite = storage.isFavorite(recipe.id);

  const toggleFavorite = () => {
    storage.toggleFavorite(source!);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const toggleLine = (i: number) =>
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View>
          <RecipeVisual recipe={recipe} style={[styles.hero, { height: 300 + insets.top }]} emojiSize={110} />
          {!!recipe.image && (
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']}
              style={[styles.heroShade, { height: 110 + insets.top }]}
              pointerEvents="none"
            />
          )}
        </View>
        <View style={[styles.topBar, { top: insets.top + 8 }]}>
          <IconButton icon="arrow-left" label="Retour" filled onPress={back} />
          <IconButton
            icon="heart"
            label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            filled
            color={favorite ? colors.heart : colors.text}
            onPress={toggleFavorite}
          />
        </View>

        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Txt variant="label">{recipe.category}</Txt>
            <Text style={styles.title}>{recipe.title}</Text>
            {!!recipe.description && <Txt variant="muted">{recipe.description}</Txt>}
          </View>

          <View style={styles.facts}>
            {recipe.time != null && <Fact icon="clock" label={formatTime(recipe.time)!} />}
            {recipe.difficulty && <Fact icon="bar-chart" label={recipe.difficulty === 'moyen' ? 'Moyen' : 'Facile'} />}
            <Fact icon="list" label={`${recipe.steps.length} étapes`} />
          </View>

          {tr.translatable && (
            <View style={styles.translateBar}>
              <Icon name="globe" size={18} color={colors.accent} />
              <View style={styles.translateText}>
                <Text style={styles.translateTitle}>
                  {tr.loading ? 'Traduction en cours…' : tr.translated ? 'Traduit en français' : 'Recette en anglais'}
                </Text>
                <Text style={styles.translateHint}>
                  {tr.failed
                    ? 'Traduction impossible (connexion ?). Réessaie.'
                    : tr.translated
                      ? 'Traduction automatique : quelques tournures peuvent être approximatives.'
                      : `Source TheMealDB · environ ${recipe.servings} personnes`}
                </Text>
              </View>
              {tr.loading ? (
                <ActivityIndicator color={colors.accent} />
              ) : tr.translated ? (
                <Pressable onPress={tr.showOriginal} hitSlop={8}>
                  <Text style={styles.translateAction}>Original</Text>
                </Pressable>
              ) : (
                <Button label="Traduire" icon="globe" small onPress={tr.translate} />
              )}
            </View>
          )}
          {tr.translatable && tr.hasTranslation && (
            <Pressable
              onPress={() => storage.setAutoTranslate(!storage.autoTranslate)}
              style={styles.autoRow}
              hitSlop={6}>
              <View style={[styles.switch, storage.autoTranslate && styles.switchOn]}>
                <View style={[styles.knob, storage.autoTranslate && styles.knobOn]} />
              </View>
              <Text style={styles.autoText}>Toujours traduire les recettes du monde</Text>
            </Pressable>
          )}

          {fridge.size > 0 && (
            <View style={[styles.fridgeNote, match.missing.length === 0 ? styles.noteOk : styles.noteWarn]}>
              <Icon
                name={match.missing.length === 0 ? 'check-circle' : 'shopping-bag'}
                color={match.missing.length === 0 ? colors.accent : colors.warning}
              />
              <Text style={styles.noteText}>
                {match.missing.length === 0
                  ? 'Tu as tout ce qu’il faut !'
                  : `Il te manque : ${match.missing.map((m) => m.name.toLowerCase()).join(', ')}`}
              </Text>
            </View>
          )}
          {match.missing.length > 0 && (
            <Button
              label={
                added != null
                  ? added
                    ? `${added} article${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} à ta liste`
                    : 'Déjà dans ta liste de courses'
                  : `Ajouter ${fridge.size ? 'les manquants' : 'les ingrédients'} à ma liste de courses`
              }
              icon={added != null ? 'check' : 'shopping-cart'}
              variant="secondary"
              small
              onPress={() =>
                setAdded(
                  storage.addShopping(
                    match.missing.map((m) => ({
                      name: m.name,
                      quantity: scaleQuantity(m.quantity, factor),
                      recipe: recipe.title,
                    })),
                  ),
                )
              }
            />
          )}

          <View style={styles.sectionHead}>
            <Text style={styles.section}>Ingrédients</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setServings(Math.max(1, people - 1))}
                style={styles.stepperBtn}
                accessibilityLabel="Moins de personnes">
                <Icon name="minus" size={16} />
              </Pressable>
              <Text style={styles.stepperValue}>{people} pers.</Text>
              <Pressable
                onPress={() => setServings(people + 1)}
                style={styles.stepperBtn}
                accessibilityLabel="Plus de personnes">
                <Icon name="plus" size={16} />
              </Pressable>
            </View>
          </View>

          <View style={styles.ingredients}>
            {recipe.ingredients.map((line, i) => {
              const done = checked.has(i);
              const inFridge = hasIngredient(fridge, line.id);
              return (
                <Pressable
                  key={`${line.name}-${i}`}
                  onPress={() => toggleLine(i)}
                  style={[styles.line, i > 0 && styles.lineBorder]}>
                  <View style={[styles.checkbox, done && styles.checkboxOn]}>
                    {done && <Icon name="check" size={14} color={colors.onAccent} />}
                  </View>
                  <View style={styles.lineText}>
                    <Text style={[styles.lineName, done && styles.lineDone]}>
                      {line.name}
                      {line.optional ? <Text style={styles.optional}> · facultatif</Text> : null}
                    </Text>
                    {inFridge && !done && <Text style={styles.inFridge}>Dans ton frigo</Text>}
                  </View>
                  {!!line.quantity && (
                    <Text style={[styles.quantity, done && styles.lineDone]}>
                      {scaleQuantity(line.quantity, factor)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>Préparation</Text>
          <View style={styles.steps}>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Button
          label="Cuisiner pas à pas"
          icon="play"
          onPress={() => router.push({ pathname: '/cuisine/[id]', params: { id: recipe.id } })}
        />
      </View>
    </View>
  );
}

function Fact({ icon, label }: { icon: 'clock' | 'bar-chart' | 'list'; label: string }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={15} color={colors.muted} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loader: { marginTop: 80 },
  hero: { borderRadius: 0, width: '100%' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  translateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  translateText: { flex: 1, gap: 2 },
  translateTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  translateHint: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12.5, lineHeight: 17 },
  translateAction: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -6 },
  switch: { width: 38, height: 22, borderRadius: 11, backgroundColor: colors.border, padding: 2 },
  switchOn: { backgroundColor: colors.accent },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  knobOn: { transform: [{ translateX: 16 }] },
  autoText: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13.5 },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  topBarStatic: { padding: 16 },
  body: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.bg,
    padding: 20,
    gap: 18,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  titleBlock: { gap: 6 },
  title: { fontFamily: fonts.title, color: colors.text, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  factText: { fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
  fridgeNote: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: radius.md },
  noteOk: { backgroundColor: colors.accentSoft },
  noteWarn: { backgroundColor: colors.warningSoft },
  noteText: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 14.5, lineHeight: 20 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { fontFamily: fonts.title, color: colors.text, fontSize: 22 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  stepperBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 14, minWidth: 54, textAlign: 'center' },
  ingredients: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  lineBorder: { borderTopWidth: 1, borderTopColor: colors.border },
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
  lineText: { flex: 1, gap: 1 },
  lineName: { fontFamily: fonts.medium, color: colors.text, fontSize: 15.5 },
  optional: { fontFamily: fonts.regular, color: colors.faint, fontSize: 13 },
  inFridge: { fontFamily: fonts.medium, color: colors.accent, fontSize: 12 },
  lineDone: { color: colors.faint, textDecorationLine: 'line-through' },
  quantity: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, maxWidth: 150, textAlign: 'right' },
  steps: { gap: 14 },
  step: { flexDirection: 'row', gap: 14 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontFamily: fonts.bold,
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  stepText: { flex: 1, fontFamily: fonts.regular, color: colors.text, fontSize: 16, lineHeight: 24 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

/** Pages pré-générées pour le site web (une par recette de l'app). */
export function generateStaticParams() {
  return LOCAL_RECIPES.map((r) => ({ id: r.id }));
}
