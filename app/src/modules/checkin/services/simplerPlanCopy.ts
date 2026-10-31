import type { SimplerPlan } from '@elevapro/shared';

/** O que muda no plano mais simples, como a linha antes → depois mostra. */
export interface SimplerPlanRow {
  title: string;
  before: string;
  after: string;
  badge: string;
}

/** O teto de preparo que o pedido de "Mais rápido" faz à IA. */
const QUICK_RECIPE_MINUTES = 15;

/**
 * O porquê do plano mais simples (A5c), sem cobrança: a semana ficou fora do
 * plano, e em vez de cortar calorias o plano fica mais fácil de seguir.
 *
 * @example simplerPlanReason({ adherenceDays: 2, mealsPerDay: 5, nextMealsPerDay: 4 })
 * // "Você seguiu 2 de 7 dias. Em vez de cortar calorias, vamos deixar o plano mais fácil de seguir."
 */
export function simplerPlanReason(plan: SimplerPlan): string {
  return `Você seguiu ${plan.adherenceDays} de 7 dias. Em vez de cortar calorias, vamos deixar o plano mais fácil de seguir.`;
}

/**
 * As linhas do que muda: uma refeição a menos na mesma meta, e receitas rápidas.
 *
 * @example simplerPlanRows(plano)[0] // { title: 'Refeições por dia', before: '5', after: '4', badge: 'mesma meta' }
 */
export function simplerPlanRows(plan: SimplerPlan): SimplerPlanRow[] {
  return [
    {
      title: 'Refeições por dia',
      before: String(plan.mealsPerDay),
      after: String(plan.nextMealsPerDay),
      badge: 'mesma meta',
    },
    {
      title: 'Tempo das receitas',
      before: 'como hoje',
      after: `até ${QUICK_RECIPE_MINUTES} min`,
      badge: 'estimativa',
    },
  ];
}
