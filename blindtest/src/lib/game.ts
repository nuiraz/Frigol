import type { StartMode } from '@/components/youtube-player.types';

import type { Track } from './types';

export type AnswerMode = 'qcm' | 'texte';
export type Target = 'titre' | 'artiste' | 'les-deux';

export type Difficulty = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Durée de l'extrait en secondes. */
  snippet: number;
  /** Nombre de réécoutes autorisées. */
  replays: number;
  /** Temps pour répondre, en secondes (à partir de la première écoute). */
  answerTime: number;
  choices: number;
  answerMode: AnswerMode;
  startMode: StartMode;
  basePoints: number;
  color: string;
};

export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'facile',
    label: 'Facile',
    emoji: '🟢',
    description: 'Extrait de 15 s, 4 propositions, 2 réécoutes',
    snippet: 15,
    replays: 2,
    answerTime: 30,
    choices: 4,
    answerMode: 'qcm',
    startMode: 'random',
    basePoints: 100,
    color: '#2EE59D',
  },
  {
    id: 'moyen',
    label: 'Moyen',
    emoji: '🟠',
    description: 'Extrait de 7 s, 6 propositions, 1 réécoute',
    snippet: 7,
    replays: 1,
    answerTime: 20,
    choices: 6,
    answerMode: 'qcm',
    startMode: 'random',
    basePoints: 200,
    color: '#FFB020',
  },
  {
    id: 'dur',
    label: 'Difficile',
    emoji: '🔴',
    description: 'Extrait de 4 s, réponse à écrire, aucune réécoute',
    snippet: 4,
    replays: 0,
    answerTime: 25,
    choices: 4,
    answerMode: 'texte',
    startMode: 'random',
    basePoints: 400,
    color: '#FF5470',
  },
  {
    id: 'une-seconde',
    label: '1 seconde',
    emoji: '⚡',
    description: '1 seule seconde de musique ! 3 réécoutes, 4 propositions',
    snippet: 1,
    replays: 3,
    answerTime: 20,
    choices: 4,
    answerMode: 'qcm',
    startMode: 'random',
    basePoints: 500,
    color: '#B36BFF',
  },
  {
    id: 'intro',
    label: 'Intro',
    emoji: '🎬',
    description: 'Les 3 premières secondes du morceau, réponse à écrire',
    snippet: 3,
    replays: 1,
    answerTime: 25,
    choices: 4,
    answerMode: 'texte',
    startMode: 'intro',
    basePoints: 350,
    color: '#4FC3FF',
  },
];

export const TARGETS: { id: Target; label: string }[] = [
  { id: 'titre', label: 'Le titre' },
  { id: 'artiste', label: "L'artiste" },
  { id: 'les-deux', label: 'Titre ou artiste' },
];

export function getDifficulty(id: string) {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[0];
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function trackLabel(track: Track, target: Target) {
  if (target === 'artiste') return track.artist || track.title;
  if (target === 'titre') return track.title;
  return track.artist ? `${track.title} — ${track.artist}` : track.title;
}

/** Propositions pour le QCM : la bonne réponse + des leurres tirés du même ensemble. */
export function buildChoices(answer: Track, pool: Track[], count: number, target: Target): string[] {
  const right = trackLabel(answer, target);
  const seen = new Set([normalize(right)]);
  const wrong: string[] = [];
  for (const t of shuffle(pool)) {
    if (wrong.length >= count - 1) break;
    const label = trackLabel(t, target);
    const key = normalize(label);
    if (!label || seen.has(key)) continue;
    // Pour « l'artiste », évite un leurre du même artiste.
    if (target === 'artiste' && normalize(t.artist) === normalize(answer.artist)) continue;
    seen.add(key);
    wrong.push(label);
  }
  return shuffle([right, ...wrong]);
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\b(feat|ft|featuring)\b.*$/, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(the|le|la|les|l) /, '')
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Compare une saisie libre à la réponse en tolérant accents, fautes de frappe et mots parasites. */
export function isCloseEnough(input: string, expected: string) {
  const a = normalize(input);
  const b = normalize(expected);
  if (!a || !b) return false;
  if (a === b) return true;
  // « bohemian » pour « bohemian rhapsody » : accepté si la saisie couvre l'essentiel du titre.
  if (b.includes(a) && a.length >= Math.max(4, b.length * 0.6)) return true;
  if (a.includes(b) && b.length >= 3) return true;
  const tolerance = b.length <= 4 ? 0 : b.length <= 8 ? 1 : Math.floor(b.length * 0.2);
  return levenshtein(a, b) <= tolerance;
}

export function checkTextAnswer(input: string, track: Track, target: Target) {
  if (target === 'titre') return isCloseEnough(input, track.title);
  if (target === 'artiste') return isCloseEnough(input, track.artist);
  return isCloseEnough(input, track.title) || isCloseEnough(input, track.artist);
}

/** Points : base × bonus de rapidité, moins une pénalité par réécoute, plus le bonus de série. */
export function computePoints(d: Difficulty, timeLeft: number, replaysUsed: number, streak: number) {
  const speed = 0.5 + 0.5 * Math.max(0, Math.min(1, timeLeft / d.answerTime));
  const replayPenalty = Math.max(0.4, 1 - replaysUsed * 0.2);
  const streakBonus = 1 + Math.min(streak, 5) * 0.1;
  return Math.round(d.basePoints * speed * replayPenalty * streakBonus);
}

export function scoreKey(categoryKey: string, difficultyId: string) {
  return `${categoryKey}|${difficultyId}`;
}
