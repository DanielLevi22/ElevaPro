/** Quilocalorias em um quilo de tecido corporal: a conta clássica (Wishnofsky). */
const KCAL_PER_KG = 7700;
/** A curva de O8 olha 16 semanas; o relatório do bloco, as 4 dele. */
const WEEKS = 16;
/** Abaixo disto a meta é manutenção, e não há curva para desenhar. */
const MAINTENANCE_MARGIN = 50;
/**
 * A faixa provável vai de 60% a 100% da mudança calculada: o gasto se adapta
 * com o tempo e a conta linear superestima. Provisório até o CRN (ADR-0044).
 */
const LIKELY_FLOOR = 0.6;

export interface WeightProjection {
  startKg: number;
  weeks: number;
  direction: "loss" | "gain";
  /** O peso provável ao fim, do mais conservador ao da conta linear. */
  likelyEndKg: { from: number; to: number };
}

const oneDecimal = (value: number) => Math.round(value * 10) / 10;

/**
 * A curva de O8: para onde o peso tende com a meta do código. É estimativa, e a
 * tela diz isso; o check-in semanal recalibra em 2 a 4 semanas. Mora no `shared`
 * porque o relatório do bloco (#376, B4) compara o prometido com o real.
 *
 * @example projectWeight({ weightKg: 86, tdee: 2539, targetCalories: 1989 }) // { direction: 'loss', … }
 */
export function projectWeight({
  weightKg,
  tdee,
  targetCalories,
  weeks = WEEKS,
}: {
  weightKg: number;
  tdee: number;
  targetCalories: number;
  weeks?: number;
}): WeightProjection | null {
  const dailyDelta = targetCalories - tdee;
  if (Math.abs(dailyDelta) < MAINTENANCE_MARGIN) return null;

  const change = (dailyDelta * 7 * weeks) / KCAL_PER_KG;
  const linear = oneDecimal(weightKg + change);
  const conservative = oneDecimal(weightKg + change * LIKELY_FLOOR);
  return {
    startKg: weightKg,
    weeks,
    direction: change < 0 ? "loss" : "gain",
    likelyEndKg: { from: Math.min(linear, conservative), to: Math.max(linear, conservative) },
  };
}
