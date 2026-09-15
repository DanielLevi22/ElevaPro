import { type ConsentStatus, createHealthService, type HealthDailyMetric } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { localDateKey } from '@/services/healthSync';

const healthService = createHealthService(supabase);

/** Quantos dias a tela olha para trás. Duas semanas cobrem a linha de base. */
export const HISTORY_DAYS = 14;

export interface HealthHistory {
  /** Do mais recente para o mais antigo, como o banco devolve. */
  days: HealthDailyMetric[];
  loading: boolean;
  failed: boolean;
  reload: () => Promise<unknown>;
}

/**
 * O histórico gravado do próprio Student, do banco — não do relógio.
 *
 * `useHealthData` lê o aparelho e responde "como está hoje". Este lê o que foi
 * sincronizado e responde "como tem sido", que é a pergunta que sono e FC de
 * repouso existem para responder. Vem do banco de propósito: é o mesmo dado que o
 * especialista enxerga, e divergência entre as duas telas vira conversa errada.
 *
 * O log de falha vai sem o erro: o do PostgREST pode carregar as linhas, que são
 * dado de saúde (Art. 6°, VII).
 *
 * @example const { days, loading } = useHealthHistory(user.id);
 */
export function useHealthHistory(studentId: string): HealthHistory {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (HISTORY_DAYS - 1));
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['healthHistory', studentId, localDateKey(end)],
    queryFn: () =>
      avisandoSeFalhar('health.read_history', () =>
        healthService.getRange(studentId, localDateKey(start), localDateKey(end))
      ),
  });
  return { days: data ?? [], loading: isLoading, failed: isError, reload: refetch };
}

/**
 * Em que pé está o aceite de saúde, para o health check. `null` enquanto carrega ou
 * quando a consulta falha: dizer "não autorizado" a quem autorizou é pior que não
 * dizer nada.
 *
 * @example const { consent } = useConsentStatus(user.id);
 */
export function useConsentStatus(studentId: string): {
  consent: ConsentStatus | null;
  reload: () => Promise<unknown>;
} {
  const { data, refetch } = useQuery({
    queryKey: ['consentStatus', studentId],
    queryFn: () =>
      avisandoSeFalhar('health.read_consent', () => healthService.getConsentStatus(studentId)),
  });
  return { consent: data ?? null, reload: refetch };
}
