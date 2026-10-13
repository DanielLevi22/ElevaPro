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
  /**
   * Semanas entre as duas pesagens. Quem pula check-in compara com uma pesagem
   * de duas ou três semanas atrás, e a variação inteira contra o ritmo de uma
   * semana só dava veredito falso. Padrão: 1.
   */
  weeksSincePrevious?: number;
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
  /** Quanto mudou por semana entre as duas pesagens. */
  actualChangeKg: number | null;
  /** Qual trava segurou o passo. A tela explica por ela. */
  guard?: RecalibrationGuard;
}

/** Provisório (CRN): o passo semanal, dentro dos 100–200 que a pesquisa traz. */
const WEEKLY_STEP_KCAL = 150;
export type RecalibrationGuard = "bmr_floor" | "weekly_rate_cap" | "weekly_gain_cap";

/** Provisório (CRN): oscilação de água e intestino que não conta como desvio. */
export const PACE_TOLERANCE_KG = 0.2;
const KCAL_PER_KG = 7700;
/** O mesmo teto do onboarding: ~1% do peso por semana (`practitionerDietTarget`). */
const MAX_DEFICIT_KCAL_PER_KG = 11;
/**
 * Provisório (CRN): ~0,5% do peso por semana de ganho, o teto da faixa de
 * iniciante e intermediário (`regras-prescricao-praticante.md`, F26):
 * 0,5% × 7.700 kcal/kg ÷ 7 dias.
 */
const MAX_SURPLUS_KCAL_PER_KG = 5.5;
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

  const weeks = Math.max(1, input.weeksSincePrevious ?? 1);
  const actual = (input.weightKg - input.previousWeightKg) / weeks;
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
  // O passo não é arredondado: com a meta em 3.231, arredondar a nova para 10
  // mostrava "−151 kcal". Só as travas arredondam, para dentro da faixa.
  const stepped = input.targetCalories + step;
  const { value: proposed, guard } = withinLimits(stepped, input);

  // Já na trava, o passo não acontece: andar seria o sentido contrário.
  if (Math.sign(proposed - input.targetCalories) !== Math.sign(step)) {
    return { verdict, proposedCalories: input.targetCalories, deltaCalories: 0, guard };
  }
  return {
    verdict,
    proposedCalories: proposed,
    deltaCalories: proposed - input.targetCalories,
    guard,
  };
}

/**
 * A meta dentro das travas: nunca abaixo da TMB nem do déficit de ~1% do peso
 * por semana, nunca acima do ganho de ~0,5%.
 */
function withinLimits(
  calories: number,
  input: RecalibrationInput,
): { value: number; guard?: RecalibrationGuard } {
  const weight = input.weightKg ?? input.previousWeightKg ?? 0;
  const ceiling = Math.floor((input.tdee + MAX_SURPLUS_KCAL_PER_KG * weight) / ROUNDING) * ROUNDING;
  if (calories > ceiling) return { value: ceiling, guard: "weekly_gain_cap" };

  const rateCap = input.tdee - MAX_DEFICIT_KCAL_PER_KG * weight;
  const floor =
    input.tmb >= rateCap
      ? { value: input.tmb, guard: "bmr_floor" as const }
      : { value: rateCap, guard: "weekly_rate_cap" as const };
  // Arredondar o piso para cima: para baixo, a meta furaria a trava por 1 a 9 kcal.
  const floorValue = Math.ceil(floor.value / ROUNDING) * ROUNDING;
  return calories < floorValue ? { value: floorValue, guard: floor.guard } : { value: calories };
}
