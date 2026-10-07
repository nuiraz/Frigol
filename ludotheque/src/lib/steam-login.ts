import { APP_URL } from './config';

const KEY = 'steam-openid';

/** Redirige vers « Se connecter avec Steam » (OpenID 2.0, la méthode officielle de Valve). */
export function startSteamLogin() {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${APP_URL}?steam=retour`,
    'openid.realm': window.location.origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  window.location.href = `https://steamcommunity.com/openid/login?${params}`;
}

/** Au retour de Steam : on garde la réponse et on nettoie l'adresse (avant l'affichage de l'app). */
export function captureSteamReturn() {
  const search = new URLSearchParams(window.location.search);
  if (search.get('openid.mode') !== 'id_res') return;
  const params: Record<string, string> = {};
  search.forEach((v, k) => {
    if (k.startsWith('openid.')) params[k] = v;
  });
  sessionStorage.setItem(KEY, JSON.stringify(params));
  window.history.replaceState(null, '', `${APP_URL}#/comptes`);
}

export function takeSteamReturn(): Record<string, string> | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  return JSON.parse(raw);
}
