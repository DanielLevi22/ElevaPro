import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayOfWeek } from "../../types/workouts.types";
import type { NoticeMeal, NoticeState, NoticeWorkout } from "../../utils/dailyNotices";
import { LEARNING_WINDOW_DAYS } from "../../utils/dailyNotices";
import { addDays, localDateOf, weekdayFromMonday } from "../../utils/dateOnly";
import { createHealthService } from "../health/health.service";
import { createWeeklyCheckInService } from "../nutrition/weeklyCheckIn.service";
import { createRestService } from "../workouts/rest.service";

interface MealRow {
  id: string;
  name: string | null;
  meal_time: string | null;
  day_of_week: number | null;
}

interface SessionRow {
  started_at: string | null;
  completed_at: string;
  session_type: string | null;
}

const MINUTES_PER_HOUR = 60;

/**
 * O estado do dia que os avisos precisam (#376, item G), sob a sessão do
 * aluno. Só nomes e horários do plano e se cada coisa foi feita: o aviso não
 * lê o que foi comido nem as cargas.
 *
 * @example const estado = await createDailyNoticesService(supabase).fetchNoticeState(user.id, new Date());
 */
export const createDailyNoticesService = (supabase: SupabaseClient) => {
  const rests = createRestService(supabase);
  const health = createHealthService(supabase);
  const checkIns = createWeeklyCheckInService(supabase);

  return {
    /**
     * O plano de hoje, o que já foi feito e os inícios de treino das últimas
     * 4 semanas, no fuso do aparelho. Sem o consentimento de saúde, a dieta e
     * os registros de refeição nem são lidos: ler para descartar ainda é
     * tratamento (#344).
     *
     * @example const estado = await notices.fetchNoticeState(user.id, new Date());
     */
    fetchNoticeState: async (studentId: string, now: Date): Promise<NoticeState> => {
      const today = localDateOf(now);
      const healthConsent = await health.hasCollectionConsent(studentId).catch(() => false);
      const [meals, loggedMealIds, workouts, sessions, paused, summary] = await Promise.all([
        healthConsent ? activeMeals(supabase, studentId) : [],
        healthConsent ? loggedToday(supabase, studentId, today) : [],
        activeWorkouts(supabase, studentId),
        recentSessions(supabase, studentId, addDays(today, -LEARNING_WINDOW_DAYS)),
        rests.recent(studentId),
        checkIns.summary(studentId),
      ]);
      return {
        today,
        nowMinutes: minutesOfDay(now),
        meals,
        loggedMealIds,
        workouts,
        ...sessionFacts(sessions, today),
        rests: paused,
        checkInDue: summary.state === "due",
        healthConsent,
      };
    },

    /**
     * Quantos treinos a pessoa já fez, de qualquer tipo: o marco da vitória (F1).
     *
     * @example const total = await notices.countWorkouts(user.id); // 50
     */
    countWorkouts: async (studentId: string): Promise<number> => {
      const { count, error } = await supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .not("completed_at", "is", null);
      if (error) throw error;
      return count ?? 0;
    },
  };
};

const minutesOfDay = (instant: Date) =>
  instant.getHours() * MINUTES_PER_HOUR + instant.getMinutes();

/** O que as sessões das 4 semanas dizem: hoje, a última, a semana e o costume. */
function sessionFacts(sessions: readonly SessionRow[], today: string) {
  const days = sessions.map((row) => localDateOf(new Date(row.completed_at))).sort();
  const monday = addDays(today, -weekdayFromMonday(today));
  return {
    trainedToday: days.includes(today),
    lastWorkoutDate: days.at(-1) ?? null,
    workoutsThisWeek: days.filter((day) => day >= monday).length,
    // O horário de costume é o da musculação: o cardio tem hora própria.
    workoutStarts: sessions.flatMap((row) =>
      row.started_at && row.session_type === "strength"
        ? [minutesOfDay(new Date(row.started_at))]
        : [],
    ),
  };
}

export type DailyNoticesService = ReturnType<typeof createDailyNoticesService>;

/** As refeições da dieta ativa. No plano único, todas valem todo dia. */
async function activeMeals(supabase: SupabaseClient, studentId: string): Promise<NoticeMeal[]> {
  const { data, error } = await supabase
    .from("diet_plans")
    .select("plan_type, meals:diet_meals(id, name, meal_time, day_of_week)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  const plan = data as { plan_type: string; meals: MealRow[] | null } | null;
  return (plan?.meals ?? []).flatMap((meal) =>
    meal.meal_time
      ? [
          {
            id: meal.id,
            name: meal.name ?? "Refeição",
            time: meal.meal_time,
            dayOfWeek: plan?.plan_type === "unique" ? null : meal.day_of_week,
          },
        ]
      : [],
  );
}

async function loggedToday(supabase: SupabaseClient, studentId: string, today: string) {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("diet_meal_id")
    .eq("student_id", studentId)
    .eq("logged_date", today)
    .eq("completed", true);
  if (error) throw error;
  return ((data ?? []) as { diet_meal_id: string | null }[]).flatMap((row) =>
    row.diet_meal_id ? [row.diet_meal_id] : [],
  );
}

/** Os treinos com dia do plano ativo da periodização ativa. */
async function activeWorkouts(
  supabase: SupabaseClient,
  studentId: string,
): Promise<NoticeWorkout[]> {
  const { data, error } = await supabase
    .from("training_plans")
    .select(
      "workouts(id, title, day_of_week), periodization:training_periodizations!inner(status, student_id)",
    )
    .eq("status", "active")
    .eq("periodization.status", "active")
    .eq("periodization.student_id", studentId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const rows =
    (data as { workouts: { id: string; title: string; day_of_week: DayOfWeek | null }[] } | null)
      ?.workouts ?? [];
  return rows.flatMap((row) =>
    row.day_of_week ? [{ id: row.id, title: row.title, day: row.day_of_week }] : [],
  );
}

async function recentSessions(
  supabase: SupabaseClient,
  studentId: string,
  since: string,
): Promise<SessionRow[]> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("started_at, completed_at, session_type")
    .eq("student_id", studentId)
    .not("completed_at", "is", null)
    .gte("completed_at", since);
  if (error) throw error;
  return (data ?? []) as SessionRow[];
}
