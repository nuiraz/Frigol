/**
 * Connexion au service en ligne (comptes, classement mondial, hub communautaire).
 *
 * Renseigne ces deux valeurs (Supabase → Project Settings → API) ou les variables
 * EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. La clé « anon » est publique
 * par nature : la sécurité est assurée par les règles de supabase/schema.sql.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const ONLINE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Informations affichées dans les mentions légales : à compléter par l'éditeur de l'application. */
export const LEGAL = {
  editor: 'Nuiraz',
  contactEmail: 'contact@exemple.fr',
  host: 'GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. St, San Francisco, CA 94107, États-Unis)',
  dataHost: 'Supabase Inc. (serveurs dans la région choisie lors de la création du projet)',
  lastUpdate: '6 octobre 2026',
};
