import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PREMIUM } from '@/lib/config';
import { fonts, radius } from '@/lib/theme';

export const GOLD = ['#FCD34D', '#F59E0B'] as const;

export function PremiumBadge({ small }: { small?: boolean }) {
  return (
    <LinearGradient colors={GOLD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.badge, small && styles.badgeSmall]}>
      <Text style={[styles.badgeText, small && { fontSize: 9.5 }]}>✨ PREMIUM</Text>
    </LinearGradient>
  );
}

/** Encart affiché à la place d'une fonction Premium. */
export function PremiumLock({ title, text, compact }: { title: string; text?: string; compact?: boolean }) {
  return (
    <Pressable onPress={() => router.push('/premium')} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={['#2A2112', '#1A1520']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.lock, compact && { padding: 12 }]}>
        <Text style={{ fontSize: compact ? 20 : 26 }}>🔒</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.lockTitle}>{title}</Text>
          {!!text && <Text style={styles.lockText}>{text}</Text>}
          <Text style={styles.lockCta}>
            Débloquer avec Premium · {PREMIUM.price}/{PREMIUM.period} →
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeSmall: { paddingHorizontal: 6, paddingVertical: 1.5 },
  badgeText: { fontFamily: fonts.bold, color: '#3B2604', fontSize: 11, letterSpacing: 0.5 },
  lock: { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: '#F59E0B55' },
  lockTitle: { fontFamily: fonts.bold, color: '#FDE68A', fontSize: 15 },
  lockText: { fontFamily: fonts.regular, color: '#D6CFC0', fontSize: 13.5, lineHeight: 19 },
  lockCta: { fontFamily: fonts.bold, color: '#FBBF24', fontSize: 13, marginTop: 4 },
});
