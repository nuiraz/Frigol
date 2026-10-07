// Fonction serveur « api » de Ludothèque (Supabase Edge Function, Deno).
// Déploiement : supabase functions deploy api --no-verify-jwt
// Secret      : supabase secrets set STEAM_API_KEY=xxxxxxxx   (https://steamcommunity.com/dev/apikey)
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  exchangeRefreshTokenForAuthTokens,
  getTitleTrophies,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
} from 'npm:psn-api@2';

const STEAM_KEY = Deno.env.get('STEAM_API_KEY') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Achievement = { id: string; name: string; description: string; icon?: string; unlocked: boolean; unlocked_at?: string | null };
type GameRow = {
  id: string;
  platform: 'steam' | 'psn' | 'xbox';
  name: string;
  cover_url?: string | null;
  header_url?: string | null;
  description?: string | null;
  genres?: string[];
  release_date?: string | null;
  developer?: string | null;
};
type LibraryRow = {
  user_id: string;
  game_id: string;
  playtime_minutes?: number;
  last_played?: string | null;
  achievements_unlocked: number;
  achievements_total: number;
  platinum?: boolean;
  achievements: Achievement[];
};

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new HttpError(502, `Service distant indisponible (${res.status})`);
  return res.json();
}

/** Exécute des tâches avec une concurrence limitée. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

async function saveLibrary(db: SupabaseClient, userId: string, platform: string, games: GameRow[], library: LibraryRow[]) {
  for (let k = 0; k < games.length; k += 200) {
    const { error } = await db.from('games').upsert(games.slice(k, k + 200), { onConflict: 'id', ignoreDuplicates: false });
    if (error) throw new HttpError(500, error.message);
  }
  for (let k = 0; k < library.length; k += 200) {
    const { error } = await db.from('user_games').upsert(library.slice(k, k + 200));
    if (error) throw new HttpError(500, error.message);
  }
  await db.from('linked_accounts').update({ last_sync: new Date().toISOString(), sync_error: null }).eq('user_id', userId).eq('platform', platform);
}

// ---------------------------------------------------------------- Steam
const steamCover = (appid: number | string) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
const steamHeader = (appid: number | string) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;

async function steamSearch(term: string) {
  const data = await getJson(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=french&cc=FR`,
  );
  const games: GameRow[] = (data.items ?? [])
    .filter((it: { type: string }) => it.type === 'app')
    .map((it: { id: number; name: string }) => ({
      id: `steam:${it.id}`,
      platform: 'steam',
      name: it.name,
      cover_url: steamCover(it.id),
      header_url: steamHeader(it.id),
    }));
  // On garde les jeux en base pour pouvoir les noter ensuite (sans écraser les fiches complètes).
  if (games.length) await admin.from('games').upsert(games, { onConflict: 'id', ignoreDuplicates: true });
  return games;
}

async function steamGame(appid: string) {
  const data = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=french&cc=FR`);
  const d = data?.[appid]?.data;
  if (!d) throw new HttpError(404, 'Jeu introuvable sur Steam');
  const game: GameRow = {
    id: `steam:${appid}`,
    platform: 'steam',
    name: d.name,
    cover_url: steamCover(appid),
    header_url: d.header_image ?? steamHeader(appid),
    description: d.short_description ?? null,
    genres: (d.genres ?? []).map((g: { description: string }) => g.description),
    release_date: d.release_date?.date ?? null,
    developer: d.developers?.[0] ?? null,
  };
  await admin.from('games').upsert({ ...game, updated_at: new Date().toISOString() });
  return game;
}

/** Vérifie la réponse « Se connecter avec Steam » (OpenID 2.0) auprès de Steam. */
async function steamVerify(params: Record<string, string>) {
  const body = new URLSearchParams({ ...params, 'openid.mode': 'check_authentication' });
  const res = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  const id = params['openid.claimed_id']?.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/)?.[1];
  if (!/is_valid\s*:\s*true/.test(text) || !id) throw new HttpError(400, 'Connexion Steam refusée ou expirée');
  return id;
}

async function steamSync(userId: string, steamId: string) {
  if (!STEAM_KEY) throw new HttpError(500, 'Clé API Steam manquante sur le serveur (STEAM_API_KEY)');
  const summary = await getJson(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_KEY}&steamids=${steamId}`,
  );
  const player = summary?.response?.players?.[0];
  await admin.from('linked_accounts').upsert({
    user_id: userId,
    platform: 'steam',
    external_id: steamId,
    display_name: player?.personaname ?? steamId,
    avatar_url: player?.avatarfull ?? null,
    profile_url: player?.profileurl ?? `https://steamcommunity.com/profiles/${steamId}`,
  });

  const owned = await getJson(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`,
  );
  const list: { appid: number; name: string; playtime_forever: number; rtime_last_played?: number }[] = owned?.response?.games ?? [];
  if (!list.length) throw new HttpError(400, 'Aucun jeu visible : passe « Détails des jeux » en Public dans la confidentialité de ton profil Steam.');

  // Succès détaillés pour les 60 jeux les plus joués (limite de temps de la fonction).
  const top = [...list].sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 60);
  const details = new Map<number, Achievement[]>();
  await pool(top, 6, async (g) => {
    try {
      const [mine, schema] = await Promise.all([
        getJson(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_KEY}&steamid=${steamId}&appid=${g.appid}&l=french`),
        getJson(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${g.appid}&l=french`),
      ]);
      const defs = new Map<string, { displayName: string; description?: string; icon: string; icongray: string }>(
        (schema?.game?.availableGameStats?.achievements ?? []).map((a: { name: string }) => [a.name, a]),
      );
      const achs: Achievement[] = (mine?.playerstats?.achievements ?? []).map(
        (a: { apiname: string; achieved: number; unlocktime: number; name?: string; description?: string }) => {
          const def = defs.get(a.apiname);
          return {
            id: a.apiname,
            name: def?.displayName ?? a.name ?? a.apiname,
            description: def?.description ?? a.description ?? '',
            icon: a.achieved ? def?.icon : def?.icongray,
            unlocked: a.achieved === 1,
            unlocked_at: a.achieved && a.unlocktime ? new Date(a.unlocktime * 1000).toISOString() : null,
          };
        },
      );
      details.set(g.appid, achs);
    } catch {
      // Jeu sans succès : on ignore.
    }
  });

  const games: GameRow[] = list.map((g) => ({
    id: `steam:${g.appid}`,
    platform: 'steam',
    name: g.name,
    cover_url: steamCover(g.appid),
    header_url: steamHeader(g.appid),
  }));
  const library: LibraryRow[] = list.map((g) => {
    const achs = details.get(g.appid) ?? [];
    return {
      user_id: userId,
      game_id: `steam:${g.appid}`,
      playtime_minutes: g.playtime_forever,
      last_played: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
      achievements_unlocked: achs.filter((a) => a.unlocked).length,
      achievements_total: achs.length,
      achievements: achs,
    };
  });
  // Les fiches déjà complètes (description…) ne sont pas écrasées : on n'insère que les nouveaux jeux.
  await admin.from('games').upsert(games, { onConflict: 'id', ignoreDuplicates: true });
  await saveLibrary(admin, userId, 'steam', [], library);
  return { games: list.length };
}

// ---------------------------------------------------------------- PlayStation
type PsnAuth = { accessToken: string; refreshToken: string };

async function psnSync(userId: string, auth: PsnAuth, onlineId?: string) {
  const { trophyTitles = [] } = await getUserTitles({ accessToken: auth.accessToken }, 'me', { limit: 800 });
  if (onlineId) {
    await admin.from('linked_accounts').upsert({
      user_id: userId,
      platform: 'psn',
      external_id: onlineId,
      display_name: onlineId,
      profile_url: `https://psnprofiles.com/${encodeURIComponent(onlineId)}`,
    });
  }
  type Title = {
    npCommunicationId: string;
    npServiceName: 'trophy' | 'trophy2';
    trophyTitleName: string;
    trophyTitleIconUrl: string;
    trophyTitlePlatform: string;
    lastUpdatedDateTime: string;
    definedTrophies: Record<string, number>;
    earnedTrophies: Record<string, number>;
  };
  const titles = trophyTitles as Title[];
  const total = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);

  // Trophées détaillés pour les 30 jeux joués le plus récemment.
  const details = new Map<string, Achievement[]>();
  await pool(titles.slice(0, 30), 4, async (t) => {
    try {
      const opts = { npServiceName: t.npServiceName };
      const [defs, mine] = await Promise.all([
        getTitleTrophies({ accessToken: auth.accessToken }, t.npCommunicationId, 'all', { ...opts, headerOverrides: { 'Accept-Language': 'fr-FR' } }),
        getUserTrophiesEarnedForTitle({ accessToken: auth.accessToken }, 'me', t.npCommunicationId, 'all', opts),
      ]);
      const earned = new Map(mine.trophies.map((x: { trophyId: number; earned?: boolean; earnedDateTime?: string }) => [x.trophyId, x]));
      details.set(
        t.npCommunicationId,
        defs.trophies.map((d: { trophyId: number; trophyName?: string; trophyDetail?: string; trophyIconUrl?: string; trophyType: string }) => {
          const e = earned.get(d.trophyId) as { earned?: boolean; earnedDateTime?: string } | undefined;
          return {
            id: String(d.trophyId),
            name: d.trophyName ?? 'Trophée caché',
            description: `${{ bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine' }[d.trophyType] ?? ''} · ${d.trophyDetail ?? ''}`,
            icon: d.trophyIconUrl,
            unlocked: !!e?.earned,
            unlocked_at: e?.earnedDateTime ?? null,
          };
        }),
      );
    } catch {
      // ignoré
    }
  });

  const games: GameRow[] = titles.map((t) => ({
    id: `psn:${t.npCommunicationId}`,
    platform: 'psn',
    name: t.trophyTitleName,
    cover_url: t.trophyTitleIconUrl,
    header_url: t.trophyTitleIconUrl,
    genres: [t.trophyTitlePlatform],
  }));
  const library: LibraryRow[] = titles.map((t) => ({
    user_id: userId,
    game_id: `psn:${t.npCommunicationId}`,
    last_played: t.lastUpdatedDateTime,
    achievements_unlocked: total(t.earnedTrophies),
    achievements_total: total(t.definedTrophies),
    platinum: (t.earnedTrophies.platinum ?? 0) > 0,
    achievements: details.get(t.npCommunicationId) ?? [],
  }));
  await saveLibrary(admin, userId, 'psn', games, library);
  return { games: titles.length };
}

// ---------------------------------------------------------------- Xbox (OpenXBL)
async function xbl(path: string, key: string) {
  return getJson(`https://xbl.io/api/v2/${path}`, { headers: { 'X-Authorization': key, Accept: 'application/json', 'Accept-Language': 'fr-FR' } });
}

async function xboxSync(userId: string, key: string) {
  const account = await xbl('account', key);
  const user = account?.profileUsers?.[0];
  if (!user) throw new HttpError(400, 'Clé OpenXBL invalide');
  const setting = (id: string) => user.settings?.find((s: { id: string }) => s.id === id)?.value;
  const gamertag = setting('Gamertag') ?? user.id;
  await admin.from('linked_accounts').upsert({
    user_id: userId,
    platform: 'xbox',
    external_id: user.id,
    display_name: gamertag,
    avatar_url: setting('GameDisplayPicRaw') ?? null,
    profile_url: `https://www.xbox.com/fr-FR/play/user/${encodeURIComponent(gamertag)}`,
  });

  const history = await xbl('achievements', key);
  type XTitle = {
    titleId: string;
    name: string;
    displayImage?: string;
    achievement?: { currentAchievements: number; totalAchievements: number };
    titleHistory?: { lastTimePlayed?: string };
  };
  const titles: XTitle[] = (history?.titles ?? []).filter((t: XTitle) => t.name);
  const details = new Map<string, Achievement[]>();
  await pool(titles.slice(0, 20), 3, async (t) => {
    try {
      const data = await xbl(`achievements/title/${t.titleId}`, key);
      details.set(
        t.titleId,
        (data?.achievements ?? []).map(
          (a: { id: string; name: string; description?: string; lockedDescription?: string; progressState: string; progression?: { timeUnlocked?: string }; mediaAssets?: { url: string }[] }) => ({
            id: a.id,
            name: a.name,
            description: a.progressState === 'Achieved' ? (a.description ?? '') : (a.lockedDescription ?? a.description ?? ''),
            icon: a.mediaAssets?.[0]?.url,
            unlocked: a.progressState === 'Achieved',
            unlocked_at: a.progressState === 'Achieved' ? (a.progression?.timeUnlocked ?? null) : null,
          }),
        ),
      );
    } catch {
      // ignoré
    }
  });

  const games: GameRow[] = titles.map((t) => ({
    id: `xbox:${t.titleId}`,
    platform: 'xbox',
    name: t.name,
    cover_url: t.displayImage ?? null,
    header_url: t.displayImage ?? null,
  }));
  const library: LibraryRow[] = titles.map((t) => ({
    user_id: userId,
    game_id: `xbox:${t.titleId}`,
    last_played: t.titleHistory?.lastTimePlayed ?? null,
    achievements_unlocked: t.achievement?.currentAchievements ?? 0,
    achievements_total: t.achievement?.totalAchievements ?? 0,
    achievements: details.get(t.titleId) ?? [],
  }));
  await saveLibrary(admin, userId, 'xbox', games, library);
  return { games: titles.length };
}

// ---------------------------------------------------------------- Routeur
async function currentUser(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!jwt) throw new HttpError(401, 'Connexion requise');
  const { data } = await admin.auth.getUser(jwt);
  if (!data.user) throw new HttpError(401, 'Session expirée, reconnecte-toi');
  return data.user.id;
}

async function token(userId: string, platform: string) {
  const { data } = await admin.from('platform_tokens').select('token').eq('user_id', userId).eq('platform', platform).maybeSingle();
  if (!data) throw new HttpError(400, 'Compte non lié');
  return data.token as string;
}

async function saveToken(userId: string, platform: string, value: string) {
  await admin.from('platform_tokens').upsert({ user_id: userId, platform, token: value, updated_at: new Date().toISOString() });
}

async function handle(req: Request) {
  const body = await req.json().catch(() => ({}));
  switch (body.action) {
    case 'steam-search':
      return { games: await steamSearch(String(body.term ?? '').slice(0, 80)) };
    case 'steam-game':
      return { game: await steamGame(String(body.appid).replace(/\D/g, '')) };
    case 'steam-link': {
      const userId = await currentUser(req);
      const steamId = await steamVerify(body.params ?? {});
      const { data: taken } = await admin.from('linked_accounts').select('user_id').eq('platform', 'steam').eq('external_id', steamId).neq('user_id', userId).maybeSingle();
      if (taken) throw new HttpError(409, 'Ce compte Steam est déjà lié à un autre membre');
      return await steamSync(userId, steamId);
    }
    case 'steam-sync': {
      const userId = await currentUser(req);
      const { data } = await admin.from('linked_accounts').select('external_id').eq('user_id', userId).eq('platform', 'steam').single();
      if (!data) throw new HttpError(400, 'Compte Steam non lié');
      return await steamSync(userId, data.external_id);
    }
    case 'psn-link': {
      const userId = await currentUser(req);
      const npsso = String(body.npsso ?? '').trim();
      const onlineId = String(body.onlineId ?? '').trim().slice(0, 32);
      if (npsso.length < 30 || !onlineId) throw new HttpError(400, 'Code NPSSO ou identifiant PSN manquant');
      let auth: PsnAuth;
      try {
        auth = await exchangeAccessCodeForAuthTokens(await exchangeNpssoForAccessCode(npsso));
      } catch {
        throw new HttpError(400, 'Code NPSSO invalide ou expiré : récupère-en un nouveau.');
      }
      await saveToken(userId, 'psn', auth.refreshToken);
      return await psnSync(userId, auth, onlineId);
    }
    case 'psn-sync': {
      const userId = await currentUser(req);
      const auth = await exchangeRefreshTokenForAuthTokens(await token(userId, 'psn'));
      await saveToken(userId, 'psn', auth.refreshToken);
      return await psnSync(userId, auth);
    }
    case 'xbox-link': {
      const userId = await currentUser(req);
      const key = String(body.apiKey ?? '').trim();
      if (key.length < 20) throw new HttpError(400, 'Clé OpenXBL manquante');
      const result = await xboxSync(userId, key);
      await saveToken(userId, 'xbox', key);
      return result;
    }
    case 'xbox-sync': {
      const userId = await currentUser(req);
      return await xboxSync(userId, await token(userId, 'xbox'));
    }
    case 'unlink': {
      const userId = await currentUser(req);
      const platform = String(body.platform);
      await admin.from('platform_tokens').delete().eq('user_id', userId).eq('platform', platform);
      await admin.from('linked_accounts').delete().eq('user_id', userId).eq('platform', platform);
      await admin.from('user_games').delete().eq('user_id', userId).like('game_id', `${platform}:%`);
      return { ok: true };
    }
    default:
      throw new HttpError(400, 'Action inconnue');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    return json(await handle(req));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: e instanceof Error ? e.message : String(e) }, status);
  }
});
