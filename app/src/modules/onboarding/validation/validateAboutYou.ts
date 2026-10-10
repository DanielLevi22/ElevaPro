import { lerRespostaNumerica } from '@elevapro/shared';
import { ADULT_AGE, AGE_RANGE } from './constants';
import { FIELD_ERRORS } from './messages';
import type { AboutYouField, AboutYouInput, AboutYouResult } from './types';

/**
 * Lê O4 · Sobre você: pronto para gravar, incompleto, com campo errado ou menor
 * de idade.
 *
 * Altura e peso passam por `lerRespostaNumerica`, a mesma leitura de quem
 * consome a anamnese depois: a faixa e a vírgula do Android ficam num lugar só.
 *
 * @example validateAboutYou({ age: '29', height: '172', weight: '78', sex: 'Feminino' }).status // 'ready'
 */
export function validateAboutYou(input: AboutYouInput): AboutYouResult {
  if (!input.age || !input.height || !input.weight || !input.sex) return { status: 'incomplete' };

  const age = readAge(input.age);
  const height = lerRespostaNumerica(input.height, 'height');
  const weight = lerRespostaNumerica(input.weight, 'weight');

  const errors: Partial<Record<AboutYouField, string>> = {};
  if (age === null) errors.age = FIELD_ERRORS.age;
  if (!height.ok) errors.height = FIELD_ERRORS.height;
  if (!weight.ok) errors.weight = FIELD_ERRORS.weight;
  if (age === null || !height.ok || !weight.ok) return { status: 'invalid', errors };

  // Depois da faixa, e não antes: idade digitada errada pede correção, e não
  // orientação para procurar um especialista.
  if (age < ADULT_AGE) return { status: 'minor' };

  return {
    status: 'ready',
    answers: { age, height: height.valor, weight: weight.valor, gender: input.sex },
  };
}

/** Idade em anos inteiros dentro da faixa, ou `null`. "29,5" é digitação, não idade. */
function readAge(typed: string): number | null {
  if (!/^\d+$/.test(typed.trim())) return null;
  const age = Number(typed);
  return age >= AGE_RANGE.min && age <= AGE_RANGE.max ? age : null;
}
