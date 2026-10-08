export const colors = {
  bg: '#0B0B12',
  surface: '#15151F',
  surfaceAlt: '#1D1D2A',
  border: '#2A2A3A',
  text: '#F4F3FA',
  muted: '#A3A1B8',
  faint: '#6E6C85',
  accent: '#FF5C8A',
  accentSoft: '#3A1A28',
  onAccent: '#FFFFFF',
  good: '#4ADE80',
  mid: '#FACC15',
  bad: '#F87171',
};

export const fonts = {
  regular: 'DMSans',
  medium: 'DMSans-Medium',
  bold: 'DMSans-Bold',
};

export const radius = { sm: 10, md: 14, lg: 22 };

/** Couleur d'une note sur 10. */
export function scoreColor(score: number) {
  return score >= 7.5 ? colors.good : score >= 5 ? colors.mid : colors.bad;
}
