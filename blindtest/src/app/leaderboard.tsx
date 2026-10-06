import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OnlineGate } from '@/components/online-gate';
import { Button, Card, Chip, Muted, Row, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DIFFICULTIES } from '@/lib/game';
import { fetchLeaderboard, type LeaderboardRow } from '@/lib/online';
import { colors, fonts } from '@/lib/theme';

const PERIODS = [
  { id: 'week', label: 'Cette semaine', days: 7 },
  { id: 'month', label: 'Ce mois', days: 30 },
  { id: 'all', label: 'Depuis toujours', days: 0 },
];

export default function LeaderboardScreen() {
  return (
    <OnlineGate>
      <Leaderboard />
    </OnlineGate>
  );
}

function Leaderboard() {
  const auth = useAuth();
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[0].id);
  const [period, setPeriod] = useState('all');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const days = PERIODS.find((p) => p.id === period)!.days;
    const since = days ? new Date(Date.now() - days * 86400000) : null;
    fetchLeaderboard(difficulty, since)
      .then((r) => !cancelled && (setRows(r), setError('')))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
      setRows(null);
    };
  }, [difficulty, period]);

  const me = auth.session?.user.id;
  const myRank = rows?.findIndex((r) => r.user_id === me) ?? -1;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Classement mondial</Text>
      </View>

      <Row style={styles.center}>
        {DIFFICULTIES.map((d) => (
          <Chip
            key={d.id}
            label={`${d.emoji} ${d.label}`}
            selected={difficulty === d.id}
            color={d.color}
            onPress={() => setDifficulty(d.id)}
          />
        ))}
      </Row>
      <Row style={styles.center}>
        {PERIODS.map((p) => (
          <Chip key={p.id} label={p.label} selected={period === p.id} onPress={() => setPeriod(p.id)} />
        ))}
      </Row>

      {!auth.session && (
        <Card style={styles.cta}>
          <Muted style={styles.ctaText}>Connecte-toi pour que tes parties solo comptent dans le classement.</Muted>
          <Button label="Se connecter" small onPress={() => router.push('/account')} />
        </Card>
      )}
      {myRank >= 0 && <Text style={styles.myRank}>Tu es {myRank + 1}ᵉ sur ce classement</Text>}

      <Card>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !rows ? (
          <ActivityIndicator color={colors.accent} />
        ) : rows.length === 0 ? (
          <Muted>Personne n’a encore joué à ce niveau. Sois le premier !</Muted>
        ) : (
          rows.map((r, i) => (
            <View key={r.user_id} style={[styles.row, r.user_id === me && styles.rowMe]}>
              <Text style={[styles.rank, i < 3 && styles.rankTop]}>{i + 1}</Text>
              <Text style={styles.avatar}>{r.avatar}</Text>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.username}
                </Text>
                <Muted>
                  {r.games} partie{r.games > 1 ? 's' : ''}
                </Muted>
              </View>
              <Text style={styles.score}>{r.best}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingTop: 8 },
  globe: { fontSize: 52 },
  title: { fontFamily: fonts.display, color: colors.text, fontSize: 40, lineHeight: 46, textTransform: 'uppercase' },
  rankTop: { color: colors.accent },
  center: { justifyContent: 'center' },
  cta: { alignItems: 'center' },
  ctaText: { textAlign: 'center' },
  myRank: { color: colors.success, fontFamily: fonts.bold, textAlign: 'center' },
  error: { color: colors.danger },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  rowMe: { backgroundColor: `${colors.accent}22` },
  rank: { width: 28, textAlign: 'center', color: colors.faint, fontFamily: fonts.display, fontSize: 20 },
  avatar: { fontSize: 26 },
  flex: { flex: 1 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  score: { color: colors.accent, fontFamily: fonts.bold, fontSize: 20 },
});
