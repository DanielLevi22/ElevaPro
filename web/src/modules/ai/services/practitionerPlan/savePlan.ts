import { addDays, createNutritionService, localDateOf } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { saveWorkoutsWithExercises } from "../workoutPersistence";
import type { OnboardingPlanPending } from "./types";

/**
 * A primeira periodização do onboarding: 4 semanas, até o check-in semanal
 * recalibrar (F5). Provisório, como as faixas (ADR-0044).
 */
const FIRST_BLOCK_WEEKS = 4;
const DIFFICULTY: Record<string, string> = {
  beginner: "beginner",
  returning: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

export interface SavePlanContext {
  studentId: string;
  /** O cliente com a sessão do aluno: a dieta grava e ativa pela RLS dele. */
  titular: SupabaseClient;
  /** Para o desfazer alcançar a periodização (o resto cai por cascata). */
  registrar: (id: string) => void;
}

/**
 * Grava o plano aprovado em O9: o treino com os exercícios e, se a triagem
 * liberou, a dieta com as refeições, já ativa.
 *
 * O treino vai pela chave de serviço porque o aluno não tem política de escrita
 * em periodização; a dieta vai pela sessão dele, porque tem, e porque ativar
 * confere `auth.uid()`.
 *
 * @example const { periodizationId } = await savePractitionerPlan(ctx, pendente);
 */
export async function savePractitionerPlan(
  ctx: SavePlanContext,
  pending: OnboardingPlanPending,
): Promise<{ periodizationId: string; dietPlanId: string | null }> {
  const periodizationId = await saveTraining(ctx, pending);
  const dietPlanId = pending.target ? await saveDiet(ctx, pending) : null;
  return { periodizationId, dietPlanId };
}

/** O primeiro bloco: de hoje a 4 semanas. O banco exige as duas datas no treino e na dieta. */
function firstBlock(): { start_date: string; end_date: string } {
  const start_date = localDateOf(new Date());
  return { start_date, end_date: addDays(start_date, FIRST_BLOCK_WEEKS * 7) };
}

async function saveTraining(ctx: SavePlanContext, pending: OnboardingPlanPending): Promise<string> {
  const { start_date: start, end_date: end } = firstBlock();
  const name = "Meu primeiro plano";

  const { data: period, error } = await supabaseAdmin
    .from("training_periodizations")
    .insert({
      student_id: ctx.studentId,
      specialist_id: null,
      name,
      objective: pending.goal,
      level: pending.level,
      duration_weeks: FIRST_BLOCK_WEEKS,
      status: "active",
      start_date: start,
      end_date: end,
    })
    .select("id")
    .single();
  if (error || !period) throw new Error(`periodização do onboarding não gravou: ${error?.message}`);
  ctx.registrar(period.id);

  const { data: phase, error: phaseError } = await supabaseAdmin
    .from("training_plans")
    .insert({
      periodization_id: period.id,
      name,
      duration_weeks: FIRST_BLOCK_WEEKS,
      focus: pending.goal,
      order_index: 0,
      start_date: start,
      end_date: end,
    })
    .select("id")
    .single();
  if (phaseError || !phase)
    throw new Error(`fase do onboarding não gravou: ${phaseError?.message}`);

  await saveWorkoutsWithExercises(
    pending.proposal.workouts.map((workout) => ({
      title: workout.title,
      muscle_group: workout.muscle_group,
      day_of_week: workout.day_of_week,
      difficulty: DIFFICULTY[pending.level],
      description: workout.optional ? "Sessão opcional: o esporte que você pratica." : undefined,
      exercises: workout.exercises,
    })),
    phase.id,
    { specialistId: null, studentId: ctx.studentId },
    // A periodização já está registrada: treinos e exercícios caem por cascata.
    () => undefined,
  );
  return period.id;
}

async function saveDiet(ctx: SavePlanContext, pending: OnboardingPlanPending): Promise<string> {
  const target = pending.target as NonNullable<OnboardingPlanPending["target"]>;
  const meals = pending.proposal.meals ?? [];
  const foods = await foodsByName(
    meals.flatMap((meal) => meal.items.map((item) => item.food_name)),
  );
  const nutrition = createNutritionService(ctx.titular);

  const plan = await nutrition.createDietPlanWithMeals(
    {
      student_id: ctx.studentId,
      specialist_id: null,
      name: "Minha primeira dieta",
      plan_type: "unique",
      // A mesma vigência do bloco de treino: os dois se recalibram juntos.
      ...firstBlock(),
      target_calories: target.calories,
      target_protein: target.protein,
      target_carbs: target.carbs,
      target_fat: target.fat,
      meals_per_day: pending.mealsPerDay,
    },
    meals.map((meal) => ({
      name: meal.name,
      meal_time: meal.meal_time,
      items: meal.items.map((item) => {
        // A conferência já recusou alimento fora do banco: ele existe.
        const food = foods.get(item.food_name) as { id: string; unit: string };
        // A quantidade da IA está na unidade da porção do alimento (ver o prompt).
        return { food_id: food.id, quantity: item.quantity, unit: food.unit };
      }),
    })),
  );
  try {
    await nutrition.activateDietPlan(plan.id);
  } catch (error) {
    // Rascunho ativo pela metade não existe: sem ativar, o rascunho sai.
    await ctx.titular.from("diet_plans").delete().eq("id", plan.id);
    throw error;
  }
  return plan.id;
}

/** Id e unidade da porção de cada alimento do banco público, pelo nome. */
async function foodsByName(names: string[]): Promise<Map<string, { id: string; unit: string }>> {
  const { data, error } = await supabaseAdmin
    .from("foods")
    .select("id, name, serving_unit")
    .eq("is_custom", false)
    .in("name", [...new Set(names)]);
  if (error) throw error;
  return new Map((data ?? []).map((food) => [food.name, { id: food.id, unit: food.serving_unit }]));
}
