import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Backdrop, Card, Label, Muted } from '@/components/ui';
import { Vinyl } from '@/components/vinyl';
import { getDifficulty } from '@/lib/game';
import { quickPlay } from '@/lib/quick-play';
import { playableTracks, useStore } from '@/lib/store';
import { colors, shade } from '@/lib/theme';

function Tile({
  emoji,
  title,
  subtitle,
  color,
  onPress,
  wide,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [wide ? styles.tileWide : styles.tileWrap, pressed && styles.pressed]}>
      <LinearGradient
        colors={[color, shade(color, 0.55)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tile}>
        <Text style={styles.tileEmoji}>{emoji}</Text>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{subtitle}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function Home() {
  const { data } = useStore();
  const categories = data.categories.filter((c) => playableTracks(c).length > 0);
  const totalTracks = categories.reduce((n, c) => n + playableTracks(c).length, 0);
  const scores = Object.entries(data.bestScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5);

  const categoryName = (key: string) => {
    if (key === 'all') return '🎲 Toutes catégories';
    const names = key
      .split(',')
      .map((id) => data.categories.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => `${c!.emoji} ${c!.name}`);
    return names.join(', ') || 'Catégorie supprimée';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.push('/share')} style={styles.iconButton}>
            <Text style={styles.iconText}>📱 QR code</Text>
          </Pressable>
          <View style={styles.topRight}>
            <Pressable onPress={() => router.push('/admin/import')} style={styles.iconButton}>
              <Text style={styles.iconText}>📥 Importer</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/admin')} style={styles.iconButton}>
              <Text style={styles.iconText}>🔒 Admin</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Vinyl active color={colors.primary} size={150} label="♪" />
          <Text style={styles.title}>BLIND TEST</Text>
          <Muted style={styles.center}>
            {categories.length} catégories · {totalTracks} morceaux
          </Muted>
        </View>

        <Tile
          wide
          emoji="🎲"
          title="Lecture aléatoire"
          subtitle="Morceaux au hasard, depuis le début, lancement automatique"
          color={colors.violet}
          onPress={() => quickPlay()}
        />
        <View style={styles.grid}>
          <Tile
            emoji="🎵"
            title="Solo"
            subtitle="Choisis ton niveau"
            color={colors.primary}
            onPress={() => router.push({ pathname: '/setup', params: { mode: 'solo' } })}
          />
          <Tile
            emoji="🎉"
            title="Soirée"
            subtitle="Entre amis"
            color={colors.secondary}
            onPress={() => router.push({ pathname: '/setup', params: { mode: 'soiree' } })}
          />
        </View>

        {categories.length > 0 && (
          <>
            <Label style={styles.section}>⚡ Partie rapide par catégorie</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => quickPlay(c.id)}
                  style={({ pressed }) => [styles.cat, { borderColor: c.color }, pressed && styles.pressed]}>
                  <Text style={styles.catEmoji}>{c.emoji}</Text>
                  <Text style={styles.catName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[styles.catCount, { color: c.color }]}>{playableTracks(c).length} titres</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <Card>
          <Label>🏆 Meilleurs scores</Label>
          {scores.length === 0 ? (
            <Muted>Aucun score pour l’instant. À toi de jouer !</Muted>
          ) : (
            scores.map(([key, s], i) => {
              const [cat, diff] = key.split('|');
              const d = getDifficulty(diff);
              return (
                <View key={key} style={styles.scoreRow}>
                  <Text style={styles.rank}>{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.scoreCat} numberOfLines={1}>
                      {categoryName(cat)}
                    </Text>
                    <Muted>
                      {d.emoji} {d.label}
                    </Muted>
                  </View>
                  <Text style={styles.score}>{s.score}</Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', gap: 8 },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  hero: { alignItems: 'center', paddingVertical: 18, gap: 10 },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 5,
    textShadowColor: colors.primary,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 12 },
  tileWrap: { flex: 1, borderRadius: 22 },
  tileWide: { borderRadius: 22 },
  tile: { borderRadius: 22, padding: 18, gap: 4, minHeight: 120, justifyContent: 'flex-end' },
  tileEmoji: { fontSize: 34 },
  tileTitle: { color: '#fff', fontSize: 21, fontWeight: '900' },
  tileSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  section: { marginTop: 4 },
  catRow: { gap: 10, paddingRight: 16, alignItems: 'flex-start' },
  cat: {
    width: 128,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    gap: 4,
  },
  catEmoji: { fontSize: 30 },
  catName: { color: colors.text, fontWeight: '800', fontSize: 15 },
  catCount: { fontWeight: '700', fontSize: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { fontSize: 20, width: 30, textAlign: 'center', color: colors.muted },
  flex: { flex: 1 },
  scoreCat: { color: colors.text, fontWeight: '700' },
  score: { color: colors.warning, fontWeight: '900', fontSize: 20 },
});
