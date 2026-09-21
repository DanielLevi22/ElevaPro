import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AddFoodToMealInput,
  CreateDietMealInput,
  CreateDietPlanInput,
  DietMeal,
  DietMealItem,
  DietPlan,
  Food,
  MealLog,
  ToggleMealLogInput,
  UpdateDietMealInput,
  UpdateDietPlanInput,
  UpdateMealItemInput,
} from "../../types/nutrition.types";
import { createCatalogoDeAlimentos } from "./catalogoDeAlimentos.service";

export const createNutritionService = (supabase: SupabaseClient) => ({
  ...createCatalogoDeAlimentos(supabase),

  // ── Diet Plans ─────────────────────────────────────────────────────────────

  fetchDietPlans: async (
    specialistId: string,
  ): Promise<(DietPlan & { student?: { id: string; full_name: string | null } })[]> => {
    // Embed em vez de duas queries sequenciais: a busca dos perfis esperava a
    // dos planos terminar, dobrando a latência da listagem. O nome da constraint
    // é obrigatório porque diet_plans tem duas FKs para profiles (student_id e
    // specialist_id) e o PostgREST não saberia qual seguir.
    const { data: plans, error } = await supabase
      .from("diet_plans")
      .select("*, student:profiles!diet_plans_student_id_profiles_id_fk(id, full_name)")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!plans || plans.length === 0) return [];

    return plans as unknown as (DietPlan & {
      student?: { id: string; full_name: string | null };
    })[];
  },

  fetchActiveDietPlan: async (studentId: string): Promise<DietPlan | null> => {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data as DietPlan | null;
  },

  fetchDietPlanById: async (id: string): Promise<DietPlan | null> => {
    const { data, error } = await supabase.from("diet_plans").select("*").eq("id", id).single();
    if (error) throw error;
    return data as DietPlan;
  },

  fetchDietPlanHistory: async (studentId: string): Promise<DietPlan[]> => {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("student_id", studentId)
      .neq("status", "active")
      .order("end_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as DietPlan[];
  },

  createDietPlan: async (input: CreateDietPlanInput): Promise<DietPlan> => {
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("diet_plans")
      .select("id")
      .eq("student_id", input.student_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("diet_plans")
        .update({ status: "finished", end_date: today })
        .eq("id", existing.id);
    }

    const { data, error } = await supabase
      .from("diet_plans")
      .insert({
        student_id: input.student_id,
        specialist_id: input.specialist_id,
        name: input.name ?? null,
        plan_type: input.plan_type ?? "cyclic",
        status: "active",
        version: 1,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        target_calories: input.target_calories ?? null,
        target_protein: input.target_protein ?? null,
        target_carbs: input.target_carbs ?? null,
        target_fat: input.target_fat ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as DietPlan;
  },

  updateDietPlan: async (id: string, input: UpdateDietPlanInput): Promise<DietPlan> => {
    const { data, error } = await supabase
      .from("diet_plans")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as DietPlan;
  },

  finishDietPlan: async (id: string): Promise<DietPlan> => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("diet_plans")
      .update({ status: "finished", end_date: today })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as DietPlan;
  },

  deleteDietPlan: async (id: string): Promise<void> => {
    const { data: meals } = await supabase.from("diet_meals").select("id").eq("diet_plan_id", id);

    const mealIds = meals?.map((m) => m.id) ?? [];
    if (mealIds.length > 0) {
      await supabase.from("meal_logs").delete().in("diet_meal_id", mealIds);
      await supabase.from("diet_meal_items").delete().in("diet_meal_id", mealIds);
      await supabase.from("diet_meals").delete().in("id", mealIds);
    }

    const { error } = await supabase.from("diet_plans").delete().eq("id", id);
    if (error) throw error;
  },

  cloneDietPlan: async (
    sourcePlanId: string,
    targetStudentId: string,
    specialistId: string,
  ): Promise<DietPlan> => {
    const { data: sourcePlan, error: planError } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("id", sourcePlanId)
      .single();
    if (planError) throw planError;

    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("diet_plans")
      .select("id")
      .eq("student_id", targetStudentId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("diet_plans")
        .update({ status: "finished", end_date: today })
        .eq("id", existing.id);
    }

    const { data: newPlan, error: newPlanError } = await supabase
      .from("diet_plans")
      .insert({
        student_id: targetStudentId,
        specialist_id: specialistId,
        name: `${sourcePlan.name ?? "Plano"} (Importado)`,
        plan_type: sourcePlan.plan_type,
        status: "active",
        version: 1,
        start_date: new Date().toISOString().split("T")[0],
        end_date: sourcePlan.end_date,
        target_calories: sourcePlan.target_calories,
        target_protein: sourcePlan.target_protein,
        target_carbs: sourcePlan.target_carbs,
        target_fat: sourcePlan.target_fat,
      })
      .select()
      .single();
    if (newPlanError) throw newPlanError;

    const { data: sourceMeals } = await supabase
      .from("diet_meals")
      .select("*, diet_meal_items(*)")
      .eq("diet_plan_id", sourcePlanId);

    for (const sourceMeal of sourceMeals ?? []) {
      const { data: newMeal, error: mealError } = await supabase
        .from("diet_meals")
        .insert({
          diet_plan_id: newPlan.id,
          name: sourceMeal.name,
          meal_type: sourceMeal.meal_type,
          meal_order: sourceMeal.meal_order,
          day_of_week: sourceMeal.day_of_week,
          meal_time: sourceMeal.meal_time,
          target_calories: sourceMeal.target_calories,
        })
        .select()
        .single();
      if (mealError) throw mealError;

      const items = sourceMeal.diet_meal_items ?? [];
      if (items.length > 0) {
        await supabase.from("diet_meal_items").insert(
          items.map(
            (item: { food_id: string; quantity: string; unit: string; order_index: number }) => ({
              diet_meal_id: newMeal.id,
              food_id: item.food_id,
              quantity: item.quantity,
              unit: item.unit,
              order_index: item.order_index,
            }),
          ),
        );
      }
    }

    return newPlan as DietPlan;
  },

  // ── Diet Meals ─────────────────────────────────────────────────────────────

  fetchDietMeals: async (
    dietPlanId: string,
  ): Promise<(DietMeal & { diet_meal_items: (DietMealItem & { food: Food })[] })[]> => {
    const { data, error } = await supabase
      .from("diet_meals")
      .select(`
        *,
        diet_meal_items (
          *,
          food:foods (*)
        )
      `)
      .eq("diet_plan_id", dietPlanId)
      .order("day_of_week", { ascending: true })
      .order("meal_order", { ascending: true });
    if (error) throw error;

    return (
      (data || []) as (DietMeal & { diet_meal_items: (DietMealItem & { food: Food })[] })[]
    ).map((meal) => ({
      ...meal,
      diet_meal_items: (meal.diet_meal_items ?? []).sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
      ),
    }));
  },

  createDietMeal: async (input: CreateDietMealInput): Promise<DietMeal> => {
    const { data, error } = await supabase.from("diet_meals").insert(input).select().single();
    if (error) throw error;
    return data as DietMeal;
  },

  updateDietMeal: async (id: string, input: UpdateDietMealInput): Promise<DietMeal> => {
    const { data, error } = await supabase
      .from("diet_meals")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as DietMeal;
  },

  deleteDietMeal: async (id: string): Promise<void> => {
    await supabase.from("meal_logs").delete().eq("diet_meal_id", id);
    await supabase.from("diet_meal_items").delete().eq("diet_meal_id", id);
    const { error } = await supabase.from("diet_meals").delete().eq("id", id);
    if (error) throw error;
  },

  clearDietDay: async (dietPlanId: string, dayOfWeek: number): Promise<void> => {
    const { data: meals } = await supabase
      .from("diet_meals")
      .select("id")
      .eq("diet_plan_id", dietPlanId)
      .eq("day_of_week", dayOfWeek);

    const mealIds = meals?.map((m) => m.id) ?? [];
    if (mealIds.length === 0) return;

    await supabase.from("meal_logs").delete().in("diet_meal_id", mealIds);
    await supabase.from("diet_meal_items").delete().in("diet_meal_id", mealIds);
    const { error } = await supabase.from("diet_meals").delete().in("id", mealIds);
    if (error) throw error;
  },

  pasteDietDay: async (
    dietPlanId: string,
    targetDay: number,
    sourceMeals: (DietMeal & { diet_meal_items?: DietMealItem[] })[],
  ): Promise<void> => {
    await createNutritionService(supabase).clearDietDay(dietPlanId, targetDay);

    for (const sourceMeal of sourceMeals) {
      const { data: newMeal, error: mealError } = await supabase
        .from("diet_meals")
        .insert({
          diet_plan_id: dietPlanId,
          day_of_week: targetDay,
          name: sourceMeal.name,
          meal_type: sourceMeal.meal_type,
          meal_order: sourceMeal.meal_order,
          target_calories: sourceMeal.target_calories,
          meal_time: sourceMeal.meal_time,
        })
        .select()
        .single();
      if (mealError) throw mealError;

      const items = sourceMeal.diet_meal_items ?? [];
      if (items.length > 0) {
        await supabase.from("diet_meal_items").insert(
          items.map((item) => ({
            diet_meal_id: newMeal.id,
            food_id: item.food_id,
            quantity: item.quantity,
            unit: item.unit,
            order_index: item.order_index,
          })),
        );
      }
    }
  },

  // ── Meal Items ─────────────────────────────────────────────────────────────

  addFoodToMeal: async (input: AddFoodToMealInput): Promise<DietMealItem & { food: Food }> => {
    const { data, error } = await supabase
      .from("diet_meal_items")
      .insert(input)
      .select("*, food:foods(*)")
      .single();
    if (error) throw error;
    return data as DietMealItem & { food: Food };
  },

  addFoodsToMeal: async (
    items: AddFoodToMealInput[],
  ): Promise<(DietMealItem & { food: Food })[]> => {
    const { data, error } = await supabase
      .from("diet_meal_items")
      .insert(items)
      .select("*, food:foods(*)");
    if (error) throw error;
    return (data ?? []) as (DietMealItem & { food: Food })[];
  },

  updateMealItem: async (
    id: string,
    input: UpdateMealItemInput,
  ): Promise<DietMealItem & { food: Food }> => {
    const { data, error } = await supabase
      .from("diet_meal_items")
      .update(input)
      .eq("id", id)
      .select("*, food:foods(*)")
      .single();
    if (error) throw error;
    return data as DietMealItem & { food: Food };
  },

  removeFoodFromMeal: async (id: string): Promise<void> => {
    const { error } = await supabase.from("diet_meal_items").delete().eq("id", id);
    if (error) throw error;
  },

  // ── Meal Logs ──────────────────────────────────────────────────────────────

  fetchMealLogs: async (studentId: string, date: string): Promise<MealLog[]> => {
    const { data, error } = await supabase
      // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
      .from("meal_logs")
      .select(
        "id, student_id, diet_plan_id, diet_meal_id, logged_date, completed, actual_items, created_at",
      )
      .eq("student_id", studentId)
      .eq("logged_date", date);
    if (error) throw error;
    return (data || []) as MealLog[];
  },

  fetchMealLogsByRange: async (
    studentId: string,
    startDate: string,
    endDate: string,
  ): Promise<MealLog[]> => {
    const { data, error } = await supabase
      // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
      .from("meal_logs")
      .select(
        "id, student_id, diet_plan_id, diet_meal_id, logged_date, completed, actual_items, created_at",
      )
      .eq("student_id", studentId)
      .gte("logged_date", startDate)
      .lte("logged_date", endDate)
      .order("logged_date", { ascending: true });
    if (error) throw error;
    return (data || []) as MealLog[];
  },

  toggleMealLog: async (input: ToggleMealLogInput): Promise<MealLog> => {
    const { data: existing } = await supabase
      .from("meal_logs")
      .select("id")
      .eq("student_id", input.student_id)
      .eq("diet_meal_id", input.diet_meal_id)
      .eq("logged_date", input.logged_date)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("meal_logs")
        .update({ completed: input.completed })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data as MealLog;
    }

    const { data, error } = await supabase
      .from("meal_logs")
      .insert({
        student_id: input.student_id,
        diet_plan_id: input.diet_plan_id,
        diet_meal_id: input.diet_meal_id,
        logged_date: input.logged_date,
        completed: input.completed,
      })
      .select()
      .single();
    if (error) throw error;
    return data as MealLog;
  },

  updateMealLogItems: async (logId: string, actualItems: unknown): Promise<MealLog> => {
    const { data, error } = await supabase
      .from("meal_logs")
      .update({ actual_items: actualItems })
      .eq("id", logId)
      .select()
      .single();
    if (error) throw error;
    return data as MealLog;
  },
});
