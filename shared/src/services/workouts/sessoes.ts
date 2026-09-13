import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateWorkoutSessionInput,
  SaveSessionExerciseInput,
  UpdateSessionFeedbackInput,
  WorkoutSession,
  WorkoutSessionExercise,
} from "../../types/workouts.types";
import type { SessaoConcluida } from "../../utils/periodizacao";

/**
 * Sessões de treino: registro, feedback, frequência cardíaca e as leituras que
 * decidem o próximo treino.
 *
 * Parte do `createWorkoutsService`. É o pedaço que toca `workout_sessions`,
 * tabela sensível pela LGPD — e ficar num arquivo só é o que deixa revisar de
 * uma vez tudo o que grava ou lê dela.
 */
export const criarServicoDeSessoes = (supabase: SupabaseClient) => ({
  /**
   * A última sessão concluída com treino de fase: o que decide o rodízio.
   *
   * Só treino e data. Sessão de cardio não tem `workout_id` e fica de fora —
   * contá-la mandaria o rodízio de volta ao primeiro treino.
   *
   * @example
   * const ultima = await service.fetchLastWorkoutSession(aluno.id);
   */
  fetchLastWorkoutSession: async (studentId: string): Promise<SessaoConcluida | null> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("workout_id, completed_at")
      .eq("student_id", studentId)
      .not("workout_id", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as SessaoConcluida | null;
  },

  /**
   * As sessões concluídas desde um instante, para marcar os treinos da semana.
   *
   * @example
   * const sessoes = await service.fetchCompletedSessionsSince(aluno.id, inicioDaSemanaISO(new Date()));
   */
  fetchCompletedSessionsSince: async (
    studentId: string,
    desde: string,
  ): Promise<SessaoConcluida[]> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("workout_id, completed_at")
      .eq("student_id", studentId)
      .gte("completed_at", desde);
    if (error) throw error;
    return (data ?? []) as SessaoConcluida[];
  },

  createWorkoutSession: async (input: CreateWorkoutSessionInput): Promise<WorkoutSession> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .insert({
        student_id: input.student_id,
        workout_id: input.workout_id ?? null,
        started_at: input.started_at,
        completed_at: input.completed_at ?? null,
        perceived_exertion: input.perceived_exertion ?? null,
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
   * Só `perceived_exertion` e `notes` — é o Art. 18, III aplicado ao que o titular
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
   * await updateSessionFeedback(id, { perceived_exertion: 7, notes: "era o ombro esquerdo" });
   * // apagar só a observação; a sessão continua no histórico
   * await updateSessionFeedback(id, { notes: null });
   */
  updateSessionFeedback: async (
    sessionId: string,
    input: UpdateSessionFeedbackInput,
  ): Promise<WorkoutSession> => {
    const patch: Record<string, unknown> = { feedback_edited_at: new Date().toISOString() };
    if (input.perceived_exertion !== undefined) patch.perceived_exertion = input.perceived_exertion;
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
