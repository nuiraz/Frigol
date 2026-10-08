# Envie 🎲

Application mobile (iOS, Android) et web : tu dis ce dont tu as envie, elle te trouve **un film, une série, un jeu vidéo ou un son**. Chaque univers a son propre espace, avec ses genres, ses envies et (pour les jeux) ses plateformes.

- **Découvrir** : écris ton envie (« un jeu PS5 d’action entre potes », « film d’horreur », « musique chill ») ou choisis un univers et des filtres → *Hop !*
- **Hub** : notes sur 10, avis, likes, commentaires, signalements, titres les mieux notés, par univers.
- **Ma liste** : « À faire » / « Déjà vu, joué, écouté », synchronisée entre appareils quand on est connecté.
- **Comptes** : inscription, connexion, mot de passe oublié, profil public, suppression du compte.
- **Mentions légales**, CGU et confidentialité.
- **Top** : podium et classements par univers, tendances de la semaine, membres les plus actifs.
- **Collections** : listes perso (« Films à voir avec Julie »…), publiques ou privées, partageables.
- **Premium (3,99 €/mois, gratuit pour `nuiraz`)** : 5 idées d’un coup, filtres avancés (décennie, note 7+), collections illimitées (3 en gratuit), « Mon bilan » (statistiques), journal privé, export de liste, badge ✨.
- **Admin** (compte `nuiraz`) : signalements, Premium des membres, ajout et retrait de titres, statistiques.

Site : https://nuiraz.github.io/Frigol/app/

## Mise en route (une seule fois)

1. **Base de données** : Supabase → *SQL Editor* → coller tout `supabase/schema.sql` → *Run*.
2. **Liens des e-mails** : Supabase → *Authentication → URL Configuration*
   - Site URL : `https://nuiraz.github.io/Frigol/app/`
   - Redirect URLs : `https://nuiraz.github.io/Frigol/app/**`
3. **Admin** : inscris-toi avec le pseudo **nuiraz**.
4. Remplace l’e-mail de contact des mentions légales dans `src/lib/config.ts` (`contactEmail`).

## Encaisser le Premium (Stripe)

1. Crée un compte sur https://stripe.com → *Catalogue de produits* → produit « Envie Premium », prix récurrent **3,99 € / mois**.
2. *Liens de paiement* → crée un lien pour ce prix, copie-le dans `src/lib/config.ts` (`PREMIUM.paymentLink`), puis `npm run build:web`.
3. Activation :
   - **à la main** : après chaque paiement, Administration → Premium → pseudo → « + 1 mois » ;
   - **automatique** (conseillé) : déploie `supabase/functions/stripe-webhook` (Supabase → Edge Functions, « Verify JWT » désactivé), ajoute les secrets `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, puis dans Stripe → *Développeurs → Webhooks*, ajoute l’adresse de la fonction avec les événements `checkout.session.completed` et `invoice.paid`.

Le membre doit payer avec **la même adresse e-mail** que son compte Envie.

Aucune clé d’API à créer : le catalogue (plus de 230 titres) est intégré à l’app, et les jaquettes et extraits audio viennent automatiquement d’iTunes, TVmaze et Steam.

## Lancer l’app

```sh
npm install
npx expo start        # puis scanner le QR code avec Expo Go (téléphone) ou appuyer sur « w » (navigateur)
npm run build:web     # construit le site dans ../app (publié par GitHub Pages)
```
