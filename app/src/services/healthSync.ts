import { computeReadiness, createHealthService, type HealthMetricInput } from '@elevapro/shared';
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

/** A base da prontidão: os 14 dias anteriores ao dia gravado (ADR-0029). */
const BASELINE_DAYS = 14;

function shiftDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

/**
 * O dia com a prontidão calculada, quando esta leitura trouxe sono e FC de repouso.
 *
 * Sem os dois, o dia vai sem a chave `readiness`, e a nota de uma leitura anterior
 * do mesmo dia fica. Falha ao ler a base também: perder o dia por causa da nota é
 * pior que perder a nota.
 */
async function withReadiness(
  studentId: string,
  metric: HealthMetricInput
): Promise<HealthMetricInput> {
  const { sleep_minutes, resting_heart_rate } = metric;
  if (sleep_minutes === undefined || resting_heart_rate === undefined) return metric;
  try {
    const baseline = await healthService.getRange(
      studentId,
      shiftDays(metric.date, -BASELINE_DAYS),
      shiftDays(metric.date, -1)
    );
    const readiness = computeReadiness(
      { sleepMinutes: sleep_minutes, restingHeartRate: resting_heart_rate },
      baseline.map((day) => ({
        sleepMinutes: day.sleep_minutes,
        restingHeartRate: day.resting_heart_rate,
      }))
    );
    return {
      ...metric,
      readiness: readiness && { score: readiness.score, version: readiness.version },
    };
  } catch {
    return metric;
  }
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

    // Depois do consentimento, e não antes: a base de 14 dias é histórico de saúde,
    // e lê-la para calcular uma nota que ninguém autorizou já é tratamento.
    await healthService.upsertDaily(studentId, await withReadiness(studentId, metric));
    return 'saved';
  } catch {
    // Sem o erro no log: o do PostgREST carrega o payload, e o payload aqui são
    // passos, sono e FC — dado de saúde fora de observabilidade (Art. 6°, VII).
    registrarFalha('wearable.persist_today');
    return 'failed';
  }
}
