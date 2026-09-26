import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateDietPlanInput, DietPlan } from "../../types/nutrition.types";
import {
  calculateDietStrategy,
  DIET_STRATEGIES,
  type DietStrategyType,
  strategyMealRows,
} from "../../utils/dietStrategies";

type CreatePlan = (input: CreateDietPlanInput) => Promise<DietPlan>;

/**
 * Criação e ciclo de vida do plano de dieta, a parte que web e mobile precisam
 * fazer igual (#337). Recebe o `createDietPlan` do serviço de nutrição em vez
 * de repetir a inserção do plano.
 */
export const createDietPlanCreation = (supabase: SupabaseClient, createDietPlan: CreatePlan) => ({
  /**
   * Cria o plano com as metas do formulário, o tipo de plano que a estratégia
   * define e as refeições-molde dela, gravadas numa inserção só.
   *
   * @example
   * await nutritionService.createDietPlanFromStrategy(
   *   { student_id, specialist_id, name, target_calories: 2200 },
   *   "carb_cycling",
   * );
   */
  createDietPlanFromStrategy: async (
    plan: Omit<CreateDietPlanInput, "plan_type">,
    strategy: DietStrategyType,
  ): Promise<DietPlan> => {
    const planType = DIET_STRATEGIES[strategy].planType;
    const created = await createDietPlan({ ...plan, plan_type: planType });

    const schedule = calculateDietStrategy(strategy, Number(plan.target_calories ?? 0));
    const rows = strategyMealRows(schedule, planType);
    if (rows.length === 0) return created;

    const { error } = await supabase
      .from("diet_meals")
      .insert(rows.map((row) => ({ ...row, diet_plan_id: created.id })));
    if (error) throw error;
    return created;
  },
});
