import { PRACTITIONER_MIN_AGE } from '@elevapro/shared';

/** A regra mora no `shared`: o servidor recusa o plano pela mesma idade. */
export const ADULT_AGE = PRACTITIONER_MIN_AGE;

/**
 * Abaixo disto e acima do máximo é digitação errada, e não idade: quem tem 12
 * anos é menor e recebe a orientação; quem digita 2 errou o campo.
 */
export const AGE_RANGE = { min: 10, max: 100 };

/** As mesmas faixas que `lerRespostaNumerica` confere: é ela que lê a resposta. */
export const HEIGHT_RANGE = { min: 100, max: 250 };
export const WEIGHT_RANGE = { min: 30, max: 300 };

/** Os valores que a anamnese já grava em `gender`; o texto do kit é o mesmo. */
export const SEX_OPTIONS = [
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Masculino', label: 'Masculino' },
] as const;
