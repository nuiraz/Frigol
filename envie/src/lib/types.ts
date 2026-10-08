export type MediaType = 'film' | 'serie' | 'jeu' | 'musique';

export type Item = {
  id: string;
  type: MediaType;
  title: string;
  year: number;
  /** Réalisateur, créateur, studio ou artiste. */
  creator: string;
  genres: string[];
  moods: string[];
  /** Plateformes (jeux uniquement) : pc, playstation, xbox, switch, mobile. */
  platforms?: string[];
  summary: string;
  /** Image fixe (titres ajoutés par l'admin). */
  image?: string;
  /** Identifiant Steam : jaquette tirée du CDN Steam. */
  steam?: number;
  /** Recherche iTunes / TVmaze pour retrouver la jaquette (et l'extrait audio). */
  search?: string;
  /** Durée indicative : « 2 h 10 », « 3 saisons », « 25 h »… */
  length?: string;
};

export type Artwork = { image?: string; preview?: string };
