import type { FoodItem, MacroTargets, MacroType } from '../types';

export interface FoodMatch {
  /** Quantidade, na unidade da porção, que entrega os alvos. */
  quantity: number;
  /** De 0 a 100: quão perto os alvos ficam de pedir a mesma quantidade. */
  score: number;
  isMatch: boolean;
}

const DEFAULT_SERVING = 100;
const NO_MATCH: FoodMatch = { quantity: 0, score: 0, isMatch: false };

/**
 * A quantidade de um alimento que acerta os alvos ativos, e a nota do acerto.
 *
 * Cada alvo pede uma quantidade; a sugestão é a média delas, e a nota cai com a
 * dispersão — um alimento que acerta proteína e carboidrato com a mesma porção
 * é troca melhor que um que só acerta um dos dois.
 *
 * @example
 * matchFood(frango, { protein: '62' }, ['protein']) // { quantity: 200, score: 100, isMatch: true }
 */
export function matchFood(
  food: FoodItem,
  targets: MacroTargets,
  activeMacros: MacroType[]
): FoodMatch | null {
  const quantities = requestedQuantities(food, targets, activeMacros);
  if (quantities.length === 0) return null;
  if (quantities.includes(Number.POSITIVE_INFINITY)) return NO_MATCH;

  const average = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
  const variance = quantities.reduce((sum, q) => sum + (q - average) ** 2, 0) / quantities.length;
  return { quantity: average, score: 100 / (1 + variance / 1000), isMatch: true };
}

/** A quantidade que cada alvo preenchido pede; infinita se o alimento não tem o macro. */
function requestedQuantities(
  food: FoodItem,
  targets: MacroTargets,
  activeMacros: MacroType[]
): number[] {
  return activeMacros.flatMap((macro) => {
    const target = Number.parseFloat(targets[macro] || '0');
    if (!(target > 0)) return [];
    const perServing = food[macro] ?? 0;
    if (perServing <= 0) return [Number.POSITIVE_INFINITY];
    return [(target / perServing) * (food.serving_size || DEFAULT_SERVING)];
  });
}

/**
 * Os resultados da busca com o melhor acerto primeiro. Sem macro ativo, a ordem
 * da busca fica como veio.
 *
 * @example
 * sortByMatch(foods, { protein: '30' }, ['protein'])
 */
export function sortByMatch(
  foods: FoodItem[],
  targets: MacroTargets,
  activeMacros: MacroType[]
): FoodItem[] {
  if (activeMacros.length === 0) return foods;
  const score = (food: FoodItem) => {
    const match = matchFood(food, targets, activeMacros);
    return match?.isMatch ? match.score : -1;
  };
  return [...foods].sort((a, b) => score(b) - score(a));
}
