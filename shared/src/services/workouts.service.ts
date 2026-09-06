import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AddWorkoutExerciseInput,
  CreateExerciseInput,
  CreatePeriodizationInput,
  CreateTrainingPlanInput,
  CreateWorkoutInput,
  CreateWorkoutSessionInput,
  Exercise,
  Periodization,
  SaveSessionExerciseInput,
  TrainingPlan,
  UpdatePeriodizationInput,
  UpdateSessionFeedbackInput,
  UpdateTrainingPlanInput,
  UpdateWorkoutInput,
  Workout,
  WorkoutSession,
  WorkoutSessionExercise,
} from "../types/workouts.types";

export const createWorkoutsService = (supabase: SupabaseClient) => ({
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

  updateExercise: async (id: string, input: Partial<CreateExerciseInput>): Promise<Exercise> => {
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

  // ── Periodizations ─────────────────────────────────────────────────────────

  fetchPeriodizations: async (specialistId: string): Promise<Periodization[]> => {
    const { data: periodizations, error } = await supabase
      .from("training_periodizations")
      .select("*")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!periodizations || periodizations.length === 0) return [];

    const studentIds = [...new Set(periodizations.map((p) => p.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", studentIds);
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const periodizationIds = periodizations.map((p) => p.id);
    const { data: plans } = await supabase
      .from("training_plans")
      .select("periodization_id")
      .in("periodization_id", periodizationIds);
    const countsMap = new Map<string, number>();
    plans?.forEach((plan) => {
      countsMap.set(plan.periodization_id, (countsMap.get(plan.periodization_id) ?? 0) + 1);
    });

    return periodizations.map((p) => ({
      ...p,
      student: profileMap.get(p.student_id),
      training_plans_count: countsMap.get(p.id) ?? 0,
    })) as Periodization[];
  },

  fetchStudentPeriodizations: async (studentId: string): Promise<Periodization[]> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as Periodization[];
  },

  fetchPeriodizationById: async (id: string): Promise<Periodization | null> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const [{ data: student }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", data.student_id)
        .maybeSingle(),
      supabase
        .from("training_plans")
        .select("*", { count: "exact", head: true })
        .eq("periodization_id", id),
    ]);

    return {
      ...data,
      student: student ?? undefined,
      training_plans_count: count ?? 0,
    } as Periodization;
  },

  createPeriodization: async (input: CreatePeriodizationInput): Promise<Periodization> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .insert({
        specialist_id: input.specialist_id,
        student_id: input.student_id,
        name: input.name,
        objective: input.objective ?? null,
        start_date: input.start_date,
        end_date: input.end_date,
        status: "planned",
      })
      .select()
      .single();
    if (error) throw error;
    return data as Periodization;
  },

  updatePeriodization: async (
    id: string,
    input: UpdatePeriodizationInput,
  ): Promise<Periodization> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Periodization;
  },

  deletePeriodization: async (id: string): Promise<void> => {
    const { error } = await supabase.from("training_periodizations").delete().eq("id", id);
    if (error) throw error;
  },

  activatePeriodization: async (id: string): Promise<Periodization> => {
    const { data: periodization, error: fetchError } = await supabase
      .from("training_periodizations")
      .select("student_id")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    await supabase
      .from("training_periodizations")
      .update({ status: "completed" })
      .eq("student_id", periodization.student_id)
      .eq("status", "active");

    const { data, error } = await supabase
      .from("training_periodizations")
      .update({ status: "active" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Periodization;
  },

  // ── Training Plans ─────────────────────────────────────────────────────────

  fetchTrainingPlans: async (periodizationId: string): Promise<TrainingPlan[]> => {
    const { data, error } = await supabase
      .from("training_plans")
      .select("*")
      .eq("periodization_id", periodizationId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return [];

    const planIds = data.map((p) => p.id);
    const { data: workouts } = await supabase
      .from("workouts")
      .select("training_plan_id")
      .in("training_plan_id", planIds);
    const countsMap = new Map<string, number>();
    workouts?.forEach((w) => {
      if (w.training_plan_id) {
        countsMap.set(w.training_plan_id, (countsMap.get(w.training_plan_id) ?? 0) + 1);
      }
    });

    return data.map((p) => ({ ...p, workouts_count: countsMap.get(p.id) ?? 0 })) as TrainingPlan[];
  },

  fetchTrainingPlanById: async (id: string): Promise<TrainingPlan | null> => {
    // `maybeSingle`, não `single`: com `single` a fase inexistente vira erro
    // PGRST116 e a função lança, então o `if (!plan) notFound()` de quem chama
    // era código morto — a resposta nunca chegava a ser `null`. Fase que não
    // existe é 404; consulta que falhou é erro. São coisas diferentes.
    const { data, error } = await supabase
      .from("training_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const { count } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("training_plan_id", id);

    return { ...data, workouts_count: count ?? 0 } as TrainingPlan;
  },

  createTrainingPlan: async (input: CreateTrainingPlanInput): Promise<TrainingPlan> => {
    const { data, error } = await supabase
      .from("training_plans")
      .insert({
        periodization_id: input.periodization_id,
        name: input.name,
        start_date: input.start_date,
        end_date: input.end_date,
        order_index: input.order_index ?? 0,
        status: "planned",
      })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingPlan;
  },

  updateTrainingPlan: async (id: string, input: UpdateTrainingPlanInput): Promise<TrainingPlan> => {
    const { data, error } = await supabase
      .from("training_plans")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingPlan;
  },

  deleteTrainingPlan: async (id: string): Promise<{ periodization_id: string | undefined }> => {
    const { data: plan } = await supabase
      .from("training_plans")
      .select("periodization_id")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("training_plans").delete().eq("id", id);
    if (error) throw error;
    return { periodization_id: plan?.periodization_id };
  },

  cloneTrainingPlan: async (id: string): Promise<TrainingPlan> => {
    const { data: original, error: fetchError } = await supabase
      .from("training_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    const { data: clone, error: cloneError } = await supabase
      .from("training_plans")
      .insert({
        periodization_id: original.periodization_id,
        name: `${original.name} (Cópia)`,
        status: "planned",
        start_date: original.start_date,
        end_date: original.end_date,
        order_index: original.order_index,
      })
      .select()
      .single();
    if (cloneError) throw cloneError;

    const { data: workouts } = await supabase
      .from("workouts")
      .select("*")
      .eq("training_plan_id", id);

    if (workouts && workouts.length > 0) {
      const clonedWorkouts = workouts.map((w) => ({
        specialist_id: w.specialist_id,
        training_plan_id: clone.id,
        title: w.title,
        description: w.description,
        muscle_group: w.muscle_group,
        difficulty: w.difficulty,
        day_of_week: w.day_of_week,
      }));
      await supabase.from("workouts").insert(clonedWorkouts);
    }

    return clone as TrainingPlan;
  },

  // ── Workout Sessions ───────────────────────────────────────────────────────

  createWorkoutSession: async (input: CreateWorkoutSessionInput): Promise<WorkoutSession> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        student_id: input.student_id,
        workout_id: input.workout_id ?? null,
        started_at: input.started_at,
        completed_at: input.completed_at ?? null,
        intensity: input.intensity ?? null,
        notes: input.notes ?? null,
        session_type: input.session_type ?? "strength",
        duration_seconds: input.duration_seconds ?? null,
        active_calories: input.active_calories ?? null,
        activity_name: input.activity_name ?? null,
        distance_meters: input.distance_meters ?? null,
        avg_pace_seconds_per_km: input.avg_pace_seconds_per_km ?? null,
        avg_cadence_spm: input.avg_cadence_spm ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as WorkoutSession;
  },

  /**
   * Corrige o feedback que o aluno escreveu sobre a própria sessão.
   *
   * Só `intensity` e `notes` — é o Art. 18, III aplicado ao que o titular
   * DECLAROU. Data, séries, duração e calorias são medida do evento: o remédio
   * para uma medida inexata é medir de novo, não digitar outro número. A `0036`
   * impõe a mesma fronteira no banco por privilégio de coluna, então um
   * caminho que tentasse burlar isto receberia 42501.
   *
   * `feedback_edited_at` é carimbado aqui, e não por trigger, porque é a mesma
   * decisão que a coluna registra: o especialista precisa saber que a frase que
   * leu ontem pode não ser a de hoje. Não guardamos o texto anterior — a versão
   * antiga é justamente o dado inexato que o Art. 6°, V manda corrigir.
   *
   * @example
   * // corrigir os dois
   * await updateSessionFeedback(id, { intensity: 7, notes: "era o ombro esquerdo" });
   * // apagar só a observação; a sessão continua no histórico
   * await updateSessionFeedback(id, { notes: null });
   */
  updateSessionFeedback: async (
    sessionId: string,
    input: UpdateSessionFeedbackInput,
  ): Promise<WorkoutSession> => {
    const patch: Record<string, unknown> = { feedback_edited_at: new Date().toISOString() };
    if (input.intensity !== undefined) patch.intensity = input.intensity;
    // Texto em branco é o pedido de apagar, não um texto de um espaço.
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

    const { data, error } = await supabase
      .from("workout_sessions")
      .update(patch)
      .eq("id", sessionId)
      .select()
      .single();

    // Sem repassar o objeto do PostgREST para log: o erro dele carrega o
    // payload, e o payload aqui é `notes` — dado sensível de saúde. Mesma
    // regra já aplicada em `saveWorkoutSession` e `saveCardioSession`.
    if (error) throw error;
    return data as WorkoutSession;
  },

  /**
   * Grava os exercícios da sessão e as séries de cada um.
   *
   * Os dois passos moram aqui, e não na tela, porque cada tela que os
   * reimplementava esquecia um: até a `0023` havia três telas de execução, e
   * duas gravavam só o JSON de `sets_data`, invisível para as métricas.
   *
   * @example
   * await saveSessionExercises(sessionId, [
   *   { workout_exercise_id: "abc", sets: [{ reps_actual: 10, weight_actual: 40 }] },
   * ]);
   */
  /**
   * Grava a frequência cardíaca média de uma sessão.
   *
   * Vive em `workout_session_vitals`, e não numa coluna de `workout_sessions`,
   * porque a base legal é outra: Art. 11, II, f **mais** consentimento, contra
   * a execução de contrato da sessão. A RLS decide por linha, então uma coluna
   * de Art. 11 lá dentro ficaria sob uma política que não consulta
   * consentimento — e que não pode consultar, sob pena de revogar desligar a
   * prescrição de treino junto (migration `0049`).
   *
   * Chamar só com consentimento vigente. Quem chama é responsável, do mesmo
   * modo que é por `notes`.
   *
   * @example
   * await saveSessionHeartRate(session.id, 164);
   */
  saveSessionHeartRate: async (sessionId: string, avgHeartRate: number): Promise<void> => {
    const { error } = await supabase
      .from("workout_session_vitals")
      .insert({ session_id: sessionId, avg_heart_rate: avgHeartRate });

    if (error) throw error;
  },

  saveSessionExercises: async (
    sessionId: string,
    items: SaveSessionExerciseInput[],
  ): Promise<WorkoutSessionExercise[]> => {
    if (items.length === 0) return [];

    const { data, error } = await supabase
      .from("workout_session_exercises")
      .insert(
        items.map((item) => ({
          session_id: sessionId,
          workout_exercise_id: item.workout_exercise_id ?? null,
          exercise_id: item.exercise_id ?? null,
        })),
      )
      .select();

    if (error) throw error;

    const exercises = (data || []) as WorkoutSessionExercise[];

    // A ordem do retorno do PostgREST acompanha a do INSERT, então o índice
    // liga cada exercício às suas séries sem precisar de uma segunda leitura.
    const setRows = items.flatMap((item, index) => {
      const sessionExerciseId = exercises[index]?.id;
      if (!sessionExerciseId) return [];
      return item.sets.map((set, setIndex) => ({
        session_exercise_id: sessionExerciseId,
        set_index: setIndex,
        reps_prescribed: set.reps_prescribed ?? null,
        reps_actual: set.reps_actual ?? null,
        weight_prescribed: set.weight_prescribed ?? null,
        weight_actual: set.weight_actual ?? null,
        rest_prescribed: set.rest_prescribed ?? null,
        rest_actual: set.rest_actual ?? null,
        completed: set.completed ?? true,
        skipped: set.skipped ?? false,
      }));
    });

    if (setRows.length > 0) {
      const { error: setsError } = await supabase.from("workout_session_sets").insert(setRows);
      if (setsError) throw setsError;
    }

    return exercises;
  },
});

export type WorkoutsService = ReturnType<typeof createWorkoutsService>;
