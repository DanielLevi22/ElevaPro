import { WAIST_RANGE, WEIGHT_RANGE } from './constants';

/** O erro do campo diz o formato esperado, como nas outras medidas. */
export const MEASURE_ERRORS = {
  weight: `Use quilos, de ${WEIGHT_RANGE.min} a ${WEIGHT_RANGE.max}, com vírgula. Ex.: 77,6`,
  waist: `Use centímetros, de ${WAIST_RANGE.min} a ${WAIST_RANGE.max}. Ex.: 82`,
} as const;

/** Por que o botão está travado. Botão travado sem motivo é beco. */
export const MEASURE_HINTS = {
  weight: 'Informe seu peso de hoje',
  invalid: 'Corrija a medida para continuar',
} as const;
