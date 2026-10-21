import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSetPlan } from "../../setPlan";
import type {
  AddWorkoutExerciseInput,
  UpdateWorkoutExerciseInput,
} from "../../types/workoutItemInput.types";
import type {
  CreateExerciseInput,
  CreateWorkoutInput,
  Exercise,
  FullPeriodization,
  UpdateWorkoutInput,
  Workout,
} from "../../types/workouts.types";
import { criarServicoDeHistorico } from "./historico";
import { criarServicoDePeriodizacoes } from "./periodizacoes";
import { criarServicoDeResumoDasPeriodizacoes } from "./resumoDasPeriodizacoes";
import { criarServicoDeSessoes } from "./sessoes";

/**
 * O serviço de treino: exercícios, treinos, periodizações, fases e sessões.
 *
 * Composto por assunto — periodizações, sessões e histórico moram em `./workouts/` — para
 * que nenhum arquivo passe do limite e cada um mude por um motivo só. Quem usa
 * vê um serviço único, como antes.
 */
export const createWorkoutsService = (supabase: SupabaseClient) => ({
  ...criarServicoDePeriodizacoes(supabase),
  ...criarServicoDeSessoes(supabase),
  ...criarServicoDeHistorico(supabase),
  ...criarServicoDeResumoDasPeriodizacoes(supabase),
  // ── Exercises ──────────────────────────────────────────────────────────────

  /**
   * Catálogo de exercícios, sem as linhas-placeholder.
   *
   * O filtro estava só no hook do web: o mobile listava "Adicionar exercício"
   * como se fosse exercício de verdade, porque cada plataforma tinha o próprio
   * `useExercises`. Aqui ele vale para as duas.
   */
  fetchExercises: async (): Promise<Exercise[]> => {
    const { data, error } = await supabase.from("exercises").select("*").order("name");
    if (error) throw error;

    return ((data || []) as Exercise[]).filter((exercicio) => {
      const nome = exercicio.name?.trim().toLowerCase() ?? "";
      return nome !== "" && !nome.startsWith("adicionar exerc");
    });
  },

  createExercise: async (input: CreateExerciseInput): Promise<Exercise> => {
    const { data, error } = await supabase
      .from("exercises")
      .insert({
        name: input.name,
        muscle_group: input.muscle_group ?? null,
        description: input.description ?? null,
        video_url: input.video_url ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Exercise;
  },

  /**
   * `null` num campo opcional apaga o valor — é como o ajuste da sessão remove
   * o vídeo de um exercício.
   *
   * @example
   * await updateExercise(exercicio.id, { video_url: null });
   */
  updateExercise: async (
    id: string,
    input: { [Campo in keyof CreateExerciseInput]?: CreateExerciseInput[Campo] | null },
  ): Promise<Exercise> => {
    const { data, error } = await supabase
      .from("exercises")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Exercise;
  },

  // ── Workouts ───────────────────────────────────────────────────────────────

  fetchWorkouts: async (specialistId: string): Promise<Workout[]> => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as Workout[];
  },

  fetchWorkoutsByPlan: (trainingPlanId: string): Promise<Workout[]> =>
    fetchWorkoutsOfPlan(supabase, trainingPlanId),

  fetchWorkoutById: async (id: string): Promise<Workout | null> => {
    const { data, error } = await supabase
      .from("workouts")
      .select(`
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .eq("id", id)
      .order("order_index", { foreignTable: "workout_exercises", ascending: true })
      .single();
    if (error) throw error;
    return withPlans(data as Workout);
  },

  /**
   * O plano completo para exportar: a periodização, as fases na ordem e os
   * treinos de cada fase com os exercícios. As fases buscam os treinos em
   * paralelo. Nulo quando a periodização não existe ou a RLS não a mostra.
   *
   * @example buildPeriodizationSheet(await service.fetchFullPeriodization(id))
   */
  fetchFullPeriodization: async (periodizationId: string): Promise<FullPeriodization | null> => {
    const periodizations = criarServicoDePeriodizacoes(supabase);
    const [periodization, plans] = await Promise.all([
      periodizations.fetchPeriodizationById(periodizationId),
      periodizations.fetchTrainingPlans(periodizationId),
    ]);
    if (!periodization) return null;
    const workoutsByPlan = await Promise.all(
      plans.map((plan) => fetchWorkoutsOfPlan(supabase, plan.id)),
    );
    return {
      periodization,
      phases: plans.map((plan, index) => ({ plan, workouts: workoutsByPlan[index] ?? [] })),
    };
  },

  createWorkout: async (input: CreateWorkoutInput): Promise<Workout> => {
    const { data, error } = await supabase
      .from("workouts")
      .insert({
        specialist_id: input.specialist_id ?? null,
        student_id: input.student_id ?? null,
        training_plan_id: input.training_plan_id ?? null,
        title: input.title,
        description: input.description ?? null,
        muscle_group: input.muscle_group ?? null,
        difficulty: input.difficulty ?? null,
        day_of_week: input.day_of_week ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Workout;
  },

  updateWorkout: async (id: string, input: UpdateWorkoutInput): Promise<Workout> => {
    const { data, error } = await supabase
      .from("workouts")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Workout;
  },

  deleteWorkout: async (id: string): Promise<void> => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) throw error;
  },

  /** Esvazia a fase antes de recriar os treinos pela divisão — troca de "ABC" pra "ABCD", ou pra dar lugar à proposta da IA. */
  deleteWorkoutsForPhase: async (trainingPlanId: string): Promise<void> => {
    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("training_plan_id", trainingPlanId);
    if (error) throw error;
  },

  /**
   * Põe exercícios no Workout, cada um com o plano de séries conferido.
   *
   * @example addExercisesToWorkout(treinoId, [{ exercise_id, set_plan: plano }])
   */
  addExercisesToWorkout: async (
    workoutId: string,
    items: AddWorkoutExerciseInput[],
  ): Promise<void> => {
    const rows = items.map((item, i) => ({
      workout_id: workoutId,
      exercise_id: item.exercise_id,
      order_index: item.order_index ?? i,
      notes: item.notes ?? null,
      set_plan: validateSetPlan(item.set_plan),
    }));
    const { error } = await supabase.from("workout_exercises").insert(rows);
    if (error) throw error;
  },

  removeExerciseFromWorkout: async (workoutExerciseId: string): Promise<void> => {
    const { error } = await supabase.from("workout_exercises").delete().eq("id", workoutExerciseId);
    if (error) throw error;
  },

  /**
   * Troca o plano de séries de um exercício já no treino — não o catálogo.
   *
   * @example updateWorkoutExercise(id, { set_plan: plano })
   */
  updateWorkoutExercise: async (
    workoutExerciseId: string,
    input: UpdateWorkoutExerciseInput,
  ): Promise<void> => {
    // Confere antes de tocar no banco: plano inválido não abre consulta.
    const setPlan = validateSetPlan(input.set_plan);
    const { error } = await supabase
      .from("workout_exercises")
      .update({ set_plan: setPlan })
      .eq("id", workoutExerciseId);
    if (error) throw error;
  },

  /** Grava a nova ordem depois de mover um exercício na montagem do treino. */
  reorderWorkoutExercises: async (itens: { id: string; order_index: number }[]): Promise<void> => {
    for (const item of itens) {
      const { error } = await supabase
        .from("workout_exercises")
        .update({ order_index: item.order_index })
        .eq("id", item.id);
      if (error) throw error;
    }
  },
});

export type WorkoutsService = ReturnType<typeof createWorkoutsService>;

/** Os treinos de uma fase, com os exercícios do catálogo, na ordem de criação. */
async function fetchWorkoutsOfPlan(
  supabase: SupabaseClient,
  trainingPlanId: string,
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select(`
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `)
    .eq("training_plan_id", trainingPlanId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data || []) as Workout[]).map(withPlans);
}

/**
 * Plano nulo do banco lido como plano vazio. Até a 0106, app antigo ainda cria
 * item sem `set_plan`; nulo quebrava toda tela que resume o treino, vazio mostra
 * zero séries até o backfill rodar de novo.
 */
function withPlans(workout: Workout): Workout {
  if (!workout?.exercises) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((item) => ({ ...item, set_plan: item.set_plan ?? [] })),
  };
}
