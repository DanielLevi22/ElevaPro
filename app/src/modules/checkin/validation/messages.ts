import { WEIGHT_RANGE } from './constants';

/** O erro do campo diz o formato esperado, como o desenho A4 pede. */
export const WEIGHT_ERROR = `Use quilos, de ${WEIGHT_RANGE.min} a ${WEIGHT_RANGE.max}, com vírgula. Ex.: 77,6`;

/** Por que o botão está travado. Botão travado sem motivo é beco. */
export const HINTS = {
  logging: 'Conte como foi o registro da semana',
  weight: 'Informe seu peso de hoje',
  invalid: 'Corrija o peso para continuar',
} as const;
