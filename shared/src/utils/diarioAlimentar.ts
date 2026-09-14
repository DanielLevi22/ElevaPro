import type { DietMeal, DietMealItem, ItemRegistrado } from "../types/nutrition.types";

/**
 * O prato registrado com um item a mais: o que o aluno achou na busca, o prato
 * do scan, a sugestão aceita do assistente.
 *
 * Sem registro ainda, o prato do plano é copiado antes: o extra entra **junto**
 * dele, e não no lugar. Com registro, o que está lá fica — inclusive a troca.
 *
 * @example
 * const itens = itensComExtra(registro?.actual_items, itensDoPlano, { id: `extra_${Date.now()}`, … });
 */
export function itensComExtra(
  registrados: unknown,
  doPlano: DietMealItem[],
  extra: ItemRegistrado,
): ItemRegistrado[] {
  const base = Array.isArray(registrados)
    ? (registrados as ItemRegistrado[])
    : doPlano.map(({ id, quantity, unit, food }) => ({ id, quantity, unit, food }));
  return [...base, extra];
}

function minutosDoDia(horario: string): number {
  const [horas, minutos] = horario.split(":").map(Number);
  return horas * 60 + minutos;
}

/**
 * A refeição do plano cujo horário está mais perto de agora — onde o item
 * extra entra se o aluno não escolher outra.
 *
 * Refeição sem horário nunca é escolhida sozinha. No empate, fica a que já
 * passou: quem come às 10h05 está mais para o fim do café que para o almoço.
 *
 * @example refeicaoMaisProxima(refeicoesDeHoje, "12:10")?.id
 */
export function refeicaoMaisProxima(refeicoes: DietMeal[], agora: string): DietMeal | null {
  const alvo = minutosDoDia(agora);
  let melhor: DietMeal | null = null;
  let menorDistancia = Number.POSITIVE_INFINITY;

  for (const refeicao of refeicoes) {
    if (!refeicao.meal_time) continue;
    const distancia = Math.abs(minutosDoDia(refeicao.meal_time) - alvo);
    const desempataParaAnterior =
      distancia === menorDistancia && melhor?.meal_time && refeicao.meal_time < melhor.meal_time;
    if (distancia < menorDistancia || desempataParaAnterior) {
      melhor = refeicao;
      menorDistancia = distancia;
    }
  }
  return melhor;
}
