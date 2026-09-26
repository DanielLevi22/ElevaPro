/**
 * Gasto energético e meta calórica, para sugerir a meta do plano de dieta.
 *
 * Mora no `shared` desde a #337: a tela de metas existe no web e no mobile, e a
 * mesma pessoa não pode receber duas sugestões diferentes.
 */

export type BiologicalSex = "M" | "F";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type EnergyGoal = "cutting" | "maintenance" | "bulking";

export interface EnergyMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BodyData {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
}

/**
 * TMB pela Mifflin-St Jeor, em kcal/dia.
 *
 * @example
 * calculateTMB({ weightKg: 80, heightCm: 180, age: 30, sex: "M" }); // 1780
 */
export function calculateTMB({ weightKg, heightCm, age, sex }: BodyData): number {
  const sexOffset = sex === "M" ? 5 : -161;
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset);
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Gasto energético total (GET): a TMB vezes o fator de atividade.
 *
 * @example
 * calculateTDEE(1780, "moderate"); // 2759
 */
export function calculateTDEE(tmb: number, activityLevel: ActivityLevel): number {
  return Math.round(tmb * ACTIVITY_FACTORS[activityLevel]);
}

const GOAL_FACTORS: Record<EnergyGoal, number> = {
  cutting: 0.8,
  maintenance: 1,
  bulking: 1.1,
};

/**
 * Meta calórica do objetivo: −20% no cutting, +10% no bulking.
 *
 * @example
 * calculateTargetCalories(2500, "cutting"); // 2000
 */
export function calculateTargetCalories(tdee: number, goal: EnergyGoal): number {
  return Math.round(tdee * GOAL_FACTORS[goal]);
}

// Gramas por kg de peso corporal. O carbo não tem fator: fica com o que sobra.
const GRAMS_PER_KG: Record<EnergyGoal, { protein: number; fat: number }> = {
  cutting: { protein: 2.2, fat: 0.8 },
  maintenance: { protein: 1.8, fat: 0.9 },
  bulking: { protein: 2.0, fat: 1.0 },
};

/**
 * Macros em gramas: proteína e gordura pelo peso, carbo pelo que resta da energia.
 *
 * @example
 * calculateMacrosFromCalories(2000, 80, "cutting"); // { protein: 176, fat: 64, carbs: 180, ... }
 */
export function calculateMacrosFromCalories(
  calories: number,
  weightKg: number,
  goal: EnergyGoal,
): EnergyMacros {
  const protein = weightKg * GRAMS_PER_KG[goal].protein;
  const fat = weightKg * GRAMS_PER_KG[goal].fat;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}
