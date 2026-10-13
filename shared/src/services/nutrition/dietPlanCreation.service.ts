import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateDietPlanInput, DietPlan } from "../../types/nutrition.types";
import { addDays, daysBetween, localDateOf } from "../../utils/dateOnly";
import {
  calculateDietStrategy,
  DIET_STRATEGIES,
  type DietStrategyType,
  strategyMealRows,
} from "../../utils/dietStrategies";

interface SourceMealItem {
  food_id: string;
  quantity: string | number;
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

/** Uma refeição nova com os alimentos dela, já com o id do banco de alimentos. */
export interface NewDietMeal {
  name: string;
  meal_type?: string | null;
  meal_time?: string | null;
  items: { food_id: string; quantity: number; unit: string }[];
}

const COPIED_MEAL_COLUMNS =
  "name, meal_type, meal_order, day_of_week, meal_time, target_calories, diet_meal_items(food_id, quantity, unit, order_index)";

// Uma cópia é uma nova vigência; reutilizar o fim deixaria o rascunho vencido.
function copiedPeriod(source: Pick<DietPlan, "start_date" | "end_date">) {
  const duration =
    source.start_date && source.end_date ? daysBetween(source.start_date, source.end_date) : 28;
  const start_date = localDateOf(new Date());
  return {
    start_date,
    end_date: addDays(start_date, Number.isFinite(duration) && duration > 0 ? duration : 28),
  };
}

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
  const insertMeal = async (
    meal: Omit<SourceMeal, "diet_meal_items">,
    items: SourceMealItem[],
    planId: string,
  ): Promise<void> => {
    const { data: created, error } = await supabase
      .from("diet_meals")
      .insert({ ...meal, diet_plan_id: planId })
      .select("id")
      .single();
    if (error) throw error;
    await copyMealItems(items, (created as { id: string }).id);
  };

  const copyMeals = async (sourcePlanId: string, targetPlanId: string): Promise<void> => {
    const { data: sourceMeals, error } = await supabase
      .from("diet_meals")
      .select(COPIED_MEAL_COLUMNS)
      .eq("diet_plan_id", sourcePlanId);
    if (error) throw error;

    for (const { diet_meal_items, ...meal } of (sourceMeals ?? []) as SourceMeal[]) {
      await insertMeal(meal, diet_meal_items ?? [], targetPlanId);
    }
  };

  return {
    /**
     * Abre ou retoma o ajuste sem alterar a prescrição ativa. A cópia é atômica.
     * @example const draft = await nutrition.createDietPlanVersion(activePlan.id);
     */
    createDietPlanVersion: async (planId: string): Promise<DietPlan> => {
      const { data, error } = await supabase.rpc("create_diet_plan_version", { p_plan_id: planId });
      if (error) throw error;
      return data as DietPlan;
    },
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
     * Cria o rascunho já com as refeições e os alimentos de cada uma: o plano que
     * o onboarding do Praticante aprova (#365). Ativar é outro passo
     * (`activateDietPlan`), para criar não tirar a dieta que a pessoa segue.
     *
     * @example
     * const draft = await nutritionService.createDietPlanWithMeals(plan, [{ name: "Almoço", items: [{ food_id, quantity: 120, unit: "g" }] }]);
     */
    createDietPlanWithMeals: async (
      plan: CreateDietPlanInput,
      meals: NewDietMeal[],
    ): Promise<DietPlan> => {
      const created = await createDietPlan(plan);
      for (const [order, meal] of meals.entries()) {
        await insertMeal(
          {
            name: meal.name,
            meal_type: meal.meal_type ?? null,
            meal_order: order,
            day_of_week: null,
            meal_time: meal.meal_time ?? null,
            target_calories: null,
          },
          meal.items.map((item, index) => ({ ...item, order_index: index })),
          created.id,
        );
      }
      return created;
    },

    /**
     * Copia estrutura, metas e alimentos de um plano para um rascunho de outro
     * aluno. O dono é o aluno de destino e quem importou, nunca os da origem.
     *
     * @example
     * const draft = await nutritionService.cloneDietPlan(sourceId, targetStudentId, specialistId, "Novo plano");
     */
    cloneDietPlan: async (
      sourcePlanId: string,
      targetStudentId: string,
      specialistId: string | null,
      name: string,
    ): Promise<DietPlan> => {
      if (!name.trim()) {
        throw new Error(
          `Nome do plano inválido: ${JSON.stringify(name)}. Esperado texto não vazio.`,
        );
      }
      const { data: source, error } = await supabase
        .from("diet_plans")
        .select(
          "plan_type, start_date, end_date, target_calories, target_protein, target_carbs, target_fat",
        )
        .eq("id", sourcePlanId)
        .single();
      if (error) throw error;

      const copied = source as DietPlan;
      const draft = await createDietPlan({
        plan_type: copied.plan_type,
        ...copiedPeriod(copied),
        target_calories: copied.target_calories,
        target_protein: copied.target_protein,
        target_carbs: copied.target_carbs,
        target_fat: copied.target_fat,
        student_id: targetStudentId,
        specialist_id: specialistId,
        name: name.trim(),
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
