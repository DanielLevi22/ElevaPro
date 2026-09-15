import type { SupabaseClient } from "@supabase/supabase-js";
import { localDateOf } from "../utils/dateOnly";
import type { CompletedSet } from "../utils/trainingProgress";

/**
 * O que a evolução do treino lê do banco (issue #312): as séries concluídas do
 * aluno desde uma data, achatadas para as contas de `trainingProgress`.
 *
 * Substitui o `WorkoutAnalyticsService` do app, que fazia três consultas
 * encadeadas e mandava os ids das sessões na URL. Aqui é uma só, descendo de
 * `workout_sessions` pelas chaves estrangeiras, com colunas nomeadas: a tabela é
 * sensível e `notes` não tem o que fazer numa conta de carga.
 */

const SESSION_COLUMNS =
  "id, completed_at, exercises:workout_session_exercises(exercise_id, exercise:exercises(name, muscle_group), sets:workout_session_sets(reps_actual, weight_actual, completed))";

interface SetRow {
  reps_actual: number | null;
  weight_actual: number | null;
  completed: boolean;
}

interface CatalogExercise {
  name: string;
  muscle_group: string | null;
}

interface ExerciseRow {
  exercise_id: string | null;
  /**
   * O PostgREST devolve o recurso embutido como objeto quando prova que a chave
   * é única, e como lista quando não prova — o mesmo caso de `achatarVitals`.
   */
  exercise: CatalogExercise | CatalogExercise[] | null;
  sets: SetRow[] | null;
}

interface SessionRow {
  id: string;
  completed_at: string;
  exercises: ExerciseRow[] | null;
}

export const createTrainingProgressService = (supabase: SupabaseClient) => ({
  /**
   * As séries concluídas das sessões terminadas desde `since`, no dia local.
   *
   * @example
   * const sets = await service.listCompletedSets(aluno.id, "2025-09-16");
   */
  listCompletedSets: async (studentId: string, since: string): Promise<CompletedSet[]> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(SESSION_COLUMNS)
      .eq("student_id", studentId)
      .gte("completed_at", startOfLocalDay(since))
      .order("completed_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as SessionRow[]).flatMap(flattenSession);
  },
});

function flattenSession(session: SessionRow): CompletedSet[] {
  const date = localDateOf(new Date(session.completed_at));
  return (session.exercises ?? []).flatMap((row) => {
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise;
    const exercise_id = row.exercise_id;
    if (!exercise_id || !exercise) return [];
    return (row.sets ?? [])
      .filter((item) => item.completed)
      .map((item) => ({
        date,
        sessionId: session.id,
        exerciseId: exercise_id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscle_group,
        reps: item.reps_actual,
        weight: item.weight_actual,
      }));
  });
}

/** Meia-noite local de `date`, como instante: a sessão das 23h30 é do dia. */
function startOfLocalDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}
