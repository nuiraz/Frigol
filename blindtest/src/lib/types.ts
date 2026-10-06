export type Track = {
  /** Identifiant de la vidéo YouTube (sert aussi d'identifiant unique). */
  id: string;
  title: string;
  artist: string;
  /** Seconde de départ imposée pour l'extrait (sinon choisie selon le niveau). */
  start?: number;
  disabled?: boolean;
  /** La vidéo refuse la lecture intégrée (marquée automatiquement en jeu). */
  blocked?: boolean;
};

export type PlaylistSource = {
  listId: string;
  url: string;
  title: string;
  count: number;
  importedAt: number;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sources: PlaylistSource[];
  tracks: Track[];
};

export type Settings = {
  adminPin: string;
  youtubeApiKey: string;
};

export type BestScore = { score: number; date: number; player?: string };

export type AppData = {
  version: 1;
  categories: Category[];
  settings: Settings;
  /** Clé : `${categorie}|${niveau}` */
  bestScores: Record<string, BestScore>;
};
