import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthDailyMetric, HealthMetricInput } from "../types/health.types";

export const CONSENT_HEALTH_COLLECTION = "health_data_collection";

/**
 * Versão vigente da política de dados de saúde.
 *
 * Fonte única das duas plataformas. Até 2026-08-28 este valor existia duas
 * vezes — aqui e em `web/src/shared/hooks/useHealthDataConsent.ts` — com um
 * comentário pedindo que fossem mantidos em paridade à mão. Não é o tipo de
 * coisa que sobrevive a uma versão nova: quem sobe uma metade não tem como
 * saber da outra.
 *
 * **Subir esta constante pede reconsentimento de toda a base.** Só suba junto
 * com o texto novo da política, e só quando a cláusula que mudou for material
 * para o titular — reconsentimento pedido à toa é o que ensina a aceitar sem
 * ler.
 *
 * - `1.0` — coleta de passos e calorias para acompanhamento.
 * - `1.1` (2026-08-28) — acrescenta que **o especialista vinculado lê o que o
 *   aluno escreve no feedback de fim de treino**. A leitura pelo profissional
 *   não é uso secundário, é o uso: é ela que dá a base de tutela da saúde do
 *   Art. 11, II, f. O que faltava não era autorização, era o aluno saber disso
 *   na hora de escrever.
 * - `1.2` (2026-08-31) — acrescenta que **a câmera analisa continuamente no
 *   aparelho enquanto a tela do Body scan está aberta**. O texto da `1.1`
 *   descrevia três fotos que o aluno tira; a partir do portão de captura o
 *   aparelho olha sozinho, a cada dois segundos, para poder corrigir a posição
 *   por voz. Não armazenar não é não tratar — o Art. 5º, X inclui coleta,
 *   acesso e processamento —, e o mesmo motivo da `1.1` vale aqui: não faltava
 *   autorização, faltava o aluno saber (`ADR-0022`).
 */
export const POLICY_VERSION = "1.2";

export const createHealthService = (supabase: SupabaseClient) => ({
  /**
   * Verifica o consentimento de coleta de dados de saúde do aluno **na versão
   * vigente da política**.
   *
   * Sem consentimento registrado o dado pode ser exibido na tela, mas nunca
   * persistido — a base legal do Art. 11 exige consentimento além da tutela
   * da saúde.
   *
   * A comparação com `POLICY_VERSION` é o que torna o versionamento real. Até
   * 2026-08-28 esta consulta lia só `given_at` e `revoked_at`, então subir a
   * constante não pedia reconsentimento de ninguém: quem aceitou a `1.0`
   * seguia lendo como consentido para sempre, sob um texto que já não descrevia
   * o tratamento. Consentimento informado (Art. 9°) é sobre o texto que a
   * pessoa leu, não sobre o clique.
   *
   * Igualdade estrita, e não ordenação: quem está numa versão **posterior** à
   * que este build conhece também cai fora, e é o comportamento certo — o
   * cliente desatualizado não tem como afirmar o que a política nova diz.
   *
   * @example
   * if (await health.hasCollectionConsent(userId)) await health.upsertDaily(userId, metric);
   */
  hasCollectionConsent: async (studentId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("student_consents")
      .select("given_at, revoked_at, policy_version")
      .eq("student_id", studentId)
      .eq("consent_type", CONSENT_HEALTH_COLLECTION)
      .maybeSingle();

    if (error) throw error;
    if (!data) return false;
    if (data.policy_version !== POLICY_VERSION) return false;
    return Boolean(data.given_at) && !data.revoked_at;
  },

  /**
   * Registra o consentimento de coleta na versão vigente. Reativa um
   * consentimento revogado limpando `revoked_at` — o histórico anterior
   * permanece, porque revogação aqui é prospectiva e não apaga o que já foi
   * coletado.
   *
   * O mesmo `upsert` serve ao primeiro consentimento e ao reconsentimento de
   * quem estava numa versão antiga: `onConflict` no par
   * `(student_id, consent_type)` sobrescreve `policy_version` e `given_at`.
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
      // Campos nomeados, não `*`: tabela sensível pela `LGPD_COMPLIANCE.md`.
      // `select("*")` faz dado de saúde sair do banco para camadas que não
      // pediram por ele — e passa a carregar coluna nova sozinho.
      .select("id, student_id, date, steps, active_calories, synced_at")
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
      .select("id, student_id, date, steps, active_calories, synced_at")
      .eq("student_id", studentId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw error;
    return data as HealthDailyMetric | null;
  },
});
