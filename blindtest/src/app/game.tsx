import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pop, RoundTrack, SoundBars, TimerRing } from '@/components/game-ui';
import { Button, Card, Chip, Icon, IconButton, Input, Label, Row, Txt } from '@/components/ui';
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
import { useAuth } from '@/lib/auth';
import { submitOnlineScore } from '@/lib/online';
import { playableTracks, useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';
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
    start?: string;
    auto?: string;
  }>();
  const store = useStore();
  const auth = useAuth();
  const [online, setOnline] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const difficulty = getDifficulty(params.difficulty);
  const target: Target = params.target ?? 'titre';
  const answerMode = params.answer ?? difficulty.answerMode;
  const party = answerMode === 'soiree';
  // Départ de l'extrait : début du morceau par défaut, ou moment aléatoire.
  const startMode = difficulty.startMode === 'intro' || params.start !== 'aleatoire' ? 'intro' : 'random';
  const autoStart = params.auto !== '0';
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
  // Propositions tirées de la même catégorie que le morceau (toutes les catégories ne sont utilisées
  // qu'en renfort s'il n'y a pas assez de morceaux).
  const [siblings] = useState(() => {
    const map = new Map<string, Track[]>();
    for (const c of store.data.categories) {
      const tracks = c.tracks.filter((t) => !t.disabled);
      for (const t of tracks) if (!map.has(t.id)) map.set(t.id, tracks);
    }
    return map;
  });
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
  const [stalled, setStalled] = useState(false);
  const [slow, setSlow] = useState(false);

  const track = queue[cursor] as Track | undefined;
  const round = results.length + 1;
  const choices = useMemo(
    () =>
      track && answerMode === 'qcm'
        ? buildChoices(track, siblings.get(track.id) ?? pool, difficulty.choices, target, pool)
        : [],
    [track, answerMode, pool, siblings, difficulty.choices, target],
  );
  const score = results.reduce((n, r) => n + r.points, 0);
  const correctCount = results.filter((r) => r.correct).length;

  // Prépare chaque nouveau morceau.
  useEffect(() => {
    if (phase !== 'loading' || !track) return;
    player.current?.prepare(track.id, track.start != null ? 'fixed' : startMode, track.start);
  }, [track, phase, startMode]);

  // Chargement anormalement long : on propose de passer au morceau suivant.
  useEffect(() => {
    if (phase !== 'loading') return;
    const id = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [phase, cursor]);

  // Si le son ne démarre pas (navigateur qui bloque la lecture auto), on propose un bouton.
  useEffect(() => {
    if (phase !== 'listening' || deadline != null) return;
    const id = setTimeout(() => setStalled(true), 3500);
    return () => clearTimeout(id);
  }, [phase, deadline]);

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
      if (autoStart) {
        // Lancement automatique : le son démarre dès que le morceau est prêt.
        setStalled(false);
        setPhase('listening');
        player.current?.segment(difficulty.snippet, e.start);
      } else {
        setPhase('ready');
      }
    } else if (e.type === 'segmentStart' && phase === 'listening' && deadline == null) {
      setStalled(false);
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

  function startListening() {
    setStalled(false);
    setPhase('listening');
    player.current?.segment(difficulty.snippet, start);
  }

  function listen() {
    if (phase === 'ready') {
      startListening();
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
        if (auth.session) {
          setOnline('sending');
          submitOnlineScore({
            score: total,
            difficulty: difficulty.id,
            category: categoryLabel(),
            correct: done.filter((r) => r.correct).length,
            rounds: done.length,
          })
            .then(() => setOnline('sent'))
            .catch(() => setOnline('error'));
        }
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
    setStalled(false);
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

  if (phase === 'finished') {
    return renderSummary();
  }

  const listening = phase === 'listening';
  const revealed = phase === 'reveal';
  const canReplay = phase === 'answering' && replaysUsed < difficulty.replays;
  const lastResult = results[results.length - 1];
  const timed = !party && deadline != null && !revealed;
  const ringColor = timed && timeLeft < 5 ? colors.danger : difficulty.color;
  const question = target === 'artiste' ? 'Quel artiste ?' : target === 'titre' ? 'Quel titre ?' : 'Titre ou artiste ?';
  const caption =
    phase === 'loading'
      ? 'Chargement du morceau'
      : phase === 'ready'
        ? difficulty.snippet === 1
          ? 'Une seule seconde. Concentre-toi.'
          : `Extrait de ${difficulty.snippet} secondes`
        : listening
          ? stalled
            ? 'Touche pour lancer le son'
            : 'Écoute…'
          : party
            ? 'Qui a trouvé ?'
            : question;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <YouTubePlayer ref={player} onEvent={onPlayerEvent} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <IconButton icon="x" label="Quitter la partie" onPress={() => router.back()} />
          <View style={styles.topCenter}>
            <Text style={styles.roundNum}>
              {pad(Math.min(round, totalRounds))}
              <Text style={styles.roundTotal}> / {pad(totalRounds)}</Text>
            </Text>
            <Text style={[styles.levelName, { color: difficulty.color }]}>{difficulty.label}</Text>
          </View>
          <View style={styles.scoreBox}>
            {!party && (
              <>
                <Text style={styles.scoreNum}>{score}</Text>
                <Text style={styles.scoreUnit}>pts</Text>
              </>
            )}
          </View>
        </View>
        <RoundTrack total={totalRounds} results={results.map((r) => r.correct)} current={results.length} />

        {!revealed ? (
          <View style={styles.stage}>
            <TimerRing
              progress={timed ? timeLeft / difficulty.answerTime : 1}
              color={timed ? ringColor : colors.border}>
              {phase === 'loading' && <ActivityIndicator color={colors.text} size="large" />}
              {(phase === 'ready' || (listening && stalled)) && (
                <Pressable
                  onPress={listening ? startListening : listen}
                  accessibilityLabel="Écouter"
                  style={({ pressed }) => [styles.play, pressed && styles.pressed]}>
                  <Icon name="play" size={40} color={colors.onAccent} />
                </Pressable>
              )}
              {listening && !stalled && <SoundBars active={deadline != null} color={difficulty.color} />}
              {phase === 'answering' &&
                (party ? (
                  <Text style={styles.bigQuestion}>?</Text>
                ) : (
                  <View style={styles.center}>
                    <Text style={[styles.seconds, { color: ringColor }]}>{Math.ceil(timeLeft)}</Text>
                    <Text style={styles.secondsUnit}>secondes</Text>
                  </View>
                ))}
            </TimerRing>
            <Text style={styles.caption}>{caption}</Text>
            {phase === 'answering' && difficulty.replays > 0 && (
              <Button
                label={canReplay ? `Réécouter · ${difficulty.replays - replaysUsed}` : 'Plus de réécoute'}
                icon="rotate-ccw"
                variant="secondary"
                small
                disabled={!canReplay}
                onPress={listen}
              />
            )}
            {phase === 'loading' && slow && (
              <Button
                label="Ce morceau ne charge pas, passer"
                icon="skip-forward"
                small
                variant="secondary"
                onPress={() => {
                  setSkipped((n) => n + 1);
                  nextTrack();
                }}
              />
            )}
          </View>
        ) : (
          track && (
            <Pop key={round} style={styles.reveal}>
              <Image source={thumbnailUrl(track.id)} style={styles.cover} contentFit="cover" />
              <View style={styles.revealBody}>
                {!party && lastResult && (
                  <View style={styles.verdictRow}>
                    <Text style={[styles.verdict, { color: lastResult.correct ? colors.success : colors.danger }]}>
                      {lastResult.correct ? `+${lastResult.points}` : lastResult.answer ? 'Raté' : 'Temps écoulé'}
                    </Text>
                    {lastResult.correct && streak > 1 && <Text style={styles.streak}>Série ×{streak}</Text>}
                  </View>
                )}
                <Text style={styles.revealTitle} numberOfLines={2}>
                  {track.title}
                </Text>
                <Text style={styles.revealArtist} numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
            </Pop>
          )
        )}

        {!party && answerMode === 'qcm' && (listening || phase === 'answering' || revealed) && (
          <View style={styles.choices}>
            {choices.map((c, i) => {
              const isRight = !!track && c === trackLabel(track, target);
              const isPicked = picked === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => pick(c)}
                  disabled={revealed}
                  style={({ pressed }) => [
                    styles.choice,
                    pressed && styles.choicePressed,
                    revealed && isRight && styles.choiceRight,
                    revealed && isPicked && !isRight && styles.choiceWrong,
                    revealed && !isRight && !isPicked && styles.choiceDim,
                  ]}>
                  <Text style={styles.choiceKey}>{i + 1}</Text>
                  <Text style={styles.choiceText} numberOfLines={2}>
                    {c}
                  </Text>
                  {revealed && isRight && <Icon name="check" color={colors.success} />}
                  {revealed && isPicked && !isRight && <Icon name="x" color={colors.danger} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {!party && answerMode === 'texte' && (listening || phase === 'answering') && (
          <View style={styles.answerBox}>
            <View style={styles.answerRow}>
              <Input
                value={typed}
                onChangeText={(v) => {
                  setTyped(v);
                  setWrongTry(false);
                }}
                placeholder="Ta réponse"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={submitTyped}
                style={[styles.answerInput, wrongTry && styles.answerWrong]}
              />
              <Pressable onPress={submitTyped} style={styles.send} accessibilityLabel="Valider">
                <Icon name="arrow-right" size={22} color={colors.onAccent} />
              </Pressable>
            </View>
            {wrongTry && <Text style={styles.wrong}>Pas ça. Essaie encore.</Text>}
            <Button label="Je passe" variant="ghost" small onPress={() => finishRound(false, typed || '—')} />
          </View>
        )}

        {party && (listening || phase === 'answering') && (
          <Button label="Révéler la réponse" icon="eye" onPress={revealParty} />
        )}
        {party && revealed && (
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
            <Button label="Manche suivante" icon="arrow-right" onPress={confirmParty} />
          </Card>
        )}
        {party && renderPartyScores()}

        {!party && revealed && (
          <Button
            label={results.length >= totalRounds ? 'Voir les résultats' : 'Morceau suivant'}
            icon="arrow-right"
            onPress={() => nextTrack()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );

  function renderPartyScores() {
    const ranking = partyRanking();
    return (
      <Card style={styles.listCard}>
        {ranking.map(([name, n], i) => (
          <View key={name} style={[styles.partyRow, i > 0 && styles.rowBorder]}>
            <Text style={styles.partyRank}>{i + 1}</Text>
            <Txt variant="strong" style={styles.flex}>
              {name}
            </Txt>
            <Text style={styles.partyScore}>{n}</Text>
          </View>
        ))}
      </Card>
    );
  }

  function partyRanking() {
    const counts = new Map(players.map((p) => [p, 0]));
    for (const r of results) for (const w of r.winners ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function categoryLabel() {
    if (params.categories === 'all') return 'Toutes catégories';
    return store.data.categories
      .filter((c) => params.categories?.split(',').includes(c.id))
      .map((c) => c.name)
      .join(', ')
      .slice(0, 80);
  }

  function renderSummary() {
    const ranking = partyRanking();
    let bestStreak = 0;
    let run = 0;
    for (const r of results) {
      run = r.correct ? run + 1 : 0;
      bestStreak = Math.max(bestStreak, run);
    }
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <IconButton icon="x" label="Accueil" onPress={() => router.dismissTo('/')} />
          </View>

          <View style={styles.summaryHero}>
            <Label>Partie terminée</Label>
            {party ? (
              <>
                <Text style={styles.winner} numberOfLines={1}>
                  {ranking[0]?.[0] ?? '—'}
                </Text>
                <Txt variant="muted">
                  gagne avec {ranking[0]?.[1] ?? 0} bonne{(ranking[0]?.[1] ?? 0) > 1 ? 's' : ''} réponse
                  {(ranking[0]?.[1] ?? 0) > 1 ? 's' : ''}
                </Txt>
              </>
            ) : (
              <>
                <Text style={styles.finalScore}>{score}</Text>
                <Text style={styles.finalUnit}>points</Text>
                {saved && <Text style={styles.record}>Nouveau record</Text>}
              </>
            )}
          </View>

          {!party && (
            <View style={styles.stats}>
              <Stat value={`${correctCount}/${results.length}`} label="trouvés" />
              <Stat value={String(bestStreak)} label="meilleure série" />
              <Stat value={difficulty.badge} label={difficulty.label} color={difficulty.color} />
            </View>
          )}

          {!party && auth.enabled && (
            <Card style={styles.onlineCard}>
              <Icon name="globe" color={colors.muted} />
              <Txt variant="small" style={styles.flex}>
                {!auth.session
                  ? 'Connecte-toi pour entrer dans le classement mondial.'
                  : online === 'sending'
                    ? 'Envoi au classement mondial…'
                    : online === 'sent'
                      ? 'Score enregistré au classement mondial.'
                      : online === 'error'
                        ? 'Impossible d’envoyer le score.'
                        : ''}
              </Txt>
              <Button
                label={auth.session ? 'Classement' : 'Connexion'}
                small
                variant="secondary"
                onPress={() => router.push(auth.session ? '/leaderboard' : '/account')}
              />
            </Card>
          )}

          {party && renderPartyScores()}

          <Label>Récapitulatif</Label>
          <Card style={styles.listCard}>
            {results.map((r, i) => (
              <View key={`${r.track.id}-${i}`} style={[styles.recap, i > 0 && styles.rowBorder]}>
                <Image source={thumbnailUrl(r.track.id)} style={styles.recapThumb} contentFit="cover" />
                <View style={styles.flex}>
                  <Txt variant="strong" numberOfLines={1}>
                    {r.track.title}
                  </Txt>
                  <Txt variant="small" numberOfLines={1}>
                    {r.track.artist}
                    {party && r.winners?.length ? ` · ${r.winners.join(', ')}` : ''}
                  </Txt>
                </View>
                {!party && r.correct ? (
                  <Text style={styles.recapPoints}>+{r.points}</Text>
                ) : (
                  <Icon name={r.correct ? 'check' : 'x'} color={r.correct ? colors.success : colors.faint} />
                )}
              </View>
            ))}
            {results.length === 0 && <Txt variant="muted">Aucune manche jouée.</Txt>}
          </Card>
          {skipped > 0 && <Txt variant="small">{skipped} morceau(x) illisible(s) sauté(s).</Txt>}

          <Button
            label="Rejouer"
            icon="rotate-ccw"
            onPress={() => router.replace({ pathname: '/setup', params: { mode: party ? 'soiree' : 'solo' } })}
          />
          <Button label="Accueil" variant="secondary" onPress={() => router.dismissTo('/')} />
        </ScrollView>
      </SafeAreaView>
    );
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function Stat({ value, label, color = colors.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Txt variant="small" numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  flex: { flex: 1, gap: 2 },
  center: { alignItems: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topCenter: { alignItems: 'center' },
  roundNum: { fontFamily: fonts.display, color: colors.text, fontSize: 24 },
  roundTotal: { color: colors.faint },
  levelName: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' },
  scoreBox: { width: 72, alignItems: 'flex-end' },
  scoreNum: { fontFamily: fonts.display, color: colors.accent, fontSize: 24 },
  scoreUnit: {
    fontFamily: fonts.bold,
    color: colors.faint,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stage: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  play: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 6,
  },
  seconds: { fontFamily: fonts.display, fontSize: 88, lineHeight: 96 },
  secondsUnit: {
    fontFamily: fonts.bold,
    color: colors.faint,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  bigQuestion: { fontFamily: fonts.display, color: colors.text, fontSize: 110 },
  caption: { fontFamily: fonts.medium, color: colors.muted, fontSize: 16, textAlign: 'center' },
  reveal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceAlt },
  revealBody: { padding: 18, gap: 4 },
  verdictRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 4 },
  verdict: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, textTransform: 'uppercase' },
  streak: { fontFamily: fonts.bold, color: colors.accent, fontSize: 14 },
  revealTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 24, letterSpacing: -0.4 },
  revealArtist: { fontFamily: fonts.medium, color: colors.muted, fontSize: 16 },
  choices: { gap: 10 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choicePressed: { backgroundColor: colors.surfaceAlt },
  choiceRight: { borderColor: colors.success, backgroundColor: `${colors.success}1F` },
  choiceWrong: { borderColor: colors.danger, backgroundColor: `${colors.danger}1F` },
  choiceDim: { opacity: 0.4 },
  choiceKey: { fontFamily: fonts.display, color: colors.faint, fontSize: 18, width: 16 },
  choiceText: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  answerBox: { gap: 8 },
  answerRow: { flexDirection: 'row', gap: 10 },
  answerInput: { flex: 1, fontSize: 18, paddingVertical: 15 },
  answerWrong: { borderColor: colors.danger },
  send: {
    width: 56,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrong: { fontFamily: fonts.medium, color: colors.danger, fontSize: 14 },
  listCard: { padding: 0, gap: 0, overflow: 'hidden' },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  partyRank: { fontFamily: fonts.display, color: colors.faint, fontSize: 18, width: 16 },
  partyScore: { fontFamily: fonts.display, color: colors.accent, fontSize: 22 },
  summaryHero: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  finalScore: { fontFamily: fonts.display, color: colors.text, fontSize: 104, lineHeight: 112 },
  finalUnit: {
    fontFamily: fonts.bold,
    color: colors.faint,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  winner: { fontFamily: fonts.display, color: colors.text, fontSize: 64, lineHeight: 72, textTransform: 'uppercase' },
  record: {
    marginTop: 10,
    fontFamily: fonts.bold,
    color: colors.onAccent,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 13,
  },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontFamily: fonts.display, fontSize: 28 },
  onlineCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  recapThumb: { width: 56, height: 40, borderRadius: 8, backgroundColor: colors.surfaceAlt },
  recapPoints: { fontFamily: fonts.display, color: colors.accent, fontSize: 18 },
});
