export const colors = {
  bg: '#090914',
  surface: '#14142A',
  surfaceAlt: '#1E1E3C',
  border: '#2C2C55',
  text: '#F4F4FF',
  muted: '#9A9AC0',
  primary: '#FF4FD8',
  secondary: '#4FC3FF',
  success: '#2EE59D',
  danger: '#FF5470',
  warning: '#FFB020',
  violet: '#8B5CFF',
};

export const CATEGORY_COLORS = ['#FF4FD8', '#4FC3FF', '#FFB020', '#2EE59D', '#B36BFF', '#FF5470', '#FF8A3D', '#3DFFE0'];

export const radius = { sm: 10, md: 16, lg: 24 };

/** Adresse publique de la version web (GitHub Pages). */
export const WEB_APP_URL = 'https://nuiraz.github.io/jeuxenigme/app/';

/** Assombrit une couleur hexadécimale (#RRGGBB) pour construire un dégradé. */
export function shade(hex: string, amount = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
