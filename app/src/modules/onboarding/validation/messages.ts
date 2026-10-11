import { AGE_RANGE, HEIGHT_RANGE, WEIGHT_RANGE } from './constants';

/**
 * O formato esperado, com exemplo: o kit pede que o erro diga como acertar, e
 * não só que errou (O4, estado "campo inválido").
 */
export const FIELD_ERRORS = {
  age: `Use anos inteiros, de ${AGE_RANGE.min} a ${AGE_RANGE.max}. Ex.: 29`,
  height: `Use centímetros, de ${HEIGHT_RANGE.min} a ${HEIGHT_RANGE.max}. Ex.: 172`,
  weight: `Use quilos, de ${WEIGHT_RANGE.min} a ${WEIGHT_RANGE.max}. Ex.: 78`,
} as const;

export const INCOMPLETE_HINT = 'Preencha idade, altura, peso e sexo para continuar';
export const INVALID_HINT = 'Corrija o campo destacado para continuar';
export const MINOR_HINT = 'O plano automático é só para maiores de 18 anos';
