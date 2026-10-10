import { BffHttpError, BffUnreachableError, isConsentRequired } from '@/shared/bff';

/** Por que O8 não montou o plano. Cada causa tem texto e saída próprios. */
export type PlanFailure = 'rede' | 'plano' | 'aceite' | 'respostas' | 'servidor';

/**
 * A causa da falha ao gerar o plano. Antes, toda falha virava "sua conexão
 * caiu", inclusive o servidor fora do ar e a falta do aceite: a pessoa
 * conferia o wi-fi por um problema que não era dela.
 *
 * @example classifyPlanFailure(erro) // 'aceite'
 */
export function classifyPlanFailure(error: unknown): PlanFailure {
  if (error instanceof BffUnreachableError) return 'rede';
  if (isConsentRequired(error)) return 'aceite';
  if (!(error instanceof BffHttpError)) return 'servidor';
  if (error.code === 'plan_rejected') return 'plano';
  // Sem idade de adulto, a O4 é que diz por que o plano automático não atende.
  if (error.code === 'incomplete_answers' || error.code === 'under_age') return 'respostas';
  return 'servidor';
}

/** O código para o log: diz o que falhou, nunca o que havia no pedido. */
export function failureCode(error: unknown): string {
  if (error instanceof BffHttpError) return error.code;
  return error instanceof Error ? error.name : 'desconhecido';
}
