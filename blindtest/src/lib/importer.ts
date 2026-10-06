import type { Track } from './types';
import {
  fetchPlaylistTitle,
  fetchPlaylistWithApi,
  parsePlaylistId,
  parseVideoId,
  trackFromVideoId,
  tracksFromVideoIds,
} from './youtube';

export type ImportResult =
  | { kind: 'playlist'; listId: string; url: string; title: string; tracks: Track[] }
  | { kind: 'video'; url: string; title: string; tracks: Track[] };

type Options = {
  apiKey: string;
  /** Liste des vidéos d'une playlist via le lecteur YouTube caché (sans clé d'API). */
  idsFromPlayer: (listId: string) => Promise<string[]>;
  onProgress: (message: string) => void;
};

/** Lit un lien YouTube / YouTube Music (playlist ou morceau) et renvoie les pistes trouvées. */
export async function readYouTubeLink(input: string, { apiKey, idsFromPlayer, onProgress }: Options) {
  const url = input.trim();
  const listId = parsePlaylistId(url);
  const videoId = parseVideoId(url);

  if (listId) {
    if (apiKey.trim()) {
      onProgress('Lecture de la playlist via l’API YouTube…');
      const { title, tracks } = await fetchPlaylistWithApi(listId, apiKey.trim());
      return { kind: 'playlist', listId, url, title, tracks } satisfies ImportResult;
    }
    onProgress('Lecture de la playlist…');
    const [ids, title] = await Promise.all([idsFromPlayer(listId), fetchPlaylistTitle(listId)]);
    const unique = [...new Set(ids)];
    if (!unique.length)
      throw new Error('Playlist vide, privée ou introuvable. Vérifie qu’elle est publique ou « non répertoriée ».');
    const tracks = await tracksFromVideoIds(unique, (done) =>
      onProgress(`Récupération des titres : ${done}/${unique.length}`),
    );
    return {
      kind: 'playlist',
      listId,
      url,
      title: title ?? `Playlist (${unique.length} titres)`,
      tracks: tracks.filter((t) => t.title || t.artist),
    } satisfies ImportResult;
  }

  if (videoId) {
    onProgress('Récupération du titre…');
    const track = await trackFromVideoId(videoId);
    return { kind: 'video', url, title: track.title || 'Morceau', tracks: [track] } satisfies ImportResult;
  }

  throw new Error('Lien non reconnu. Colle un lien de playlist ou de morceau YouTube Music / YouTube.');
}
