import type { Ingredient, IngredientCategory } from '@/lib/types';

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  feculents: 'Féculents',
  proteines: 'Viandes, poissons & œufs',
  legumes: 'Fruits & légumes',
  cremerie: 'Crèmerie',
  placard: 'Placard',
  epices: 'Herbes & épices',
};

const i = (
  id: string,
  name: string,
  emoji: string,
  category: IngredientCategory,
  extra: Omit<Ingredient, 'id' | 'name' | 'emoji' | 'category'> = {},
): Ingredient => ({ id, name, emoji, category, ...extra });

export const INGREDIENTS: Ingredient[] = [
  // Féculents
  i('pates', 'Pâtes', '🍝', 'feculents', {
    aliases: ['spaghetti', 'penne', 'tagliatelles', 'coquillettes'],
    en: [
      'spaghetti',
      'pasta',
      'penne rigate',
      'fettuccine',
      'linguine',
      'rigatoni',
      'farfalle',
      'macaroni',
      'lasagne sheets',
      'tagliatelle',
    ],
  }),
  i('riz', 'Riz', '🍚', 'feculents', {
    aliases: ['riz basmati', 'riz rond'],
    en: ['rice', 'basmati rice', 'jasmine rice', 'long grain rice', 'arborio rice', 'white rice', 'brown rice'],
  }),
  i('pommes-de-terre', 'Pommes de terre', '🥔', 'feculents', {
    aliases: ['patates', 'pdt'],
    en: ['potatoes', 'potato', 'new potatoes', 'floury potatoes', 'charlotte potatoes', 'king edward potatoes'],
  }),
  i('pain', 'Pain', '🍞', 'feculents', {
    aliases: ['baguette', 'pain de mie'],
    en: ['bread', 'white bread', 'baguette', 'sourdough bread', 'bread rolls'],
  }),
  i('farine', 'Farine', '🌾', 'feculents', { en: ['flour', 'plain flour', 'self-raising flour', 'all purpose flour'] }),
  i('semoule', 'Semoule', '🥣', 'feculents', { aliases: ['couscous'], en: ['couscous', 'semolina'] }),
  i('lentilles', 'Lentilles', '🫘', 'feculents', {
    aliases: ['lentilles corail'],
    en: ['lentils', 'red lentils', 'green lentils'],
  }),
  i('pois-chiches', 'Pois chiches', '🫘', 'feculents', { en: ['chickpeas'] }),
  i('haricots-rouges', 'Haricots rouges', '🫘', 'feculents', {
    en: ['kidney beans', 'red kidney beans', 'black beans'],
  }),
  i('nouilles', 'Nouilles', '🍜', 'feculents', {
    aliases: ['nouilles chinoises', 'ramen'],
    en: ['noodles', 'egg noodles', 'rice noodles', 'udon noodles'],
  }),
  i('tortillas', 'Tortillas', '🌯', 'feculents', {
    aliases: ['wraps'],
    en: ['tortillas', 'flour tortilla', 'tortilla wraps'],
  }),
  i('pate-brisee', 'Pâte brisée', '🥧', 'feculents', {
    aliases: ['pâte feuilletée', 'pâte à tarte'],
    en: ['shortcrust pastry', 'puff pastry'],
  }),
  // Viandes, poissons & œufs
  i('oeufs', 'Œufs', '🥚', 'proteines', {
    aliases: ['oeuf', 'œuf'],
    en: ['eggs', 'egg', 'egg yolks', 'free-range egg'],
  }),
  i('poulet', 'Poulet', '🍗', 'proteines', {
    aliases: ['blanc de poulet', 'escalope de poulet', 'cuisses de poulet'],
    en: ['chicken', 'chicken breast', 'chicken breasts', 'chicken thighs', 'chicken legs'],
  }),
  i('boeuf-hache', 'Bœuf haché', '🥩', 'proteines', {
    aliases: ['viande hachée', 'steak haché', 'boeuf'],
    en: ['minced beef', 'ground beef', 'beef mince', 'beef'],
  }),
  i('jambon', 'Jambon', '🥓', 'proteines', { en: ['ham'] }),
  i('lardons', 'Lardons', '🥓', 'proteines', {
    aliases: ['bacon', 'pancetta'],
    en: ['bacon', 'pancetta', 'smoked bacon'],
  }),
  i('saucisses', 'Saucisses', '🌭', 'proteines', {
    aliases: ['chipolatas', 'merguez'],
    en: ['sausages', 'pork sausages'],
  }),
  i('chorizo', 'Chorizo', '🌶️', 'proteines', { en: ['chorizo'] }),
  i('saumon', 'Saumon', '🐟', 'proteines', {
    aliases: ['pavé de saumon'],
    en: ['salmon', 'salmon fillets', 'smoked salmon'],
  }),
  i('thon', 'Thon en boîte', '🐟', 'proteines', { aliases: ['thon'], en: ['tuna', 'tinned tuna'] }),
  i('crevettes', 'Crevettes', '🦐', 'proteines', { en: ['prawns', 'king prawns', 'shrimp'] }),
  i('tofu', 'Tofu', '🧊', 'proteines', { en: ['tofu'] }),
  // Fruits & légumes
  i('tomates', 'Tomates', '🍅', 'legumes', {
    aliases: ['tomates cerises'],
    en: ['tomatoes', 'tomato', 'cherry tomatoes', 'plum tomatoes'],
    alts: ['tomates-concassees'],
  }),
  i('oignon', 'Oignon', '🧅', 'legumes', {
    aliases: ['oignons', 'échalote'],
    en: ['onion', 'onions', 'red onions', 'red onion', 'shallots', 'spring onions'],
  }),
  i('ail', 'Ail', '🧄', 'legumes', { en: ['garlic', 'garlic clove', 'garlic cloves'] }),
  i('carotte', 'Carottes', '🥕', 'legumes', { aliases: ['carotte'], en: ['carrots', 'carrot'] }),
  i('courgette', 'Courgette', '🥒', 'legumes', {
    aliases: ['courgettes'],
    en: ['courgettes', 'zucchini', 'courgette'],
  }),
  i('poivron', 'Poivron', '🫑', 'legumes', {
    aliases: ['poivrons'],
    en: ['red pepper', 'green pepper', 'yellow pepper', 'bell pepper', 'peppers'],
  }),
  i('champignons', 'Champignons', '🍄', 'legumes', { en: ['mushrooms', 'chestnut mushroom', 'button mushrooms'] }),
  i('epinards', 'Épinards', '🥬', 'legumes', { en: ['spinach', 'baby spinach'] }),
  i('brocoli', 'Brocoli', '🥦', 'legumes', { en: ['broccoli'] }),
  i('poireau', 'Poireau', '🥬', 'legumes', { aliases: ['poireaux'], en: ['leek', 'leeks'] }),
  i('aubergine', 'Aubergine', '🍆', 'legumes', { en: ['aubergine', 'eggplant'] }),
  i('salade', 'Salade', '🥗', 'legumes', {
    aliases: ['laitue', 'roquette'],
    en: ['lettuce', 'rocket', 'little gem lettuce'],
  }),
  i('concombre', 'Concombre', '🥒', 'legumes', { en: ['cucumber'] }),
  i('avocat', 'Avocat', '🥑', 'legumes', { en: ['avocado'] }),
  i('petits-pois', 'Petits pois', '🟢', 'legumes', { en: ['peas', 'frozen peas'] }),
  i('mais', 'Maïs', '🌽', 'legumes', { en: ['sweetcorn', 'corn'] }),
  i('citron', 'Citron', '🍋', 'legumes', { en: ['lemon', 'lemon juice', 'lime', 'lime juice'] }),
  i('banane', 'Banane', '🍌', 'legumes', { aliases: ['bananes'], en: ['banana', 'bananas'] }),
  i('pomme', 'Pomme', '🍎', 'legumes', { aliases: ['pommes'], en: ['apple', 'apples', 'bramley apples'] }),
  // Crèmerie
  i('lait', 'Lait', '🥛', 'cremerie', { en: ['milk', 'whole milk', 'semi-skimmed milk'] }),
  i('beurre', 'Beurre', '🧈', 'cremerie', { en: ['butter', 'unsalted butter', 'salted butter'] }),
  i('creme', 'Crème fraîche', '🥛', 'cremerie', {
    aliases: ['crème', 'crème liquide'],
    en: ['double cream', 'heavy cream', 'single cream', 'creme fraiche', 'sour cream'],
  }),
  i('fromage', 'Fromage râpé', '🧀', 'cremerie', {
    aliases: ['emmental', 'gruyère', 'comté', 'cheddar'],
    en: ['cheddar cheese', 'gruyere', 'cheese', 'grated cheese'],
    alts: ['parmesan', 'mozzarella'],
  }),
  i('parmesan', 'Parmesan', '🧀', 'cremerie', {
    en: ['parmesan', 'parmesan cheese', 'parmigiano-reggiano'],
    alts: ['fromage'],
  }),
  i('mozzarella', 'Mozzarella', '🧀', 'cremerie', { en: ['mozzarella', 'mozzarella balls'] }),
  i('feta', 'Feta', '🧀', 'cremerie', { en: ['feta'] }),
  i('chevre', 'Fromage frais', '🧀', 'cremerie', {
    aliases: ['chèvre', 'ricotta', 'boursin', 'philadelphia'],
    en: ['goats cheese', 'ricotta', 'cream cheese'],
  }),
  i('yaourt', 'Yaourt', '🥣', 'cremerie', {
    aliases: ['yaourt grec'],
    en: ['greek yogurt', 'yogurt', 'natural yoghurt'],
  }),
  // Placard
  i('huile', 'Huile', '🫒', 'placard', {
    aliases: ["huile d'olive"],
    en: ['olive oil', 'vegetable oil', 'oil', 'sunflower oil', 'extra virgin olive oil'],
    staple: true,
  }),
  i('sel', 'Sel', '🧂', 'placard', { en: ['salt', 'sea salt'], staple: true }),
  i('poivre', 'Poivre', '🧂', 'placard', { en: ['pepper', 'black pepper', 'ground black pepper'], staple: true }),
  i('eau', 'Eau', '💧', 'placard', { en: ['water'], staple: true }),
  i('sucre', 'Sucre', '🍬', 'placard', {
    aliases: ['cassonade'],
    en: ['sugar', 'caster sugar', 'brown sugar', 'icing sugar', 'granulated sugar'],
  }),
  i('tomates-concassees', 'Tomates en boîte', '🥫', 'placard', {
    aliases: ['coulis de tomate', 'passata', 'sauce tomate'],
    en: ['chopped tomatoes', 'tinned tomatoes', 'passata', 'tomato puree', 'tomato sauce'],
    alts: ['tomates'],
  }),
  i('bouillon', 'Bouillon cube', '🧊', 'placard', {
    aliases: ['bouillon'],
    en: ['chicken stock', 'vegetable stock', 'beef stock', 'stock', 'chicken stock cube'],
  }),
  i('sauce-soja', 'Sauce soja', '🍶', 'placard', { en: ['soy sauce', 'dark soy sauce', 'light soy sauce'] }),
  i('moutarde', 'Moutarde', '🟡', 'placard', { en: ['mustard', 'dijon mustard', 'english mustard'] }),
  i('miel', 'Miel', '🍯', 'placard', { en: ['honey'] }),
  i('lait-coco', 'Lait de coco', '🥥', 'placard', { en: ['coconut milk', 'coconut cream'] }),
  i('pesto', 'Pesto', '🌿', 'placard', { en: ['pesto'] }),
  i('chocolat', 'Chocolat', '🍫', 'placard', {
    aliases: ['cacao'],
    en: ['dark chocolate', 'milk chocolate', 'cocoa', 'chocolate chips'],
  }),
  i('levure', 'Levure chimique', '🧁', 'placard', { en: ['baking powder', 'bicarbonate of soda'] }),
  i('vinaigre', 'Vinaigre', '🍶', 'placard', {
    en: ['vinegar', 'balsamic vinegar', 'white wine vinegar', 'red wine vinegar'],
  }),
  // Herbes & épices
  i('curry', 'Curry', '🟠', 'epices', {
    aliases: ['curry en poudre', 'garam masala'],
    en: ['curry powder', 'garam masala', 'madras paste', 'curry paste'],
  }),
  i('paprika', 'Paprika', '🌶️', 'epices', { en: ['paprika', 'smoked paprika'] }),
  i('cumin', 'Cumin', '🟤', 'epices', { en: ['cumin', 'ground cumin', 'cumin seeds'] }),
  i('piment', 'Piment', '🌶️', 'epices', {
    aliases: ['chili'],
    en: ['chilli', 'chilli powder', 'red chilli', 'chilli flakes', 'cayenne pepper'],
  }),
  i('gingembre', 'Gingembre', '🫚', 'epices', { en: ['ginger', 'ground ginger'] }),
  i('cannelle', 'Cannelle', '🟫', 'epices', { en: ['cinnamon', 'ground cinnamon', 'cinnamon stick'] }),
  i('herbes', 'Herbes de Provence', '🌿', 'epices', {
    aliases: ['thym', 'romarin', 'origan'],
    en: ['thyme', 'rosemary', 'oregano', 'dried oregano', 'mixed herbs'],
  }),
  i('basilic', 'Basilic', '🌿', 'epices', { en: ['basil', 'basil leaves', 'fresh basil'] }),
  i('persil', 'Persil', '🌿', 'epices', {
    aliases: ['ciboulette', 'aneth'],
    en: ['parsley', 'flat leaf parsley', 'chives', 'dill'],
  }),
  i('coriandre', 'Coriandre', '🌿', 'epices', { en: ['coriander', 'coriander leaves', 'cilantro'] }),
];

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((x) => [x.id, x]));

/** Ingrédients mis en avant sur l'accueil et en haut du frigo. */
export const EVERYDAY = [
  'pates',
  'riz',
  'oeufs',
  'poulet',
  'pommes-de-terre',
  'tomates',
  'oignon',
  'fromage',
  'jambon',
  'courgette',
  'creme',
  'thon',
];
