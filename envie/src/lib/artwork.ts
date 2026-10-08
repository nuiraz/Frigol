import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from './supabase';
import type { Artwork, Item } from './types';

// « art2 » : nouvelle version du cache (les anciennes recherches sans résultat sont refaites).
const KEY = (id: string) => `art2:${id}`;
const memory = new Map<string, Artwork>();

/** Jaquette Steam au format affiche (avec repli sur la bannière si elle n'existe pas). */
export const steamCover = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
export const steamHeader = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

/** Image immédiatement connue, sans appel réseau. */
export function staticArtwork(item: Item): Artwork | undefined {
  if (item.image) return { image: item.image };
  if (item.steam) return { image: steamCover(item.steam) };
  return memory.get(item.id);
}

/**
 * File d'attente avec plusieurs recherches en parallèle (chaque API a sa propre limite).
 * Les affiches « prioritaires » (grand format à l'écran) passent devant.
 */
function makePool(limit: number) {
  const waiting: (() => void)[] = [];
  let running = 0;
  const next = () => {
    if (running >= limit) return;
    const start = waiting.shift();
    if (!start) return;
    running++;
    start();
  };
  return function run<T>(task: () => Promise<T>, priority = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () =>
        task()
          .then(resolve, reject)
          .finally(() => {
            running--;
            next();
          });
      if (priority) waiting.unshift(start);
      else waiting.push(start);
      next();
    });
  };
}

const pools = { wiki: makePool(4), tvmaze: makePool(2), itunes: makePool(2) };

// Jaquettes déjà trouvées par la communauté : chargées en une seule requête au démarrage.
let shared: Promise<Map<string, Artwork>> | null = null;
function sharedArtwork() {
  shared ??= (async () => {
    const map = new Map<string, Artwork>();
    const { data } = await supabase.from('artwork').select('item_id,image,preview').limit(5000);
    for (const row of (data ?? []) as { item_id: string; image: string | null; preview: string | null }[]) {
      map.set(row.item_id, { image: row.image ?? undefined, preview: row.preview ?? undefined });
    }
    return map;
  })().catch(() => new Map<string, Artwork>());
  return shared;
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** iTunes n'autorise pas les appels directs depuis un navigateur : on passe par JSONP sur le web. */
function itunes(url: string, urgent: boolean): Promise<{ results?: Record<string, string>[] }> {
  return pools.itunes(() => itunesRaw(url), urgent);
}

function itunesRaw(url: string): Promise<{ results?: Record<string, string>[] }> {
  if (Platform.OS !== 'web') return getJson(url);
  return new Promise((resolve, reject) => {
    const name = `__itunes${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    const timer = setTimeout(() => done(new Error('délai dépassé')), 8000);
    function done(err?: Error, data?: unknown) {
      clearTimeout(timer);
      delete w[name];
      script.remove();
      if (err) reject(err);
      else resolve(data as { results?: Record<string, string>[] });
    }
    w[name] = (data: unknown) => done(undefined, data);
    script.onerror = () => done(new Error('iTunes indisponible'));
    script.src = `${url}&callback=${name}`;
    document.head.appendChild(script);
  });
}

const WIKI_HINT: Record<Item['type'], string> = { film: 'film', serie: 'TV series', jeu: 'video game', musique: 'song' };

/** Affiche ou jaquette de l'article Wikipédia (anglais) du titre. */
async function wikipedia(item: Item, urgent: boolean): Promise<string | undefined> {
  const q = encodeURIComponent(`${item.search ?? item.title} ${item.year || ''} ${WIKI_HINT[item.type]}`);
  const data = await pools.wiki(
    () =>
      getJson(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${q}&gsrlimit=1&prop=pageimages&piprop=original|thumbnail&pithumbsize=600&pilicense=any`,
      ),
    urgent,
  );
  const page = Object.values(data?.query?.pages ?? {})[0] as { original?: { source: string }; thumbnail?: { source: string } } | undefined;
  return page?.thumbnail?.source ?? page?.original?.source;
}

const resize = (url: string | undefined, size: string) => url?.replace(/\/\d+x\d+bb\./, `/${size}bb.`);

/** Essaie plusieurs sources dans l'ordre et garde la première image trouvée. */
async function firstImage(sources: (() => Promise<string | undefined>)[]) {
  for (const source of sources) {
    const url = await source().catch(() => undefined);
    if (url) return url;
  }
  return undefined;
}

async function lookup(item: Item, urgent: boolean): Promise<Artwork> {
  const term = encodeURIComponent(item.search ?? item.title);
  if (item.type === 'serie') {
    return {
      image: await firstImage([
        async () => {
          const show = await pools.tvmaze(() => getJson(`https://api.tvmaze.com/singlesearch/shows?q=${term}`), urgent);
          return show?.image?.original ?? show?.image?.medium;
        },
        () => wikipedia(item, urgent),
      ]),
    };
  }
  if (item.type === 'film') {
    return {
      image: await firstImage([
        () => wikipedia(item, urgent),
        async () => {
          const data = await itunes(`https://itunes.apple.com/search?term=${term}&media=movie&entity=movie&country=fr&limit=1`, urgent);
          return resize(data?.results?.[0]?.artworkUrl100, '600x900');
        },
      ]),
    };
  }
  if (item.type === 'jeu') return { image: await wikipedia(item, urgent) };
  const data = await itunes(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&country=fr&limit=1`, urgent);
  const song = data?.results?.[0];
  return { image: resize(song?.artworkUrl100, '600x600'), preview: song?.previewUrl };
}

/** Partage le résultat avec les autres membres (table publique « artwork »). */
async function share(id: string, art: Artwork) {
  if (!art.image && !art.preview) return;
  await supabase.from('artwork').upsert({ item_id: id, image: art.image ?? null, preview: art.preview ?? null }, { ignoreDuplicates: true });
}

const pending = new Map<string, Promise<Artwork>>();

/**
 * `deep` : ignore la jaquette Steam (quand elle ne se charge pas) et cherche ailleurs.
 * `priority` : affiche en grand à l'écran, cherchée avant les autres.
 */
export function resolveArtwork(item: Item, deep = false, priority = false): Promise<Artwork> {
  const known = deep ? memory.get(item.id) : staticArtwork(item);
  if (known) return Promise.resolve(known);
  const running = pending.get(item.id);
  if (running) return running;
  const task = (async () => {
    const saved = await AsyncStorage.getItem(KEY(item.id)).catch(() => null);
    if (saved) return JSON.parse(saved) as Artwork;
    const known = (await sharedArtwork()).get(item.id);
    let art: Artwork;
    if (known && (known.image || known.preview)) art = known;
    else {
      art = await lookup(item, priority);
      share(item.id, art).catch(() => {});
    }
    AsyncStorage.setItem(KEY(item.id), JSON.stringify(art)).catch(() => {});
    memory.set(item.id, art);
    return art;
  })()
    // Hors ligne ou API indisponible : pas de mise en cache, on réessaiera plus tard.
    .catch((): Artwork => ({}))
    .finally(() => pending.delete(item.id));
  pending.set(item.id, task);
  return task;
}

export function useArtwork(item: Item | null | undefined, deep = false, priority = false): Artwork {
  const [art, setArt] = useState<{ id?: string; art: Artwork }>({ art: {} });
  const id = item?.id;
  useEffect(() => {
    if (!item) return;
    let alive = true;
    resolveArtwork(item, deep, priority).then((a) => alive && setArt({ id: item.id, art: a }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, deep]);
  if (!item) return {};
  return (deep ? undefined : staticArtwork(item)) ?? (art.id === item.id ? art.art : {});
}
