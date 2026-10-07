export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const APP_NAME = 'Ludothèque';
/** Adresse publique du site (sans le #) : sert de retour après « Se connecter avec Steam » et les e-mails. */
export const APP_URL = `${window.location.origin}${import.meta.env.BASE_URL}`;

/** Informations des mentions légales : à compléter par l'éditeur du site. */
export const LEGAL = {
  editor: 'Nuiraz',
  contactEmail: 'contact@exemple.fr',
  host: 'GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. St, San Francisco, CA 94107, États-Unis)',
  dataHost: 'Supabase Inc. (serveurs dans la région choisie pour le projet)',
  lastUpdate: '7 octobre 2026',
};
