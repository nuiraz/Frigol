import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Divider, IconButton, Label, ListRow, Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { getDifficulty } from '@/lib/game';
import { quickPlay } from '@/lib/quick-play';
import { playableTracks, useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

export default function Home() {
  const { data } = useStore();
  const auth = useAuth();
  const categories = data.categories.filter((c) => playableTracks(c).length > 0);
  const totalTracks = categories.reduce((n, c) => n + playableTracks(c).length, 0);
  const scores = Object.entries(data.bestScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 3);

  const categoryName = (key: string) => {
    if (key === 'all') return 'Toutes catégories';
    const names = key
      .split(',')
      .map((id) => data.categories.find((c) => c.id === id)?.name)
      .filter(Boolean);
    return names.join(', ') || 'Catégorie supprimée';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>
            BLIND<Text style={styles.wordmarkAccent}>/</Text>TEST
          </Text>
          <View style={styles.topActions}>
            <IconButton icon="share-2" label="Inviter" onPress={() => router.push('/share')} />
            {auth.profile ? (
              <Pressable onPress={() => router.push('/account')} style={styles.avatar} accessibilityLabel="Compte">
                <Text style={styles.avatarEmoji}>{auth.profile.avatar}</Text>
              </Pressable>
            ) : (
              <IconButton icon="user" label="Compte" onPress={() => router.push('/account')} />
            )}
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.headline}>
            Devine{'\n'}le son<Text style={styles.accent}>.</Text>
          </Text>
          <Txt variant="muted">
            {totalTracks} morceaux · {categories.length} catégories
            {auth.profile ? ` · Salut ${auth.profile.username}` : ''}
          </Txt>
        </View>

        <View style={styles.cta}>
          <Button label="Lancer une partie" icon="play" onPress={() => quickPlay()} disabled={!totalTracks} />
          <Txt variant="small" style={styles.ctaHint}>
            10 morceaux au hasard, extrait depuis le début, niveau facile
          </Txt>
        </View>

        <Card style={styles.menu}>
          <ListRow
            icon="sliders"
            title="Partie personnalisée"
            subtitle="Niveau, catégories, mode 1 seconde…"
            onPress={() => router.push({ pathname: '/setup', params: { mode: 'solo' } })}
          />
          <Divider />
          <ListRow
            icon="users"
            title="Soirée entre amis"
            subtitle="Plusieurs joueurs, un seul écran"
            onPress={() => router.push({ pathname: '/setup', params: { mode: 'soiree' } })}
          />
          <Divider />
          <ListRow
            icon="bar-chart-2"
            title="Classement mondial"
            subtitle="Les meilleurs scores des joueurs"
            onPress={() => router.push('/leaderboard')}
          />
          <Divider />
          <ListRow
            icon="globe"
            title="Communauté"
            subtitle="Playlists partagées par les joueurs"
            onPress={() => router.push('/hub')}
          />
          <Divider />
          <ListRow
            icon="download"
            title="Importer une playlist"
            subtitle="Depuis YouTube Music"
            onPress={() => router.push('/admin/import')}
          />
        </Card>

        {categories.length > 0 && (
          <View style={styles.section}>
            <Label>Jouer une catégorie</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => quickPlay(c.id)}
                  style={({ pressed }) => [styles.cat, pressed && styles.pressed]}>
                  <View style={[styles.catSwatch, { backgroundColor: c.color }]}>
                    <Text style={styles.catEmoji}>{c.emoji}</Text>
                  </View>
                  <Txt variant="strong" numberOfLines={1}>
                    {c.name}
                  </Txt>
                  <Txt variant="small">{playableTracks(c).length} titres</Txt>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {scores.length > 0 && (
          <View style={styles.section}>
            <Label>Tes records</Label>
            <Card style={styles.menu}>
              {scores.map(([key, s], i) => {
                const [cat, diff] = key.split('|');
                const d = getDifficulty(diff);
                return (
                  <View key={key}>
                    {i > 0 && <View style={styles.thinDivider} />}
                    <View style={styles.scoreRow}>
                      <Text style={styles.rank}>{i + 1}</Text>
                      <View style={styles.flex}>
                        <Txt variant="strong" numberOfLines={1}>
                          {categoryName(cat)}
                        </Txt>
                        <Txt variant="small">{d.label}</Txt>
                      </View>
                      <Text style={styles.score}>{s.score}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        )}

        <View style={styles.footer}>
          {[
            ['Administration', '/admin'],
            ['Mentions légales', '/legal/mentions'],
            ['CGU', '/legal/cgu'],
            ['Confidentialité', '/legal/confidentialite'],
          ].map(([label, href]) => (
            <Text key={href} style={styles.footerLink} onPress={() => router.push(href as never)}>
              {label}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 24, width: '100%', maxWidth: 640, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wordmark: { fontFamily: fonts.display, color: colors.text, fontSize: 20, letterSpacing: 1 },
  wordmarkAccent: { color: colors.accent },
  topActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  avatarEmoji: { fontSize: 22 },
  hero: { gap: 10, paddingTop: 12 },
  headline: { fontFamily: fonts.display, color: colors.text, fontSize: 76, lineHeight: 78, textTransform: 'uppercase' },
  accent: { color: colors.accent },
  cta: { gap: 8 },
  ctaHint: { textAlign: 'center' },
  menu: { padding: 0, gap: 0, overflow: 'hidden' },
  section: { gap: 12 },
  catRow: { gap: 12, paddingRight: 20 },
  cat: { width: 120, gap: 6 },
  catSwatch: { width: 120, height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 44 },
  pressed: { opacity: 0.7 },
  thinDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rank: { fontFamily: fonts.display, color: colors.faint, fontSize: 22, width: 18 },
  flex: { flex: 1, gap: 2 },
  score: { fontFamily: fonts.display, color: colors.accent, fontSize: 26 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  footerLink: { fontFamily: fonts.regular, color: colors.faint, fontSize: 12 },
});
