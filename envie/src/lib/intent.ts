import { GENRE } from './taxonomy';
import { normalize } from './text';
import type { MediaType } from './types';

export type Filters = { types: MediaType[]; genres: string[]; moods: string[]; platforms: string[] };

export const emptyFilters = (): Filters => ({ types: [], genres: [], moods: [], platforms: [] });

/** `type` : mot qui désigne un type. `implies` : type déduit seulement si aucun type n'a été tapé (« rock », « anime »…). */
type Rule = { words: string[]; type?: MediaType; implies?: MediaType; genre?: string; mood?: string; platform?: string };

// Mots tapés → filtres. Les mots sont comparés sans accents ni majuscules.
const RULES: Rule[] = [
  { words: ['film', 'films', 'cine', 'cinema', 'movie', 'regarder un film'], type: 'film' },
  { words: ['serie', 'series', 'binge', 'saison', 'episodes', 'netflix'], type: 'serie' },
  { words: ['jeu', 'jeux', 'jouer', 'game', 'gaming', 'jv', 'jeu video', 'jeux video'], type: 'jeu' },
  { words: ['musique', 'music', 'son', 'sons', 'chanson', 'chansons', 'morceau', 'ecouter', 'playlist'], type: 'musique' },
  { words: ['anime', 'animes', 'manga', 'mangas'], implies: 'serie', genre: 'anime' },

  { words: ['pc', 'steam', 'ordi', 'ordinateur'], platform: 'pc' },
  { words: ['ps', 'ps4', 'ps5', 'playstation', 'play', 'sony'], platform: 'playstation' },
  { words: ['xbox', 'series x', 'game pass'], platform: 'xbox' },
  { words: ['switch', 'nintendo'], platform: 'switch' },
  { words: ['mobile', 'telephone', 'portable', 'iphone', 'android', 'tel'], platform: 'mobile' },

  { words: ['action', 'baston', 'explosions'], genre: 'action' },
  { words: ['aventure', 'aventures', 'exploration', 'explorer'], genre: 'aventure' },
  { words: ['horreur', 'horrifique', 'horrifiques', 'epouvante', 'zombie', 'zombies', 'fantome', 'fantomes', 'hante'], genre: 'horreur', mood: 'flippant' },
  { words: ['peur', 'flippant', 'flipper', 'effrayant', 'terrifiant'], mood: 'flippant' },
  { words: ['comedie', 'comedies', 'comique', 'drole', 'droles', 'rire', 'marrant', 'humour', 'rigoler'], genre: 'comedie', mood: 'fun' },
  { words: ['drame', 'dramatique'], genre: 'drame' },
  { words: ['thriller', 'suspense', 'tension'], genre: 'thriller' },
  { words: ['sf', 'science fiction', 'science-fiction', 'espace', 'futur', 'futuriste', 'robots', 'aliens', 'extraterrestre'], genre: 'sf' },
  { words: ['fantastique', 'fantasy', 'magie', 'dragons', 'sorcier', 'heroic fantasy'], genre: 'fantastique' },
  { words: ['policier', 'policiere', 'policiers', 'policieres', 'polar', 'polars', 'enquete', 'detective', 'crime', 'mafia', 'gangster'], genre: 'policier' },
  { words: ['romance', 'romantique', 'romantiques', 'amour', 'love', 'date', 'en couple'], genre: 'romance' },
  { words: ['animation', 'dessin anime', 'pixar', 'disney', 'ghibli', 'enfants', 'famille'], genre: 'animation' },
  { words: ['historique', 'histoire', 'guerre', 'moyen age', 'epoque'], genre: 'historique' },
  { words: ['rpg', 'jeu de role'], genre: 'rpg' },
  { words: ['fps', 'tir', 'shooter', 'flingues', 'battle royale'], genre: 'fps' },
  { words: ['plateforme', 'plateformes', 'mario'], genre: 'plateforme' },
  { words: ['course', 'voiture', 'voitures', 'racing', 'kart'], genre: 'course' },
  { words: ['sport', 'foot', 'football', 'basket'], genre: 'sport' },
  { words: ['combat', 'versus', 'fighting'], genre: 'combat' },
  { words: ['strategie', 'tactique', 'gestion'], genre: 'strategie' },
  { words: ['simulation', 'simu', 'ferme', 'construire', 'construction'], genre: 'simulation' },
  { words: ['survie', 'survival', 'crafting'], genre: 'survie' },
  { words: ['reflexion', 'enigme', 'enigmes', 'puzzle', 'casse tete'], genre: 'reflexion', mood: 'cerveau' },
  { words: ['roguelike', 'roguelite', 'rogue'], genre: 'roguelike' },
  { words: ['monde ouvert', 'open world'], genre: 'monde-ouvert' },
  { words: ['pop'], genre: 'pop', implies: 'musique' },
  { words: ['rock', 'guitare'], genre: 'rock', implies: 'musique' },
  { words: ['rap', 'hip hop', 'hiphop', 'trap', 'drill'], genre: 'rap', implies: 'musique' },
  { words: ['electro', 'techno', 'house', 'edm', 'dance', 'danser', 'club', 'soiree'], genre: 'electro', implies: 'musique' },
  { words: ['rnb', 'r b', 'soul'], genre: 'rnb', implies: 'musique' },
  { words: ['chanson francaise', 'variete', 'francais', 'francaise'], genre: 'variete', implies: 'musique' },
  { words: ['jazz', 'swing', 'blues'], genre: 'jazz', implies: 'musique' },
  { words: ['metal', 'hard rock'], genre: 'metal', implies: 'musique' },
  { words: ['reggae'], genre: 'reggae', implies: 'musique' },
  { words: ['classique', 'piano', 'orchestre'], genre: 'classique', implies: 'musique' },
  { words: ['funk', 'disco', 'groove'], genre: 'funk', implies: 'musique' },
  { words: ['lofi', 'lo fi', 'etudier', 'reviser', 'bosser', 'concentration'], genre: 'lofi', implies: 'musique' },

  { words: ['chill', 'calme', 'detente', 'tranquille', 'cosy', 'relax', 'posé', 'pose', 'doux'], mood: 'chill' },
  { words: ['fun', 'delire', 'leger', 'bonne humeur', 'joyeux'], mood: 'fun' },
  { words: ['intense', 'adrenaline', 'nerveux', 'dur', 'difficile', 'hardcore'], mood: 'intense' },
  { words: ['triste', 'pleurer', 'emouvant', 'emotion', 'emotions', 'touchant', 'larmes'], mood: 'emouvant' },
  { words: ['potes', 'amis', 'copains', 'a plusieurs', 'coop', 'multi', 'multijoueur', 'entre amis', 'en groupe'], mood: 'potes' },
  { words: ['court', 'rapide', 'petit', 'vite', 'pas long', 'pas trop long'], mood: 'court' },
  { words: ['culte', 'classique du genre', 'incontournable', 'chef d oeuvre', 'meilleur', 'meilleurs'], mood: 'culte' },
  { words: ['energie', 'motivation', 'motiver', 'muscu', 'sport musique', 'pump', 'bouger'], mood: 'energie' },
  { words: ['reflechir', 'cerveau', 'intelligent', 'complexe', 'twist', 'retourne'], mood: 'cerveau' },
];

const add = <T>(list: T[], v: T | undefined) => {
  if (v !== undefined && !list.includes(v)) list.push(v);
};

/** « jeu ps5 action entre potes » → { types: [jeu], platforms: [playstation], genres: [action], moods: [potes] } */
export function parseIntent(text: string): Filters {
  const f = emptyFilters();
  const t = ` ${normalize(text)} `;
  if (!t.trim()) return f;
  const implied: MediaType[] = [];
  for (const rule of RULES) {
    if (rule.words.some((w) => t.includes(` ${normalize(w)} `))) {
      add(f.types, rule.type);
      add(implied, rule.implies);
      add(f.genres, rule.genre);
      add(f.moods, rule.mood);
      add(f.platforms, rule.platform);
    }
  }
  if (!f.types.length) {
    // Une plateforme sans type précisé : on parle forcément de jeux.
    if (f.platforms.length) f.types.push('jeu');
    else f.types.push(...implied);
  }
  if (f.types.length) {
    // « film classique » : pas de la musique classique, mais un film culte.
    if (f.genres.includes('classique') && !f.types.includes('musique')) add(f.moods, 'culte');
    // On ne garde que les genres qui existent pour les types demandés.
    f.genres = f.genres.filter((g) => GENRE[g]?.types.some((t) => f.types.includes(t)) ?? true);
  }
  return f;
}

export const hasFilters = (f: Filters) => !!(f.types.length || f.genres.length || f.moods.length || f.platforms.length);
