import type { Platform } from './db';

export const PLATFORMS: Record<Platform, { label: string; short: string; color: string }> = {
  steam: { label: 'Steam', short: 'Steam', color: '#66c0f4' },
  psn: { label: 'PlayStation', short: 'PS', color: '#3d8bff' },
  xbox: { label: 'Xbox', short: 'Xbox', color: '#5dc21e' },
};

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 2_592_000) return `il y a ${Math.floor(s / 86400)} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function playtime(min: number) {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return `${h.toLocaleString('fr-FR')} h`;
}

/** Couleur d'une note sur 10. */
export function ratingColor(r: number) {
  return r >= 8 ? 'var(--good)' : r >= 5 ? 'var(--mid)' : 'var(--bad)';
}

export const isImage = (avatar: string) => /^https?:\/\//.test(avatar);
