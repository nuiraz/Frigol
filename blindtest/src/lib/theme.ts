export const colors = {
  bg: '#0D0D0C',
  surface: '#161614',
  surfaceAlt: '#201F1C',
  border: '#2C2B27',
  text: '#F2EEE6',
  muted: '#8F8A80',
  faint: '#5C5850',
  accent: '#F5C518',
  onAccent: '#0D0D0C',
  success: '#38D47A',
  danger: '#FF5544',
};

export const fonts = {
  display: 'Anton',
  regular: 'DMSans',
  medium: 'DMSans-Medium',
  bold: 'DMSans-Bold',
};

export const CATEGORY_COLORS = ['#F5C518', '#FF5544', '#38D47A', '#5AA9FF', '#C08CFF', '#FF8A3D', '#3DD6C4', '#F2EEE6'];

export const radius = { sm: 10, md: 14, lg: 18 };

/** Adresse publique de la version web (GitHub Pages). */
export const WEB_APP_URL = 'https://nuiraz.github.io/jeuxenigme/app/';

/** Assombrit une couleur hexadécimale (#RRGGBB). */
export function shade(hex: string, amount = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
