import {
  type ActivityLevel,
  type BiologicalSex,
  calculateMacrosFromCalories,
  calculateTargetCalories,
  calculateTDEE,
  calculateTMB,
  type EnergyGoal,
  type EnergyMacros,
} from "./energyTargets";

/** O que a anamnese e a última medida dizem, já lido e normalizado. */
export interface DietGoalInputs {
  weightKg?: number;
  heightCm?: number;
  age?: number;
  sex?: BiologicalSex;
  trainingDaysPerWeek?: number;
  /** Opção de `profession_routine`: "Sedentário", "Ativo" ou "Pesado". */
  routine?: string;
  /** Opção de `main_goal`, como "Hipertrofia" ou "Emagrecimento". */
  mainGoal?: string;
}

export interface DietGoalSuggestion {
  tmb: number;
  tdee: number;
  goal: EnergyGoal;
  targetCalories: number;
  /** Meta menos GET: negativo é déficit, positivo é superávit. */
  deltaKcal: number;
  macros: EnergyMacros;
}

const GOAL_BY_MAIN_GOAL: Record<string, EnergyGoal> = {
  Emagrecimento: "cutting",
  Hipertrofia: "bulking",
};

const ACTIVITY_SCALE: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];

function activityFor(trainingDays = 0, routine?: string): ActivityLevel {
  const byTraining = trainingDays >= 6 ? 3 : trainingDays >= 4 ? 2 : trainingDays >= 2 ? 1 : 0;
  const bump = routine === "Pesado" ? 1 : 0;
  return ACTIVITY_SCALE[Math.min(byTraining + bump, ACTIVITY_SCALE.length - 1)];
}

/**
 * A meta diária sugerida para a tela de metas (#337): TMB pela Mifflin-St Jeor,
 * GET pela atividade declarada, e a meta do objetivo principal da anamnese.
 * Sem peso, altura, idade ou sexo devolve `null`: a tela pede a meta à mão em
 * vez de sugerir sobre um corpo inventado.
 *
 * @example
 * suggestDietGoal({ weightKg: 80, heightCm: 180, age: 30, sex: "M", mainGoal: "Emagrecimento" });
 */
export function suggestDietGoal(inputs: DietGoalInputs): DietGoalSuggestion | null {
  const { weightKg, heightCm, age, sex } = inputs;
  if (weightKg === undefined || heightCm === undefined || age === undefined || !sex) return null;

  const tmb = calculateTMB({ weightKg, heightCm, age, sex });
  const tdee = calculateTDEE(tmb, activityFor(inputs.trainingDaysPerWeek, inputs.routine));
  const goal = GOAL_BY_MAIN_GOAL[inputs.mainGoal ?? ""] ?? "maintenance";
  const targetCalories = calculateTargetCalories(tdee, goal);

  return {
    tmb,
    tdee,
    goal,
    targetCalories,
    deltaKcal: targetCalories - tdee,
    macros: calculateMacrosFromCalories(targetCalories, weightKg, goal),
  };
}
