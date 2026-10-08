import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, metaLine, Poster, ScorePill } from '@/components/media';
import { Shelf } from '@/components/shelf';
import { TypeTabs } from '@/components/type-tabs';
import { Empty, text } from '@/components/ui';
import { useCatalog } from '@/lib/catalog';
import { listReviews, mostReviewed, topScores, type Author, type Review, type Score } from '@/lib/db';
import { TYPE } from '@/lib/taxonomy';
import { colors, fonts, radius } from '@/lib/theme';
import type { Item, MediaType } from '@/lib/types';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Top() {
  const { byId } = useCatalog();
  const { width } = useWindowDimensions();
  const [type, setType] = useState<MediaType | null>(null);
  const [best, setBest] = useState<Score[]>([]);
  const [popular, setPopular] = useState<Score[]>([]);
  const [recent, setRecent] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, p, r] = await Promise.all([topScores(300), mostReviewed(200), listReviews({ limit: 400 })]);
      setBest(b);
      setPopular(p);
      setRecent(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const view = useMemo(() => {
    const keep = (s: Score) => {
      const item = byId.get(s.item_id);
      return item && (!type || item.type === type) ? { item, s } : null;
    };
    const ranking = best.map(keep).filter((x): x is { item: Item; s: Score } => !!x);
    const mostRated = popular.map(keep).filter((x): x is { item: Item; s: Score } => !!x);

    // Tendances : titres les plus notés ces 7 derniers jours.
    const week = now - 7 * 864e5;
    const counts = new Map<string, number>();
    for (const r of recent) {
      if (new Date(r.created_at).getTime() < week) continue;
      if (type && r.item_type !== type) continue;
      counts.set(r.item_id, (counts.get(r.item_id) ?? 0) + 1);
    }
    const trending = [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => byId.get(id))
      .filter((i): i is Item => !!i)
      .slice(0, 14);

    // Membres les plus actifs.
    const members = new Map<string, { author: Author; n: number }>();
    for (const r of recent) {
      if (!r.profiles || (type && r.item_type !== type)) continue;
      const m = members.get(r.user_id) ?? { author: r.profiles, n: 0 };
      m.n++;
      members.set(r.user_id, m);
    }
    const active = [...members.values()].sort((a, b) => b.n - a.n).slice(0, 10);
    return { ranking, mostRated, trending, active };
  }, [best, popular, recent, byId, type, now]);

  const scoreMap = new Map(best.map((s) => [s.item_id, s.average]));
  const podiumW = Math.min((Math.min(width, 900) - 40 - 24) / 3, 200);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => (setRefreshing(true), load())} />}>
        <View style={{ gap: 4 }}>
          <Text style={text.title}>Top</Text>
          <Text style={text.muted}>Les classements de la communauté, mis à jour à chaque nouvel avis.</Text>
        </View>
        <TypeTabs value={type} onChange={setType} />

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        ) : error ? (
          <Empty icon="wifi-off" title="Classements indisponibles" hint={error} />
        ) : !view.ranking.length ? (
          <Empty icon="award" title="Pas encore de classement" hint="Les premiers avis du hub feront naître le top !" />
        ) : (
          <>
            <View style={styles.podium}>
              {[1, 0, 2].map((i) => {
                const entry = view.ranking[i];
                if (!entry) return <View key={i} style={{ width: podiumW }} />;
                return (
                  <View key={entry.item.id} style={{ width: podiumW, marginTop: i === 0 ? 0 : 28 }}>
                    <Link href={`/titre/${entry.item.id}`} asChild>
                      <Pressable style={({ pressed }) => [{ gap: 6 }, pressed && { opacity: 0.85 }]}>
                        <View>
                          <Poster item={entry.item} aspect={entry.item.type === 'musique' ? 1 : 2 / 3} radiusSize={radius.md} />
                          <Text style={styles.medal}>{MEDALS[i]}</Text>
                        </View>
                        <Text style={styles.podiumTitle} numberOfLines={2}>
                          {entry.item.title}
                        </Text>
                        <ScorePill score={entry.s.average} size="sm" />
                      </Pressable>
                    </Link>
                  </View>
                );
              })}
            </View>

            <View style={{ gap: 8 }}>
              {view.ranking.slice(3, 20).map((entry, i) => (
                <Link key={entry.item.id} href={`/titre/${entry.item.id}`} asChild>
                  <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
                    <Text style={styles.rank}>{i + 4}</Text>
                    <Poster item={entry.item} aspect={entry.item.type === 'musique' ? 1 : 2 / 3} style={{ width: 46 }} radiusSize={8} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {entry.item.title}
                      </Text>
                      <Text style={text.small} numberOfLines={1}>
                        {TYPE[entry.item.type].emoji} {entry.item.type === 'musique' ? entry.item.creator : metaLine(entry.item, 2)}
                      </Text>
                    </View>
                    <ScorePill score={entry.s.average} count={entry.s.reviews} size="sm" />
                  </Pressable>
                </Link>
              ))}
            </View>

            <Shelf title="🔥 Tendance cette semaine" items={view.trending} scores={scoreMap} />
            <Shelf title="💬 Les plus notés" items={view.mostRated.slice(0, 14).map((x) => x.item)} scores={scoreMap} />

            {view.active.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={styles.section}>👑 Membres les plus actifs</Text>
                {view.active.map((m, i) => (
                  <Link key={m.author.id} href={`/u/${m.author.username}`} asChild>
                    <Pressable style={styles.row}>
                      <Text style={styles.rank}>{i + 1}</Text>
                      <Avatar value={m.author.avatar} size={36} />
                      <Text style={[styles.rowTitle, { flex: 1 }]}>{m.author.username}</Text>
                      <Text style={text.small}>{m.n} avis</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 56, gap: 22, width: '100%', maxWidth: 900, alignSelf: 'center' },
  podium: { flexDirection: 'row', justifyContent: 'center', gap: 12, alignItems: 'flex-start' },
  medal: { position: 'absolute', top: -10, right: -6, fontSize: 30 },
  podiumTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 13.5, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rank: { fontFamily: fonts.bold, color: colors.faint, fontSize: 16, width: 24, textAlign: 'center' },
  rowTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14.5 },
  section: { fontFamily: fonts.bold, color: colors.text, fontSize: 19 },
});
