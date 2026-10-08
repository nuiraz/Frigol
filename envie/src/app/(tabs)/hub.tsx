import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaTile, ReviewCard } from '@/components/media';
import { TypeTabs } from '@/components/type-tabs';
import { Button, Card, Empty, SectionTitle, text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useCatalog } from '@/lib/catalog';
import { listReviews, topScores, type Review, type Score } from '@/lib/db';
import { TYPE } from '@/lib/taxonomy';
import { colors, fonts } from '@/lib/theme';
import type { MediaType } from '@/lib/types';
import { useLikes } from '@/lib/use-likes';

export default function Hub() {
  const { session } = useAuth();
  const { byId } = useCatalog();
  const [type, setType] = useState<MediaType | null>(null);
  const [order, setOrder] = useState<'recent' | 'top'>('recent');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [top, setTop] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { liked, toggle } = useLikes(reviews, setReviews);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [list, best] = await Promise.all([listReviews({ order, type, limit: 50 }), topScores(40)]);
      setReviews(list);
      setTop(best);
    } catch {
      setError('Impossible de charger le hub. Vérifie ta connexion (ou que la base Supabase est bien configurée).');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [order, type]);

  // Rechargé à chaque fois qu'on revient sur l'onglet (pour voir son nouvel avis).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const best = top
    .map((s) => ({ s, item: byId.get(s.item_id) }))
    .filter((x) => x.item && (!type || x.item.type === type))
    .slice(0, 12);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accent} onRefresh={() => (setRefreshing(true), load())} />}>
        <View style={{ gap: 4 }}>
          <Text style={text.title}>Le hub</Text>
          <Text style={text.muted}>Les notes et avis de la communauté sur les films, séries, jeux et sons.</Text>
        </View>

        <TypeTabs value={type} onChange={setType} />

        {!session && (
          <Card style={{ borderColor: `${colors.accent}66` }}>
            <Text style={text.strong}>Rejoins la communauté 🍿</Text>
            <Text style={text.muted}>Note ce que tu as vu, joué ou écouté, commente les avis et retrouve ta liste sur tous tes appareils.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Créer un compte" small onPress={() => router.push('/inscription')} style={{ flex: 1 }} />
              <Button label="Se connecter" small variant="secondary" onPress={() => router.push('/connexion')} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {best.length > 0 && (
          <View style={{ gap: 12 }}>
            <SectionTitle title={type ? `🏆 ${TYPE[type].plural} les mieux notés` : '🏆 Les mieux notés'} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {best.map(({ s, item }) => (
                <MediaTile key={s.item_id} item={item!} score={s.average} width={118} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.feedHead}>
          <Text style={text.h2}>{type ? `Avis ${TYPE[type].plural.toLowerCase()}` : 'Derniers avis'}</Text>
          <View style={styles.segment}>
            {(
              [
                ['recent', 'Récents'],
                ['top', 'Populaires'],
              ] as const
            ).map(([k, label]) => (
              <Text key={k} onPress={() => setOrder(k)} style={[styles.segmentItem, order === k && styles.segmentOn]}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
        ) : error ? (
          <Empty icon="wifi-off" title="Hub indisponible" hint={error} />
        ) : reviews.length ? (
          reviews.map((r) => <ReviewCard key={r.id} review={r} liked={liked.has(r.id)} onLike={() => toggle(r.id)} />)
        ) : (
          <Empty
            icon="message-square"
            title={type ? `Aucun avis ${TYPE[type].plural.toLowerCase()} pour l’instant` : 'Aucun avis pour l’instant'}
            hint="Trouve une idée dans « Découvrir », puis donne ta note !"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  feedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: colors.border },
  segmentItem: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  segmentOn: { backgroundColor: colors.accent, color: '#fff', fontFamily: fonts.bold },
});
