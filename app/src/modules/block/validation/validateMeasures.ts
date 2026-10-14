import { WAIST_RANGE, WEIGHT_RANGE } from './constants';
import { MEASURE_ERRORS, MEASURE_HINTS } from './messages';
import type { MeasuresInput, MeasuresResult } from './types';

/** "77,6" e "77.6" valem o mesmo: o teclado do Android oferece a vírgula. */
function numberIn(text: string, range: { min: number; max: number }): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value >= range.min && value <= range.max ? value : null;
}

/**
 * Lê o peso e a cintura da reavaliação do bloco (B1): o peso é obrigatório, a
 * cintura não — sem fita métrica em casa, o bloco sai só com o peso.
 *
 * @example validateMeasures({ weight: '77,6', waist: '' }) // { status: 'ready', weightKg: 77.6, waistCm: null }
 */
export function validateMeasures(input: MeasuresInput): MeasuresResult {
  if (!input.weight.trim()) return { status: 'incomplete', hint: MEASURE_HINTS.weight };
  const weightKg = numberIn(input.weight, WEIGHT_RANGE);
  const waistCm = input.waist.trim() ? numberIn(input.waist, WAIST_RANGE) : null;
  const errors = {
    ...(weightKg === null ? { weight: MEASURE_ERRORS.weight } : {}),
    ...(input.waist.trim() && waistCm === null ? { waist: MEASURE_ERRORS.waist } : {}),
  };
  if (weightKg === null || Object.keys(errors).length > 0) {
    return { status: 'invalid', errors, hint: MEASURE_HINTS.invalid };
  }
  return { status: 'ready', weightKg, waistCm };
}
