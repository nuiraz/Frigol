import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Icon, Input, Label, Row, Screen, Segmented, Txt } from '@/components/ui';
import { DIFFICULTIES, TARGETS, type AnswerMode, type Target } from '@/lib/game';
import { playableTracks, useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

/** Configuration d'une partie (utilisé par l'onglet « Jouer » et l'écran /setup). */
export function SetupScreen({ mode, replace = false }: { mode?: string; replace?: boolean }) {
  const [party, setParty] = useState(mode === 'soiree');
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
  const allCount = new Set(categories.flatMap(playableTracks).map((t) => t.id)).size;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const addPlayer = () => {
    const name = newPlayer.trim();
    if (!name || players.includes(name)) return;
    setPlayers([...players, name]);
    setNewPlayer('');
  };

  const start = () => {
    (replace ? router.replace : router.push)({
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
          <Txt variant="title">Aucune musique</Txt>
          <Txt variant="muted">Importe une playlist YouTube Music pour commencer.</Txt>
          <Button label="Importer une playlist" icon="download" onPress={() => router.replace('/admin/import')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Segmented
        options={[
          { value: 'solo', label: 'Solo' },
          { value: 'soiree', label: 'Soirée entre amis' },
        ]}
        value={party ? 'soiree' : 'solo'}
        onChange={(v) => setParty(v === 'soiree')}
      />

      <Section title="Catégories" hint={`${poolSize} morceaux, joués dans le désordre`}>
        <Row>
          <Chip label={`Toutes · ${allCount}`} selected={selected.length === 0} onPress={() => setSelected([])} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={`${c.name} · ${playableTracks(c).length}`}
              dot={c.color}
              selected={selected.includes(c.id)}
              onPress={() => toggle(c.id)}
            />
          ))}
        </Row>
      </Section>

      <Section title="Niveau">
        <Card style={styles.levels}>
          {DIFFICULTIES.map((d, i) => {
            const on = d.id === difficultyId;
            return (
              <Pressable
                key={d.id}
                onPress={() => {
                  setDifficultyId(d.id);
                  setAnswerMode(null);
                }}
                style={[styles.level, i > 0 && styles.levelBorder, on && styles.levelOn]}>
                <View style={[styles.badge, { borderColor: d.color }, on && { backgroundColor: d.color }]}>
                  <Text style={[styles.badgeText, { color: on ? colors.onAccent : d.color }]}>{d.badge}</Text>
                </View>
                <View style={styles.flex}>
                  <Txt variant="strong">{d.label}</Txt>
                  <Txt variant="small">{d.description}</Txt>
                </View>
                {on ? <Icon name="check" color={colors.accent} /> : <Text style={styles.points}>{d.basePoints}</Text>}
              </Pressable>
            );
          })}
        </Card>
      </Section>

      <Section title="Règles">
        <Card>
          <Field label="À trouver">
            <Segmented
              options={TARGETS.map((t) => ({ value: t.id, label: t.label }))}
              value={target}
              onChange={setTarget}
            />
          </Field>
          {!party && (
            <Field label="Réponse">
              <Segmented<AnswerMode>
                options={[
                  { value: 'qcm', label: 'Propositions' },
                  { value: 'texte', label: 'À écrire' },
                ]}
                value={effectiveAnswer}
                onChange={setAnswerMode}
              />
            </Field>
          )}
          <Field label="Départ de l’extrait">
            {difficulty.startMode === 'intro' ? (
              <Txt variant="small">Toujours le début du morceau à ce niveau.</Txt>
            ) : (
              <Segmented
                options={[
                  { value: 'debut', label: 'Début du morceau' },
                  { value: 'aleatoire', label: 'Au hasard' },
                ]}
                value={startFrom}
                onChange={setStartFrom}
              />
            )}
          </Field>
          <Field label="Lancement">
            <Segmented
              options={[
                { value: 'auto', label: 'Automatique' },
                { value: 'manuel', label: 'Au bouton' },
              ]}
              value={auto ? 'auto' : 'manuel'}
              onChange={(v) => setAuto(v === 'auto')}
            />
          </Field>
          <Field label="Manches">
            <Segmented
              options={[5, 10, 15, 20].map((r) => ({ value: r, label: String(r) }))}
              value={rounds}
              onChange={setRounds}
            />
          </Field>
        </Card>
      </Section>

      {party && (
        <Section title="Joueurs" hint="Tout le monde écoute, l’animateur révèle et coche qui a trouvé.">
          <Card>
            <Row>
              {players.map((p) => (
                <Chip key={p} label={`${p}  ×`} selected onPress={() => setPlayers(players.filter((x) => x !== p))} />
              ))}
            </Row>
            <Row style={styles.noWrap}>
              <Input
                value={newPlayer}
                onChangeText={setNewPlayer}
                placeholder="Ajouter un joueur"
                onSubmitEditing={addPlayer}
                style={styles.flex}
              />
              <Button label="" icon="plus" small variant="secondary" onPress={addPlayer} />
            </Row>
          </Card>
        </Section>
      )}

      <Button
        label={canStart ? 'Commencer' : 'Pas assez de morceaux'}
        icon={canStart ? 'play' : undefined}
        disabled={!canStart}
        onPress={start}
      />
    </Screen>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Label>{title}</Label>
        {hint && <Txt variant="small">{hint}</Txt>}
      </View>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Txt variant="small">{label}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionHead: { gap: 2 },
  levels: { padding: 0, gap: 0, overflow: 'hidden' },
  level: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  levelBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  levelOn: { backgroundColor: colors.surfaceAlt },
  badge: {
    width: 58,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.5 },
  points: { fontFamily: fonts.medium, color: colors.faint, fontSize: 13 },
  field: { gap: 8 },
  flex: { flex: 1, gap: 2 },
  noWrap: { flexWrap: 'nowrap' },
});
