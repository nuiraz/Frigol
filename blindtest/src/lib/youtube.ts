import { Platform } from 'react-native';

import type { Track } from './types';

const VIDEO_ID = /^[\w-]{11}$/;

/** Extrait l'identifiant vidéo d'une URL YouTube / YouTube Music (ou d'un identifiant brut). */
export function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (VIDEO_ID.test(s)) return s;
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return url.pathname.slice(1, 12) || null;
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = url.searchParams.get('v');
      if (v && VIDEO_ID.test(v)) return v;
      const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

/** Extrait l'identifiant de playlist (PL…, OLAK5uy_…, RDCLAK…) d'une URL YouTube / YouTube Music. */
export function parsePlaylistId(input: string): string | null {
  const s = input.trim();
  if (/^(PL|OLAK5uy_|RD|UU|FL|LL|OL)[\w-]{10,}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    const list = url.searchParams.get('list');
    if (list) return list;
    // music.youtube.com/browse/VLPLxxxx
    const m = url.pathname.match(/\/browse\/VL([\w-]+)/);
    if (m) return m[1];
  } catch {}
  return null;
}

const NOISE = [
  /\((?:official|officiel|clip|lyrics?|paroles|audio|video|vidéo|hd|hq|4k|remaster(?:ed)?|visuali[sz]er|music video|full|explicit)[^)]*\)/gi,
  /\[(?:official|officiel|clip|lyrics?|paroles|audio|video|vidéo|hd|hq|4k|remaster(?:ed)?|visuali[sz]er|music video|full|explicit)[^\]]*\]/gi,
  /\b(?:official (?:music )?video|clip officiel|official audio|lyric video|video officielle|audio officiel)\b/gi,
  /\s*[|｜].*$/,
];

function cleanChannel(channel: string) {
  return channel
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*Official$/i, '')
    .trim();
}

/** Devine artiste et titre à partir du titre d'une vidéo et du nom de la chaîne. */
export function guessArtistTitle(rawTitle: string, channel = ''): { artist: string; title: string } {
  let title = rawTitle;
  for (const re of NOISE) title = title.replace(re, '');
  title = title.replace(/\s{2,}/g, ' ').trim();
  const parts = title.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts
        .slice(1)
        .join(' - ')
        .replace(/^["“]|["”]$/g, '')
        .trim(),
    };
  }
  return {
    artist: cleanChannel(channel),
    title: title.replace(/^["“]|["”]$/g, ''),
  };
}

export function thumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

type OEmbed = { title?: string; author_name?: string };

/** Titre + chaîne d'une vidéo sans clé d'API (oEmbed). */
export async function fetchVideoInfo(videoId: string): Promise<OEmbed | null> {
  const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);
  const endpoints = [`https://www.youtube.com/oembed?format=json&url=${watch}`];
  // Dans le navigateur, l'oEmbed YouTube n'autorise pas toujours le CORS : noembed sert de relais.
  if (Platform.OS === 'web') endpoints.push(`https://noembed.com/embed?url=${watch}`);
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as OEmbed & { error?: string };
      if (json.title && !json.error) return json;
    } catch {}
  }
  return null;
}

export async function trackFromVideoId(videoId: string): Promise<Track> {
  const info = await fetchVideoInfo(videoId);
  if (!info?.title) return { id: videoId, artist: '', title: '' };
  return { id: videoId, ...guessArtistTitle(info.title, info.author_name) };
}

/** Récupère les infos de plusieurs vidéos avec une concurrence limitée. */
export async function tracksFromVideoIds(ids: string[], onProgress?: (done: number) => void) {
  const out: Track[] = new Array(ids.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < ids.length) {
      const i = next++;
      out[i] = await trackFromVideoId(ids[i]);
      onProgress?.(++done);
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, ids.length) }, worker));
  return out;
}

type ApiPlaylistItem = {
  snippet: {
    title: string;
    videoOwnerChannelTitle?: string;
    resourceId: { videoId: string };
  };
};

/** Import complet via l'API YouTube Data v3 (clé fournie dans les réglages admin). */
export async function fetchPlaylistWithApi(listId: string, apiKey: string) {
  const base = 'https://www.googleapis.com/youtube/v3';
  const meta = await fetch(`${base}/playlists?part=snippet&id=${listId}&key=${apiKey}`).then((r) => r.json());
  if (meta.error) throw new Error(meta.error.message ?? 'Erreur API YouTube');
  const playlistTitle: string = meta.items?.[0]?.snippet?.title ?? 'Playlist';
  const tracks: Track[] = [];
  let pageToken = '';
  do {
    const res = await fetch(
      `${base}/playlistItems?part=snippet&maxResults=50&playlistId=${listId}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`,
    ).then((r) => r.json());
    if (res.error) throw new Error(res.error.message ?? 'Erreur API YouTube');
    for (const item of (res.items ?? []) as ApiPlaylistItem[]) {
      const { title, videoOwnerChannelTitle, resourceId } = item.snippet;
      if (!videoOwnerChannelTitle) continue; // vidéo supprimée ou privée
      tracks.push({
        id: resourceId.videoId,
        ...guessArtistTitle(title, videoOwnerChannelTitle),
      });
    }
    pageToken = res.nextPageToken ?? '';
  } while (pageToken && tracks.length < 1000);
  return { title: playlistTitle, tracks };
}

/** Codes d'erreur signifiant que la vidéo elle-même est introuvable ou interdite d'intégration. */
export const BLOCKED_ERRORS = [100, 101, 150];
