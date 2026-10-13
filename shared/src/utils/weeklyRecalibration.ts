/**
 * A recalibração da meta no check-in da semana (#376): compara o que o peso fez
 * com o que a meta prometia e propõe um passo. A proposta só vale aprovada
 * (ADR-0020), e o banco recusa passo maior que 200 kcal mesmo se esta conta
 * mudar (`apply_weekly_calorie_adjustment`, 0088).
 *
 * Os valores marcados como provisórios esperam a validação do CRN (ADR-0044).
 * Base: o check-in do Carbon e do MacroFactor (`docs/research/apps-nutricao.md`).
 */

export type CheckInLogging = "all" | "partial" | "followed_unlogged" | "not_followed";

export interface RecalibrationInput {
  logging: CheckInLogging;
  /** O peso desta semana; `null` quando a pessoa não pesou. */
  weightKg: number | null;
  /** O peso declarado antes desta semana; `null` na primeira. */
  previousWeightKg: number | null;
  targetCalories: number;
  /** Gasto e TMB recalculados com o peso desta semana. */
  tdee: number;
  tmb: number;
}

/**
 * O que a semana disse. Peso acima do ritmo baixa a meta e abaixo sobe: vale
 * para perder, manter e ganhar, e é o motivo que o banco grava.
 */
export type RecalibrationVerdict =
  | "on_pace"
  | "weight_above_pace"
  | "weight_below_pace"
  | "insufficient_data"
  | "low_adherence";

export interface Recalibration {
  verdict: RecalibrationVerdict;
  proposedCalories: number;
  deltaCalories: number;
  /** Quanto o peso devia ter mudado na semana, pela meta: negativo é perda. */
  expectedChangeKg: number | null;
  actualChangeKg: number | null;
  /** Qual trava segurou o passo. A tela explica por ela. */
  guard?: "bmr_floor" | "weekly_rate_cap";
}

/** Provisório (CRN): o passo semanal, dentro dos 100–200 que a pesquisa traz. */
const WEEKLY_STEP_KCAL = 150;
/** Provisório (CRN): oscilação de água e intestino que não conta como desvio. */
const PACE_TOLERANCE_KG = 0.2;
const KCAL_PER_KG = 7700;
/** O mesmo teto do onboarding: ~1% do peso por semana (`practitionerDietTarget`). */
const MAX_DEFICIT_KCAL_PER_KG = 11;
const ROUNDING = 10;

/**
 * @example
 * recalibrateWeeklyTarget({ logging: "all", weightKg: 77.9, previousWeightKg: 78, targetCalories: 2150, tdee: 2700, tmb: 1700 });
 * // { verdict: "weight_above_pace", proposedCalories: 2000, deltaCalories: -150, ... }
 */
export function recalibrateWeeklyTarget(input: RecalibrationInput): Recalibration {
  const expected = ((input.targetCalories - input.tdee) * 7) / KCAL_PER_KG;
  const keep = (verdict: RecalibrationVerdict, actual: number | null = null): Recalibration => ({
    verdict,
    proposedCalories: input.targetCalories,
    deltaCalories: 0,
    expectedChangeKg: expected,
    actualChangeKg: actual,
  });

  // Registro parcial não sustenta ajuste; quem não seguiu não ganha corte.
  if (input.logging === "partial") return keep("insufficient_data");
  if (input.logging === "not_followed") return keep("low_adherence");
  if (input.weightKg === null || input.previousWeightKg === null) return keep("insufficient_data");

  const actual = input.weightKg - input.previousWeightKg;
  const deviation = actual - expected;
  if (Math.abs(deviation) <= PACE_TOLERANCE_KG) return keep("on_pace", actual);

  const verdict = deviation > 0 ? "weight_above_pace" : "weight_below_pace";
  return { ...stepTowardPace(input, verdict), expectedChangeKg: expected, actualChangeKg: actual };
}

/** Um passo só, por mais longe que o peso esteja: a meta não compensa atraso. */
function stepTowardPace(
  input: RecalibrationInput,
  verdict: "weight_above_pace" | "weight_below_pace",
): Pick<Recalibration, "verdict" | "proposedCalories" | "deltaCalories" | "guard"> {
  const step = verdict === "weight_above_pace" ? -WEEKLY_STEP_KCAL : WEEKLY_STEP_KCAL;
  const stepped = Math.round((input.targetCalories + step) / ROUNDING) * ROUNDING;
  const floor = lowestAllowed(input);
  // Arredondar o piso para cima: para baixo, a meta furaria a trava por 1 a 9 kcal.
  const proposed = Math.max(stepped, Math.ceil(floor.value / ROUNDING) * ROUNDING);
  const guard = stepped < proposed ? floor.guard : undefined;

  // Já no piso, o passo para baixo não acontece: subir seria o sentido contrário.
  if (step < 0 && proposed >= input.targetCalories) {
    return { verdict, proposedCalories: input.targetCalories, deltaCalories: 0, guard };
  }
  return {
    verdict,
    proposedCalories: proposed,
    deltaCalories: proposed - input.targetCalories,
    guard,
  };
}

/** A meta mais baixa permitida: a TMB, ou o déficit de ~1% do peso por semana. */
function lowestAllowed(input: RecalibrationInput): {
  value: number;
  guard: "bmr_floor" | "weekly_rate_cap";
} {
  const weight = input.weightKg ?? input.previousWeightKg ?? 0;
  const rateCap = input.tdee - MAX_DEFICIT_KCAL_PER_KG * weight;
  return input.tmb >= rateCap
    ? { value: input.tmb, guard: "bmr_floor" }
    : { value: rateCap, guard: "weekly_rate_cap" };
}
