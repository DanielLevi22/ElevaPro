import { suggestDietGoal } from "./dietGoalSuggestion";
import {
  type BiologicalSex,
  calculateMacrosFromCalories,
  type EnergyGoal,
  type EnergyMacros,
} from "./energyTargets";

/**
 * A meta de dieta do Praticante: a conta da sugestão de meta com as travas de
 * segurança do onboarding (#365, ADR-0044). A IA nunca escolhe este número; ela
 * monta as refeições em cima dele.
 *
 * Os valores marcados como provisórios vêm da pesquisa
 * (`docs/research/regras-prescricao-praticante.md`) e esperam a validação de um
 * nutricionista (CRN) antes da abertura ao público.
 */

export interface PractitionerDietInput {
  age: number;
  sex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  /** Opção de `main_goal`: "Emagrecimento", "Hipertrofia"… */
  mainGoal?: string;
  trainingDaysPerWeek?: number;
  /** O resultado da triagem de O5; a condição nunca chega aqui. */
  dietScreening: "allowed" | "referred";
  /** O % de gordura do scan opcional depois de O4, quando a pessoa fez. */
  bodyFatPct?: number;
}

/** Qual trava mexeu na meta: a tela de plano explica por esse motivo, e a IA só verbaliza. */
export type DietGuard =
  | "bmr_floor"
  | "weekly_rate_cap"
  | "low_bmi_no_loss"
  | "reference_weight"
  | "lean_mass";

export type PractitionerDietTarget =
  | { kind: "no_diet" }
  | {
      kind: "target";
      tmb: number;
      tdee: number;
      goal: EnergyGoal;
      targetCalories: number;
      macros: EnergyMacros;
      guards: DietGuard[];
    };

const LOW_BMI = 18.5;
const OBESITY_BMI = 30;
/** Provisório (CRN): sem massa magra medida, o peso de referência é o de IMC 25. */
const REFERENCE_BMI = 25;
/** ~1% do peso por semana: 1% × 7.700 kcal/kg ÷ 7 dias (Helms 2014; Garthe 2011). */
const MAX_DEFICIT_KCAL_PER_KG = 11;

/**
 * @example
 * practitionerDietTarget({ age: 30, sex: "M", heightCm: 180, weightKg: 80, mainGoal: "Emagrecimento", dietScreening: "allowed" });
 * // { kind: "target", targetCalories: 1780, guards: ["bmr_floor"], ... }
 */
export function practitionerDietTarget(input: PractitionerDietInput): PractitionerDietTarget {
  if (input.dietScreening === "referred") return { kind: "no_diet" };

  const base = suggestDietGoal(input);
  // Com os quatro números presentes a sugestão sempre existe; o tipo é que não sabe.
  if (!base) return { kind: "no_diet" };

  const guards: DietGuard[] = [];
  const bmi = input.weightKg / (input.heightCm / 100) ** 2;
  let goal = base.goal;
  let calories = base.targetCalories;

  if (goal === "cutting" && bmi < LOW_BMI) {
    goal = "maintenance";
    calories = base.tdee;
    guards.push("low_bmi_no_loss");
  }

  const maxDeficit = MAX_DEFICIT_KCAL_PER_KG * input.weightKg;
  if (base.tdee - calories > maxDeficit) {
    calories = base.tdee - maxDeficit;
    guards.push("weekly_rate_cap");
  }

  if (calories < base.tmb) {
    calories = base.tmb;
    guards.push("bmr_floor");
  }

  const referenceWeight = macroWeight(input, bmi, guards);
  return {
    kind: "target",
    tmb: base.tmb,
    tdee: base.tdee,
    goal,
    targetCalories: Math.round(calories),
    macros: withLeanMassProtein(
      calculateMacrosFromCalories(calories, referenceWeight, goal),
      input,
      goal,
      guards,
    ),
    guards,
  };
}

/**
 * Proteína por kg de massa magra, com o % de gordura do scan. Provisório até o
 * CRN (ADR-0044): o corte fica em 2,5, dentro de 2,3–3,1 (Helms 2014).
 */
const PROTEIN_PER_LEAN_KG: Record<EnergyGoal, number> = {
  cutting: 2.5,
  maintenance: 2.0,
  bulking: 2.2,
};
/** O mesmo intervalo que a medida declarada aceita (`FAT_RANGE`): fora dele é erro. */
const PLAUSIBLE_FAT = { min: 3, max: 70 };

/**
 * Com o % de gordura medido, a proteína sai da massa magra; a gordura continua
 * pelo peso de referência e o carboidrato fica com o resto. As calorias não
 * mudam: só a divisão entre os macros.
 */
function withLeanMassProtein(
  macros: EnergyMacros,
  input: PractitionerDietInput,
  goal: EnergyGoal,
  guards: DietGuard[],
): EnergyMacros {
  const fat = input.bodyFatPct;
  if (fat === undefined || fat < PLAUSIBLE_FAT.min || fat > PLAUSIBLE_FAT.max) return macros;
  guards.push("lean_mass");
  const protein = Math.round(input.weightKg * (1 - fat / 100) * PROTEIN_PER_LEAN_KG[goal]);
  const carbs = Math.max(0, Math.round((macros.calories - protein * 4 - macros.fat * 9) / 4));
  return { ...macros, protein, carbs };
}

/**
 * O peso sobre o qual proteína e gordura são calculadas. Em obesidade, o peso
 * total inflava a proteína (130 kg → 286 g) e espremia o carboidrato até quase
 * zero; a faixa da literatura é por massa magra (ISSN 2017; Helms 2014).
 */
function macroWeight(input: PractitionerDietInput, bmi: number, guards: DietGuard[]): number {
  if (bmi < OBESITY_BMI) return input.weightKg;
  guards.push("reference_weight");
  return REFERENCE_BMI * (input.heightCm / 100) ** 2;
}

/** De 0 a 6: no caminho "só dieta", quem não se exercita conta como sedentário. */
const TRAINING_DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
/** O padrão de quem pulou O6: o mínimo de força da OMS com cada músculo 2× por semana. */
export const DEFAULT_TRAINING_DAYS = 3;

/**
 * A meta a partir das respostas gravadas do onboarding, como o BFF e o app as
 * leem: a mesma conta nas duas pontas, para a curva de O8 e o plano de O9 não
 * divergirem. `null` quando faltam os números do corpo (o onboarding não passou
 * de O4); sem dieta quando a triagem não liberou.
 *
 * @example practitionerDietTargetFromAnswers({ age: 30, height: 180, weight: 80, gender: "Masculino", diet_screening: "allowed" })
 */
export function practitionerDietTargetFromAnswers(
  answers: Record<string, unknown>,
  { bodyFatPct }: { bodyFatPct?: number } = {},
): PractitionerDietTarget | null {
  if (answers.diet_screening !== "allowed") return { kind: "no_diet" };
  const { age, height, weight, gender } = answers;
  if (typeof age !== "number" || typeof height !== "number" || typeof weight !== "number") {
    return null;
  }
  if (gender !== "Masculino" && gender !== "Feminino") return null;

  return practitionerDietTarget({
    age,
    heightCm: height,
    weightKg: weight,
    sex: gender === "Masculino" ? "M" : "F",
    mainGoal: typeof answers.main_goal === "string" ? answers.main_goal : undefined,
    trainingDaysPerWeek: TRAINING_DAY_OPTIONS.includes(answers.training_days as number)
      ? (answers.training_days as number)
      : DEFAULT_TRAINING_DAYS,
    dietScreening: "allowed",
    bodyFatPct,
  });
}
