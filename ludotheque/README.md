# Ludothèque

Hub communautaire de jeux vidéo : liaison des comptes **Steam**, **PlayStation** et **Xbox**, import des jeux et succès, notes sur 10, avis, discussions, likes et commentaires.

Site : https://nuiraz.github.io/Frigol/hub/

## Mise en route (une seule fois)

1. **Base de données** : Supabase → *SQL Editor* → coller et exécuter `supabase/schema.sql`.
2. **Authentification** : Supabase → *Authentication → URL Configuration*
   - Site URL : `https://nuiraz.github.io/Frigol/hub/`
   - Redirect URLs : `https://nuiraz.github.io/Frigol/hub/`
3. **Clé Steam** : en créer une sur https://steamcommunity.com/dev/apikey (domaine : `nuiraz.github.io`).
4. **Fonction serveur** (indispensable : sans elle, « Le serveur ne répond pas »).
   Sans rien installer, depuis le site Supabase :
   - *Edge Functions* → *Deploy a new function* → *Via Editor*, nom : **`api`**
   - effacer le code d'exemple, coller tout le fichier `supabase/functions/api/index.ts`, puis *Deploy*
   - dans la fonction `api` → *Details* : **désactiver « Verify JWT »**, puis *Save*
   - *Edge Functions* → *Secrets* : ajouter `STEAM_API_KEY` = ta clé Steam

   Ou avec la ligne de commande :
   ```sh
   cd ludotheque
   npx supabase login
   npx supabase link --project-ref kmkgsrkkgxyayminzsbo
   npx supabase secrets set STEAM_API_KEY=ta_cle_steam
   npx supabase functions deploy api --no-verify-jwt
   ```
5. **Admin** : créer un compte avec le pseudo `nuiraz` → droits de modération.

## Comptes de jeux

- **Steam** : connexion officielle Steam (OpenID). Le profil et les détails de jeu doivent être publics.
- **PlayStation** : chaque joueur colle son code NPSSO (instructions dans la page « Comptes »).
- **Xbox** : chaque joueur crée une clé gratuite sur https://xbl.io et la colle dans la page « Comptes ».

## Développement

```sh
npm install
npm run dev        # http://localhost:5173/Frigol/hub/
npm run build:hub  # construit et copie dans ../hub (publié par GitHub Pages)
```
