import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { DIFFICULTIES, TARGETS, type AnswerMode, type Target } from '@/lib/game';
import { playableTracks, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const ROUNDS = [5, 10, 15, 20];

export default function Setup() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const party = mode === 'soiree';
  const { data } = useStore();
  const categories = data.categories.filter((c) => playableTracks(c).length > 0);

  const [selected, setSelected] = useState<string[]>([]);
  const [difficultyId, setDifficultyId] = useState(DIFFICULTIES[0].id);
  const [target, setTarget] = useState<Target>('titre');
  const [answerMode, setAnswerMode] = useState<AnswerMode | null>(null);
  const [rounds, setRounds] = useState(10);
  const [startFrom, setStartFrom] = useState<'debut' | 'aleatoire'>('debut');
  const [auto, setAuto] = useState(true);
  const [players, setPlayers] = useState<string[]>(['Joueur 1', 'Joueur 2']);
  const [newPlayer, setNewPlayer] = useState('');

  const difficulty = DIFFICULTIES.find((d) => d.id === difficultyId)!;
  const effectiveAnswer = answerMode ?? difficulty.answerMode;
  const pool = (selected.length ? categories.filter((c) => selected.includes(c.id)) : categories).flatMap(
    playableTracks,
  );
  const poolSize = new Set(pool.map((t) => t.id)).size;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (!name || players.includes(name)) return;
    setPlayers([...players, name]);
    setNewPlayer('');
  };

  const start = () => {
    router.replace({
      pathname: '/game',
      params: {
        categories: selected.length ? selected.join(',') : 'all',
        difficulty: difficultyId,
        target,
        answer: party ? 'soiree' : effectiveAnswer,
        rounds: String(rounds),
        players: party ? players.join('|') : '',
        start: difficulty.startMode === 'intro' ? 'debut' : startFrom,
        auto: auto ? '1' : '0',
      },
    });
  };

  const canStart = poolSize >= (party || effectiveAnswer === 'texte' ? 1 : 2) && (!party || players.length > 0);

  if (categories.length === 0) {
    return (
      <Screen>
        <Card>
          <Label>Aucune musique disponible</Label>
          <Muted>Ajoute des playlists YouTube Music depuis la page d’administration.</Muted>
          <Button label="Aller à l’administration" onPress={() => router.replace('/admin')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Label>🎼 Catégories</Label>
        <View style={styles.catGrid}>
          <CategoryTile
            emoji="🎲"
            name="Toutes"
            count={new Set(categories.flatMap(playableTracks).map((t) => t.id)).size}
            color={colors.violet}
            selected={selected.length === 0}
            onPress={() => setSelected([])}
          />
          {categories.map((c) => (
            <CategoryTile
              key={c.id}
              emoji={c.emoji}
              name={c.name}
              count={playableTracks(c).length}
              color={c.color}
              selected={selected.includes(c.id)}
              onPress={() => toggle(c.id)}
            />
          ))}
        </View>
        <Muted>{poolSize} morceaux dans la sélection, joués dans un ordre aléatoire</Muted>
      </Card>

      <Card>
        <Label>🎚️ Niveau</Label>
        {DIFFICULTIES.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => {
              setDifficultyId(d.id);
              setAnswerMode(null);
            }}
            style={[
              styles.level,
              d.id === difficultyId && {
                borderColor: d.color,
                backgroundColor: `${d.color}22`,
              },
            ]}>
            <Text style={styles.levelEmoji}>{d.emoji}</Text>
            <View style={styles.flex}>
              <Text style={[styles.levelTitle, d.id === difficultyId && { color: d.color }]}>{d.label}</Text>
              <Muted>{d.description}</Muted>
            </View>
            <Text style={styles.levelPoints}>{d.basePoints} pts</Text>
          </Pressable>
        ))}
      </Card>

      <Card>
        <Label>🎯 Il faut trouver</Label>
        <Row>
          {TARGETS.map((t) => (
            <Chip key={t.id} label={t.label} selected={target === t.id} onPress={() => setTarget(t.id)} />
          ))}
        </Row>
        {!party && (
          <>
            <Label>✍️ Réponse</Label>
            <Row>
              <Chip
                label="Propositions (QCM)"
                selected={effectiveAnswer === 'qcm'}
                onPress={() => setAnswerMode('qcm')}
              />
              <Chip label="À écrire" selected={effectiveAnswer === 'texte'} onPress={() => setAnswerMode('texte')} />
            </Row>
          </>
        )}
        <Label>▶️ Départ de l’extrait</Label>
        {difficulty.startMode === 'intro' ? (
          <Muted>Toujours le début du morceau avec ce niveau.</Muted>
        ) : (
          <Row>
            <Chip label="⏮ Début du morceau" selected={startFrom === 'debut'} onPress={() => setStartFrom('debut')} />
            <Chip
              label="🔀 Moment aléatoire"
              selected={startFrom === 'aleatoire'}
              onPress={() => setStartFrom('aleatoire')}
            />
          </Row>
        )}
        <Label>⏯ Lancement</Label>
        <Row>
          <Chip label="⚡ Automatique (3, 2, 1…)" selected={auto} onPress={() => setAuto(true)} />
          <Chip label="👆 Bouton ▶" selected={!auto} onPress={() => setAuto(false)} />
        </Row>
        <Label>🔁 Nombre de manches</Label>
        <Row>
          {ROUNDS.map((r) => (
            <Chip key={r} label={String(r)} selected={rounds === r} onPress={() => setRounds(r)} />
          ))}
        </Row>
      </Card>

      {party && (
        <Card>
          <Label>👥 Joueurs</Label>
          <Muted>Tout le monde écoute, puis l’animateur révèle la réponse et désigne qui a trouvé.</Muted>
          <Row>
            {players.map((p) => (
              <Chip
                key={p}
                label={`${p}  ✕`}
                selected
                color={colors.secondary}
                onPress={() => setPlayers(players.filter((x) => x !== p))}
              />
            ))}
          </Row>
          <Row style={styles.noWrap}>
            <Input
              value={newPlayer}
              onChangeText={setNewPlayer}
              placeholder="Nom du joueur"
              onSubmitEditing={addPlayer}
              style={styles.flex}
            />
            <Button label="Ajouter" small onPress={addPlayer} />
          </Row>
        </Card>
      )}

      <Button
        label={canStart ? '🚀  C’est parti !' : 'Pas assez de morceaux'}
        color={difficulty.color}
        disabled={!canStart}
        onPress={start}
      />
    </Screen>
  );
}

function CategoryTile({
  emoji,
  name,
  count,
  color,
  selected,
  onPress,
}: {
  emoji: string;
  name: string;
  count: number;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.catTile,
        selected && { borderColor: color, backgroundColor: `${color}26` },
        pressed && { opacity: 0.8 },
      ]}>
      <Text style={styles.catEmoji}>{emoji}</Text>
      <Text style={styles.catName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.catCount, { color: selected ? color : colors.muted }]}>{count} titres</Text>
      {selected && <Text style={[styles.check, { backgroundColor: color }]}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catTile: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 2,
  },
  catEmoji: { fontSize: 28 },
  catName: { color: colors.text, fontWeight: '800', fontSize: 14 },
  catCount: { fontSize: 12, fontWeight: '700' },
  check: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    color: '#090914',
    fontWeight: '900',
    overflow: 'hidden',
  },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  levelEmoji: { fontSize: 26 },
  levelTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  levelPoints: { color: colors.warning, fontWeight: '800' },
  flex: { flex: 1 },
  noWrap: { flexWrap: 'nowrap' },
});
