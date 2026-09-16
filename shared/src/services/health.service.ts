import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthDailyMetric, HealthMetricInput } from "../types/health.types";

export const CONSENT_HEALTH_COLLECTION = "health_data_collection";
export const CONSENT_TECHNIQUE_ANALYSIS = "technique_analysis";
export const CONSENT_RANKING = "ranking";

/**
 * Uma finalidade de tratamento e a versão do texto que a descreve.
 *
 * O par anda junto porque separá-los foi o defeito de 2026-08-28: a consulta
 * lia só `given_at`, então subir a versão não alcançava ninguém e quem aceitou
 * a `1.0` seguia consentido sob um texto que já não descrevia o tratamento.
 *
 * Cada finalidade tem a **sua** versão. Uma constante global voltaria a
 * amarrá-las: mudar o texto da Análise de Técnica pediria reconsentimento do
 * body scan, e reconsentimento pedido à toa é o que ensina a aceitar sem ler.
 */
export interface Finalidade {
  tipo: string;
  versao: string;
}

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
 * - `1.3` (2026-09-04) — acrescenta **sono e frequência cardíaca de repouso**,
 *   e diz o que a revogação faz. As duas coisas mudaram juntas de propósito: o
 *   texto da `1.2` descrevia "acompanhamento de atividade entre sessões de
 *   treino", e sono é comportamento fora do treino enquanto FC de repouso é
 *   sinal vital — finalidade nova, não detalhe da anterior. E até a `0043` a
 *   revogação só interrompia a coleta: o especialista seguia lendo o histórico,
 *   embora este documento afirmasse o contrário. Agora revogar fecha o acesso
 *   dele às cinco tabelas de Art. 11, e o texto pode prometer isso porque o
 *   banco cumpre.
 * - `1.4` (2026-09-06) — acrescenta a **frequência cardíaca média da corrida**,
 *   lida do relógio pelo período da sessão. Finalidade nova pelo mesmo critério
 *   da `1.3`: o texto anterior cobria o agregado do dia, e esta é a medida de
 *   uma sessão específica, que o especialista usa para ajustar a prescrição.
 *   Continua no mesmo `consent_type` — é coleta de dado de saúde para
 *   acompanhamento, ao contrário da Análise de Técnica, que ganhou tipo próprio
 *   na `0041` por ser outra natureza.
 *
 *   O texto diz também o que **não** é coletado, porque nesta feature a
 *   ausência é a decisão: o percurso da corrida não é guardado. O GPS mede
 *   distância e ritmo no aparelho e as coordenadas morrem com a sessão — elas
 *   revelariam endereço de casa e janela de ausência sem mudar prescrição
 *   nenhuma (issue #278, migration `0049`).
 * - `1.5` (2026-09-13) — acrescenta **a água do dia** e diz **o que vai ao
 *   serviço de IA** no fluxo de nutrição. Duas mudanças materiais, as duas da
 *   #298: a água é dado de saúde novo (`0052`), e o texto nunca disse que a foto
 *   do prato, a pergunta ao assistente e o que falta de calorias e macros do
 *   dia saem do aparelho para um serviço externo. O scan e o assistente já
 *   existiam; o lote aumentou o que atravessa, e o aluno precisa saber antes de
 *   fotografar (Art. 9°). O texto diz também o que não vai: a foto não é
 *   guardada, e o nome do aluno não segue junto.
 * - `1.6` (2026-09-14) — acrescenta **o tempo em cada zona de FC das corridas** e
 *   diz que **a idade da anamnese calcula as zonas**. Issue #304 e migration
 *   `0054`: as zonas são dado de saúde novo guardado, e a idade passa a servir a
 *   uma finalidade que o texto não mencionava. O texto diz também o que continua
 *   fora: a série de batimentos é lida no aparelho e não é guardada.
 * - `1.7` (2026-09-14) — acrescenta **a prontidão do dia**, a nota de 0 a 100
 *   calculada do sono e da FC de repouso contra a média do próprio aluno. Issue
 *   #308, migration `0055` e ADR-0029: a nota é dado de saúde derivado e gravado,
 *   e inferir recuperação é finalidade que o texto não cobria — guardar a duração
 *   do sono não é o mesmo que dizer se a pessoa está pronta para treinar.
 * - `1.8` (2026-09-15) — acrescenta **a medida corporal registrada pelo próprio
 *   aluno** e **as notas do especialista sobre o progresso**. Issue #312 e
 *   migration `0056`: o aluno sem especialista passou a declarar peso, gordura e
 *   medidas, e a lista nunca tinha dito que a medida corporal é guardada; a nota
 *   é texto do especialista sobre a saúde do aluno, e aparece só no texto de quem
 *   tem especialista. As duas entram juntas para a base reconsentir uma vez.
 */
export const POLICY_VERSION = "1.8";

/** Coleta de dados de saúde: avaliação, anamnese, métricas diárias, body scan. */
export const SAUDE: Finalidade = { tipo: CONSENT_HEALTH_COLLECTION, versao: POLICY_VERSION };

/**
 * Análise de Técnica: a câmera lendo o corpo durante a série.
 *
 * Finalidade separada da `SAUDE`, e não um parágrafo novo dentro dela, porque
 * o Art. 8°, §4° anula autorização genérica e porque empacotá-las faria a
 * recusa de uma custar a outra — ver a migration 0041. Começa em `1.0`: é
 * texto novo, não revisão de texto existente.
 */
export const TECNICA: Finalidade = { tipo: CONSENT_TECHNIQUE_ANALYSIS, versao: "1.0" };

/**
 * Participar do ranking: o primeiro nome e a inicial do sobrenome aparecem para
 * outros participantes. Não é dado de saúde, mas expor o nome a quem não tem
 * vínculo não é execução de contrato (Art. 7°, I), e por isso tem finalidade
 * própria, pelo mesmo motivo da `TECNICA` — ver a migration 0058.
 */
export const RANKING: Finalidade = { tipo: CONSENT_RANKING, versao: "1.0" };

export type ConsentState = "granted" | "outdated" | "revoked" | "missing";

export interface ConsentStatus {
  state: ConsentState;
  givenAt: string | null;
  policyVersion: string | null;
}

async function readConsentStatus(
  supabase: SupabaseClient,
  studentId: string,
  finalidade: Finalidade,
): Promise<ConsentStatus> {
  const { data, error } = await supabase
    .from("student_consents")
    .select("given_at, revoked_at, policy_version")
    .eq("student_id", studentId)
    .eq("consent_type", finalidade.tipo)
    .maybeSingle();

  if (error) throw error;
  if (!data?.given_at) return { state: "missing", givenAt: null, policyVersion: null };
  const found = { givenAt: data.given_at, policyVersion: data.policy_version };
  // Retirado vale mais que a versão: quem retirou não está "pendente de aceitar".
  if (data.revoked_at) return { state: "revoked", ...found };
  if (data.policy_version !== finalidade.versao) return { state: "outdated", ...found };
  return { state: "granted", ...found };
}

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
  hasCollectionConsent: async (
    studentId: string,
    finalidade: Finalidade = SAUDE,
  ): Promise<boolean> =>
    (await readConsentStatus(supabase, studentId, finalidade)).state === "granted",

  /**
   * Em que pé está o aceite, para o health check dizer ao Student o que fazer:
   * aceito na versão vigente (com a data), pendente de uma versão nova, retirado,
   * ou nunca dado. A regra de "aceito" é a mesma de `hasCollectionConsent`.
   *
   * @example
   * const { state, givenAt } = await health.getConsentStatus(userId);
   */
  getConsentStatus: (studentId: string, finalidade: Finalidade = SAUDE): Promise<ConsentStatus> =>
    readConsentStatus(supabase, studentId, finalidade),

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
  grantCollectionConsent: async (
    studentId: string,
    finalidade: Finalidade = SAUDE,
  ): Promise<void> => {
    const { error } = await supabase.from("student_consents").upsert(
      {
        student_id: studentId,
        consent_type: finalidade.tipo,
        given_at: new Date().toISOString(),
        revoked_at: null,
        policy_version: finalidade.versao,
      },
      { onConflict: "student_id,consent_type" },
    );
    if (error) throw error;
  },

  /** Interrompe a coleta. Não apaga o histórico — ver docs/LGPD_COMPLIANCE.md. */
  revokeCollectionConsent: async (
    studentId: string,
    finalidade: Finalidade = SAUDE,
  ): Promise<void> => {
    const { error } = await supabase
      .from("student_consents")
      .update({ revoked_at: new Date().toISOString() })
      .eq("student_id", studentId)
      .eq("consent_type", finalidade.tipo);
    if (error) throw error;
  },

  /**
   * Grava o acumulado do dia. Idempotente por (student_id, date) — o background
   * fetch reenvia o mesmo dia várias vezes e um append inflaria a contagem.
   *
   * **Métrica ausente não vira coluna apagada.** Cada leitura falha por conta
   * própria: o relógio dá passos e não dá sono, ou o Health Connect nega uma
   * permissão e concede outra. Uma gravação parcial que enviasse `null` no que
   * não leu limparia o sono da noite anterior a cada sincronização de passos —
   * o mesmo defeito que `hasRecords` corrigiu para o zero-por-ausência, num
   * lugar diferente. Chave omitida do payload não entra no `ON CONFLICT DO
   * UPDATE` e preserva o que já está gravado.
   *
   * Para apagar de propósito, passe `null` explícito.
   *
   * @example
   * // só passos: o sono de ontem continua lá
   * await health.upsertDaily(id, { date, steps: 8421, active_calories: 512 });
   */
  upsertDaily: async (studentId: string, metric: HealthMetricInput): Promise<void> => {
    const payload: Record<string, unknown> = {
      student_id: studentId,
      date: metric.date,
      steps: metric.steps,
      active_calories: metric.active_calories,
      synced_at: new Date().toISOString(),
    };

    if (metric.sleep_minutes !== undefined) payload.sleep_minutes = metric.sleep_minutes;
    if (metric.resting_heart_rate !== undefined) {
      payload.resting_heart_rate = metric.resting_heart_rate;
    }
    if (metric.readiness !== undefined) {
      payload.readiness_score = metric.readiness?.score ?? null;
      payload.readiness_version = metric.readiness?.version ?? null;
    }

    const { error } = await supabase
      .from("health_daily_metrics")
      .upsert(payload, { onConflict: "student_id,date" });
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
      .select(
        "id, student_id, date, steps, active_calories, sleep_minutes, resting_heart_rate, readiness_score, readiness_version, synced_at",
      )
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
      .select(
        "id, student_id, date, steps, active_calories, sleep_minutes, resting_heart_rate, readiness_score, readiness_version, synced_at",
      )
      .eq("student_id", studentId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw error;
    return data as HealthDailyMetric | null;
  },
});
