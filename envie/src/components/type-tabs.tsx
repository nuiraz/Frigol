import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TYPES } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { MediaType } from '@/lib/types';

/** Onglets Films / Séries / Jeux / Musique (avec « Tout » en option). */
export function TypeTabs({
  value,
  onChange,
  withAll = true,
  counts,
}: {
  value: MediaType | null;
  onChange: (t: MediaType | null) => void;
  withAll?: boolean;
  counts?: Partial<Record<MediaType | 'all', number>>;
}) {
  const tabs = [
    ...(withAll ? [{ id: null, label: 'Tout', emoji: '✨', color: colors.accent }] : []),
    ...TYPES.map((t) => ({ id: t.id, label: t.plural, emoji: t.emoji, color: t.color })),
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((t) => {
        const on = value === t.id;
        const n = counts?.[t.id ?? 'all'];
        return (
          <Pressable
            key={t.id ?? 'all'}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [styles.tab, on && { backgroundColor: `${t.color}22`, borderColor: t.color }, pressed && { opacity: 0.8 }]}>
            <Text style={styles.emoji}>{t.emoji}</Text>
            <Text style={[styles.label, on && { color: t.color }]}>{t.label}</Text>
            {n !== undefined && (
              <View style={[styles.count, on && { backgroundColor: t.color }]}>
                <Text style={[styles.countText, on && { color: colors.bg }]}>{n}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emoji: { fontSize: 17 },
  label: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
  count: { backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  countText: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11 },
});
