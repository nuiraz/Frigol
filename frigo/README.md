# 🥕 Frigo Malin

Application React Native / **Expo** (TypeScript, Expo Router) pour cuisiner rapidement avec ce qu’on a dans son frigo.

## Lancer

```bash
cd frigo
npm install
npx expo start        # puis scanner le QR code avec Expo Go
npm run build:web     # met à jour la version web (../app, publiée par GitHub Pages)
```

## Fonctionnalités (V1)

- **Accueil** : ingrédients du quotidien en un clic, « Avec ce que tu as », idée du jour, recettes prêtes en 15 min, favoris et historique.
- **Mon frigo (anti-gaspi)** : saisie avec suggestions (« tom » → Tomates) ou cases à cocher par rayon ; les recettes se trient instantanément avec le **nombre d’ingrédients manquants** (« Tout est là », « Il manque 2 : crème, lardons »). Filtres : manquants max, ≤ 20 min. Sel, poivre, huile et eau sont considérés comme toujours disponibles ; certains ingrédients se remplacent (tomates fraîches ↔ en boîte, fromage râpé ↔ parmesan).
- **Explorer** : recherche et catégories **TheMealDB** (API gratuite) + « Surprends-moi ». Une recherche en français (« poulet ») est traduite automatiquement pour interroger TheMealDB.
- **Traduction en français** des recettes TheMealDB : bouton « Traduire » sur la fiche (titre, étapes, ingrédients, unités), option « Toujours traduire » (titres traduits dans les listes aussi). Traductions gardées en mémoire sur l’appareil. Service gratuit sans clé (Google Translate public, MyMemory en secours).
- **Liste de courses** : un bouton ajoute les ingrédients manquants d’une recette ; on coche en magasin.
- **Par envie** : les catégories (pâtes, œufs, soupes…) depuis l’accueil, triées selon le frigo.
- **Fiche recette** : ingrédients à cocher, ceux déjà dans le frigo signalés, quantités ajustables au nombre de personnes, étapes numérotées, favori.
- **Mode cuisine pas à pas** : grand texte, écran qui reste allumé, minuteur détecté dans l’étape (« 10 min »), liste des ingrédients à portée de main.
- **Stockage local** (AsyncStorage) : favoris (consultables hors ligne), historique, contenu du frigo.

## Sources de recettes

| Source | Contenu | Hors ligne |
| --- | --- | --- |
| `src/data/recipes.ts` | 46 recettes françaises du quotidien, ingrédients reliés au catalogue | ✅ |
| [TheMealDB](https://www.themealdb.com/api.php) (clé de test « 1 ») | Des centaines de recettes du monde, photos | ❌ (sauf favoris) |

Les ingrédients TheMealDB (en anglais) sont reconnus grâce aux noms anglais du catalogue (`en` dans `src/data/ingredients.ts`), ce qui permet aussi de calculer ce qui manque.

## Architecture

```
frigo/src
├── app/                      Écrans (Expo Router)
│   ├── _layout.tsx           Polices, stockage, navigation (pile)
│   ├── (tabs)/_layout.tsx    Barre d’onglets : Accueil · Mon frigo · Explorer · Favoris
│   ├── (tabs)/index.tsx      Tableau de bord
│   ├── (tabs)/frigo.tsx      Recherche par ingrédients (anti-gaspi)
│   ├── (tabs)/explorer.tsx   TheMealDB : recherche, catégories, aléatoire
│   ├── (tabs)/favoris.tsx    Favoris et historique
│   ├── categorie/[name].tsx  Recettes d’une catégorie
│   ├── recette/[id].tsx      Fiche recette
│   └── cuisine/[id].tsx      Mode pas à pas
├── components/
│   ├── ui.tsx                Boutons, pastilles, champs, icônes, titres
│   └── recipe-card.tsx       Cartes et lignes de recette, badge « il manque »
├── data/
│   ├── ingredients.ts        Catalogue (rayons, synonymes, noms anglais, remplaçants)
│   └── recipes.ts            Recettes locales
└── lib/
    ├── matching.ts           Calcul des manquants, classement, suggestions de saisie
    ├── mealdb.ts             Client TheMealDB → format Recipe
    ├── recipes.ts            Chargement d’une recette (locale, cache, API) + mise à l’échelle des quantités
    ├── storage.tsx           Favoris, historique, frigo, courses, traductions (AsyncStorage)
    ├── translate.ts          Traduction anglais → français (recettes, unités de mesure)
    ├── use-translation.ts    Affichage traduit d’une recette ou d’une liste de titres
    ├── theme.ts / text.ts    Couleurs, polices, normalisation de texte
    └── types.ts              Ingredient, Recipe…
```

### Ajouter une recette

Dans `src/data/recipes.ts` :

```ts
r('mon-id', 'Titre', '🍲', { time: 20, difficulty: 'facile', servings: 2, category: 'Pâtes', tags: ['rapide'] },
  [['pates', '200 g'], ['tomates', '3'], ['basilic', '', 'option']],
  ['Étape 1…', 'Étape 2… 10 min.']),
```

Les identifiants d’ingrédients viennent de `src/data/ingredients.ts` ; `'option'` marque un ingrédient facultatif (jamais compté comme manquant).
