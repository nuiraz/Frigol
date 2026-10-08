# Envie 🎲

Application mobile (iOS, Android) et web : tu dis ce dont tu as envie, elle te trouve **un film, une série, un jeu vidéo ou un son**. Chaque univers a son propre espace, avec ses genres, ses envies et (pour les jeux) ses plateformes.

- **Découvrir** : écris ton envie (« un jeu PS5 d’action entre potes », « film d’horreur », « musique chill ») ou choisis un univers et des filtres → *Hop !*
- **Hub** : notes sur 10, avis, likes, commentaires, signalements, titres les mieux notés, par univers.
- **Ma liste** : « À faire » / « Déjà vu, joué, écouté », synchronisée entre appareils quand on est connecté.
- **Comptes** : inscription, connexion, mot de passe oublié, profil public, suppression du compte.
- **Mentions légales**, CGU et confidentialité.
- **Top** : podium et classements par univers, tendances de la semaine, membres les plus actifs.
- **Collections** : listes perso (« Films à voir avec Julie »…), publiques ou privées, partageables.
- **Premium (3,99 €/mois ou 10,99 € à vie, gratuit pour `nuiraz`)** : 5 idées d’un coup, filtres avancés (décennie, note 7+), collections illimitées (3 en gratuit), « Mon bilan » (statistiques), journal privé, export de liste, badge ✨.
- **Admin** (compte `nuiraz`) : signalements, Premium des membres, ajout et retrait de titres, statistiques.

Site : https://nuiraz.github.io/Frigol/app/

## Mise en route (une seule fois)

1. **Base de données** : Supabase → *SQL Editor* → coller tout `supabase/schema.sql` → *Run*.
2. **Liens des e-mails** : Supabase → *Authentication → URL Configuration*
   - Site URL : `https://nuiraz.github.io/Frigol/app/`
   - Redirect URLs : `https://nuiraz.github.io/Frigol/app/**`
3. **Admin** : inscris-toi avec le pseudo **nuiraz**.
4. Remplace l’e-mail de contact des mentions légales dans `src/lib/config.ts` (`contactEmail`).

## Encaisser le Premium (PayPal)

Deux offres : **3,99 € / mois** ou **10,99 € à vie** (une seule fois), payées sur **paypal.me/noozoaa**.

1. Le membre choisit son offre sur la page Premium et paie via PayPal, en écrivant **son pseudo** dans le message.
2. À réception, va dans **Administration → Premium**, tape le pseudo, puis :
   - « + 1 mois » pour un paiement de 3,99 € ;
   - « À vie » pour un paiement de 10,99 €.

Le mensuel n’est pas prélevé automatiquement (PayPal.me ne fait pas d’abonnement) : le membre repaie chaque mois. Le pseudo PayPal se change dans `src/lib/config.ts` (`PREMIUM.paypal`).

Aucune clé d’API à créer : le catalogue (plus de 230 titres) est intégré à l’app, et les jaquettes et extraits audio viennent automatiquement d’iTunes, TVmaze et Steam.

## Lancer l’app

```sh
npm install
npx expo start        # puis scanner le QR code avec Expo Go (téléphone) ou appuyer sur « w » (navigateur)
npm run build:web     # construit le site dans ../app (publié par GitHub Pages)
```
