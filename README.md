# 🧩 Casse-Tête & Énigmes

Jeu en ligne de casse-tête en français : énigmes, logique, suites logiques et calcul mental, avec 3 niveaux de difficulté et un test de QI.

## 🎮 Jouer

👉 **https://nuiraz.github.io/jeuxenigme/**

## Fonctionnalités

- **4 catégories** : 🔮 Énigmes, 🧠 Logique, 🔢 Suites, ➗ Calcul mental (ou 🎲 Mélange)
- **3 niveaux** : 🟢 Facile (30 s), 🟠 Moyen (45 s), 🔴 Difficile (60 s)
- **Test de QI** : 20 questions de difficulté croissante, chronométrées, avec un QI estimé (pour le fun)
- Points bonus pour la rapidité et les séries de bonnes réponses 🔥
- Joker 50/50, explication après chaque réponse, récapitulatif final
- Meilleurs scores sauvegardés dans le navigateur
- Jouable au clavier (touches 1 à 4) et sur mobile

## Ajouter des questions

Toutes les questions sont dans `questions.js`. Format :

```js
{ q: "La question", c: ["Bonne réponse", "Fausse 1", "Fausse 2", "Fausse 3"], e: "Explication" }
```

La bonne réponse est toujours la première : les choix sont mélangés automatiquement pendant le jeu.

## Lancer en local

Ouvre simplement `index.html` dans ton navigateur — aucune installation nécessaire.
