import { createHealthService, type HealthMetricInput } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { registrarFalha } from '@/lib/registro';

const healthService = createHealthService(supabase);

/** ISO date local (YYYY-MM-DD). toISOString() usaria UTC e viraria o dia cedo demais. */
export function localDateKey(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, '0');
  const day = String(reference.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export type SyncOutcome = 'saved' | 'no-session' | 'no-consent' | 'failed';

/**
 * Persiste o agregado do dia, se e somente se houver sessão e consentimento.
 *
 * Nunca lança: é chamada tanto pela UI quanto pela task de background, e uma
 * falha de rede não pode derrubar nenhuma das duas.
 *
 * @example
 * const outcome = await syncDailyMetrics({ date: localDateKey(), steps, active_calories });
 */
export async function syncDailyMetrics(metric: HealthMetricInput): Promise<SyncOutcome> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return 'no-session';

    const studentId = session.user.id;
    if (!(await healthService.hasCollectionConsent(studentId))) return 'no-consent';

    await healthService.upsertDaily(studentId, metric);
    return 'saved';
  } catch {
    // Sem o erro no log: o do PostgREST carrega o payload, e o payload aqui são
    // passos, sono e FC — dado de saúde fora de observabilidade (Art. 6°, VII).
    registrarFalha('wearable.persist_today');
    return 'failed';
  }
}
