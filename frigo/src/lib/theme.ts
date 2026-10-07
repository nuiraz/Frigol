export const colors = {
  bg: '#FBF8F3',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEE6',
  border: '#E9E2D6',
  text: '#1F1C17',
  muted: '#756C60',
  faint: '#A79E91',
  accent: '#2F7D4F',
  accentSoft: '#E3F1E7',
  onAccent: '#FFFFFF',
  heart: '#E4572E',
  warning: '#C9831F',
  warningSoft: '#FBEFD9',
};

export const fonts = {
  title: 'Fraunces-SemiBold',
  regular: 'DMSans',
  medium: 'DMSans-Medium',
  bold: 'DMSans-Bold',
};

/** Fond pastel des illustrations, selon la catégorie de la recette. */
const CATEGORY_TINTS: Record<string, string> = {
  Pâtes: '#FCE9D6',
  'Riz & céréales': '#F6EFD2',
  Viandes: '#F9E0DA',
  Œufs: '#FBF1CF',
  Légumes: '#E2F0DD',
  Soupes: '#E5EFE8',
  Poisson: '#DDEBF3',
  'Sur le pouce': '#F4E4D3',
  Sucré: '#F7E1EA',
};
export const tint = (category: string) => CATEGORY_TINTS[category] ?? '#EFE9DF';

export const radius = { sm: 10, md: 14, lg: 20 };
