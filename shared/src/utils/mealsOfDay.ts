import type { DietMeal, DietPlanType } from "../types/nutrition.types";

/**
 * As refeições que valem para o dia escolhido (domingo = 0, como `getUTCDay`).
 *
 * Mora no `shared` desde a #312: a aderência do plano do dia, da semana e do hub
 * de Progresso é a mesma regra, e o hub não pode importar o módulo de nutrição.
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
 * const doDia = mealsOfDay(meals, plano.plan_type, diaSelecionado);
 */
export function mealsOfDay<Meal extends Pick<DietMeal, "day_of_week">>(
  meals: readonly Meal[],
  planType: DietPlanType | null | undefined,
  weekday: number,
): Meal[] {
  // Dieta única vale todo dia: é o que "única" significa. Filtrar por dia aqui
  // seria procurar uma informação que o formato não guarda de propósito.
  if (planType === "unique") return [...meals];

  return meals.filter((meal) => meal.day_of_week === weekday);
}
