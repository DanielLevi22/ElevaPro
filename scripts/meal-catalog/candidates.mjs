import { createHash } from "node:crypto";
import { groupFoods, normalizeFoodName } from "./groups.mjs";

/** @typedef {import('./groups.mjs').CatalogFood} CatalogFood */
/** @typedef {{id: string, template: string, title: string, foodIds: string[], ingredients: string[], reviewStatus: 'pending'}} MealCandidate */

const TEMPLATES = [
  { id: "savory_plate", title: "Prato", roles: ["starch", "mainProtein", "vegetable"] },
  { id: "legume_plate", title: "Prato com leguminosa", roles: ["starch", "legume", "vegetable"] },
  { id: "sandwich", title: "Sanduíche ou torrada", roles: ["carrier", "savoryFilling"] },
  { id: "yogurt_bowl", title: "Bowl", roles: ["yogurt", "fruit", "topping"] },
  { id: "smoothie", title: "Vitamina", roles: ["liquid", "smoothieFruit"] },
  { id: "porridge", title: "Mingau", roles: ["liquid", "oats", "porridgeFruit"] },
  {
    id: "seasoned_side",
    title: "Legumes com finalização",
    roles: ["cookedVegetable", "seasoning", "cookingFat"],
  },
  { id: "snack_plate", title: "Lanche", roles: ["readySnack", "fruit"] },
  { id: "paired_drink", title: "Lanche com bebida", roles: ["readySnack", "beverage"] },
  { id: "protein_drink", title: "Bebida com suplemento", roles: ["liquid", "powder"] },
];

/** Rótulos humanos das regras de combinação. @example MEAL_TEMPLATE_TITLES.savory_plate */
export const MEAL_TEMPLATE_TITLES = Object.fromEntries(
  TEMPLATES.map((template) => [template.id, template.title]),
);

function* combinations(groups, selected = []) {
  if (!groups.length) {
    yield selected;
    return;
  }
  for (const food of groups[0]) yield* combinations(groups.slice(1), [...selected, food]);
}

function candidate(template, foods) {
  const ingredients = foods.map((food) => food.name);
  const key = `${template.id}:${ingredients.map(normalizeFoodName).join("|")}`;
  const suffix = createHash("sha256").update(key).digest("hex").slice(0, 16);
  return {
    id: `candidate-${suffix}`,
    template: template.id,
    title: `${template.title}: ${ingredients.join(" + ")}`,
    foodIds: foods.map((food) => food.id),
    ingredients,
    reviewStatus: "pending",
  };
}

/** Enumera o universo finito das regras atuais, ainda sujeito a revisão culinária. @example buildMealCandidates(foods) */
/** @param {CatalogFood[]} foods @returns {MealCandidate[]} */
export function buildMealCandidates(foods) {
  const groups = groupFoods(foods);
  const unique = new Map();
  for (const template of TEMPLATES) {
    for (const selected of combinations(template.roles.map((role) => groups[role]))) {
      if (new Set(selected.map((food) => food.id)).size !== selected.length) continue;
      const option = candidate(template, selected);
      unique.set(option.id, option);
    }
  }
  return [...unique.values()].sort((first, second) => first.id.localeCompare(second.id));
}

/** Lista itens sem combinação para revisão explícita, sem forçar suplemento a virar prato. @example uncoveredFoods(foods, candidates) */
export function uncoveredFoods(foods, candidates) {
  const covered = new Set(candidates.flatMap((option) => option.foodIds));
  return foods.filter((food) => !covered.has(food.id));
}
