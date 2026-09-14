import {
  createNutritionService,
  type DietMeal,
  type DietMealItem,
  type ItemRegistrado,
  itensComExtra,
  refeicaoMaisProxima,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

const nutricao = createNutritionService(supabase);

interface Registro {
  alunoId: string;
  planoId: string;
  refeicaoId: string;
  /** `YYYY-MM-DD` do dia em que o aluno comeu. */
  data: string;
  /** O prato do plano, para copiar quando ainda não há registro. */
  doPlano: DietMealItem[];
  extra: Omit<ItemRegistrado, 'id'>;
}

/**
 * Acrescenta um item ao que o aluno comeu numa refeição: o alimento da busca,
 * o prato do scan, a sugestão do assistente.
 *
 * O registro da data é lido do banco, e não do store: o store guarda os
 * registros do dia aberto no plano, que pode não ser o dia do registro — juntar
 * com aqueles apagaria a troca de outro dia.
 *
 * @example
 * await registrarNoDiario({ alunoId, planoId, refeicaoId, data: hoje, doPlano,
 *   extra: { quantity: 100, unit: 'g', food, origem: 'busca' } });
 */
export async function registrarNoDiario({
  alunoId,
  planoId,
  refeicaoId,
  data,
  doPlano,
  extra,
}: Registro): Promise<void> {
  const doDia = await nutricao.fetchMealLogs(alunoId, data);
  const existente = doDia.find((registro) => registro.diet_meal_id === refeicaoId);
  const item: ItemRegistrado = { ...extra, id: `extra_${Date.now()}` };
  const itens = itensComExtra(existente?.actual_items, doPlano, item);

  const logId =
    existente?.id ??
    (
      await nutricao.toggleMealLog({
        student_id: alunoId,
        diet_plan_id: planoId,
        diet_meal_id: refeicaoId,
        logged_date: data,
        completed: false,
      })
    ).id;
  await nutricao.updateMealLogItems(logId, itens);
}

/**
 * A refeição de hoje em que o item extra entra: a de horário mais perto de
 * agora e, sem horário em nenhuma, a primeira.
 *
 * @example refeicaoParaAgora(refeicoesDeHoje)?.name
 */
export function refeicaoParaAgora(refeicoes: DietMeal[]): DietMeal | null {
  const agora = new Date().toTimeString().slice(0, 5);
  return refeicaoMaisProxima(refeicoes, agora) ?? refeicoes[0] ?? null;
}
