/** Um alimento do catálogo, com os macros por porção (`serving_size`). */
export interface FoodItem {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving_size: number;
  serving_unit: string;
}

export type MacroType = 'protein' | 'carbs' | 'fat' | 'calories';

/** Alvos digitados na calculadora reversa: texto, como saem do campo. */
export type MacroTargets = Partial<Record<MacroType, string>>;

/** Os macros do alimento que vai ser trocado. */
export type SubstitutionTarget = Record<MacroType, number>;
