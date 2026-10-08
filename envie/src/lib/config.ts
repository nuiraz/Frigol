export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const APP_NAME = 'Envie';
/** Adresse publique du site : utilisée pour les liens des e-mails (confirmation, mot de passe). */
export const WEB_URL = 'https://nuiraz.github.io/Frigol/app/';

/**
 * Premium : paiement via PayPal.me, puis activation par l'admin (Administration → Premium).
 * PayPal.me n'est pas un prélèvement automatique : le mensuel se règle chaque mois.
 */
export const PREMIUM = {
  price: '3,99 €',
  period: 'mois',
  lifetimePrice: '59,99 €',
  paypal: 'noozoaa',
  monthlyAmount: '3.99',
  lifetimeAmount: '59.99',
};

export const paypalLink = (amount: string) => `https://paypal.me/${PREMIUM.paypal}/${amount}EUR`;

export const LEGAL = {
  editor: 'Nuiraz',
  contactEmail: 'contact@exemple.fr',
  host: 'GitHub Pages — GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis',
  dataHost: 'Supabase Inc. (serveurs dans l’Union européenne selon la région du projet)',
  lastUpdate: '8 octobre 2026',
};
