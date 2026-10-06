import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Label, Muted, Screen } from '@/components/ui';
import { getDifficulty } from '@/lib/game';
import { playableTracks, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function Home() {
  const { data } = useStore();
  const totalTracks = data.categories.reduce((n, c) => n + playableTracks(c).length, 0);
  const scores = Object.entries(data.bestScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5);

  const categoryName = (key: string) => {
    if (key === 'all') return 'Toutes catégories';
    const names = key
      .split(',')
      .map((id) => data.categories.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => `${c!.emoji} ${c!.name}`);
    return names.join(', ') || 'Catégorie supprimée';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.logo}>🎧</Text>
          <Text style={styles.title}>BLIND TEST</Text>
          <Muted style={styles.center}>
            Devine la musique le plus vite possible.{'\n'}
            {data.categories.length} catégories · {totalTracks} morceaux
          </Muted>
        </View>

        <Button
          label="🎵  Jouer en solo"
          onPress={() => router.push({ pathname: '/setup', params: { mode: 'solo' } })}
        />
        <Button
          label="🎉  Mode soirée (multijoueur)"
          color={colors.secondary}
          onPress={() => router.push({ pathname: '/setup', params: { mode: 'soiree' } })}
        />
        <Button label="🔒  Administration" variant="ghost" onPress={() => router.push('/admin')} />

        <Card>
          <Label>🏆 Meilleurs scores</Label>
          {scores.length === 0 ? (
            <Muted>Aucun score pour l’instant. À toi de jouer !</Muted>
          ) : (
            scores.map(([key, s]) => {
              const [cat, diff] = key.split('|');
              const d = getDifficulty(diff);
              return (
                <View key={key} style={styles.scoreRow}>
                  <View style={styles.flex}>
                    <Text style={styles.scoreCat} numberOfLines={1}>
                      {categoryName(cat)}
                    </Text>
                    <Muted>
                      {d.emoji} {d.label}
                      {s.player ? ` · ${s.player}` : ''}
                    </Muted>
                  </View>
                  <Text style={styles.score}>{s.score}</Text>
                </View>
              );
            })
          )}
        </Card>
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  logo: { fontSize: 72 },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 4,
  },
  center: { textAlign: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  scoreCat: { color: colors.text, fontWeight: '700' },
  score: { color: colors.warning, fontWeight: '900', fontSize: 20 },
});
