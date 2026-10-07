import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, IconButton, Txt } from '@/components/ui';
import { LOCAL_RECIPES } from '@/data/recipes';
import { useRecipe } from '@/lib/recipes';
import { colors, fonts, radius } from '@/lib/theme';

/** Durée en minutes repérée dans le texte d'une étape (« … 10 min »), pour proposer un minuteur. */
function stepMinutes(step: string) {
  const m = step.match(/(\d+)\s*(?:min|minutes)\b/i);
  return m ? Number(m[1]) : null;
}

function format(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default function CookingMode() {
  // L'écran reste allumé pendant qu'on cuisine.
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipe } = useRecipe(id);
  const [index, setIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerEnd) return;
    const t = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= timerEnd) {
        clearInterval(t);
        setTimerEnd(null);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (Platform.OS === 'web') window.alert('Minuteur terminé !');
        else Alert.alert('Minuteur terminé', 'C’est prêt pour l’étape suivante.');
      }
    }, 250);
    return () => clearInterval(t);
  }, [timerEnd]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  if (!recipe) return <SafeAreaView style={styles.safe} />;

  const steps = recipe.steps;
  const step = steps[index];
  const minutes = stepMinutes(step);
  const last = index === steps.length - 1;
  const remaining = timerEnd ? Math.max(0, Math.round((timerEnd - now) / 1000)) : 0;

  const go = (next: number) => {
    setIndex(next);
    setShowIngredients(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="x" label="Quitter le mode cuisine" filled onPress={close} />
        <View style={styles.topText}>
          <Txt variant="small" numberOfLines={1}>
            {recipe.title}
          </Txt>
          <Text style={styles.counter}>
            Étape {index + 1} sur {steps.length}
          </Text>
        </View>
        <IconButton
          icon="shopping-bag"
          label="Afficher les ingrédients"
          filled
          color={showIngredients ? colors.accent : colors.text}
          onPress={() => setShowIngredients(!showIngredients)}
        />
      </View>
      <View style={styles.progress}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progressStep, i <= index && styles.progressOn]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {showIngredients ? (
          <View style={styles.ingredients}>
            {recipe.ingredients.map((l, i) => (
              <View key={`${l.name}-${i}`} style={styles.ingredient}>
                <Text style={styles.ingredientName}>{l.name}</Text>
                {!!l.quantity && <Text style={styles.ingredientQty}>{l.quantity}</Text>}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.stepText}>{step}</Text>
        )}

        {minutes != null && !showIngredients && (
          <Pressable
            onPress={() => {
              if (timerEnd) setTimerEnd(null);
              else {
                setNow(Date.now());
                setTimerEnd(Date.now() + minutes * 60_000);
              }
            }}
            style={({ pressed }) => [styles.timer, timerEnd != null && styles.timerOn, pressed && { opacity: 0.8 }]}>
            <Icon name="clock" color={timerEnd ? colors.onAccent : colors.accent} />
            <Text style={[styles.timerText, timerEnd != null && { color: colors.onAccent }]}>
              {timerEnd ? `${format(remaining)} · Arrêter` : `Minuteur ${minutes} min`}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.nav}>
        <Button
          label="Précédent"
          icon="arrow-left"
          variant="secondary"
          disabled={index === 0}
          onPress={() => go(index - 1)}
          style={styles.navBtn}
        />
        <Button
          label={last ? 'Terminé' : 'Suivant'}
          icon={last ? 'check' : 'arrow-right'}
          onPress={() => (last ? close() : go(index + 1))}
          style={styles.navBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  topText: { flex: 1, alignItems: 'center' },
  counter: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: 14 },
  progressStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressOn: { backgroundColor: colors.accent },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    gap: 28,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  stepText: { fontFamily: fonts.title, color: colors.text, fontSize: 28, lineHeight: 40 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  timerOn: { backgroundColor: colors.accent },
  timerText: { fontFamily: fonts.bold, color: colors.accent, fontSize: 16 },
  ingredients: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
  },
  ingredient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  ingredientName: { fontFamily: fonts.medium, color: colors.text, fontSize: 18, flex: 1 },
  ingredientQty: { fontFamily: fonts.regular, color: colors.muted, fontSize: 17 },
  nav: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  navBtn: { flex: 1, minHeight: 58 },
});

/** Pages pré-générées pour le site web (une par recette de l'app). */
export function generateStaticParams() {
  return LOCAL_RECIPES.map((r) => ({ id: r.id }));
}
