import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthDailyMetric, HealthMetricInput } from "../types/health.types";

const CONSENT_HEALTH_COLLECTION = "health_data_collection";

/** Mantém paridade com web/src/shared/hooks/useHealthDataConsent.ts. */
const POLICY_VERSION = "1.0";

export const createHealthService = (supabase: SupabaseClient) => ({
  /**
   * Verifica o consentimento de coleta de dados de saúde do aluno.
   *
   * Sem consentimento registrado o dado pode ser exibido na tela, mas nunca
   * persistido — a base legal do Art. 11 exige consentimento além da tutela
   * da saúde.
   *
   * @example
   * if (await health.hasCollectionConsent(userId)) await health.upsertDaily(userId, metric);
   */
  hasCollectionConsent: async (studentId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("student_consents")
      .select("given_at, revoked_at")
      .eq("student_id", studentId)
      .eq("consent_type", CONSENT_HEALTH_COLLECTION)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;
    return Boolean(data.given_at) && !data.revoked_at;
  },

  /**
   * Registra o consentimento de coleta. Reativa um consentimento revogado
   * limpando `revoked_at` — o histórico anterior permanece, porque revogação
   * aqui é prospectiva e não apaga o que já foi coletado.
   */
  grantCollectionConsent: async (studentId: string): Promise<void> => {
    const { error } = await supabase.from("student_consents").upsert(
      {
        student_id: studentId,
        consent_type: CONSENT_HEALTH_COLLECTION,
        given_at: new Date().toISOString(),
        revoked_at: null,
        policy_version: POLICY_VERSION,
      },
      { onConflict: "student_id,consent_type" },
    );
    if (error) throw error;
  },

  /** Interrompe a coleta. Não apaga o histórico — ver docs/LGPD_COMPLIANCE.md. */
  revokeCollectionConsent: async (studentId: string): Promise<void> => {
    const { error } = await supabase
      .from("student_consents")
      .update({ revoked_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .eq("consent_type", CONSENT_HEALTH_COLLECTION);
    if (error) throw error;
  },

  /**
   * Grava o acumulado do dia. Idempotente por (student_id, date) — o background
   * fetch reenvia o mesmo dia várias vezes e um append inflaria a contagem.
   */
  upsertDaily: async (studentId: string, metric: HealthMetricInput): Promise<void> => {
    const { error } = await supabase.from("health_daily_metrics").upsert(
      {
        student_id: studentId,
        date: metric.date,
        steps: metric.steps,
        active_calories: metric.active_calories,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "student_id,date" },
    );
    if (error) throw error;
  },

  getRange: async (
    studentId: string,
    startDate: string,
    endDate: string,
  ): Promise<HealthDailyMetric[]> => {
    const { data, error } = await supabase
      .from("health_daily_metrics")
      .select("*")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) throw error;
    return (data as HealthDailyMetric[]) ?? [];
  },

  getDay: async (studentId: string, date: string): Promise<HealthDailyMetric | null> => {
    const { data, error } = await supabase
      .from("health_daily_metrics")
      .select("*")
      .eq("student_id", studentId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw error;
    return data as HealthDailyMetric | null;
  },
});
