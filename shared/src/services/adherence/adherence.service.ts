import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealLog } from "../../types/nutrition.types";
import { dailyActivities } from "../../utils/dailyActivity";
import { addDays } from "../../utils/dateOnly";
import { mealAdherence } from "../../utils/progressSummary";
import { createProgressService } from "../progress/progress.service";

/**
 * Aderência do especialista sobre seus alunos: treino e dieta combinados,
 * na janela de uma semana — a mesma janela dos dois lados, como a issue #332
 * pede.
 *
 * O lado da dieta reaproveita a mesma conta que o aluno já vê no próprio hub
 * de Progresso (`mealAdherence`, issue #298), nunca uma fórmula nova. O lado
 * do treino é sessões concluídas sobre as prescritas na fase ativa da
 * periodização ativa.
 *
 * Sem plano de um dos dois lados, o peso vai todo para o outro; sem nenhum
 * dos dois, `null` — nunca 0%, que afirmaria abandono onde não há dado.
 */

/** Janela semanal, dos dois lados — "periodização ativa, janela semanal" (issue #332). */
const WINDOW_DAYS = 7;
const PERCENT = 100;

type LogRow = Pick<MealLog, "logged_date" | "diet_meal_id" | "completed">;

export const createAdherenceService = (supabase: SupabaseClient) => {
  const progressService = createProgressService(supabase);

  const readMealLogs = async (studentId: string, from: string, to: string): Promise<LogRow[]> => {
    // meal_logs, nunca diet_logs: o segundo é campo legado, já superado
    // (docs/LGPD_COMPLIANCE.md). Roda sob a sessão do especialista — nunca
    // com privilégio de administrador — para a RLS de meal_logs fechar no
    // consentimento revogado.
    const { data, error } = await supabase
      .from("meal_logs")
      .select("logged_date, diet_meal_id, completed")
      .eq("student_id", studentId)
      .eq("completed", true)
      .gte("logged_date", from)
      .lte("logged_date", to);
    if (error) throw error;
    return (data ?? []) as LogRow[];
  };

  const fetchDietAdherence = async (studentId: string, today: string): Promise<number | null> => {
    const { plan, meals } = await progressService.getMealPlanOutline(studentId);
    if (!plan) return null;

    const from = addDays(today, -(WINDOW_DAYS - 1));
    const logs = await readMealLogs(studentId, from, today);
    const days = dailyActivities({ from, to: today, sessions: [], plan, meals, mealLogs: logs });
    return mealAdherence(days);
  };

  /**
   * Sessões concluídas sobre as prescritas na fase ativa da periodização
   * ativa, nos últimos 7 dias. `null` sem periodização ativa, sem fase ativa
   * ou sem nenhum treino com dia da semana prescrito nela.
   */
  const fetchTrainingAdherence = async (
    studentId: string,
    today: string,
  ): Promise<number | null> => {
    const { data: periodization, error: perError } = await supabase
      .from("training_periodizations")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (perError) throw perError;
    if (!periodization) return null;

    const { data: plan, error: planError } = await supabase
      .from("training_plans")
      .select("id")
      .eq("periodization_id", (periodization as { id: string }).id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan) return null;

    const { count: prescribed, error: workoutsError } = await supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("training_plan_id", (plan as { id: string }).id)
      .not("day_of_week", "is", null);
    if (workoutsError) throw workoutsError;
    if (!prescribed) return null;

    const from = addDays(today, -(WINDOW_DAYS - 1));
    const { count: completed, error: sessionsError } = await supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
      .gte("completed_at", `${from}T00:00:00.000Z`);
    if (sessionsError) throw sessionsError;

    return Math.min(PERCENT, Math.round(((completed ?? 0) / prescribed) * PERCENT));
  };

  const fetchStudentAdherence = async (
    studentId: string,
    today: string,
  ): Promise<number | null> => {
    const training = await fetchTrainingAdherence(studentId, today);
    const diet = await fetchDietAdherence(studentId, today);

    if (training === null && diet === null) return null;
    if (training === null) return diet;
    if (diet === null) return training;
    return Math.round((training + diet) / 2);
  };

  return {
    fetchStudentAdherence,

    /**
     * A média entre os alunos ativos que têm treino e/ou dieta ativos —
     * quem não tem nenhum dos dois não entra na conta, para não puxar a
     * média para baixo como se tivesse 0%. `null` quando ninguém entra.
     *
     * @example const media = await adherenceService.fetchAdherence(especialistaId, hoje);
     */
    fetchAdherence: async (specialistId: string, today: string): Promise<number | null> => {
      const { data, error } = await supabase
        .from("student_specialists")
        .select("student_id")
        .eq("specialist_id", specialistId)
        .eq("status", "active");
      if (error) throw error;

      const studentIds = [
        ...new Set((data ?? []).map((row: { student_id: string }) => row.student_id)),
      ];
      if (studentIds.length === 0) return null;

      // Sequencial, e não Promise.all: um aluno de cada vez mantém a ordem
      // das consultas previsível — e o painel não precisa da resposta em
      // paralelo para uma lista de dezenas de alunos.
      const values: (number | null)[] = [];
      for (const studentId of studentIds) {
        values.push(await fetchStudentAdherence(studentId, today));
      }

      const known = values.filter((value): value is number => value !== null);
      if (known.length === 0) return null;

      return Math.round(known.reduce((total, value) => total + value, 0) / known.length);
    },
  };
};

export type AdherenceService = ReturnType<typeof createAdherenceService>;
