import {
  achatarRespostas,
  addDays,
  createAdaptiveAnamnesisService,
  createNutritionService,
  localDateOf,
} from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { type StartingLoads, saveWorkoutsWithExercises } from "../workoutPersistence";
import { dietPlanName, trainingPlanName } from "./planNames";
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
 * Concluir o onboarding é o último passo, e na mesma aprovação. Antes o app
 * aprovava e só depois concluía, em outra chamada: se a segunda falhasse, o plano
 * ficava ativo, a tela dizia que não aprovou, e o guarda devolvia a pessoa ao
 * onboarding sem proposta para aprovar de novo. Aqui, falhar ao concluir desfaz
 * o treino e devolve a proposta, e tentar de novo funciona.
 *
 * @example const { periodizationId } = await savePractitionerPlan(ctx, pendente);
 */
export async function savePractitionerPlan(
  ctx: SavePlanContext,
  pending: OnboardingPlanPending,
): Promise<{ periodizationId: string | null; dietPlanId: string | null }> {
  // Só dieta não tem treino: nada de periodização, e o treino anterior fica como está.
  const hasTraining = pending.proposal.workouts.length > 0;
  const previousDietId = pending.target ? await activeOwnDietId(ctx.studentId) : null;
  const periodizationId = hasTraining ? await saveTraining(ctx, pending) : null;
  const dietPlanId = pending.target ? await saveDiet(ctx, pending) : null;
  if (periodizationId) await finishPreviousTraining(ctx.studentId, periodizationId, "replaced");
  if (dietPlanId) await markEndedDiet(previousDietId, "replaced");
  await completeOnboarding(ctx);
  return { periodizationId, dietPlanId };
}

/**
 * Conclui a anamnese pela sessão do aluno, com o mesmo `save` que o app usava:
 * ele também cria a primeira medida declarada a partir da altura e do peso.
 */
async function completeOnboarding(ctx: SavePlanContext): Promise<void> {
  await saveAnswers(ctx, {});
}

/**
 * Grava a anamnese pela sessão do aluno, com respostas trocadas por cima: as da
 * reavaliação do fim do bloco (#376), ou nenhuma, para só concluir.
 *
 * @example await saveAnswers(ctx, { gym_type: "Home gym" });
 */
export async function saveAnswers(
  ctx: SavePlanContext,
  changed: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await ctx.titular
    .from("student_anamnesis")
    .select("responses")
    .eq("student_id", ctx.studentId)
    .maybeSingle();
  if (error) throw new Error(`anamnese não foi lida: ${error.message}`);
  await createAdaptiveAnamnesisService(ctx.titular).save({
    studentId: ctx.studentId,
    answers: {
      ...achatarRespostas(data?.responses as Record<string, unknown> | null),
      ...changed,
    },
    completed: true,
    selfGuided: true,
  });
}

/**
 * Quem volta ao onboarding pelo "Complete seu perfil" aprova um plano novo: o
 * anterior do próprio Praticante é encerrado, para não haver dois treinos
 * ativos. Só no fim, depois de tudo gravado: se a aprovação falhar no meio, o
 * desfazer apaga o novo e o anterior continua valendo. A dieta não precisa
 * disto: `activate_diet_plan` já encerra a anterior.
 */
export async function finishPreviousTraining(
  studentId: string,
  keepId: string,
  reason: PlanEndReason,
): Promise<void> {
  // Encerrado antes do fim, o bloco termina hoje: o histórico mostra até onde
  // ele foi, e não as semanas que não aconteceram.
  const ended = reason === "changed_early" ? { end_date: localDateOf(new Date()) } : {};
  const { error } = await supabaseAdmin
    .from("training_periodizations")
    .update({ status: "completed", end_reason: reason, ...ended })
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("specialist_id", null)
    .neq("id", keepId);
  if (error) throw new Error(`periodização anterior não foi encerrada: ${error.message}`);
}

/**
 * A dieta ativa do próprio Praticante, lida antes de gravar a nova: é ela que
 * `activate_diet_plan` vai encerrar.
 *
 * @example const anterior = await activeOwnDietId(aluno.id);
 */
export async function activeOwnDietId(studentId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("diet_plans")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("specialist_id", null)
    .maybeSingle();
  if (error) throw new Error(`dieta ativa de ${studentId} não foi lida: ${error.message}`);
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * `activate_diet_plan` já encerra a dieta anterior; aqui ela ganha o motivo.
 * Pelo id, e não pela data: o banco grava `end_date` no dia UTC, e uma versão
 * encerrada de manhã pelo check-in tem a mesma data.
 */
export async function markEndedDiet(dietId: string | null, reason: PlanEndReason): Promise<void> {
  if (!dietId) return;
  const { error } = await supabaseAdmin
    .from("diet_plans")
    .update({ end_reason: reason })
    .eq("status", "finished")
    .eq("id", dietId);
  if (error) throw new Error(`dieta ${dietId} ficou sem motivo: ${error.message}`);
}

/** O primeiro bloco: de hoje a 4 semanas. O banco exige as duas datas no treino e na dieta. */
function firstBlock(start?: string): { start_date: string; end_date: string } {
  const start_date = start ?? localDateOf(new Date());
  return { start_date, end_date: addDays(start_date, FIRST_BLOCK_WEEKS * 7) };
}

/** Como o bloco se chama e de que carga parte; o onboarding usa o padrão. */
export interface BlockNaming {
  name: string;
  phaseName: string;
  loads?: StartingLoads;
  /** O primeiro dia; sem ele, hoje. O bloco trocado antes do fim começa amanhã. */
  startDate?: string;
}

/** Por que o plano anterior acabou (0099, 0100): fim do bloco, trocado, ou mudado antes do fim. */
export type PlanEndReason = "block_completed" | "replaced" | "changed_early";

export async function saveTraining(
  ctx: SavePlanContext,
  pending: OnboardingPlanPending,
  naming: BlockNaming = {
    name: trainingPlanName(pending),
    phaseName: `Primeiras ${FIRST_BLOCK_WEEKS} semanas`,
  },
): Promise<string> {
  const { start_date: start, end_date: end } = firstBlock(naming.startDate);
  const name = naming.name;

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
      name: naming.phaseName,
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
    naming.loads,
  );
  return period.id;
}

export async function saveDiet(
  ctx: SavePlanContext,
  pending: OnboardingPlanPending,
  startDate?: string,
): Promise<string> {
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
      name: dietPlanName(pending),
      plan_type: "unique",
      // A mesma vigência do bloco de treino: os dois se recalibram juntos.
      ...firstBlock(startDate),
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
