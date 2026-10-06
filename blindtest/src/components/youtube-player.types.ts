import type { StyleProp, ViewStyle } from 'react-native';

export type StartMode = 'random' | 'intro' | 'fixed';

export type PlayerEvent =
  | { type: 'ready' }
  | { type: 'prepared'; start: number; duration: number }
  | { type: 'segmentStart' }
  | { type: 'segmentEnd' }
  | { type: 'error'; code: number | 'timeout' }
  | { type: 'playlist'; ids: string[] };

export type PlayerHandle = {
  /** Charge la vidéo en silencieux et la met en pause au point de départ choisi. */
  prepare: (videoId: string, startMode: StartMode, start?: number) => void;
  /** Joue `duration` secondes depuis le point de départ préparé (ou `start`). */
  segment: (duration: number, start?: number) => void;
  stop: () => void;
  /** Charge une playlist pour en lire la liste des vidéos (événement `playlist`). */
  playlist: (listId: string) => void;
};

export type YouTubePlayerProps = {
  ref?: React.Ref<PlayerHandle>;
  onEvent?: (e: PlayerEvent) => void;
  /** Affiche la vidéo (sinon le lecteur reste caché : c'est un blind test !). */
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
};
