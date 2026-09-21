import type { SupabaseClient } from "@supabase/supabase-js";
import type { MealLog } from "../../types/nutrition.types";
import { dailyActivities } from "../../utils/dailyActivity";
import { addDays } from "../../utils/dateOnly";
import { mealAdherence } from "../../utils/progressSummary";
import { createProgressService } from "../progress/progress.service";

/**
 * Aderência do especialista sobre seus alunos: a mesma conta que o aluno já
 * vê no próprio hub de Progresso (issue #298), nunca uma nova — "aderência"
 * não pode significar coisas diferentes em duas telas do mesmo produto.
 *
 * O treino não entra nesse número de propósito: o hub também nunca combina
 * treino e dieta num percentual só, só como "dia top" (contagem, não média).
 */

/** Mesma janela do hub de Progresso, para o número ser o mesmo em qualquer tela. */
const WINDOW_DAYS = 30;

type LogRow = Pick<MealLog, "logged_date" | "diet_meal_id" | "completed">;

export const createAdherenceService = (supabase: SupabaseClient) => {
  const progressService = createProgressService(supabase);

  const readMealLogs = async (studentId: string, from: string, to: string): Promise<LogRow[]> => {
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

  const fetchStudentAdherence = async (
    studentId: string,
    today: string,
  ): Promise<number | null> => {
    const from = addDays(today, -(WINDOW_DAYS - 1));
    const [{ plan, meals }, logs] = await Promise.all([
      progressService.getMealPlanOutline(studentId),
      readMealLogs(studentId, from, today),
    ]);

    const days = dailyActivities({ from, to: today, sessions: [], plan, meals, mealLogs: logs });
    return mealAdherence(days);
  };

  return {
    fetchStudentAdherence,

    /**
     * A média entre os alunos ativos que têm plano de dieta — quem não tem
     * não entra na conta, para não puxar a média para baixo como se tivesse
     * 0%. `null` quando ninguém tem plano ativo (ou não há aluno ativo).
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

      const values = await Promise.all(
        studentIds.map((studentId) => fetchStudentAdherence(studentId, today)),
      );
      const known = values.filter((value): value is number => value !== null);
      if (known.length === 0) return null;

      return Math.round(known.reduce((total, value) => total + value, 0) / known.length);
    },
  };
};

export type AdherenceService = ReturnType<typeof createAdherenceService>;
