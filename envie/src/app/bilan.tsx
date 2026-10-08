import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MediaTile } from '@/components/media';
import { PremiumLock } from '@/components/premium';
import { Empty, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { listReviews, type Review } from '@/lib/db';
import { useLists } from '@/lib/lists';
import { GENRE, TYPES } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item } from '@/lib/types';

/** « Mon bilan » (Premium) : statistiques personnelles. */
export default function Bilan() {
  const { ready, session, premium } = useAuth();
  const { byId } = useCatalog();
  const { saved } = useLists();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || !premium) return;
    listReviews({ userId, limit: 1000 })
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [userId, premium]);

  if (ready && !session) return <Redirect href="/connexion" />;
  if (!premium) {
    return (
      <View style={styles.content}>
        <Text style={text.title}>Mon bilan</Text>
        <PremiumLock title="Tes statistiques personnelles" text="Notes par univers, genres préférés, répartition de tes notes et ton top perso." />
      </View>
    );
  }
  if (!reviews) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const done = [...saved.values()].filter((s) => s === 'done').length;
  const todo = [...saved.values()].filter((s) => s === 'todo').length;
  const perType = TYPES.map((t) => {
    const list = reviews.filter((r) => r.item_type === t.id);
    return { t, n: list.length, avg: list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0 };
  });
  const maxType = Math.max(1, ...perType.map((x) => x.n));
  const dist = Array.from({ length: 10 }, (_, i) => reviews.filter((r) => r.rating === i + 1).length);
  const maxDist = Math.max(1, ...dist);
  const genreStats = new Map<string, { n: number; sum: number }>();
  for (const r of reviews) {
    for (const g of byId.get(r.item_id)?.genres ?? []) {
      const e = genreStats.get(g) ?? { n: 0, sum: 0 };
      e.n++;
      e.sum += r.rating;
      genreStats.set(g, e);
    }
  }
  const topGenres = [...genreStats].sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  const maxGenre = Math.max(1, ...topGenres.map(([, e]) => e.n));
  const best = [...reviews]
    .sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at))
    .map((r) => byId.get(r.item_id))
    .filter((i): i is Item => !!i)
    .slice(0, 8);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={text.title}>Mon bilan 📊</Text>
      <View style={styles.tiles}>
        <Tile value={String(reviews.length)} label="avis publiés" />
        <Tile value={reviews.length ? avg.toFixed(1) : '–'} label="note moyenne" />
        <Tile value={String(done)} label="terminés" />
        <Tile value={String(todo)} label="à faire" />
      </View>

      {!reviews.length ? (
        <Empty icon="bar-chart-2" title="Pas encore de statistiques" hint="Note quelques titres et ton bilan se remplira tout seul." />
      ) : (
        <>
          <Section title="Avis par univers">
            {perType.map(({ t, n, avg: a }) => (
              <View key={t.id} style={styles.hRow}>
                <Text style={styles.hLabel}>
                  {t.emoji} {t.plural}
                </Text>
                <View style={styles.hTrack}>
                  {n > 0 && <View style={[styles.hBar, { width: `${(n / maxType) * 100}%`, backgroundColor: t.color }]} />}
                </View>
                <Text style={styles.hValue}>
                  {n}
                  {n ? ` · ${a.toFixed(1)}` : ''}
                </Text>
              </View>
            ))}
            <Text style={text.small}>Nombre d’avis · note moyenne</Text>
          </Section>

          <Section title="Répartition de mes notes">
            <View style={styles.vChart}>
              {dist.map((n, i) => (
                <View key={i} style={styles.vCol}>
                  <Text style={styles.vValue}>{n || ''}</Text>
                  <View style={styles.vTrack}>
                    {n > 0 && <View style={[styles.vBar, { height: `${(n / maxDist) * 100}%` }]} />}
                  </View>
                  <Text style={styles.vAxis}>{i + 1}</Text>
                </View>
              ))}
            </View>
          </Section>

          {topGenres.length > 0 && (
            <Section title="Mes genres préférés">
              {topGenres.map(([g, e]) => (
                <View key={g} style={styles.hRow}>
                  <Text style={styles.hLabel} numberOfLines={1}>
                    {GENRE[g]?.emoji} {GENRE[g]?.label ?? g}
                  </Text>
                  <View style={styles.hTrack}>
                    <View style={[styles.hBar, { width: `${(e.n / maxGenre) * 100}%`, backgroundColor: colors.accent }]} />
                  </View>
                  <Text style={styles.hValue}>
                    {e.n} · {(e.sum / e.n).toFixed(1)}
                  </Text>
                </View>
              ))}
            </Section>
          )}

          {best.length > 0 && (
            <Section title="Mon top perso">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {best.map((i) => (
                  <MediaTile key={i.id} item={i} width={118} myScore={reviews.find((r) => r.item_id === i.id)?.rating} />
                ))}
              </ScrollView>
            </Section>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={text.h2}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 56, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center', backgroundColor: colors.bg },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, minWidth: 140, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 2 },
  tileValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 30, letterSpacing: -1 },
  tileLabel: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  hRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hLabel: { fontFamily: fonts.medium, color: colors.text, fontSize: 13.5, width: 120 },
  hTrack: { flex: 1, height: 12, justifyContent: 'center' },
  hBar: { height: 10, borderTopRightRadius: 4, borderBottomRightRadius: 4, minWidth: 4 },
  hValue: { fontFamily: fonts.bold, color: colors.muted, fontSize: 12.5, width: 64, textAlign: 'right' },
  vChart: { flexDirection: 'row', gap: 4, height: 150, alignItems: 'flex-end' },
  vCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  vValue: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, height: 14 },
  vTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', borderBottomWidth: 1, borderBottomColor: colors.border },
  vBar: { width: '70%', alignSelf: 'center', backgroundColor: colors.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  vAxis: { fontFamily: fonts.medium, color: colors.faint, fontSize: 11.5 },
});
