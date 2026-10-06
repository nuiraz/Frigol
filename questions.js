// Banque de questions.
// Format : { q: question, c: [bonne réponse, mauvaise 1, mauvaise 2, mauvaise 3], e: explication }
// Les choix sont mélangés au moment du jeu.

const CATEGORIES = {
  enigmes: { name: "Énigmes", icon: "🔮" },
  logique: { name: "Logique", icon: "🧠" },
  suites: { name: "Suites", icon: "🔢" },
  calcul: { name: "Calcul mental", icon: "➗" },
};

const LEVELS = {
  facile: { name: "Facile", icon: "🟢", time: 30, points: 10 },
  moyen: { name: "Moyen", icon: "🟠", time: 45, points: 20 },
  difficile: { name: "Difficile", icon: "🔴", time: 60, points: 30 },
};

const QUESTIONS = {
  enigmes: {
    facile: [
      { q: "Plus on m'en enlève, plus je deviens grand. Qui suis-je ?", c: ["Un trou", "Un arbre", "Un ballon", "Une ombre"], e: "Plus on retire de terre, plus le trou est grand." },
      { q: "Qu'est-ce qui a des dents mais ne mord jamais ?", c: ["Un peigne", "Un requin", "Un bébé", "Une fourchette"], e: "Le peigne a des dents… mais il est inoffensif !" },
      { q: "Je suis plein de trous, mais je retiens l'eau. Qui suis-je ?", c: ["Une éponge", "Un seau", "Une passoire", "Un filet"], e: "L'éponge est pleine de trous et absorbe l'eau." },
      { q: "Qu'est-ce qui monte mais ne redescend jamais ?", c: ["L'âge", "Un ascenseur", "La fumée", "Un ballon"], e: "On vieillit toujours, on ne rajeunit jamais !" },
      { q: "J'ai des aiguilles mais je ne couds jamais. Qui suis-je ?", c: ["Une horloge", "Un hérisson", "Un sapin", "Une couturière"], e: "Les aiguilles de l'horloge indiquent l'heure." },
      { q: "Qu'est-ce qui a des touches mais n'ouvre aucune porte ?", c: ["Un piano", "Un trousseau", "Une serrure", "Un coffre"], e: "Le piano a des touches… pas des clés de porte !" },
      { q: "Qu'est-ce qui devient mouillé en séchant ?", c: ["Une serviette", "Le linge", "Une flaque", "Le soleil"], e: "La serviette se mouille en séchant ce qu'elle essuie." },
      { q: "Qu'est-ce qui a un cou mais pas de tête ?", c: ["Une bouteille", "Une girafe", "Un serpent", "Un pull"], e: "Une bouteille a un goulot, aussi appelé « cou »." },
    ],
    moyen: [
      { q: "Je parle sans bouche et j'entends sans oreilles. Qui suis-je ?", c: ["L'écho", "Le vent", "Un téléphone", "Une radio"], e: "L'écho répète ce qu'on dit, sans bouche ni oreilles." },
      { q: "Le pauvre l'a, le riche en a besoin, et si tu en manges, tu meurs. Qu'est-ce que c'est ?", c: ["Rien", "L'argent", "Le poison", "L'amour"], e: "Le pauvre n'a rien, le riche n'a besoin de rien, et si tu ne manges rien… tu meurs." },
      { q: "Qu'est-ce qui t'appartient, mais que les autres utilisent plus que toi ?", c: ["Ton prénom", "Ta voiture", "Ton téléphone", "Ta maison"], e: "Les autres prononcent ton prénom bien plus souvent que toi." },
      { q: "Qu'est-ce qui peut remplir une pièce sans prendre de place ?", c: ["La lumière", "L'air", "L'eau", "Les meubles"], e: "La lumière remplit la pièce sans occuper d'espace." },
      { q: "Je cours mais ne marche jamais, j'ai un lit mais ne dors jamais. Qui suis-je ?", c: ["Une rivière", "Un coureur", "Un chat", "Le vent"], e: "Une rivière « court » et possède un lit." },
      { q: "Je commence la nuit et je termine le matin. Qui suis-je ?", c: ["La lettre N", "La lune", "Un rêve", "Le sommeil"], e: "« Nuit » commence par N et « matin » se termine par N." },
      { q: "Si tu prononces mon nom, je disparais. Qui suis-je ?", c: ["Le silence", "Un secret", "Un fantôme", "Une bulle"], e: "Dès qu'on dit « silence », il n'y a plus de silence !" },
      { q: "Qu'est-ce qui a des villes sans maisons, des forêts sans arbres et des rivières sans eau ?", c: ["Une carte", "Un désert", "Un rêve", "Un livre"], e: "Une carte géographique représente tout cela… sans le contenir." },
    ],
    difficile: [
      { q: "Un homme regarde un portrait et dit : « Je n'ai ni frère ni sœur, mais le père de cet homme est le fils de mon père. » Qui est sur le portrait ?", c: ["Son fils", "Lui-même", "Son père", "Son neveu"], e: "« Le fils de mon père » = lui-même (il est fils unique). Donc le père de l'homme du portrait, c'est lui : c'est son fils." },
      { q: "Celui qui le fabrique le vend, celui qui l'achète ne l'utilise pas, et celui qui l'utilise ne le voit pas. Qu'est-ce que c'est ?", c: ["Un cercueil", "Un cadeau", "Un parachute", "Une assurance"], e: "On achète un cercueil pour quelqu'un d'autre, qui ne le voit jamais." },
      { q: "Un homme pousse sa voiture jusqu'à un hôtel et déclare immédiatement faillite. Pourquoi ?", c: ["Il joue au Monopoly", "Il n'a plus d'essence", "L'hôtel est trop cher", "Il a perdu ses clés"], e: "Au Monopoly, tomber sur une case avec un hôtel peut ruiner un joueur !" },
      { q: "Quel mot de la langue française s'écrit toujours « incorrectement » ?", c: ["Incorrectement", "Orthographe", "Faute", "Aucun"], e: "Le mot « incorrectement » s'écrit toujours… « incorrectement »." },
      { q: "Un homme habite au 10e étage. Chaque jour, il prend l'ascenseur jusqu'au 7e puis monte à pied, sauf les jours de pluie où il va directement au 10e. Pourquoi ?", c: ["Il est petit et atteint le bouton 10 avec son parapluie", "Il fait du sport quand il fait beau", "L'ascenseur est en panne", "Il rend visite à un voisin"], e: "Trop petit pour atteindre le bouton du 10e, il s'aide de son parapluie quand il pleut." },
      { q: "On me trouve au milieu de Paris, au début de Rome et à la fin de l'hiver. Qui suis-je ?", c: ["La lettre R", "La lettre I", "La Seine", "Le printemps"], e: "paRis, Rome, hiveR : c'est la lettre R." },
      { q: "Deux pères et deux fils vont à la pêche. Ils attrapent 3 poissons et chacun en a exactement un. Comment est-ce possible ?", c: ["Ils sont 3 : grand-père, père et fils", "Un poisson a été coupé en deux", "L'un d'eux n'a rien mangé", "C'est impossible"], e: "Le père est à la fois père et fils : 3 personnes suffisent." },
      { q: "Une femme tire sur son mari, puis le plonge sous l'eau pendant 5 minutes, et enfin le pend. Peu après, ils dînent ensemble. Comment ?", c: ["Elle l'a photographié", "Il sait retenir sa respiration", "C'est un film", "Il est magicien"], e: "Elle prend une photo (on « tire » le portrait), la développe dans un bain, puis la pend pour la sécher." },
    ],
  },

  logique: {
    facile: [
      { q: "Tous les chats sont des animaux. Félix est un chat. Donc…", c: ["Félix est un animal", "Tous les animaux sont des chats", "Félix n'est pas un animal", "On ne peut rien conclure"], e: "Si tous les chats sont des animaux, Félix, qui est un chat, est forcément un animal." },
      { q: "Marie est plus grande que Paul. Paul est plus grand que Léo. Qui est le plus petit ?", c: ["Léo", "Paul", "Marie", "On ne sait pas"], e: "Marie > Paul > Léo." },
      { q: "Quel mot ne va pas avec les autres ?", c: ["Carotte", "Pomme", "Banane", "Poire"], e: "La carotte est un légume, les autres sont des fruits." },
      { q: "Combien de mois de l'année ont 28 jours ?", c: ["12", "1", "2", "6"], e: "Tous les mois ont au moins 28 jours !" },
      { q: "Un fermier a 15 moutons. Tous meurent sauf 8. Combien en reste-t-il ?", c: ["8", "7", "15", "0"], e: "« Tous sauf 8 » : il en reste donc 8." },
      { q: "Si hier était dimanche, quel jour serons-nous demain ?", c: ["Mardi", "Lundi", "Mercredi", "Samedi"], e: "Hier dimanche → aujourd'hui lundi → demain mardi." },
      { q: "Quel est l'intrus ?", c: ["Cube", "Carré", "Triangle", "Cercle"], e: "Le cube est une forme en 3D ; les autres sont des formes planes." },
      { q: "Le père de Marie a 5 filles : Nana, Néné, Nini, Nono et… ?", c: ["Marie", "Nunu", "Nina", "Nounou"], e: "C'est le père de Marie : la cinquième fille est Marie !" },
    ],
    moyen: [
      { q: "Pendant une course, tu dépasses la personne en 2e position. À quelle place es-tu ?", c: ["2e", "1re", "3e", "On ne sait pas"], e: "Tu prends sa place : tu es 2e." },
      { q: "Le gant est à la main ce que la chaussure est…", c: ["au pied", "au lacet", "à la chaussette", "à la marche"], e: "Le gant couvre la main, la chaussure couvre le pied." },
      { q: "5 machines fabriquent 5 objets en 5 minutes. Combien de temps faut-il à 100 machines pour fabriquer 100 objets ?", c: ["5 minutes", "100 minutes", "20 minutes", "1 minute"], e: "Chaque machine fait 1 objet en 5 minutes. 100 machines font 100 objets en 5 minutes." },
      { q: "Certains A sont des B. Tous les B sont des C. Que peut-on conclure ?", c: ["Certains A sont des C", "Tous les A sont des C", "Aucun A n'est un C", "Tous les C sont des A"], e: "Les A qui sont des B sont aussi des C." },
      { q: "Des nénuphars doublent de surface chaque jour et couvrent tout le lac en 48 jours. En combien de jours couvrent-ils la moitié du lac ?", c: ["47 jours", "24 jours", "46 jours", "12 jours"], e: "La veille du jour 48, ils couvraient la moitié : jour 47." },
      { q: "Combien de fois peut-on soustraire 5 de 25 ?", c: ["Une seule fois", "5 fois", "4 fois", "Une infinité de fois"], e: "Après la première fois, on soustrait 5 de 20, plus de 25 !" },
      { q: "Pierre a deux fois l'âge de Jean. À eux deux, ils ont 30 ans. Quel âge a Pierre ?", c: ["20 ans", "15 ans", "10 ans", "25 ans"], e: "Jean = x, Pierre = 2x → 3x = 30 → x = 10. Pierre a 20 ans." },
      { q: "3 chats attrapent 3 souris en 3 minutes. Combien de chats faut-il pour attraper 100 souris en 100 minutes ?", c: ["3", "100", "33", "10"], e: "3 chats attrapent 1 souris par minute, donc 100 souris en 100 minutes." },
    ],
    difficile: [
      { q: "Dans une famille, chaque fille a autant de frères que de sœurs, et chaque garçon a deux fois plus de sœurs que de frères. Combien y a-t-il d'enfants ?", c: ["7", "5", "6", "9"], e: "4 filles et 3 garçons : une fille a 3 frères et 3 sœurs ; un garçon a 4 sœurs et 2 frères." },
      { q: "Une batte et une balle coûtent 1,10 € au total. La batte coûte 1 € de plus que la balle. Combien coûte la balle ?", c: ["0,05 €", "0,10 €", "0,01 €", "0,15 €"], e: "Balle = x, batte = x + 1 → 2x + 1 = 1,10 → x = 0,05 €." },
      { q: "Trois boîtes sont étiquetées « Pommes », « Oranges » et « Mélange », mais TOUTES les étiquettes sont fausses. Dans quelle boîte faut-il piocher un seul fruit pour tout réétiqueter ?", c: ["La boîte « Mélange »", "La boîte « Pommes »", "La boîte « Oranges »", "Il faut piocher deux fois"], e: "La boîte « Mélange » ne contient qu'un seul type de fruit : le fruit pioché la révèle, et on déduit les deux autres." },
      { q: "Sur une île, les chevaliers disent toujours la vérité et les menteurs mentent toujours. A dit : « B est un menteur. » B dit : « A et moi sommes du même type. » Que sont A et B ?", c: ["A chevalier, B menteur", "A menteur, B chevalier", "Tous deux chevaliers", "Tous deux menteurs"], e: "Si A ment, B serait chevalier et dirait vrai (« même type »), contradiction. Donc A dit vrai et B ment." },
      { q: "Tu as 8 billes identiques, dont une légèrement plus lourde, et une balance à deux plateaux. Combien de pesées minimum garantissent de la trouver ?", c: ["2", "3", "1", "4"], e: "Pèse 3 contre 3. Si équilibre, pèse les 2 restantes. Sinon, prends le groupe lourd et pèse 1 contre 1." },
      { q: "2 peintres peignent 2 murs en 2 heures. Combien de murs 6 peintres peignent-ils en 6 heures ?", c: ["18", "6", "12", "36"], e: "1 peintre peint 1 mur en 2 h → en 6 h, 3 murs. 6 peintres × 3 = 18 murs." },
      { q: "Un escargot est au fond d'un puits de 10 m. Il monte de 3 m le jour et glisse de 2 m la nuit. En combien de jours sort-il ?", c: ["8 jours", "10 jours", "7 jours", "9 jours"], e: "Après 7 jours et 7 nuits, il est à 7 m. Le 8e jour, il monte de 3 m et sort." },
      { q: "Avant-hier était le lendemain de jeudi. Quel jour serons-nous après-demain ?", c: ["Mardi", "Lundi", "Dimanche", "Mercredi"], e: "Lendemain de jeudi = vendredi = avant-hier → aujourd'hui dimanche → après-demain mardi." },
    ],
  },

  suites: {
    facile: [
      { q: "2, 4, 6, 8, … ?", c: ["10", "9", "12", "16"], e: "On ajoute 2 à chaque fois." },
      { q: "1, 3, 5, 7, … ?", c: ["9", "8", "10", "11"], e: "Les nombres impairs : +2." },
      { q: "5, 10, 15, 20, … ?", c: ["25", "30", "22", "40"], e: "On ajoute 5 à chaque fois." },
      { q: "A, C, E, G, … ?", c: ["I", "H", "J", "K"], e: "On saute une lettre à chaque fois." },
      { q: "3, 6, 12, 24, … ?", c: ["48", "36", "30", "42"], e: "On multiplie par 2." },
      { q: "100, 90, 80, 70, … ?", c: ["60", "50", "65", "75"], e: "On retire 10 à chaque fois." },
      { q: "Lundi, mercredi, vendredi, … ?", c: ["Dimanche", "Samedi", "Jeudi", "Mardi"], e: "On saute un jour à chaque fois." },
      { q: "1, 1, 2, 2, 3, 3, … ?", c: ["4", "3", "5", "1"], e: "Chaque nombre apparaît deux fois." },
    ],
    moyen: [
      { q: "1, 4, 9, 16, 25, … ?", c: ["36", "30", "35", "49"], e: "Les carrés : 1², 2², 3², 4², 5², 6² = 36." },
      { q: "1, 1, 2, 3, 5, 8, … ?", c: ["13", "11", "12", "16"], e: "Suite de Fibonacci : chaque terme est la somme des deux précédents (5 + 8)." },
      { q: "2, 6, 12, 20, 30, … ?", c: ["42", "40", "36", "44"], e: "Les écarts sont +4, +6, +8, +10, puis +12." },
      { q: "1, 2, 4, 7, 11, … ?", c: ["16", "15", "14", "18"], e: "On ajoute 1, 2, 3, 4, puis 5." },
      { q: "Z, X, V, T, … ?", c: ["R", "S", "Q", "P"], e: "On recule de deux lettres dans l'alphabet." },
      { q: "3, 9, 27, 81, … ?", c: ["243", "162", "189", "324"], e: "On multiplie par 3." },
      { q: "2, 3, 5, 7, 11, … ?", c: ["13", "12", "15", "17"], e: "Ce sont les nombres premiers." },
      { q: "1, 8, 27, 64, … ?", c: ["125", "100", "81", "128"], e: "Les cubes : 1³, 2³, 3³, 4³, 5³ = 125." },
    ],
    difficile: [
      { q: "1, 11, 21, 1211, 111221, … ?", c: ["312211", "1112221", "122111", "211211"], e: "Chaque terme décrit le précédent : « trois 1, deux 2, un 1 » → 312211." },
      { q: "2, 3, 5, 9, 17, … ?", c: ["33", "31", "25", "34"], e: "On multiplie par 2 puis on retire 1 : 17 × 2 − 1 = 33." },
      { q: "1, 2, 6, 24, 120, … ?", c: ["720", "240", "600", "144"], e: "Les factorielles : on multiplie par 2, 3, 4, 5, puis 6." },
      { q: "3, 4, 7, 11, 18, 29, … ?", c: ["47", "40", "45", "51"], e: "Chaque terme est la somme des deux précédents : 18 + 29 = 47." },
      { q: "U, D, T, Q, C, S, S, … ?", c: ["H", "N", "O", "D"], e: "Les initiales de Un, Deux, Trois, Quatre, Cinq, Six, Sept… Huit !" },
      { q: "1, 4, 27, 256, … ?", c: ["3125", "625", "1024", "1296"], e: "nⁿ : 1¹, 2², 3³, 4⁴, 5⁵ = 3125." },
      { q: "2, 12, 36, 80, 150, … ?", c: ["252", "216", "240", "300"], e: "n³ + n² : pour n = 6, 216 + 36 = 252." },
      { q: "7, 10, 8, 11, 9, 12, … ?", c: ["10", "13", "8", "11"], e: "On alterne +3 et −2 : 12 − 2 = 10." },
    ],
  },

  calcul: {
    facile: [
      { q: "7 + 8 = ?", c: ["15", "14", "16", "13"], e: "7 + 8 = 15." },
      { q: "9 × 6 = ?", c: ["54", "56", "48", "63"], e: "9 × 6 = 54." },
      { q: "100 − 37 = ?", c: ["63", "73", "67", "53"], e: "100 − 37 = 63." },
      { q: "Quelle est la moitié de 84 ?", c: ["42", "44", "32", "48"], e: "84 ÷ 2 = 42." },
      { q: "48 ÷ 4 = ?", c: ["12", "14", "11", "16"], e: "48 ÷ 4 = 12." },
      { q: "25 + 25 + 25 = ?", c: ["75", "70", "100", "65"], e: "3 × 25 = 75." },
      { q: "Une boîte contient 6 œufs. Combien d'œufs dans 4 boîtes ?", c: ["24", "20", "18", "28"], e: "6 × 4 = 24." },
      { q: "3 × 3 + 3 = ?", c: ["12", "18", "15", "9"], e: "On fait la multiplication d'abord : 9 + 3 = 12." },
    ],
    moyen: [
      { q: "Combien font 15 % de 200 ?", c: ["30", "15", "20", "35"], e: "10 % = 20 et 5 % = 10, donc 15 % = 30." },
      { q: "13 × 7 = ?", c: ["91", "87", "93", "81"], e: "13 × 7 = 70 + 21 = 91." },
      { q: "2 + 3 × 4 = ?", c: ["14", "20", "24", "12"], e: "Priorité à la multiplication : 2 + 12 = 14." },
      { q: "Quelle est la racine carrée de 144 ?", c: ["12", "14", "11", "72"], e: "12 × 12 = 144." },
      { q: "1/2 + 1/4 = ?", c: ["3/4", "2/6", "1/6", "2/4"], e: "1/2 = 2/4, donc 2/4 + 1/4 = 3/4." },
      { q: "Un article à 80 € est soldé à −25 %. Quel est son nouveau prix ?", c: ["60 €", "55 €", "65 €", "70 €"], e: "25 % de 80 = 20 → 80 − 20 = 60 €." },
      { q: "2 puissance 10 = ?", c: ["1024", "512", "2048", "1000"], e: "2¹⁰ = 1024." },
      { q: "Quelle est la moyenne de 4, 8 et 12 ?", c: ["8", "6", "12", "24"], e: "(4 + 8 + 12) ÷ 3 = 24 ÷ 3 = 8." },
    ],
    difficile: [
      { q: "17 × 23 = ?", c: ["391", "381", "401", "371"], e: "17 × 23 = 17 × 20 + 17 × 3 = 340 + 51 = 391." },
      { q: "Quelle est la somme des nombres de 1 à 100 ?", c: ["5050", "5000", "10100", "4950"], e: "Formule de Gauss : 100 × 101 ÷ 2 = 5050." },
      { q: "Un robinet remplit une baignoire en 3 h, un autre en 6 h. Ensemble, en combien de temps la remplissent-ils ?", c: ["2 h", "4 h 30", "3 h", "1 h 30"], e: "1/3 + 1/6 = 1/2 de baignoire par heure → 2 h." },
      { q: "Un prix augmente de 20 %, puis baisse de 20 %. Quelle est la variation totale ?", c: ["−4 %", "0 %", "+4 %", "−2 %"], e: "1,2 × 0,8 = 0,96 → baisse de 4 %." },
      { q: "Un train parcourt 120 km en 1 h 30. Quelle est sa vitesse moyenne ?", c: ["80 km/h", "90 km/h", "60 km/h", "100 km/h"], e: "120 ÷ 1,5 = 80 km/h." },
      { q: "Tu fais un trajet aller à 60 km/h et le retour à 40 km/h. Quelle est ta vitesse moyenne sur l'aller-retour ?", c: ["48 km/h", "50 km/h", "45 km/h", "52 km/h"], e: "Pour 120 km : 2 h à l'aller + 3 h au retour = 5 h pour 240 km → 48 km/h." },
      { q: "999 × 999 = ?", c: ["998001", "999001", "998999", "997001"], e: "(1000 − 1)² = 1 000 000 − 2000 + 1 = 998 001." },
      { q: "Combien de nombres entre 1 et 100 sont divisibles par 3 ou par 5 ?", c: ["47", "53", "33", "40"], e: "33 multiples de 3 + 20 multiples de 5 − 6 multiples de 15 = 47." },
    ],
  },
};
