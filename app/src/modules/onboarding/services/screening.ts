import type { InjuryRegion } from '@elevapro/shared/data/anamnesisAdaptive';
import { toggleExclusive } from './toggleExclusive';

/**
 * A triagem de saúde de O5: decide se o app monta dieta para o Praticante.
 *
 * Regra em código, e não na IA (ADR-0044): "condição clínica → sem dieta" não
 * pode depender de o modelo lembrar. Base: Lei 8.234/1991, art. 3º, VII e VIII.
 */

export const HEALTH_CONDITIONS = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'kidney', label: 'Doença renal' },
  { id: 'pregnancy', label: 'Gestação ou amamentação' },
  { id: 'eating_disorder', label: 'Transtorno alimentar (atual ou passado)' },
  { id: 'injury', label: 'Lesão ou dor' },
  { id: 'none', label: 'Nenhum' },
] as const;

export type HealthCondition = (typeof HEALTH_CONDITIONS)[number]['id'];

/** Lesão muda o treino, não a alimentação: não está aqui. */
const CLINICAL: readonly HealthCondition[] = ['diabetes', 'kidney', 'pregnancy', 'eating_disorder'];

export type ScreeningAnswer =
  | {
      kind: 'answered';
      conditions: HealthCondition[];
      /** Onde dói, quando marcou "Lesão ou dor". */
      injuryRegions?: readonly InjuryRegion[];
    }
  /** "Prefiro não informar": a triagem é obrigatória, mas responder não é. */
  | { kind: 'declined' };

export type ScreeningResult =
  | { diet: 'allowed' }
  | { diet: 'referred'; reason: 'clinical_condition' | 'undisclosed' };

/**
 * @example screen({ kind: 'answered', conditions: ['diabetes'] }) // { diet: 'referred', reason: 'clinical_condition' }
 */
export function screen(answer: ScreeningAnswer): ScreeningResult {
  if (answer.kind === 'declined') return { diet: 'referred', reason: 'undisclosed' };
  const clinical = answer.conditions.some((condition) => CLINICAL.includes(condition));
  return clinical ? { diet: 'referred', reason: 'clinical_condition' } : { diet: 'allowed' };
}

/**
 * O que a anamnese grava da triagem: o resultado, nunca a condição (ADR-0044).
 *
 * Quem lê depois — o plano, a IA, um especialista que se vincule — recebe "dieta
 * encaminhada", e não "diabetes". A lesão é a exceção, por região: o treino
 * precisa saber que há uma, e o especialista que se vincule, onde (`injuryRecord`).
 *
 * @example screeningRecord({ kind: 'answered', conditions: ['none'] }) // { diet_screening: 'allowed', injury_reported: false }
 */
export function screeningRecord(answer: ScreeningAnswer): Record<string, unknown> {
  const result = screen(answer);
  const injured = answer.kind === 'answered' && answer.conditions.includes('injury');
  // Marcou lesão é lesão, mesmo sem região: a região diz onde, não se há.
  const injury = {
    injury_reported: injured,
    injuries: injured && answer.kind === 'answered' ? [...(answer.injuryRegions ?? [])] : [],
  };
  if (result.diet === 'allowed') return { diet_screening: 'allowed', ...injury };
  return {
    diet_screening: 'referred',
    diet_screening_reason: result.reason,
    // Quem não informou não disse se tem lesão: ausente, e não "não".
    ...(answer.kind === 'answered' ? injury : {}),
  };
}

/**
 * A lesão como a anamnese grava: se há, e onde. `injuries` é a mesma chave da
 * anamnese longa, que o especialista já lê. A região não vai à IA: ela recebe
 * só a regra de treino (`planPrompt`).
 *
 * @example injuryRecord(['Joelhos']) // { injury_reported: true, injuries: ['Joelhos'] }
 */
export function injuryRecord(regions: readonly InjuryRegion[]): Record<string, unknown> {
  return { injury_reported: regions.length > 0, injuries: [...regions] };
}

/**
 * "Nenhum" é exclusivo: marcar ele limpa o resto, e marcar outra coisa tira ele.
 *
 * @example toggleCondition(['none'], 'diabetes') // ['diabetes']
 */
export function toggleCondition(
  selected: HealthCondition[],
  condition: HealthCondition
): HealthCondition[] {
  return toggleExclusive(selected, condition, 'none');
}
