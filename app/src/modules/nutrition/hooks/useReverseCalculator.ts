import { useState } from 'react';
import { matchFood, sortByMatch } from '../services/reverseCalculator';
import type { FoodItem, MacroTargets, MacroType, SubstitutionTarget } from '../types';

const ALL_MACROS: MacroType[] = ['protein', 'carbs', 'fat', 'calories'];

/** Os macros do original, arredondados como o campo os mostraria. */
function targetsFrom(original: SubstitutionTarget): MacroTargets {
  return Object.fromEntries(
    ALL_MACROS.map((macro) => [macro, String(Math.round(original[macro]))])
  );
}

/**
 * A calculadora reversa da troca: começa com os quatro macros do alimento
 * original como alvo, e a pessoa liga, desliga e ajusta cada um.
 *
 * @example
 * const calculator = useReverseCalculator(substitutionTarget);
 * calculator.match(food)?.quantity
 */
export function useReverseCalculator(original: SubstitutionTarget) {
  const [targets, setTargets] = useState<MacroTargets>(() => targetsFrom(original));
  const [activeMacros, setActiveMacros] = useState<MacroType[]>(ALL_MACROS);

  const toggle = (macro: MacroType) => {
    if (!activeMacros.includes(macro)) {
      setActiveMacros([...activeMacros, macro]);
      return;
    }
    setActiveMacros(activeMacros.filter((active) => active !== macro));
    setTargets(({ [macro]: _removed, ...rest }) => rest);
  };

  return {
    targets,
    activeMacros,
    toggle,
    setTarget: (macro: MacroType, value: string) =>
      setTargets((current) => ({ ...current, [macro]: value })),
    match: (food: FoodItem) => matchFood(food, targets, activeMacros),
    sort: (foods: FoodItem[]) => sortByMatch(foods, targets, activeMacros),
  };
}

export type ReverseCalculator = ReturnType<typeof useReverseCalculator>;
