import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateDietPlanInput, DietPlan } from "../../types/nutrition.types";
import {
  calculateDietStrategy,
  DIET_STRATEGIES,
  type DietStrategyType,
  strategyMealRows,
} from "../../utils/dietStrategies";

interface SourceMealItem {
  food_id: string;
  quantity: string;
  unit: string;
  order_index: number;
}

interface SourceMeal {
  name: string;
  meal_type: string | null;
  meal_order: number;
  day_of_week: number | null;
  meal_time: string | null;
  target_calories: string | null;
  diet_meal_items: SourceMealItem[] | null;
}

const COPIED_MEAL_COLUMNS =
  "name, meal_type, meal_order, day_of_week, meal_time, target_calories, diet_meal_items(food_id, quantity, unit, order_index)";

/**
 * Criação e ciclo de vida do plano de dieta, a parte que web e mobile precisam
 * fazer igual (#337).
 *
 * Todo plano nasce **rascunho**: criar não tira a dieta que o aluno segue. Ele
 * só vale — e só finaliza o anterior — quando é enviado por `activateDietPlan`,
 * que roda no banco numa transação só.
 */
export const createDietPlanCreation = (supabase: SupabaseClient) => {
  const createDietPlan = async (input: CreateDietPlanInput): Promise<DietPlan> => {
    const { data, error } = await supabase
      .from("diet_plans")
      .insert({
        student_id: input.student_id,
        specialist_id: input.specialist_id,
        name: input.name ?? null,
        plan_type: input.plan_type ?? "cyclic",
        status: "draft",
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        target_calories: input.target_calories ?? null,
        target_protein: input.target_protein ?? null,
        target_carbs: input.target_carbs ?? null,
        target_fat: input.target_fat ?? null,
        notes: input.notes ?? null,
        dietary_restrictions: input.dietary_restrictions ?? [],
        meals_per_day: input.meals_per_day ?? null,
        allows_supplements: input.allows_supplements ?? null,
        free_meal_days: input.free_meal_days ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return data as DietPlan;
  };

  const copyMealItems = async (items: SourceMealItem[], mealId: string): Promise<void> => {
    if (items.length === 0) return;
    const { error } = await supabase.from("diet_meal_items").insert(
      items.map((item) => ({
        diet_meal_id: mealId,
        food_id: item.food_id,
        quantity: item.quantity,
        unit: item.unit,
        order_index: item.order_index,
      })),
    );
    if (error) throw error;
  };

  // Uma refeição por vez: cada item precisa do id da refeição recém-criada.
  const copyMeals = async (sourcePlanId: string, targetPlanId: string): Promise<void> => {
    const { data: sourceMeals, error } = await supabase
      .from("diet_meals")
      .select(COPIED_MEAL_COLUMNS)
      .eq("diet_plan_id", sourcePlanId);
    if (error) throw error;

    for (const { diet_meal_items, ...meal } of (sourceMeals ?? []) as SourceMeal[]) {
      const { data: created, error: mealError } = await supabase
        .from("diet_meals")
        .insert({ ...meal, diet_plan_id: targetPlanId })
        .select("id")
        .single();
      if (mealError) throw mealError;
      await copyMealItems(diet_meal_items ?? [], (created as { id: string }).id);
    }
  };

  return {
    /**
     * Cria o plano em rascunho. Não mexe no plano ativo do aluno.
     *
     * @example
     * const draft = await nutritionService.createDietPlan({ student_id, specialist_id, name });
     */
    createDietPlan,

    /**
     * Cria o rascunho com as metas do formulário, o tipo de plano que a
     * estratégia define e as refeições-molde dela, gravadas numa inserção só.
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
      const rows = strategyMealRows(schedule, planType, plan.meals_per_day);
      if (rows.length === 0) return created;

      const { error } = await supabase
        .from("diet_meals")
        .insert(rows.map((row) => ({ ...row, diet_plan_id: created.id })));
      if (error) throw error;
      return created;
    },

    /**
     * Copia estrutura, metas e alimentos de um plano para um rascunho de outro
     * aluno. O dono é o aluno de destino e quem importou, nunca os da origem.
     *
     * @example
     * const draft = await nutritionService.cloneDietPlan(sourceId, targetStudentId, specialistId);
     */
    cloneDietPlan: async (
      sourcePlanId: string,
      targetStudentId: string,
      specialistId: string,
    ): Promise<DietPlan> => {
      const { data: source, error } = await supabase
        .from("diet_plans")
        .select(
          "name, plan_type, end_date, target_calories, target_protein, target_carbs, target_fat",
        )
        .eq("id", sourcePlanId)
        .single();
      if (error) throw error;

      const { name, ...copied } = source as Record<string, unknown> & { name: string | null };
      const draft = await createDietPlan({
        ...(copied as Partial<CreateDietPlanInput>),
        student_id: targetStudentId,
        specialist_id: specialistId,
        name: `${name ?? "Plano"} (Importado)`,
        start_date: new Date().toISOString().split("T")[0],
      });
      await copyMeals(sourcePlanId, draft.id);
      return draft;
    },

    /**
     * Envia o rascunho: ativa este plano e finaliza o ativo do aluno, seja de
     * que autor for, numa transação no banco (`activate_diet_plan`).
     *
     * @example
     * await nutritionService.activateDietPlan(draft.id);
     */
    activateDietPlan: async (planId: string): Promise<DietPlan> => {
      const { data, error } = await supabase.rpc("activate_diet_plan", { p_plan_id: planId });
      if (error) throw error;
      return data as DietPlan;
    },
  };
};
