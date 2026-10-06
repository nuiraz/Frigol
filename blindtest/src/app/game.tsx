import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Equalizer } from '@/components/equalizer';
import { Button, Card, Chip, Input, Label, Muted, Row, Screen } from '@/components/ui';
import { YouTubePlayer } from '@/components/youtube-player';
import type { PlayerEvent, PlayerHandle } from '@/components/youtube-player.types';
import {
  buildChoices,
  checkTextAnswer,
  computePoints,
  getDifficulty,
  scoreKey,
  shuffle,
  trackLabel,
  type Target,
} from '@/lib/game';
import { playableTracks, useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import type { Track } from '@/lib/types';
import { BLOCKED_ERRORS, thumbnailUrl } from '@/lib/youtube';

type Phase = 'loading' | 'ready' | 'listening' | 'answering' | 'reveal' | 'finished';

type RoundResult = {
  track: Track;
  correct: boolean;
  points: number;
  answer?: string;
  winners?: string[];
};

const REVEAL_SECONDS = 12;

function feedback(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS !== 'web') Haptics.notificationAsync(type).catch(() => {});
}

export default function Game() {
  const params = useLocalSearchParams<{
    categories: string;
    difficulty: string;
    target: Target;
    answer: 'qcm' | 'texte' | 'soiree';
    rounds: string;
    players: string;
  }>();
  const store = useStore();
  const difficulty = getDifficulty(params.difficulty);
  const target: Target = params.target ?? 'titre';
  const answerMode = params.answer ?? difficulty.answerMode;
  const party = answerMode === 'soiree';
  const players = useMemo(() => (params.players ? params.players.split('|').filter(Boolean) : []), [params.players]);

  // Pool figé au lancement de la partie.
  const [pool] = useState<Track[]>(() => {
    const cats =
      params.categories === 'all'
        ? store.data.categories
        : store.data.categories.filter((c) => params.categories?.split(',').includes(c.id));
    const byId = new Map<string, Track>();
    for (const t of cats.flatMap(playableTracks)) if (!byId.has(t.id)) byId.set(t.id, t);
    return [...byId.values()];
  });
  const [queue] = useState(() => shuffle(pool));
  const totalRounds = Math.min(Number(params.rounds) || 10, queue.length);

  const player = useRef<PlayerHandle>(null);
  const [cursor, setCursor] = useState(0); // position dans la file (les morceaux illisibles sont sautés)
  const [phase, setPhase] = useState<Phase>('loading');
  const [results, setResults] = useState<RoundResult[]>([]);
  const [replaysUsed, setReplaysUsed] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(difficulty.answerTime);
  const [typed, setTyped] = useState('');
  const [wrongTry, setWrongTry] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [winners, setWinners] = useState<string[]>([]);
  const [start, setStart] = useState(0);
  const [streak, setStreak] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [saved, setSaved] = useState<boolean | null>(null);

  const track = queue[cursor] as Track | undefined;
  const round = results.length + 1;
  const choices = useMemo(
    () => (track && answerMode === 'qcm' ? buildChoices(track, pool, difficulty.choices, target) : []),
    [track, answerMode, pool, difficulty.choices, target],
  );
  const score = results.reduce((n, r) => n + r.points, 0);
  const correctCount = results.filter((r) => r.correct).length;

  // Prépare chaque nouveau morceau.
  useEffect(() => {
    if (phase !== 'loading' || !track) return;
    player.current?.prepare(track.id, track.start != null ? 'fixed' : difficulty.startMode, track.start);
  }, [track, phase, difficulty.startMode]);

  // Chronomètre de réponse (pas de chrono en mode soirée).
  useEffect(() => {
    if (deadline == null || party) return;
    const id = setInterval(() => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        finishRound(false, undefined);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, party]);

  useEffect(() => () => player.current?.stop(), []);

  function onPlayerEvent(e: PlayerEvent) {
    if (e.type === 'prepared' && phase === 'loading') {
      setStart(e.start);
      setPhase('ready');
    } else if (e.type === 'segmentStart' && phase === 'listening' && deadline == null) {
      setDeadline(Date.now() + difficulty.answerTime * 1000);
    } else if (e.type === 'segmentEnd' && phase === 'listening') {
      setPhase('answering');
    } else if (e.type === 'error' && (phase === 'loading' || phase === 'ready' || phase === 'listening')) {
      // Morceau illisible : on le saute sans compter la manche.
      if (track && typeof e.code === 'number' && BLOCKED_ERRORS.includes(e.code)) store.markBlocked(track.id);
      setSkipped((n) => n + 1);
      nextTrack();
    }
  }

  function listen() {
    if (phase === 'ready') {
      setPhase('listening');
      player.current?.segment(difficulty.snippet, start);
    } else if (phase === 'answering' && replaysUsed < difficulty.replays) {
      setReplaysUsed((n) => n + 1);
      setPhase('listening');
      player.current?.segment(difficulty.snippet, start);
    }
  }

  function finishRound(correct: boolean, answer: string | undefined, roundWinners?: string[]) {
    if (!track) return;
    const points = correct && !party ? computePoints(difficulty, timeLeft, replaysUsed, streak) : 0;
    setStreak(correct ? streak + 1 : 0);
    setResults((r) => [...r, { track, correct, points, answer, winners: roundWinners }]);
    setDeadline(null);
    setPhase('reveal');
    feedback(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    // On fait écouter un plus long passage du morceau en récompense.
    player.current?.segment(REVEAL_SECONDS, start);
  }

  function pick(choice: string) {
    if (phase !== 'listening' && phase !== 'answering') return;
    if (deadline == null && phase === 'listening') return;
    setPicked(choice);
    finishRound(choice === trackLabel(track!, target), choice);
  }

  function submitTyped() {
    if (!track || !typed.trim()) return;
    if (checkTextAnswer(typed, track, target)) {
      finishRound(true, typed);
    } else {
      setWrongTry(true);
      feedback(Haptics.NotificationFeedbackType.Warning);
    }
  }

  function nextTrack(done: RoundResult[] = results) {
    player.current?.stop();
    if (done.length >= totalRounds || cursor + 1 >= queue.length) {
      // Fin de partie : on enregistre le meilleur score en solo.
      const total = done.reduce((n, r) => n + r.points, 0);
      if (!party && done.length > 0) {
        setSaved(
          store.submitScore(scoreKey(params.categories, difficulty.id), {
            score: total,
            date: Date.now(),
          }),
        );
      }
      setPhase('finished');
      return;
    }
    setCursor((c) => c + 1);
    setPhase('loading');
    setReplaysUsed(0);
    setDeadline(null);
    setTimeLeft(difficulty.answerTime);
    setTyped('');
    setWrongTry(false);
    setPicked(null);
    setWinners([]);
  }

  function revealParty() {
    player.current?.stop();
    setDeadline(null);
    setPhase('reveal');
    player.current?.segment(REVEAL_SECONDS, start);
  }

  function confirmParty() {
    if (!track) return;
    const done = [...results, { track, correct: winners.length > 0, points: 0, winners }];
    setResults(done);
    nextTrack(done);
  }

  const header = (
    <Row style={styles.header}>
      <Text style={styles.roundText}>
        Manche {Math.min(round, totalRounds)}/{totalRounds}
      </Text>
      <Text style={[styles.badge, { color: difficulty.color }]}>
        {difficulty.emoji} {difficulty.label}
      </Text>
      {!party && <Text style={styles.scoreText}>{score} pts</Text>}
    </Row>
  );

  if (phase === 'finished') {
    return renderSummary();
  }

  const listening = phase === 'listening';
  const canReplay = phase === 'answering' && replaysUsed < difficulty.replays;
  const lastResult = results[results.length - 1];

  return (
    <Screen>
      <YouTubePlayer ref={player} onEvent={onPlayerEvent} />
      {header}

      {!party && deadline != null && phase !== 'reveal' && (
        <View style={styles.timerTrack}>
          <View
            style={[
              styles.timerBar,
              {
                width: `${(timeLeft / difficulty.answerTime) * 100}%`,
                backgroundColor: timeLeft < 5 ? colors.danger : difficulty.color,
              },
            ]}
          />
        </View>
      )}

      {phase !== 'reveal' ? (
        <Card style={styles.stage}>
          <Equalizer active={listening} color={difficulty.color} />
          {phase === 'loading' && <Muted>Chargement du morceau…</Muted>}
          {phase === 'ready' && (
            <Pressable onPress={listen} style={[styles.playButton, { backgroundColor: difficulty.color }]}>
              <Text style={styles.playIcon}>▶</Text>
            </Pressable>
          )}
          {phase === 'ready' && (
            <Muted>
              {difficulty.snippet === 1 ? 'Une seule seconde… concentre-toi !' : `Extrait de ${difficulty.snippet} s`}
            </Muted>
          )}
          {listening && <Text style={styles.listening}>🎶 Écoute…</Text>}
          {phase === 'answering' && (
            <Button
              label={canReplay ? `🔁 Réécouter (${difficulty.replays - replaysUsed})` : 'Plus de réécoute'}
              variant="secondary"
              small
              disabled={!canReplay}
              onPress={listen}
            />
          )}
        </Card>
      ) : (
        track && (
          <Card style={styles.stage}>
            <Image source={thumbnailUrl(track.id)} style={styles.cover} contentFit="cover" />
            <Text style={styles.revealTitle}>{track.title}</Text>
            <Text style={styles.revealArtist}>{track.artist}</Text>
            {!party && lastResult && (
              <Text
                style={[
                  styles.verdict,
                  {
                    color: lastResult.correct ? colors.success : colors.danger,
                  },
                ]}>
                {lastResult.correct
                  ? `✅ Bravo ! +${lastResult.points} pts${streak > 1 ? `  🔥 x${streak}` : ''}`
                  : lastResult.answer
                    ? '❌ Raté !'
                    : '⏱️ Temps écoulé'}
              </Text>
            )}
          </Card>
        )
      )}

      {/* Zone de réponse */}
      {!party && answerMode === 'qcm' && phase !== 'loading' && phase !== 'ready' && (
        <View style={styles.choices}>
          {choices.map((c) => {
            const isRight = track && c === trackLabel(track, target);
            const revealed = phase === 'reveal';
            return (
              <Pressable
                key={c}
                onPress={() => pick(c)}
                disabled={revealed}
                style={({ pressed }) => [
                  styles.choice,
                  pressed && styles.pressed,
                  revealed && isRight && styles.choiceRight,
                  revealed && picked === c && !isRight && styles.choiceWrong,
                ]}>
                <Text style={styles.choiceText}>{c}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {!party && answerMode === 'texte' && (phase === 'listening' || phase === 'answering') && (
        <Card>
          <Label>
            {target === 'artiste' ? 'Quel artiste ?' : target === 'titre' ? 'Quel titre ?' : 'Titre ou artiste ?'}
          </Label>
          <Input
            value={typed}
            onChangeText={(v) => {
              setTyped(v);
              setWrongTry(false);
            }}
            placeholder="Ta réponse…"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={submitTyped}
          />
          {wrongTry && <Text style={styles.wrong}>Non… essaie encore !</Text>}
          <Row>
            <Button label="Valider" small onPress={submitTyped} style={styles.flex} />
            <Button label="Je passe" small variant="ghost" onPress={() => finishRound(false, typed || '—')} />
          </Row>
        </Card>
      )}

      {party && (phase === 'listening' || phase === 'answering') && (
        <Button label="👀 Révéler la réponse" color={colors.secondary} onPress={revealParty} />
      )}
      {party && phase === 'reveal' && (
        <Card>
          <Label>Qui a trouvé ?</Label>
          <Row>
            {players.map((p) => (
              <Chip
                key={p}
                label={p}
                color={colors.success}
                selected={winners.includes(p)}
                onPress={() => setWinners((w) => (w.includes(p) ? w.filter((x) => x !== p) : [...w, p]))}
              />
            ))}
          </Row>
          <Button label="Manche suivante ➜" onPress={confirmParty} />
        </Card>
      )}
      {party && renderPartyScores()}

      {!party && phase === 'reveal' && (
        <Button
          label={results.length >= totalRounds ? '🏁 Voir les résultats' : 'Morceau suivant ➜'}
          onPress={() => nextTrack()}
        />
      )}

      <Button label="Quitter la partie" variant="ghost" small onPress={() => router.back()} />
    </Screen>
  );

  function renderPartyScores() {
    const ranking = partyRanking();
    return (
      <Card>
        <Label>📊 Scores</Label>
        {ranking.map(([name, n]) => (
          <Row key={name} style={styles.spread}>
            <Text style={styles.playerName}>{name}</Text>
            <Text style={styles.scoreText}>{n}</Text>
          </Row>
        ))}
      </Card>
    );
  }

  function partyRanking() {
    const counts = new Map(players.map((p) => [p, 0]));
    for (const r of results) for (const w of r.winners ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function renderSummary() {
    const ranking = partyRanking();
    return (
      <Screen>
        <View style={styles.summaryHero}>
          <Text style={styles.trophy}>🏆</Text>
          {party ? (
            <>
              <Text style={styles.bigScore}>{ranking[0]?.[0] ?? '—'}</Text>
              <Muted>
                gagne avec {ranking[0]?.[1] ?? 0} bonne
                {(ranking[0]?.[1] ?? 0) > 1 ? 's' : ''} réponse
                {(ranking[0]?.[1] ?? 0) > 1 ? 's' : ''} !
              </Muted>
            </>
          ) : (
            <>
              <Text style={styles.bigScore}>{score} pts</Text>
              <Muted>
                {correctCount}/{results.length} bonnes réponses · {difficulty.emoji} {difficulty.label}
              </Muted>
              {saved && <Text style={styles.record}>✨ Nouveau record !</Text>}
            </>
          )}
          {skipped > 0 && <Muted>{skipped} morceau(x) illisible(s) sauté(s)</Muted>}
        </View>

        {party && renderPartyScores()}

        <Card>
          <Label>Récapitulatif</Label>
          {results.map((r, i) => (
            <Row key={`${r.track.id}-${i}`} style={styles.recap}>
              <Image source={thumbnailUrl(r.track.id)} style={styles.recapThumb} contentFit="cover" />
              <View style={styles.flex}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {r.track.title}
                </Text>
                <Muted>
                  {r.track.artist}
                  {party && r.winners?.length ? ` · ${r.winners.join(', ')}` : ''}
                </Muted>
              </View>
              <Text>{r.correct ? '✅' : '❌'}</Text>
              {!party && <Text style={styles.recapPoints}>{r.points}</Text>}
            </Row>
          ))}
          {results.length === 0 && <Muted>Aucune manche jouée.</Muted>}
        </Card>

        <Button
          label="🔁 Rejouer"
          color={difficulty.color}
          onPress={() =>
            router.replace({
              pathname: '/setup',
              params: { mode: party ? 'soiree' : 'solo' },
            })
          }
        />
        <Button label="Accueil" variant="ghost" onPress={() => router.dismissTo('/')} />
      </Screen>
    );
  }
}

const styles = StyleSheet.create({
  header: { justifyContent: 'space-between' },
  roundText: { color: colors.text, fontWeight: '800', fontSize: 16 },
  badge: { fontWeight: '800' },
  scoreText: { color: colors.warning, fontWeight: '900', fontSize: 18 },
  timerTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  timerBar: { height: '100%', borderRadius: 4 },
  stage: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  playButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#0B0B1A', fontSize: 40, marginLeft: 6 },
  listening: { color: colors.text, fontSize: 18, fontWeight: '800' },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14 },
  revealTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  revealArtist: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  verdict: { fontSize: 18, fontWeight: '900' },
  choices: { gap: 10 },
  choice: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  pressed: { opacity: 0.7 },
  choiceRight: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}33`,
  },
  choiceWrong: {
    borderColor: colors.danger,
    backgroundColor: `${colors.danger}33`,
  },
  choiceText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  wrong: { color: colors.danger, fontWeight: '700' },
  flex: { flex: 1 },
  spread: { justifyContent: 'space-between' },
  playerName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  summaryHero: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  trophy: { fontSize: 64 },
  bigScore: { color: colors.text, fontSize: 40, fontWeight: '900' },
  record: { color: colors.warning, fontWeight: '900', fontSize: 18 },
  recap: { flexWrap: 'nowrap' },
  recapThumb: { width: 56, height: 32, borderRadius: 6 },
  recapPoints: {
    color: colors.warning,
    fontWeight: '800',
    width: 44,
    textAlign: 'right',
  },
});
