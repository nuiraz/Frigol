import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/lib/theme';

import { Icon } from './ui';

const KEY = 'bienvenue1';
const STEPS: [string, string][] = [
  ['🎯', 'Choisis un univers ou écris ton envie'],
  ['🎲', 'Appuie sur « Hop » : une idée sur mesure'],
  ['⭐', 'Note-la sur le hub et garde-la dans ta liste'],
];

/** Petit guide affiché à la première visite. */
export function Welcome() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setShow(!v))
      .catch(() => {});
  }, []);
  if (!show) return null;
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={styles.title}>Bienvenue sur Envie 👋</Text>
        <Pressable
          onPress={() => {
            setShow(false);
            AsyncStorage.setItem(KEY, '1').catch(() => {});
          }}
          hitSlop={10}
          accessibilityLabel="Fermer">
          <Icon name="x" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {STEPS.map(([e, t], i) => (
        <View key={t} style={styles.step}>
          <View style={styles.num}>
            <Text style={styles.numText}>{i + 1}</Text>
          </View>
          <Text style={{ fontSize: 18 }}>{e}</Text>
          <Text style={styles.stepText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: `${colors.accent}55` },
  title: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.bold, color: '#fff', fontSize: 12 },
  stepText: { flex: 1, fontFamily: fonts.medium, color: colors.text, fontSize: 14 },
});
