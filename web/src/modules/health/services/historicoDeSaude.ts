import { createHealthService, type HealthDailyMetric } from "@elevapro/shared";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Janela que a aba mostra. Duas semanas cobrem a linha de base de sono e FC. */
export const DIAS_DA_JANELA = 14;

/**
 * Uma métrica resumida para a tela: o valor de hoje contra a média dos dias
 * anteriores.
 */
export interface ResumoDaMetrica {
  atual: number | null;
  media: number | null;
  variacao: number | null;
}

export interface HistoricoDeSaude {
  dias: HealthDailyMetric[];
  sono: ResumoDaMetrica;
  frequenciaDeRepouso: ResumoDaMetrica;
  passos: ResumoDaMetrica;
}

function chaveLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Compara o dia mais recente com a média dos anteriores.
 *
 * A média exclui o próprio valor comparado: incluí-lo achata o desvio que o
 * especialista veio ver. Devolve tudo nulo com menos de três dias de base —
 * média de dois dias tem cara de medição e não é uma.
 */
function resumir(valores: (number | null)[]): ResumoDaMetrica {
  const [atual = null, ...anteriores] = valores;
  const base = anteriores.filter((v): v is number => v != null);

  if (atual == null || base.length < 3) {
    return { atual, media: null, variacao: null };
  }

  const media = Math.round(base.reduce((soma, v) => soma + v, 0) / base.length);
  return { atual, media, variacao: atual - media };
}

/**
 * O que o relógio do aluno mediu, para o especialista vinculado.
 *
 * Usa o cliente do **titular**, não a chave de serviço: assim a RLS decide, e
 * ela decide por vínculo ativo **e** consentimento não revogado (migrations
 * `0015` e `0043`). Aluno que revogou volta lista vazia aqui, sem que esta
 * função precise saber disso — é o mesmo motivo pelo qual as rotas do BFF
 * passaram a existir com `api-auth.ts`: autorização em um lugar só.
 *
 * Devolve os dias em ordem decrescente, o mais recente primeiro, que é a ordem
 * em que `getRange` já entrega e a que as duas telas consomem.
 *
 * @example
 * const { sono, dias } = await carregarHistoricoDeSaude(studentId);
 */
export async function carregarHistoricoDeSaude(studentId: string): Promise<HistoricoDeSaude> {
  const supabase = await createServerSupabaseClient();

  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - (DIAS_DA_JANELA - 1));

  const dias = await createHealthService(supabase).getRange(
    studentId,
    chaveLocal(inicio),
    chaveLocal(fim),
  );

  return {
    dias,
    sono: resumir(dias.map((d) => d.sleep_minutes)),
    frequenciaDeRepouso: resumir(dias.map((d) => d.resting_heart_rate)),
    passos: resumir(dias.map((d) => d.steps)),
  };
}
