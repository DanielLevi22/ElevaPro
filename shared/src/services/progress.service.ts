import type { SupabaseClient } from "@supabase/supabase-js";
import type { DietMeal, DietPlan, MealLog } from "../types/nutrition.types";
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

/** O teto de linhas por resposta do PostgREST (`max_rows`). */
const PAGE_SIZE = 1000;

export interface ActivityHistory {
  /** O dia local de cada sessão concluída, repetido quando há duas no dia. */
  sessionDates: string[];
  mealLogs: Pick<MealLog, "logged_date" | "diet_meal_id" | "completed">[];
}

/** O plano ativo reduzido ao que a contagem do dia usa. */
export interface MealPlanOutline {
  plan: Pick<DietPlan, "plan_type" | "start_date"> | null;
  meals: Pick<DietMeal, "id" | "day_of_week">[];
}

interface PlanOutlineRow extends Pick<DietPlan, "plan_type" | "start_date"> {
  meals: Pick<DietMeal, "id" | "day_of_week">[] | null;
}

export const createProgressService = (supabase: SupabaseClient) => ({
  /**
   * O tipo, o início e as refeições do plano ativo, sem alimento nem macro: a
   * aderência só precisa saber quantas refeições valem em cada dia.
   *
   * @example const { plan, meals } = await service.getMealPlanOutline(aluno.id);
   */
  getMealPlanOutline: async (studentId: string): Promise<MealPlanOutline> => {
    const { data, error } = await supabase
      .from("diet_plans")
      .select("plan_type, start_date, meals:diet_meals(id, day_of_week)")
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    const row = data as PlanOutlineRow | null;
    if (!row) return { plan: null, meals: [] };
    return {
      plan: { plan_type: row.plan_type, start_date: row.start_date },
      meals: row.meals ?? [],
    };
  },

  /**
   * Toda a atividade do aluno, só pelas datas: é o que a sequência e o heatmap
   * precisam, e nada da sessão ou da refeição além disso.
   *
   * @example const history = await service.listActivityHistory(aluno.id);
   */
  listActivityHistory: async (studentId: string): Promise<ActivityHistory> => {
    const [sessions, meals] = await Promise.all([
      readAllPages<{ completed_at: string }>((from, to) =>
        supabase
          .from("workout_sessions")
          .select("completed_at")
          .eq("student_id", studentId)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: true })
          .range(from, to),
      ),
      readAllPages<{ logged_date: string; diet_meal_id: string | null }>((from, to) =>
        supabase
          .from("meal_logs")
          .select("logged_date, diet_meal_id")
          .eq("student_id", studentId)
          .eq("completed", true)
          .order("logged_date", { ascending: true })
          .range(from, to),
      ),
    ]);
    return {
      sessionDates: sessions.map((row) => localDateOf(new Date(row.completed_at))),
      mealLogs: meals.map((row) => ({ ...row, completed: true })),
    };
  },

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

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/** Lê até a página vir incompleta: o PostgREST corta cada resposta em `PAGE_SIZE`. */
async function readAllPages<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

/** Meia-noite local de `date`, como instante: a sessão das 23h30 é do dia. */
function startOfLocalDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}
