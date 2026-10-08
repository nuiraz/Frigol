import type { MediaType } from './types';

export const TYPES: {
  id: MediaType;
  label: string;
  plural: string;
  emoji: string;
  color: string;
  verb: string;
  /** « Déjà vu », « Déjà joué »… */
  done: string;
}[] = [
  { id: 'film', label: 'Film', plural: 'Films', emoji: '🎬', color: '#FF5C8A', verb: 'à regarder', done: 'Déjà vu' },
  { id: 'serie', label: 'Série', plural: 'Séries', emoji: '📺', color: '#A78BFA', verb: 'à binger', done: 'Déjà vue' },
  { id: 'jeu', label: 'Jeu vidéo', plural: 'Jeux', emoji: '🎮', color: '#34D399', verb: 'à jouer', done: 'Déjà joué' },
  { id: 'musique', label: 'Musique', plural: 'Musique', emoji: '🎧', color: '#FBBF24', verb: 'à écouter', done: 'Déjà écouté' },
];
export const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t])) as Record<MediaType, (typeof TYPES)[number]>;

export type Tag = { id: string; label: string; emoji: string; types: MediaType[] };

const SCREEN: MediaType[] = ['film', 'serie'];
const ALL_VIDEO: MediaType[] = ['film', 'serie', 'jeu'];

export const GENRES: Tag[] = [
  { id: 'action', label: 'Action', emoji: '💥', types: ALL_VIDEO },
  { id: 'aventure', label: 'Aventure', emoji: '🧭', types: ALL_VIDEO },
  { id: 'horreur', label: 'Horreur', emoji: '👻', types: ALL_VIDEO },
  { id: 'comedie', label: 'Comédie', emoji: '😂', types: SCREEN },
  { id: 'drame', label: 'Drame', emoji: '🎭', types: SCREEN },
  { id: 'thriller', label: 'Thriller', emoji: '🔪', types: SCREEN },
  { id: 'sf', label: 'Science-fiction', emoji: '🚀', types: ALL_VIDEO },
  { id: 'fantastique', label: 'Fantastique', emoji: '🐉', types: ALL_VIDEO },
  { id: 'policier', label: 'Policier', emoji: '🕵️', types: SCREEN },
  { id: 'romance', label: 'Romance', emoji: '💘', types: SCREEN },
  { id: 'animation', label: 'Animation', emoji: '🧸', types: SCREEN },
  { id: 'anime', label: 'Anime', emoji: '🍥', types: ['serie'] },
  { id: 'historique', label: 'Historique', emoji: '🏰', types: SCREEN },
  { id: 'rpg', label: 'RPG', emoji: '🗡️', types: ['jeu'] },
  { id: 'fps', label: 'FPS / Tir', emoji: '🔫', types: ['jeu'] },
  { id: 'plateforme', label: 'Plateforme', emoji: '🍄', types: ['jeu'] },
  { id: 'course', label: 'Course', emoji: '🏎️', types: ['jeu'] },
  { id: 'sport', label: 'Sport', emoji: '⚽', types: ['jeu'] },
  { id: 'combat', label: 'Combat', emoji: '🥊', types: ['jeu'] },
  { id: 'strategie', label: 'Stratégie', emoji: '♟️', types: ['jeu'] },
  { id: 'simulation', label: 'Gestion / Simu', emoji: '🏗️', types: ['jeu'] },
  { id: 'survie', label: 'Survie', emoji: '🪓', types: ['jeu'] },
  { id: 'reflexion', label: 'Réflexion', emoji: '🧩', types: ['jeu'] },
  { id: 'roguelike', label: 'Roguelike', emoji: '🎲', types: ['jeu'] },
  { id: 'monde-ouvert', label: 'Monde ouvert', emoji: '🗺️', types: ['jeu'] },
  { id: 'pop', label: 'Pop', emoji: '🎤', types: ['musique'] },
  { id: 'rock', label: 'Rock', emoji: '🎸', types: ['musique'] },
  { id: 'rap', label: 'Rap', emoji: '🎙️', types: ['musique'] },
  { id: 'electro', label: 'Électro', emoji: '🎛️', types: ['musique'] },
  { id: 'rnb', label: 'R&B / Soul', emoji: '💜', types: ['musique'] },
  { id: 'variete', label: 'Chanson FR', emoji: '🇫🇷', types: ['musique'] },
  { id: 'jazz', label: 'Jazz', emoji: '🎷', types: ['musique'] },
  { id: 'metal', label: 'Metal', emoji: '🤘', types: ['musique'] },
  { id: 'reggae', label: 'Reggae', emoji: '🌴', types: ['musique'] },
  { id: 'classique', label: 'Classique', emoji: '🎻', types: ['musique'] },
  { id: 'funk', label: 'Funk / Disco', emoji: '🪩', types: ['musique'] },
  { id: 'lofi', label: 'Lo-fi / Chill', emoji: '☕', types: ['musique'] },
];

export const MOODS: Tag[] = [
  { id: 'chill', label: 'Chill', emoji: '🛋️', types: ['film', 'serie', 'jeu', 'musique'] },
  { id: 'fun', label: 'Fun', emoji: '🤪', types: ['film', 'serie', 'jeu', 'musique'] },
  { id: 'intense', label: 'Intense', emoji: '🔥', types: ['film', 'serie', 'jeu', 'musique'] },
  { id: 'flippant', label: 'Flippant', emoji: '😱', types: ALL_VIDEO },
  { id: 'emouvant', label: 'Émouvant', emoji: '🥲', types: ['film', 'serie', 'jeu', 'musique'] },
  { id: 'potes', label: 'Entre potes', emoji: '👯', types: ['film', 'serie', 'jeu', 'musique'] },
  { id: 'court', label: 'Pas trop long', emoji: '⏱️', types: ALL_VIDEO },
  { id: 'culte', label: 'Culte', emoji: '🏆', types: ['film', 'serie', 'jeu', 'musique'] },
  { id: 'energie', label: 'Énergie', emoji: '⚡', types: ['musique'] },
  { id: 'cerveau', label: 'Qui fait réfléchir', emoji: '🧠', types: ['film', 'serie', 'jeu'] },
];

export const PLATFORMS: { id: string; label: string; emoji: string }[] = [
  { id: 'pc', label: 'PC', emoji: '🖥️' },
  { id: 'playstation', label: 'PlayStation', emoji: '🎮' },
  { id: 'xbox', label: 'Xbox', emoji: '🟢' },
  { id: 'switch', label: 'Switch', emoji: '🔴' },
  { id: 'mobile', label: 'Mobile', emoji: '📱' },
];

export const GENRE = Object.fromEntries(GENRES.map((g) => [g.id, g]));
export const MOOD = Object.fromEntries(MOODS.map((m) => [m.id, m]));
export const PLATFORM = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
