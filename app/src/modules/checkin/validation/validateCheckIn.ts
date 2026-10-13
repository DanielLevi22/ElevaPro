import { lerRespostaNumerica } from '@elevapro/shared';
import { HINTS, WEIGHT_ERROR } from './messages';
import type { CheckInFields, CheckInInput, CheckInResult } from './types';

/**
 * Lê o check-in da semana (A4): pronto para enviar, incompleto ou com o peso
 * errado. O peso passa por `lerRespostaNumerica`, a mesma leitura da
 * anamnese: a vírgula do Android e a faixa ficam num lugar só.
 *
 * @example validateCheckIn({ logging: 'all', weight: '77,6' }).status // 'ready'
 * @example validateCheckIn({ logging: 'partial', weight: '' }, 'withoutWeight').status // 'ready'
 */
export function validateCheckIn(
  input: CheckInInput,
  fields: CheckInFields = 'withWeight'
): CheckInResult {
  if (!input.logging) return { status: 'incomplete', hint: HINTS.logging };
  if (fields === 'withoutWeight')
    return { status: 'ready', logging: input.logging, weightKg: null };
  if (!input.weight.trim()) return { status: 'incomplete', hint: HINTS.weight };

  const weight = lerRespostaNumerica(input.weight.trim(), 'weight');
  if (!weight.ok) return { status: 'invalid', error: WEIGHT_ERROR, hint: HINTS.invalid };
  return { status: 'ready', logging: input.logging, weightKg: weight.valor };
}
