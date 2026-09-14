import { useNutritionStore } from '../store/nutritionStore';

/**
 * Carrega no store o plano ativo do aluno, as refeições dele e, com `data`, os
 * registros daquele dia.
 *
 * Refeições e registros não dependem um do outro e vão em paralelo; o plano
 * vai antes, porque as refeições são dele.
 *
 * @example await carregarPlanoDoAluno(user.id, '2026-09-13');
 */
export async function carregarPlanoDoAluno(alunoId: string, data?: string): Promise<void> {
  const store = useNutritionStore.getState();
  await store.fetchDietPlan(alunoId);
  const plano = useNutritionStore.getState().currentDietPlan;
  await Promise.all([
    plano ? store.fetchMeals(plano.id) : null,
    data ? store.fetchDailyLogs(alunoId, data) : null,
  ]);
}
