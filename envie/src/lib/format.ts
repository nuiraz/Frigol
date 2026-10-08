export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'à l’instant';
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const isUrl = (s: string) => /^https?:\/\//.test(s);

export const AVATARS = ['🍿', '🎬', '🎮', '🎧', '📺', '👾', '🦊', '🐼', '🐸', '🦄', '🐙', '🤖', '👻', '🧙', '🦖', '🌈', '🔥', '⚡', '🌙', '🍕'];
