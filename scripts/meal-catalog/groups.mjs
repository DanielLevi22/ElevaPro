/** @typedef {{id: string, name: string, category: string}} CatalogFood */

const NAME_PATTERNS = {
  starch: /arroz|batata|cara cozido|inhame|mandioca|macarrao|polenta|quinoa|cuscuz|milho verde/,
  carrier: /pao (?!de queijo)|torrada|biscoito de arroz|tapioca/,
  oats: /aveia/,
  yogurt: /iogurte|kefir/,
  liquid: /leite|bebida de/,
  cheese: /queijo|ricota|requeijao/,
  coldProtein: /peito de peru|presunto|ovo inteiro cozido|ovo de codorna cozido/,
  seasoning: /^(alho|cebola|limao|azeitona verde)$/,
  cookingFat: /azeite|oleo|manteiga/,
  topping:
    /amendoim|amendoas|avela|castanha|nozes|chia|linhaca|gergelim|semente|granola|aveia em flocos|coco fresco/,
  readySnack:
    /crepioca|panqueca de aveia|pao de queijo|barra de proteina|biscoito de arroz|torrada/,
  powder: /albumina|caseina|colageno|proteina vegetal|whey/,
};

const ROLE_CATEGORIES = {
  starch: ["carboidrato"],
  carrier: ["carboidrato"],
  oats: ["carboidrato"],
  yogurt: ["laticinio"],
  liquid: ["laticinio"],
  cheese: ["laticinio"],
  coldProtein: ["proteina"],
  cookingFat: ["gordura"],
  powder: ["suplemento"],
  topping: ["gordura", "carboidrato"],
  readySnack: ["carboidrato", "suplemento"],
};

/** Normaliza apenas para classificação editorial. @example normalizeFoodName('Maçã') */
export function normalizeFoodName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Forma grupos culinários sem inferir dieta ou composição nutricional. @example groupFoods(foods) */
export function groupFoods(foods) {
  const matches = (role) =>
    foods.filter(
      (food) =>
        NAME_PATTERNS[role].test(normalizeFoodName(food.name)) &&
        (!ROLE_CATEGORIES[role] || ROLE_CATEGORIES[role].includes(food.category)),
    );
  const category = (name) => foods.filter((food) => food.category === name);
  const excludeNames = (items, pattern) =>
    items.filter((food) => !pattern.test(normalizeFoodName(food.name)));
  return {
    ...Object.fromEntries(Object.keys(NAME_PATTERNS).map((role) => [role, matches(role)])),
    mainProtein: excludeNames(category("proteina"), /peito de peru|presunto/),
    vegetable: excludeNames(category("hortalica"), /^(alho|cebola)$/),
    cookedVegetable: category("hortalica").filter((food) =>
      /cozid|refogad/.test(normalizeFoodName(food.name)),
    ),
    fruit: excludeNames(category("fruta"), /^limao$/),
    smoothieFruit: category("fruta").filter((food) =>
      /banana (nanica|prata)|morango|mirtilo|framboesa|abacate|mamao|manga|acai/.test(
        normalizeFoodName(food.name),
      ),
    ),
    porridgeFruit: category("fruta").filter((food) =>
      /banana (nanica|prata)|maca|uva passa|damasco|tamara/.test(normalizeFoodName(food.name)),
    ),
    legume: excludeNames(category("leguminosa"), /^homus$/),
    savoryFilling: [
      ...matches("cheese"),
      ...matches("coldProtein"),
      ...foods.filter((food) => food.name === "Homus"),
    ],
    beverage: category("bebida"),
  };
}
