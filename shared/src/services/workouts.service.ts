import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AddWorkoutExerciseInput,
  CreateExerciseInput,
  CreateWorkoutInput,
  Exercise,
  UpdateWorkoutInput,
  Workout,
} from "../types/workouts.types";
import { criarServicoDeHistorico } from "./workouts/historico";
import { criarServicoDePeriodizacoes } from "./workouts/periodizacoes";
import { criarServicoDeResumoDasPeriodizacoes } from "./workouts/resumoDasPeriodizacoes";
import { criarServicoDeSessoes } from "./workouts/sessoes";

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

  fetchWorkoutsByPlan: async (trainingPlanId: string): Promise<Workout[]> => {
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
    return (data || []) as Workout[];
  },

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
    return data as Workout;
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

  addExercisesToWorkout: async (
    workoutId: string,
    items: AddWorkoutExerciseInput[],
  ): Promise<void> => {
    const rows = items.map((item, i) => ({
      workout_id: workoutId,
      exercise_id: item.exercise_id,
      sets: item.sets ?? null,
      reps: item.reps ?? null,
      weight: item.weight ?? null,
      rest_seconds: item.rest_seconds ?? null,
      order_index: item.order_index ?? i,
      notes: item.notes ?? null,
    }));
    const { error } = await supabase.from("workout_exercises").insert(rows);
    if (error) throw error;
  },

  removeExerciseFromWorkout: async (workoutExerciseId: string): Promise<void> => {
    const { error } = await supabase.from("workout_exercises").delete().eq("id", workoutExerciseId);
    if (error) throw error;
  },
});

export type WorkoutsService = ReturnType<typeof createWorkoutsService>;
