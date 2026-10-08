export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const APP_NAME = 'Envie';
/** Adresse publique du site : utilisée pour les liens des e-mails (confirmation, mot de passe). */
export const WEB_URL = 'https://nuiraz.github.io/Frigol/app/';

export const PREMIUM = {
  price: '3,99 €',
  period: 'mois',
  /**
   * Lien de paiement Stripe (Stripe → Liens de paiement → abonnement à 3,99 €/mois).
   * Tant qu'il est vide, le bouton propose de contacter l'admin, qui active le Premium à la main.
   */
  paymentLink: '',
};

export const LEGAL = {
  editor: 'Nuiraz',
  contactEmail: 'contact@exemple.fr',
  host: 'GitHub Pages — GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis',
  dataHost: 'Supabase Inc. (serveurs dans l’Union européenne selon la région du projet)',
  lastUpdate: '8 octobre 2026',
};
