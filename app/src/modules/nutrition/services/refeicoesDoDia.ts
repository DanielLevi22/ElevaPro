import type { DietMeal, DietPlanType } from '@elevapro/shared';

/**
 * As refeições que valem para o dia escolhido.
 *
 * Existem dois tipos de plano e a gravação respeita os dois: dieta **única**
 * guarda `day_of_week = null`, porque é uma estrutura só que vale a semana
 * inteira; dieta **cíclica** guarda 0–6, porque muda de um dia para o outro.
 *
 * A leitura conhecia só o segundo, filtrando por `day_of_week === diaEscolhido`.
 * Como `null` não é igual a nenhum dos sete dias, **nenhuma refeição de dieta
 * única aparecia em dia nenhum** — o plano abria vazio e quem tinha acabado de
 * montá-lo via o trabalho sumir.
 *
 * @example
 * const doDia = refeicoesDoDia(meals, plano.plan_type, diaSelecionado);
 */
export function refeicoesDoDia(
  meals: DietMeal[],
  planType: DietPlanType | null | undefined,
  diaEscolhido: number
): DietMeal[] {
  // Dieta única vale todo dia: é o que "única" significa. Filtrar por dia aqui
  // seria procurar uma informação que o formato não guarda de propósito.
  if (planType === 'unique') return meals;

  return meals.filter((meal) => meal.day_of_week === diaEscolhido);
}
