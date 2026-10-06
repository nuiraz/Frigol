# 🎧 Blind Test (Expo)

Application de blind test en React Native / Expo (Android, iOS et web), alimentée par des playlists **YouTube Music**.

## Lancer

```bash
cd blindtest
npm install
npx expo start
```

Scanne le QR code avec **Expo Go** (Android / iOS), ou appuie sur `w` pour la version web.

## Jouer

- **Solo** : choisis une ou plusieurs catégories, un niveau, ce qu’il faut trouver (titre, artiste ou les deux), le type de réponse (propositions ou à écrire) et le nombre de manches.
- **Mode soirée** : plusieurs joueurs écoutent ensemble, l’animateur révèle la réponse et coche qui a trouvé. Classement en direct.

| Niveau | Extrait | Réponse | Réécoutes | Points |
| --- | --- | --- | --- | --- |
| 🟢 Facile | 15 s | 4 propositions | 2 | 100 |
| 🟠 Moyen | 7 s | 6 propositions | 1 | 200 |
| 🔴 Difficile | 4 s | à écrire | 0 | 400 |
| ⚡ 1 seconde | 1 s | 4 propositions | 3 | 500 |
| 🎬 Intro | 3 premières s | à écrire | 1 | 350 |

Les extraits démarrent à un endroit aléatoire du morceau (entre 25 % et 65 %), sauf en mode Intro ou si un départ est fixé dans l’admin. Le chrono ne démarre qu’une fois le son réellement lancé. Bonus de rapidité, bonus de série 🔥, pénalité par réécoute. La saisie libre tolère accents et fautes de frappe. Meilleurs scores sauvegardés par catégorie et niveau.

## Administration

Accueil → 🔒 Administration (code par défaut **1234**, à changer dans Réglages).

- Créer / renommer / supprimer des catégories (emoji + couleur).
- **Importer une playlist** en collant son lien : `https://music.youtube.com/playlist?list=…` (fonctionne aussi avec YouTube classique et les albums `OLAK5uy_…`). Le lien d’un seul morceau marche aussi.
- Corriger titre / artiste (devinés automatiquement depuis le titre de la vidéo), fixer la seconde de départ de l’extrait, désactiver ou supprimer un morceau, l’écouter en aperçu.
- Les vidéos qui refusent la lecture intégrée sont sautées automatiquement en jeu et marquées ⚠️ bloquées (bouton pour les purger).
- Clé **YouTube Data API v3** optionnelle : import plus rapide et jusqu’à 1000 titres (sans clé : ~200 titres via le lecteur YouTube).
- Export / import des catégories en JSON pour les copier sur un autre appareil.

Trois catégories de démo (Années 80, Hits Pop, Rock) sont fournies pour tester tout de suite.

## Structure

```
src/app/            écrans (Expo Router) : accueil, setup, game, admin/…
src/components/     UI, égaliseur, lecteur YouTube (WebView sur mobile, IFrame API sur le web)
src/lib/            données (AsyncStorage), règles du jeu, outils YouTube
```
