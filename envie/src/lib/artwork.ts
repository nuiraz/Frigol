import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';
import type { Artwork, Item } from './types';

const KEY = (id: string) => `art1:${id}`;
const memory = new Map<string, Artwork>();

/** Jaquette Steam au format affiche (avec repli sur la bannière si elle n'existe pas). */
export const steamCover = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
export const steamHeader = (appid: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

/** Image immédiatement connue, sans appel réseau. */
export function staticArtwork(item: Item): Artwork | undefined {
  if (item.image) return { image: item.image };
  if (item.steam) return { image: steamCover(item.steam) };
  if (item.type === 'jeu') return {};
  return memory.get(item.id);
}

// Les API iTunes et TVmaze limitent le nombre d'appels : on les fait un par un.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, 250)),
    () => new Promise((r) => setTimeout(r, 250)),
  );
  return run;
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const resize = (url: string | undefined, size: string) => url?.replace(/\/\d+x\d+bb\./, `/${size}bb.`);

async function lookup(item: Item): Promise<Artwork> {
  const term = encodeURIComponent(item.search ?? item.title);
  if (item.type === 'serie') {
    const show = await getJson(`https://api.tvmaze.com/singlesearch/shows?q=${term}`);
    return { image: show?.image?.original ?? show?.image?.medium };
  }
  if (item.type === 'film') {
    const data = await getJson(`https://itunes.apple.com/search?term=${term}&media=movie&entity=movie&country=fr&limit=1`);
    return { image: resize(data?.results?.[0]?.artworkUrl100, '600x900') };
  }
  const data = await getJson(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&country=fr&limit=1`);
  const song = data?.results?.[0];
  return { image: resize(song?.artworkUrl100, '600x600'), preview: song?.previewUrl };
}

/** Partage le résultat avec les autres membres (table publique « artwork »). */
async function share(id: string, art: Artwork) {
  if (!art.image && !art.preview) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase.from('artwork').upsert({ item_id: id, image: art.image ?? null, preview: art.preview ?? null }, { ignoreDuplicates: true });
}

const pending = new Map<string, Promise<Artwork>>();

export function resolveArtwork(item: Item): Promise<Artwork> {
  const known = staticArtwork(item);
  if (known) return Promise.resolve(known);
  const running = pending.get(item.id);
  if (running) return running;
  const task = (async () => {
    const saved = await AsyncStorage.getItem(KEY(item.id)).catch(() => null);
    if (saved) return JSON.parse(saved) as Artwork;
    const { data: row } = await supabase.from('artwork').select('image,preview').eq('item_id', item.id).maybeSingle();
    let art: Artwork;
    if (row && (row.image || row.preview)) art = { image: row.image ?? undefined, preview: row.preview ?? undefined };
    else {
      art = await enqueue(() => lookup(item));
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

export function useArtwork(item: Item | null | undefined): Artwork {
  const [art, setArt] = useState<{ id?: string; art: Artwork }>({ art: {} });
  const id = item?.id;
  useEffect(() => {
    if (!item) return;
    let alive = true;
    resolveArtwork(item).then((a) => alive && setArt({ id: item.id, art: a }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!item) return {};
  return staticArtwork(item) ?? (art.id === item.id ? art.art : {});
}
