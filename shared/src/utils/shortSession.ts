/** Os exercícios da versão curta (#376, F3): três cabem em uns 20 minutos. */
export const SHORT_SESSION_EXERCISES = 3;

/**
 * A versão curta do treino: os três primeiros na ordem do plano, que é a da
 * prioridade (o composto vem antes do isolado). Conta como treino feito.
 *
 * @example shortSession(treino.exercises).map((item) => item.order_index) // [0, 1, 2]
 */
export function shortSession<Item extends { order_index: number }>(items: readonly Item[]): Item[] {
  return [...items].sort((a, b) => a.order_index - b.order_index).slice(0, SHORT_SESSION_EXERCISES);
}
