import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { OnlineGate } from '@/components/online-gate';
import { Button, Chip, Icon, Input, Muted, Row, Screen } from '@/components/ui';
import { listSharedPlaylists, type SharedPlaylist } from '@/lib/online';
import { colors, fonts } from '@/lib/theme';

type Item = Omit<SharedPlaylist, 'tracks'>;

export default function HubScreen() {
  return (
    <OnlineGate>
      <Hub />
    </OnlineGate>
  );
}

function Hub() {
  const [order, setOrder] = useState<'likes' | 'recent'>('likes');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState('');

  // Petite temporisation pour ne pas interroger le serveur à chaque lettre.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    listSharedPlaylists(order, query)
      .then((r) => !cancelled && (setItems(r), setError('')))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [order, query]);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Hub communautaire</Text>
        <Muted style={styles.center}>
          Les playlists de blind test partagées par les joueurs. Ajoute-les en un clic !
        </Muted>
      </View>

      <Input value={search} onChangeText={setSearch} placeholder="Rechercher : rap, disney, années 80…" />
      <Row style={styles.spread}>
        <Row>
          <Chip label="Populaires" selected={order === 'likes'} onPress={() => setOrder('likes')} />
          <Chip label="Récentes" selected={order === 'recent'} onPress={() => setOrder('recent')} />
        </Row>
      </Row>
      <Button label="Partager une de mes catégories" small variant="secondary" onPress={() => router.push('/admin')} />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !items ? (
        <ActivityIndicator color={colors.accent} />
      ) : items.length === 0 ? (
        <Muted style={styles.center}>Aucune playlist pour l’instant. Partage la première depuis l’admin !</Muted>
      ) : (
        items.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push({ pathname: '/hub/[id]', params: { id: p.id } })}
            style={({ pressed }) => [styles.item, { borderLeftColor: p.color }, pressed && styles.pressed]}>
            <Text style={styles.emoji}>{p.emoji}</Text>
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {p.title}
              </Text>
              <Muted numberOfLines={1}>
                {p.profiles?.avatar} {p.profiles?.username ?? 'Anonyme'} · {p.track_count} titres
              </Muted>
            </View>
            <View style={styles.counters}>
              <View style={styles.counterRow}>
                <Icon name="heart" size={13} color={colors.text} />
                <Text style={styles.counter}>{p.likes_count}</Text>
              </View>
              <View style={styles.counterRow}>
                <Icon name="play" size={12} color={colors.muted} />
                <Text style={styles.counterMuted}>{p.plays_count}</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingTop: 8 },
  icon: { fontSize: 52 },
  title: { fontFamily: fonts.display, color: colors.text, fontSize: 40, lineHeight: 46, textTransform: 'uppercase' },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  center: { textAlign: 'center' },
  spread: { justifyContent: 'space-between' },
  error: { color: colors.danger },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 16,
    borderLeftWidth: 6,
  },
  pressed: { opacity: 0.75 },
  emoji: { fontSize: 30 },
  flex: { flex: 1 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  counters: { alignItems: 'flex-end', gap: 2 },
  counter: { color: colors.text, fontFamily: fonts.bold },
  counterMuted: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12 },
});
