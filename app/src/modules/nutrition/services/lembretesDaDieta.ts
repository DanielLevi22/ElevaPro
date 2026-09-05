import type { DietMeal, DietMealItem } from '@elevapro/shared';

/**
 * As refeições do plano viradas em lembretes agendáveis.
 *
 * Existe separado do agendamento porque a regra é sobre o dado e não sobre o
 * aparelho: refeição sem hora ou sem dia não pode virar notificação, e a única
 * alternativa a descartá-la seria inventar um horário — o aluno receberia um
 * aviso para comer numa hora que ninguém prescreveu.
 *
 * @example
 * await scheduleMealNotifications(plano.id, lembretesDaDieta(meals, itensPorRefeicao));
 */
export interface LembreteDeRefeicao {
  mealId: string;
  mealName: string;
  /** "HH:MM" — o agendador corta em `:` e converte. */
  mealTime: string;
  /** 0 (domingo) a 6 (sábado). */
  dayOfWeek: number;
  /** O que comer, para o aviso dizer mais que "está na hora". */
  foodNames?: string[];
}

export function lembretesDaDieta(
  meals: DietMeal[],
  itensPorRefeicao: Record<string, DietMealItem[]>
): LembreteDeRefeicao[] {
  const lembretes: LembreteDeRefeicao[] = [];

  for (const meal of meals) {
    // `day_of_week` 0 é domingo, e um `!meal.day_of_week` descartaria o domingo
    // inteiro sem ninguém notar.
    if (!meal.meal_time || meal.day_of_week === null || meal.day_of_week === undefined) continue;

    const nomes = (itensPorRefeicao[meal.id] ?? [])
      .map((item) => item.food?.name)
      .filter((nome): nome is string => Boolean(nome));

    lembretes.push({
      mealId: meal.id,
      mealName: meal.name ?? 'Refeição',
      mealTime: meal.meal_time,
      dayOfWeek: meal.day_of_week,
      ...(nomes.length > 0 ? { foodNames: nomes } : {}),
    });
  }

  return lembretes;
}
