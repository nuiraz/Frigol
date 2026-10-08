import type { Item } from '@/lib/types';

import { FILMS } from './films';
import { JEUX } from './jeux';
import { MUSIQUE } from './musique';
import { SERIES } from './series';

/** Catalogue intégré à l'app (complété par les titres ajoutés par l'admin dans Supabase). */
export const BUILTIN: Item[] = [...FILMS, ...SERIES, ...JEUX, ...MUSIQUE];
